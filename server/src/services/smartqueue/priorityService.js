const Waitlist = require('../../models/Waitlist');
const SmartQueueAudit = require('../../models/SmartQueueAudit');
const eligibilityService = require('./eligibilityService');
const { WAITLIST_STATUS, AUDIT_ACTIONS } = require('./config');

/**
 * Finds the next eligible candidate from the waitlist in deterministic FIFO order.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.eventId
 * @param {Object} [params.eventDoc]
 * @param {string} [params.ticketTypeName]
 * @returns {Promise<{ candidate: Object|null, reason?: string }>}
 */
async function getNextEligibleCandidate({ eventId, eventDoc = null, ticketTypeName = null }) {
  const query = {
    event: eventId,
    status: { $in: [WAITLIST_STATUS.WAITING, WAITLIST_STATUS.ELIGIBLE] },
  };

  if (ticketTypeName) {
    query['ticketType.name'] = ticketTypeName;
  }

  // Fetch candidates sorted strictly by position ascending, then createdAt
  const candidates = await Waitlist.find(query)
    .sort({ position: 1, createdAt: 1 })
    .populate('user', 'name email avatar')
    .populate('registration');

  for (const entry of candidates) {
    const eligibility = await eligibilityService.checkEligibility({
      eventId,
      userId: entry.user?._id || entry.user,
      waitlistEntry: entry,
      eventDoc,
    });

    if (eligibility.eligible) {
      return { candidate: entry, user: eligibility.user, event: eligibility.event };
    }

    // Candidate is ineligible or skipped
    entry.status = WAITLIST_STATUS.SKIPPED;
    entry.skipReason = eligibility.reason || 'Candidate ineligible';
    await entry.save();

    await SmartQueueAudit.create({
      eventId,
      userId: entry.user?._id || entry.user,
      waitlistEntryId: entry._id,
      action: AUDIT_ACTIONS.PROMOTION_SKIPPED,
      details: { reason: eligibility.reason },
      actor: 'priorityService',
    });
  }

  return { candidate: null, reason: 'No eligible candidates remaining in waitlist' };
}

/**
 * Recalculates contiguous waitlist positions for an event.
 *
 * @param {string|mongoose.Types.ObjectId} eventId
 * @returns {Promise<number>} Number of active waiting participants
 */
async function recalculatePositions(eventId) {
  const activeEntries = await Waitlist.find({
    event: eventId,
    status: { $in: [WAITLIST_STATUS.WAITING, WAITLIST_STATUS.ELIGIBLE] },
  }).sort({ position: 1, createdAt: 1 });

  for (let idx = 0; idx < activeEntries.length; idx++) {
    const expectedPosition = idx + 1;
    if (activeEntries[idx].position !== expectedPosition) {
      activeEntries[idx].position = expectedPosition;
      await activeEntries[idx].save();
    }
  }

  return activeEntries.length;
}

module.exports = {
  getNextEligibleCandidate,
  recalculatePositions,
};
