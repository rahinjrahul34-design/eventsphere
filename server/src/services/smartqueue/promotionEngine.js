const Event = require('../../models/Event');
const Waitlist = require('../../models/Waitlist');
const SmartQueueAudit = require('../../models/SmartQueueAudit');
const priorityService = require('./priorityService');
const holdService = require('./holdService');
const eligibilityService = require('./eligibilityService');
const notificationService = require('../notificationService');
const emailService = require('../emailService');
const { emitToUser, emitToEvent } = require('../../sockets');
const config = require('../../config');
const { AUDIT_ACTIONS, DEFAULT_HOLD_DURATION_MINUTES, WAITLIST_STATUS } = require('./config');

/**
 * Handles newly available seats for an event by finding and holding seats
 * for eligible waitlisted candidates in FIFO order.
 *
 * @param {string|mongoose.Types.ObjectId} eventId
 * @returns {Promise<{ success: boolean, promotedCount: number, promoted: Array }>}
 */
async function handleSeatAvailable(eventId) {
  const event = await Event.findById(eventId);
  if (!event) {
    return { success: false, reason: 'Event not found' };
  }

  // Check if SmartQueue is enabled
  const sqSettings = event.settings?.smartQueue || {};
  if (sqSettings.enabled === false) {
    return { success: false, reason: 'SmartQueue is disabled for this event' };
  }

  if (sqSettings.autoPromote === false) {
    return { success: false, reason: 'Auto promotion is paused by organizer' };
  }

  const promoted = [];
  const duration = sqSettings.holdDurationMinutes || DEFAULT_HOLD_DURATION_MINUTES;

  // Loop while available capacity > 0
  let available = Math.max(0, event.capacity - ((event.registrationCount || 0) + (event.activeHoldsCount || 0)));

  while (available > 0) {
    const { candidate, user } = await priorityService.getNextEligibleCandidate({
      eventId: event._id,
      eventDoc: event,
    });

    if (!candidate || !user) {
      break; // No more eligible candidates
    }

    const holdResult = await holdService.createSeatHold({
      eventId: event._id,
      userId: user._id,
      waitlistEntryId: candidate._id,
      holdDurationMinutes: duration,
      ticketType: candidate.ticketType || { name: 'General', price: event.price || 0 },
    });

    if (!holdResult.success) {
      break; // Failed to lock capacity
    }

    const { hold } = holdResult;

    // Multi-channel notifications
    const acceptUrl = `${config.clientUrl}/events/${event.slug || event._id}?action=claim-hold&holdId=${hold._id}`;

    await notificationService.notify({
      user: user._id,
      type: 'waitlist',
      title: `⚡ Seat Reserved: ${event.title}`,
      message: `A seat has opened up! Complete your claim within ${duration} minutes.`,
      link: `/events/${event.slug || event._id}?action=claim-hold&holdId=${hold._id}`,
      data: {
        eventId: event._id,
        holdId: hold._id,
        expiresAt: hold.holdExpiresAt,
        durationMinutes: duration,
      },
      email: user.email
        ? emailService.templates.smartQueueSeatHeld(
            user.name,
            event.title,
            hold.holdExpiresAt,
            duration,
            acceptUrl
          )
        : null,
    });

    await SmartQueueAudit.create({
      eventId: event._id,
      userId: user._id,
      holdId: hold._id,
      waitlistEntryId: candidate._id,
      action: AUDIT_ACTIONS.NOTIFICATION_SENT,
      details: { channels: ['in_app', 'socket', user.email ? 'email' : null].filter(Boolean) },
      actor: 'promotionEngine',
    });

    // Real-time socket events
    emitToUser(user._id.toString(), 'smartqueue:seat_held', {
      eventId: event._id,
      holdId: hold._id,
      eventTitle: event.title,
      expiresAt: hold.holdExpiresAt,
      durationMinutes: duration,
      ticketType: hold.ticketType,
    });

    promoted.push({ hold, user, candidate });

    // Recalculate contiguous positions for other waiting users
    await priorityService.recalculatePositions(event._id);

    // Refresh available capacity
    const refreshed = await Event.findById(event._id).select('capacity registrationCount activeHoldsCount');
    available = Math.max(0, (refreshed.capacity || 0) - ((refreshed.registrationCount || 0) + (refreshed.activeHoldsCount || 0)));
  }

  if (promoted.length > 0) {
    emitToEvent(event._id.toString(), 'smartqueue:update', {
      eventId: event._id,
      activeHoldsCount: (event.activeHoldsCount || 0) + promoted.length,
      promotedCount: promoted.length,
    });
    emitToEvent(event._id.toString(), 'registration:update', {
      registrationCount: event.registrationCount,
      activeHoldsCount: (event.activeHoldsCount || 0) + promoted.length,
      seatsLeft: Math.max(0, event.capacity - (event.registrationCount + (event.activeHoldsCount || 0) + promoted.length)),
    });
  }

  return {
    success: true,
    promotedCount: promoted.length,
    promoted,
  };
}

/**
 * Manually promotes a specific waitlisted attendee into an active hold.
 */
async function promoteCandidateManually(eventId, waitlistEntryId, organizerUserId) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const candidate = await Waitlist.findById(waitlistEntryId).populate('user');
  if (!candidate) {
    throw new Error('Waitlist entry not found');
  }

  const eligibility = await eligibilityService.checkEligibility({
    eventId: event._id,
    userId: candidate.user._id,
    waitlistEntry: candidate,
    eventDoc: event,
  });

  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Candidate is not eligible for promotion');
  }

  const duration = event.settings?.smartQueue?.holdDurationMinutes || DEFAULT_HOLD_DURATION_MINUTES;

  const holdResult = await holdService.createSeatHold({
    eventId: event._id,
    userId: candidate.user._id,
    waitlistEntryId: candidate._id,
    holdDurationMinutes: duration,
    ticketType: candidate.ticketType || { name: 'General', price: event.price || 0 },
  });

  if (!holdResult.success) {
    throw new Error(holdResult.reason || 'Failed to create seat hold');
  }

  const { hold } = holdResult;

  await SmartQueueAudit.create({
    eventId: event._id,
    userId: candidate.user._id,
    holdId: hold._id,
    waitlistEntryId: candidate._id,
    action: AUDIT_ACTIONS.MANUAL_PROMOTION,
    details: { promotedBy: organizerUserId, holdId: hold._id },
    actor: organizerUserId.toString(),
  });

  // Notify candidate
  const acceptUrl = `${config.clientUrl}/events/${event.slug || event._id}?action=claim-hold&holdId=${hold._id}`;
  await notificationService.notify({
    user: candidate.user._id,
    type: 'waitlist',
    title: `⚡ Seat Reserved: ${event.title}`,
    message: `A seat has opened up for you! Claim within ${duration} minutes.`,
    link: `/events/${event.slug || event._id}?action=claim-hold&holdId=${hold._id}`,
    data: { eventId: event._id, holdId: hold._id, expiresAt: hold.holdExpiresAt },
    email: candidate.user.email
      ? emailService.templates.smartQueueSeatHeld(
          candidate.user.name,
          event.title,
          hold.holdExpiresAt,
          duration,
          acceptUrl
        )
      : null,
  });

  emitToUser(candidate.user._id.toString(), 'smartqueue:seat_held', {
    eventId: event._id,
    holdId: hold._id,
    eventTitle: event.title,
    expiresAt: hold.holdExpiresAt,
    durationMinutes: duration,
  });

  await priorityService.recalculatePositions(event._id);

  emitToEvent(event._id.toString(), 'smartqueue:update', {
    eventId: event._id,
    activeHoldsCount: event.activeHoldsCount + 1,
  });

  return { success: true, hold };
}

/**
 * Dry-run simulation of what the next promotion action will do.
 * Does not mutate database or send notifications.
 */
async function simulatePromotion(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const available = Math.max(0, event.capacity - ((event.registrationCount || 0) + (event.activeHoldsCount || 0)));
  const waitlistCandidates = await Waitlist.find({
    event: eventId,
    status: { $in: [WAITLIST_STATUS.WAITING, WAITLIST_STATUS.ELIGIBLE] },
  })
    .sort({ position: 1, createdAt: 1 })
    .limit(5)
    .populate('user', 'name email');

  const simulated = [];
  for (const candidate of waitlistCandidates) {
    const eligibility = await eligibilityService.checkEligibility({
      eventId: event._id,
      userId: candidate.user?._id || candidate.user,
      waitlistEntry: candidate,
      eventDoc: event,
    });
    simulated.push({
      waitlistId: candidate._id,
      user: candidate.user,
      position: candidate.position,
      ticketType: candidate.ticketType,
      eligible: eligibility.eligible,
      reason: eligibility.reason || 'Eligible for promotion',
    });
  }

  const duration = event.settings?.smartQueue?.holdDurationMinutes || DEFAULT_HOLD_DURATION_MINUTES;

  return {
    eventId: event._id,
    eventCapacity: event.capacity,
    currentRegistrations: event.registrationCount,
    activeHoldsCount: event.activeHoldsCount,
    availableSeats: available,
    holdDurationMinutes: duration,
    queueLength: waitlistCandidates.length,
    candidates: simulated,
    nextInLine: simulated.find((c) => c.eligible) || null,
  };
}

module.exports = {
  handleSeatAvailable,
  promoteCandidateManually,
  simulatePromotion,
};
