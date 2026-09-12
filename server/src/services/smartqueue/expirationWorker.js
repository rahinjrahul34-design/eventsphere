const SeatHold = require('../../models/SeatHold');
const Event = require('../../models/Event');
const User = require('../../models/User');
const holdService = require('./holdService');
const promotionEngine = require('./promotionEngine');
const notificationService = require('../notificationService');
const emailService = require('../emailService');
const { emitToUser } = require('../../sockets');
const { HOLD_STATUS, SWEEPER_INTERVAL_MS, REMINDER_THRESHOLD_MINUTES } = require('./config');

let workerTimer = null;
let isSweeping = false;

/**
 * Sweeps for expired seat holds and sends reminders for holds nearing expiration.
 */
async function sweepExpiredHolds() {
  if (isSweeping) return { swept: 0, reminders: 0 };
  isSweeping = true;

  try {
    const now = new Date();

    // 1. Process Expired Holds
    const expiredHolds = await SeatHold.find({
      status: HOLD_STATUS.ACTIVE,
      holdExpiresAt: { $lte: now },
    });

    const affectedEventIds = new Set();
    let sweptCount = 0;

    for (const hold of expiredHolds) {
      const releaseResult = await holdService.releaseSeatHold({
        holdId: hold._id,
        reason: 'expired',
        actor: 'expirationWorker',
      });

      if (releaseResult.success) {
        sweptCount++;
        affectedEventIds.add(hold.eventId.toString());

        // Notify user about expiration
        const [event, user] = await Promise.all([
          Event.findById(hold.eventId).select('title'),
          User.findById(hold.userId).select('name email'),
        ]);

        if (event && user) {
          await notificationService.notify({
            user: user._id,
            type: 'waitlist',
            title: `Seat Hold Expired: ${event.title}`,
            message: `Your temporary reservation for ${event.title} has expired.`,
            data: { eventId: event._id, holdId: hold._id },
            email: user.email ? emailService.templates.smartQueueSeatExpired(user.name, event.title) : null,
          });

          emitToUser(user._id.toString(), 'smartqueue:hold_expired', {
            eventId: event._id,
            holdId: hold._id,
            eventTitle: event.title,
          });
        }
      }
    }

    // 2. Process Reminders (T-5 minutes before expiry)
    const reminderWindow = new Date(now.getTime() + REMINDER_THRESHOLD_MINUTES * 60 * 1000);
    const pendingReminders = await SeatHold.find({
      status: HOLD_STATUS.ACTIVE,
      reminderSentAt: null,
      holdExpiresAt: { $gt: now, $lte: reminderWindow },
    });

    let remindersCount = 0;
    for (const hold of pendingReminders) {
      const [event, user] = await Promise.all([
        Event.findById(hold.eventId).select('title slug settings'),
        User.findById(hold.userId).select('name email'),
      ]);

      if (event && user && event.settings?.smartQueue?.sendReminders !== false) {
        const remainingMinutes = Math.max(
          1,
          Math.ceil((new Date(hold.holdExpiresAt).getTime() - Date.now()) / (60 * 1000))
        );

        hold.reminderSentAt = new Date();
        await hold.save();
        remindersCount++;

        await notificationService.notify({
          user: user._id,
          type: 'waitlist',
          title: `⏳ Reminder: Only ${remainingMinutes}m left for ${event.title}`,
          message: `Your seat hold will expire in ${remainingMinutes} minutes! Complete your claim now.`,
          link: `/events/${event.slug || event._id}?action=claim-hold&holdId=${hold._id}`,
          data: { eventId: event._id, holdId: hold._id, expiresAt: hold.holdExpiresAt },
          email: user.email
            ? emailService.templates.smartQueueReminder(user.name, event.title, remainingMinutes)
            : null,
        });

        emitToUser(user._id.toString(), 'smartqueue:reminder', {
          eventId: event._id,
          holdId: hold._id,
          remainingMinutes,
        });
      }
    }

    // 3. Trigger immediate promotions for affected events where seats opened
    for (const eventId of affectedEventIds) {
      try {
        await promotionEngine.handleSeatAvailable(eventId);
      } catch (promotionErr) {
        console.error(`SmartQueue auto-promotion error on event ${eventId}:`, promotionErr);
      }
    }

    return { swept: sweptCount, reminders: remindersCount };
  } catch (err) {
    console.error('SmartQueue sweepExpiredHolds error:', err);
    return { swept: 0, reminders: 0, error: err.message };
  } finally {
    isSweeping = false;
  }
}

/**
 * Starts background sweeper worker.
 */
function startWorker(intervalMs = SWEEPER_INTERVAL_MS) {
  if (workerTimer) return;
  workerTimer = setInterval(sweepExpiredHolds, intervalMs);
  // Do not block process exit in tests
  if (workerTimer.unref) workerTimer.unref();
}

/**
 * Stops background sweeper worker.
 */
function stopWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

module.exports = {
  sweepExpiredHolds,
  startWorker,
  stopWorker,
};
