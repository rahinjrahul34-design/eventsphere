const SeatHold = require('../../models/SeatHold');
const Waitlist = require('../../models/Waitlist');
const SmartQueueAudit = require('../../models/SmartQueueAudit');
const Event = require('../../models/Event');
const { HOLD_STATUS, WAITLIST_STATUS } = require('./config');

/**
 * Computes comprehensive operational metrics, funnel stats, and queue efficiency.
 *
 * @param {string|mongoose.Types.ObjectId} eventId
 */
async function getEventSmartQueueMetrics(eventId) {
  const [event, holds, waitlistEntries, recentAudits] = await Promise.all([
    Event.findById(eventId).select('title capacity registrationCount activeHoldsCount settings price ticketTypes'),
    SeatHold.find({ eventId }).sort({ createdAt: -1 }),
    Waitlist.find({ event: eventId }).sort({ position: 1 }).populate('user', 'name email avatar'),
    SmartQueueAudit.find({ eventId }).sort({ createdAt: -1 }).limit(25).populate('userId', 'name email'),
  ]);

  if (!event) {
    throw new Error('Event not found');
  }

  // Funnel calculations
  const totalHolds = holds.length;
  const acceptedHolds = holds.filter((h) => h.status === HOLD_STATUS.ACCEPTED);
  const expiredHolds = holds.filter((h) => h.status === HOLD_STATUS.EXPIRED);
  const declinedHolds = holds.filter((h) => h.status === HOLD_STATUS.DECLINED);
  const activeHolds = holds.filter((h) => h.status === HOLD_STATUS.ACTIVE && new Date(h.holdExpiresAt) > new Date());

  const acceptedCount = acceptedHolds.length;
  const expiredCount = expiredHolds.length;
  const declinedCount = declinedHolds.length;
  const activeCount = activeHolds.length;

  const resolvedHolds = acceptedCount + expiredCount + declinedCount;
  const acceptanceRate = resolvedHolds > 0 ? Math.round((acceptedCount / resolvedHolds) * 100) : 0;
  const expirationRate = resolvedHolds > 0 ? Math.round((expiredCount / resolvedHolds) * 100) : 0;
  const declineRate = resolvedHolds > 0 ? Math.round((declinedCount / resolvedHolds) * 100) : 0;

  // Average time to claim
  let totalClaimSeconds = 0;
  acceptedHolds.forEach((h) => {
    if (h.acceptedAt && h.createdAt) {
      const diff = (new Date(h.acceptedAt).getTime() - new Date(h.createdAt).getTime()) / 1000;
      if (diff > 0) totalClaimSeconds += diff;
    }
  });
  const avgClaimTimeSeconds = acceptedCount > 0 ? Math.round(totalClaimSeconds / acceptedCount) : 0;

  // Queue Efficiency Score (0–100)
  // 1. Acceptance rate weight: up to 50 pts
  // 2. Churn penalty: expired/declined deduction up to 30 pts
  // 3. Speed bonus: under 5 mins (300s) = full 20 pts, tapering off
  let efficiencyScore = 50;
  if (resolvedHolds > 0) {
    const acceptancePoints = (acceptanceRate / 100) * 50;
    const speedPoints = avgClaimTimeSeconds > 0
      ? Math.max(0, 20 - Math.min(20, (avgClaimTimeSeconds / 900) * 20))
      : 10;
    const churnPenalty = (expirationRate / 100) * 20;
    efficiencyScore = Math.min(100, Math.max(10, Math.round(acceptancePoints + speedPoints + 30 - churnPenalty)));
  } else if (event.registrationCount >= event.capacity) {
    efficiencyScore = 75; // Baseline ready state
  }

  // Active waitlist breakdown
  const waitingCount = waitlistEntries.filter((w) => w.status === WAITLIST_STATUS.WAITING).length;

  return {
    eventId: event._id,
    eventTitle: event.title,
    capacity: event.capacity,
    registrationCount: event.registrationCount,
    activeHoldsCount: activeCount,
    availableCapacity: Math.max(0, event.capacity - (event.registrationCount + activeCount)),
    isFull: event.registrationCount + activeCount >= event.capacity,
    settings: event.settings?.smartQueue || {},
    metrics: {
      totalWaitlist: waitlistEntries.length,
      waitingCount,
      activeHoldsCount: activeCount,
      totalHoldsCreated: totalHolds,
      acceptedCount,
      expiredCount,
      declinedCount,
      acceptanceRate,
      expirationRate,
      declineRate,
      avgClaimTimeSeconds,
      avgClaimTimeFormatted: avgClaimTimeSeconds > 0
        ? `${Math.floor(avgClaimTimeSeconds / 60)}m ${avgClaimTimeSeconds % 60}s`
        : 'N/A',
      efficiencyScore,
    },
    activeHolds: activeHolds.map((h) => ({
      _id: h._id,
      userId: h.userId,
      ticketType: h.ticketType,
      holdExpiresAt: h.holdExpiresAt,
      secondsRemaining: Math.max(0, Math.floor((new Date(h.holdExpiresAt).getTime() - Date.now()) / 1000)),
      holdDurationMinutes: h.holdDurationMinutes,
      createdAt: h.createdAt,
    })),
    waitlist: waitlistEntries.slice(0, 50),
    recentAudits: recentAudits.slice(0, 20),
  };
}

module.exports = {
  getEventSmartQueueMetrics,
};
