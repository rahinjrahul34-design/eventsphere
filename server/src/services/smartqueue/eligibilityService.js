const Event = require('../../models/Event');
const User = require('../../models/User');
const Registration = require('../../models/Registration');
const SeatHold = require('../../models/SeatHold');
const SmartQueueAudit = require('../../models/SmartQueueAudit');
const { AUDIT_ACTIONS } = require('./config');

/**
 * Validates whether a waitlisted user is currently eligible for seat hold promotion.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.eventId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {Object} [params.waitlistEntry]
 * @param {Object} [params.eventDoc]
 * @returns {Promise<{ eligible: boolean, reason?: string, details?: object }>}
 */
async function checkEligibility({ eventId, userId, waitlistEntry = null, eventDoc = null }) {
  try {
    const event = eventDoc || (await Event.findById(eventId));
    if (!event) {
      return { eligible: false, reason: 'Event not found' };
    }

    if (!['published', 'live'].includes(event.status) || event.approvalStatus !== 'approved') {
      return { eligible: false, reason: `Event is not active (status: ${event.status})` };
    }

    if (new Date(event.endDate) < new Date()) {
      return { eligible: false, reason: 'Event has already concluded' };
    }

    // Registration closure gate (CORE FEATURE 35): never promote after the
    // organizer's registration deadline has passed.
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return { eligible: false, reason: 'Registration has closed for this event' };
    }

    // Check user status
    const user = await User.findById(userId);
    if (!user) {
      return { eligible: false, reason: 'User account does not exist' };
    }

    // Check if user already has an active confirmed registration
    const existingRegistration = await Registration.findOne({
      event: event._id,
      user: user._id,
      status: { $in: ['confirmed', 'checked_in'] },
    });
    if (existingRegistration) {
      return {
        eligible: false,
        reason: 'User already holds a confirmed registration for this event',
        details: { registrationId: existingRegistration._id },
      };
    }

    // Check if user already holds an active seat reservation
    const existingHold = await SeatHold.findOne({
      eventId: event._id,
      userId: user._id,
      status: 'active',
      holdExpiresAt: { $gt: new Date() },
    });
    if (existingHold) {
      return {
        eligible: false,
        reason: 'User already has an active seat hold for this event',
        details: { holdId: existingHold._id, expiresAt: existingHold.holdExpiresAt },
      };
    }

    // Check ticket-type specificity if configured
    if (event.settings?.smartQueue?.ticketTypeSpecific && waitlistEntry?.ticketType?.name) {
      const requestedTier = waitlistEntry.ticketType.name;
      const tier = (event.ticketTypes || []).find((t) => t.name === requestedTier);
      if (tier && tier.quantity > 0 && tier.soldCount >= tier.quantity) {
        return {
          eligible: false,
          reason: `Requested ticket tier "${requestedTier}" is at full capacity`,
          details: { tier: requestedTier },
        };
      }
    }

    // Log successful eligibility evaluation
    await SmartQueueAudit.create({
      eventId: event._id,
      userId: user._id,
      waitlistEntryId: waitlistEntry?._id || null,
      action: AUDIT_ACTIONS.ELIGIBILITY_CHECKED,
      details: { eligible: true },
      actor: 'eligibilityService',
    });

    return { eligible: true, user, event };
  } catch (error) {
    console.error('SmartQueue eligibility check error:', error);
    return { eligible: false, reason: `Eligibility check error: ${error.message}` };
  }
}

module.exports = {
  checkEligibility,
};
