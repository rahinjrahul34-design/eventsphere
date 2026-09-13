const Event = require('../../models/Event');
const SeatHold = require('../../models/SeatHold');
const Waitlist = require('../../models/Waitlist');
const SmartQueueAudit = require('../../models/SmartQueueAudit');
const User = require('../../models/User');
const notificationService = require('../notificationService');
const { emitToUser } = require('../../sockets');
const { HOLD_STATUS, WAITLIST_STATUS, AUDIT_ACTIONS, DEFAULT_HOLD_DURATION_MINUTES } = require('./config');

/**
 * Atomically locks a seat and creates a temporary hold record.
 *
 * Invariant: Capacity >= RegistrationCount + ActiveHoldsCount
 */
async function createSeatHold({
  eventId,
  userId,
  waitlistEntryId,
  holdDurationMinutes = DEFAULT_HOLD_DURATION_MINUTES,
  ticketType = { name: 'General', price: 0 },
  idempotencyKey = null,
}) {
  const duration = Math.min(Math.max(holdDurationMinutes, 5), 60);

  // 1. Atomic capacity lock on Event:
  // Only increment activeHoldsCount if (registrationCount + activeHoldsCount) < capacity
  const event = await Event.findOneAndUpdate(
    {
      _id: eventId,
      $expr: {
        $lt: [
          { $add: [{ $ifNull: ['$registrationCount', 0] }, { $ifNull: ['$activeHoldsCount', 0] }] },
          '$capacity',
        ],
      },
    },
    { $inc: { activeHoldsCount: 1 } },
    { new: true }
  );

  if (!event) {
    return {
      success: false,
      reason: 'No available capacity for seat reservation',
    };
  }

  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  try {
    const hold = await SeatHold.create({
      eventId,
      userId,
      waitlistEntryId,
      ticketType,
      status: HOLD_STATUS.ACTIVE,
      holdExpiresAt: expiresAt,
      holdDurationMinutes: duration,
      notifiedAt: new Date(),
      idempotencyKey: idempotencyKey || undefined,
    });

    await Waitlist.findByIdAndUpdate(waitlistEntryId, {
      status: WAITLIST_STATUS.HOLD_ACTIVE,
      activeHold: hold._id,
      notifiedAt: new Date(),
    });

    await SmartQueueAudit.create({
      eventId,
      userId,
      holdId: hold._id,
      waitlistEntryId,
      action: AUDIT_ACTIONS.SEAT_HELD,
      details: {
        holdDurationMinutes: duration,
        holdExpiresAt: expiresAt,
        ticketType,
      },
      actor: 'holdService',
    });

    return {
      success: true,
      hold,
      event,
    };
  } catch (error) {
    // Roll back capacity reservation in case of error (e.g. duplicate idempotencyKey)
    await Event.findByIdAndUpdate(eventId, { $inc: { activeHoldsCount: -1 } });
    throw error;
  }
}

/**
 * Atomically releases an active seat hold and frees capacity.
 */
async function releaseSeatHold({ holdId, reason = 'expired', actor = 'system' }) {
  const targetStatus = reason === 'declined' ? HOLD_STATUS.DECLINED : HOLD_STATUS.EXPIRED;
  const auditAction = reason === 'declined' ? AUDIT_ACTIONS.HOLD_DECLINED : AUDIT_ACTIONS.HOLD_EXPIRED;

  // Atomically update hold status if currently active
  const hold = await SeatHold.findOneAndUpdate(
    { _id: holdId, status: HOLD_STATUS.ACTIVE },
    {
      status: targetStatus,
      expiredAt: reason === 'expired' ? new Date() : undefined,
      declinedAt: reason === 'declined' ? new Date() : undefined,
    },
    { new: true }
  );

  if (!hold) {
    return { success: false, reason: 'Hold not active or already finalized' };
  }

  // Atomically decrement activeHoldsCount on Event
  await Event.findOneAndUpdate(
    { _id: hold.eventId, activeHoldsCount: { $gt: 0 } },
    { $inc: { activeHoldsCount: -1 } }
  );

  // Update Waitlist entry
  await Waitlist.findByIdAndUpdate(hold.waitlistEntryId, {
    status: reason === 'declined' ? WAITLIST_STATUS.DECLINED : WAITLIST_STATUS.EXPIRED,
    declinedAt: reason === 'declined' ? new Date() : undefined,
    activeHold: null,
  });

  // Audit logging
  await SmartQueueAudit.create({
    eventId: hold.eventId,
    userId: hold.userId,
    holdId: hold._id,
    waitlistEntryId: hold.waitlistEntryId,
    action: auditAction,
    details: { reason, releasedAt: new Date() },
    actor,
  });

  await SmartQueueAudit.create({
    eventId: hold.eventId,
    userId: hold.userId,
    holdId: hold._id,
    action: AUDIT_ACTIONS.SEAT_RELEASED,
    details: { reason },
    actor,
  });

  return { success: true, hold };
}

/**
 * Atomically confirms acceptance of an active seat hold.
 * Decrements activeHoldsCount to allow confirmRegistration to increment registrationCount.
 */
async function acceptSeatHold({ holdId, userId }) {
  const hold = await SeatHold.findOneAndUpdate(
    {
      _id: holdId,
      userId,
      status: HOLD_STATUS.ACTIVE,
      holdExpiresAt: { $gt: new Date() },
    },
    {
      status: HOLD_STATUS.ACCEPTED,
      acceptedAt: new Date(),
    },
    { new: true }
  );

  if (!hold) {
    return {
      success: false,
      reason: 'Hold has expired, was cancelled, or does not belong to this user',
    };
  }

  // Decrement active hold lock so confirmRegistration can take the permanent seat
  await Event.findOneAndUpdate(
    { _id: hold.eventId, activeHoldsCount: { $gt: 0 } },
    { $inc: { activeHoldsCount: -1 } }
  );

  // Update Waitlist status
  await Waitlist.findByIdAndUpdate(hold.waitlistEntryId, {
    status: WAITLIST_STATUS.PROMOTED,
    promotedAt: new Date(),
  });

  await SmartQueueAudit.create({
    eventId: hold.eventId,
    userId: hold.userId,
    holdId: hold._id,
    waitlistEntryId: hold.waitlistEntryId,
    action: AUDIT_ACTIONS.HOLD_ACCEPTED,
    details: { acceptedAt: hold.acceptedAt },
    actor: 'user',
  });

  return { success: true, hold };
}

/**
 * Atomically releases ALL active holds for an event (CORE FEATURE 34/35).
 * Used when an event is cancelled/completed or promotions must stop.
 * Each release is an atomic conditional update — safe under concurrency.
 * Does NOT trigger further promotions (the caller decides policy).
 */
async function cancelAllActiveHolds({ eventId, reason = 'event_cancelled', actor = 'system', notifyUsers = true }) {
  const activeHolds = await SeatHold.find({ eventId, status: HOLD_STATUS.ACTIVE });
  const released = [];

  for (const hold of activeHolds) {
    const result = await releaseSeatHold({ holdId: hold._id, reason, actor });
    if (result.success) {
      released.push(hold);

      if (notifyUsers) {
        try {
          const user = await User.findById(hold.userId).select('name email');
          const event = await Event.findById(eventId).select('title');
          if (user && event) {
            await notificationService.notify({
              user: user._id,
              type: 'waitlist',
              title: `Seat reservation closed: ${event.title}`,
              message: `Temporary seat reservations for ${event.title} were released because the event status changed (${reason.replace(/_/g, ' ')}).`,
              data: { eventId, holdId: hold._id, reason },
            });
            emitToUser(user._id.toString(), 'smartqueue:hold_expired', {
              eventId,
              holdId: hold._id,
              eventTitle: event.title,
              reason,
            });
          }
        } catch (notifyErr) {
          // Notification failure must not block the release loop (FEATURE 33)
        }
      }
    }
  }

  return { releasedCount: released.length, released };
}

/**
 * Returns active hold for a user and event with calculated remaining seconds.
 */
async function getActiveHoldForUser(eventId, userId) {
  const hold = await SeatHold.findOne({
    eventId,
    userId,
    status: HOLD_STATUS.ACTIVE,
    holdExpiresAt: { $gt: new Date() },
  }).populate('eventId', 'title slug capacity registrationCount activeHoldsCount price ticketTypes');

  if (!hold) return null;

  const secondsRemaining = Math.max(0, Math.floor((new Date(hold.holdExpiresAt).getTime() - Date.now()) / 1000));
  return {
    ...hold.toObject(),
    secondsRemaining,
  };
}

module.exports = {
  createSeatHold,
  releaseSeatHold,
  acceptSeatHold,
  getActiveHoldForUser,
  cancelAllActiveHolds,
};
