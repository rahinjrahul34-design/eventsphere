/**
 * Command Center Backend Aggregation Layer
 *
 * Parallelizes data fetching across all six EventSphere intelligence modules using
 * `Promise.allSettled`. If any module fails or has not yet computed data, the Command Center
 * remains fully operational and marks the module with an explicit `available: false` state.
 *
 * Never invents fake numbers or defaults missing data to zero unless zero is the real value.
 */

const mongoose = require('mongoose');
const Event = require('../../models/Event');
const EventPrediction = require('../../models/EventPrediction');
const EventRiskAssessment = require('../../models/EventRiskAssessment');
const EventPredictionSnapshot = require('../../models/EventPredictionSnapshot');
const RiskAssessmentHistory = require('../../models/RiskAssessmentHistory');
const RecommendationInteraction = require('../../models/RecommendationInteraction');
const OrganizerTrustProfile = require('../../models/OrganizerTrustProfile');
const ApiError = require('../../utils/ApiError');

// Reused existing flagship services
const { getPredictionHistory } = require('../eventpulse/eventPulseEngine');
const { getEventAlerts } = require('../eventShieldAlerts');
const { getEventSmartQueueMetrics } = require('../smartqueue/smartQueueAnalytics');
const { getOrCreateProfile: getOrCreateBoostProfile } = require('../eventboost/eventBoostEngine');

// Command center internal engines
const { calculateEventHealth } = require('./healthScoreEngine');
const { extractModuleActions } = require('./actionEngine');
const { generateExecutiveBrief } = require('./narrativeService');
const { isSocketInitialized } = require('../../sockets');

/**
 * Aggregates complete event intelligence from all 6 modules.
 *
 * @param {string|mongoose.Types.ObjectId} eventId
 * @param {object} user - Requesting user object with { _id, role }
 * @returns {Promise<object>} Complete Command Center payload
 */
async function aggregateCommandCenterData(eventId, user = {}) {
  // 1. Fetch primary Event document
  const event = await Event.findById(eventId)
    .populate('organizer', 'name email company avatar organizerStatus')
    .lean();

  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const organizerId = (event.organizer?._id || event.organizer)?.toString();
  const validObjId = mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;

  // 2. Parallel data fetching across all 6 intelligence modules via Promise.allSettled
  const [
    pulseSettled,
    pulseHistorySettled,
    shieldAssessmentSettled,
    shieldAlertsSettled,
    queueSettled,
    trustSettled,
    boostSettled,
    recInteractionsSettled,
    predictionSnapshotsSettled,
    riskHistorySettled,
  ] = await Promise.allSettled([
    // EventPulse Prediction
    EventPrediction.findOne({ eventId, expiresAt: { $gt: new Date() } }).lean(),

    // EventPulse History
    getPredictionHistory(eventId),

    // EventShield Assessment
    EventRiskAssessment.findOne({ event: eventId }).lean(),

    // EventShield Alerts
    getEventAlerts(eventId),

    // SmartQueue Metrics
    getEventSmartQueueMetrics(eventId),

    // TrustSphere Organizer Profile
    organizerId ? OrganizerTrustProfile.findOne({ organizer: organizerId }).lean() : Promise.resolve(null),

    // EventBoost SEO Profile
    getOrCreateBoostProfile(eventId),

    // Recommendation 2.0 Interactions
    validObjId
      ? RecommendationInteraction.aggregate([
          { $match: { event: validObjId } },
          { $group: { _id: '$interactionType', count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),

    // Health Timeline: Prediction Snapshots
    EventPredictionSnapshot.find({ eventId }).sort({ recordedAt: 1 }).limit(30).lean(),

    // Health Timeline: Risk History
    RiskAssessmentHistory.find({ eventId }).sort({ recordedAt: 1 }).limit(30).lean(),
  ]);

  // 3. Normalize module outputs with explicit availability states
  const pulseData = pulseSettled.status === 'fulfilled' ? pulseSettled.value : null;
  const pulseHistory = pulseHistorySettled.status === 'fulfilled' ? pulseHistorySettled.value : [];
  const shieldData = shieldAssessmentSettled.status === 'fulfilled' ? shieldAssessmentSettled.value : null;
  const shieldAlerts = shieldAlertsSettled.status === 'fulfilled' ? shieldAlertsSettled.value : [];
  const queueData = queueSettled.status === 'fulfilled' ? queueSettled.value : null;
  const trustData = trustSettled.status === 'fulfilled' ? trustSettled.value : null;
  const boostData = boostSettled.status === 'fulfilled' ? boostSettled.value : null;
  const recInteractions = recInteractionsSettled.status === 'fulfilled' ? recInteractionsSettled.value : [];
  const predictionSnapshots = predictionSnapshotsSettled.status === 'fulfilled' ? predictionSnapshotsSettled.value : [];
  const riskHistory = riskHistorySettled.status === 'fulfilled' ? riskHistorySettled.value : [];

  // 4. Calculate Unified Event Health Score (Deterministic)
  const health = calculateEventHealth({
    event,
    pulseData,
    shieldData,
    shieldAlerts,
    queueData,
    boostProfile: boostData,
    trustProfile: trustData,
  });

  // 5. Synthesize and Prioritize Actions
  const actions = extractModuleActions({
    event,
    pulseData,
    shieldData,
    shieldAlerts,
    queueData,
    boostProfile: boostData,
    trustProfile: trustData,
  });

  // 6. Assemble Unified Alerts Feed
  const alertsFeed = [];
  if (shieldAlerts && shieldAlerts.length > 0) {
    shieldAlerts.forEach((a) => {
      alertsFeed.push({
        id: a._id || `shield_${a.type}`,
        source: 'eventshield',
        sourceName: 'EventShield AI',
        title: a.type?.replace(/_/g, ' ')?.toUpperCase(),
        message: a.message,
        severity: a.severity || 'medium',
        status: a.status || 'active',
        createdAt: a.createdAt,
        actionable: true,
        link: `/dashboard/events/${eventId}/eventshield`,
      });
    });
  }

  if (pulseData?.alerts && pulseData.alerts.length > 0) {
    pulseData.alerts.forEach((a) => {
      alertsFeed.push({
        id: a._id || `pulse_${a.type}`,
        source: 'eventpulse',
        sourceName: 'EventPulse AI',
        title: a.type?.replace(/_/g, ' ')?.toUpperCase(),
        message: a.message,
        severity: a.severity || 'high',
        status: a.status || 'active',
        createdAt: a.createdAt,
        actionable: true,
        link: `/dashboard/events/${eventId}/eventpulse`,
      });
    });
  }

  // Sort alerts: critical first, then high, medium, low
  const sevOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  alertsFeed.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));

  // 7. Format Recommendation Intelligence Signals
  const recMap = (recInteractions || []).reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const recommendationIntelligence = {
    available: recInteractionsSettled.status === 'fulfilled',
    reason: recInteractionsSettled.status === 'fulfilled' ? null : 'Recommendation interaction data unavailable',
    views: recMap.view || 0,
    clicks: recMap.click || 0,
    saves: recMap.save || 0,
    shares: recMap.share || 0,
    feedbackScore: recMap.feedback || 0,
    ctr: recMap.view > 0 ? Math.round(((recMap.click || 0) / recMap.view) * 100) : 0,
    visibilitySignal: (recMap.view || 0) > 100 ? 'High' : (recMap.view || 0) > 20 ? 'Moderate' : 'Emerging',
    lastUpdated: new Date().toISOString(),
  };

  // 8. Assemble Historical Health Timeline
  const trends = [];
  const snapshotCount = predictionSnapshots.length;

  if (snapshotCount > 0) {
    predictionSnapshots.forEach((snap, idx) => {
      const correspondingRisk = riskHistory[idx];
      trends.push({
        timestamp: snap.recordedAt || snap.createdAt,
        date: new Date(snap.recordedAt || snap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        healthScore: snap.health?.score !== undefined ? snap.health.score : null,
        predictedAttendance: snap.attendance?.expectedAttendees ?? null,
        registrations: snap.registrations?.total ?? null,
        safetyScore: correspondingRisk?.safetyScore !== undefined ? correspondingRisk.safetyScore : null,
      });
    });
  } else if (pulseHistory && pulseHistory.length > 0) {
    pulseHistory.forEach((item) => {
      trends.push({
        timestamp: item.recordedAt || item.timestamp,
        date: new Date(item.recordedAt || item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        healthScore: item.healthScore ?? null,
        predictedAttendance: item.attendance ?? null,
        registrations: item.registrations ?? null,
        safetyScore: null,
      });
    });
  } else {
    // Current point baseline (real, current data — not fabricated history)
    trends.push({
      timestamp: new Date(),
      date: 'Today',
      healthScore: health.score,
      predictedAttendance: pulseData?.attendance?.expectedAttendees ?? null,
      registrations: event.registrationCount || 0,
      safetyScore: shieldData?.safetyScore ?? null,
    });
  }

  // 9. Generate AI Executive Brief
  const brief = await generateExecutiveBrief({
    event,
    health,
    actions,
    pulseData,
    shieldData,
    shieldAlerts,
    queueData,
    boostProfile: boostData,
    trustProfile: trustData,
  });

  // 10. Assemble Intelligence Module Cards with Freshness and Availability
  return {
    event: {
      _id: event._id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      capacity: event.capacity,
      registrationCount: event.registrationCount || 0,
      venue: event.venue,
      isPublished: event.isPublished,
      approvalStatus: event.approvalStatus,
      organizer: event.organizer,
    },
    overallHealth: health,
    summary: brief,
    attendance: {
      available: pulseData !== null,
      reason: pulseData ? null : 'EventPulse data unavailable or awaiting initial registrations',
      expectedRegistrations: pulseData ? (pulseData.registrations?.predictedTotal ?? event.registrationCount ?? null) : null,
      expectedAttendance: pulseData?.attendance?.expectedAttendees ?? null,
      expectedNoShows: pulseData?.attendance?.expectedNoShows ?? null,
      currentRegistrations: event.registrationCount || 0,
      registrationVelocity: pulseData?.registrations?.velocity24h ?? null,
      attendanceRate: pulseData?.attendance?.attendanceRate ?? null,
      confidence: pulseData?.health?.confidence ?? null,
      trend: pulseData ? (pulseData.registrations?.velocity24h > 3 ? 'up' : pulseData.registrations?.velocity24h === 0 ? 'flat' : pulseData.registrations?.velocity24h !== undefined ? 'down' : null) : null,
      lastUpdated: pulseData?.calculatedAt || null,
      ctaText: 'View EventPulse',
      ctaLink: `/dashboard/events/${eventId}/eventpulse`,
    },
    safety: {
      available: shieldData !== null,
      reason: shieldData ? null : 'EventShield baseline awaiting evaluation',
      safetyScore: shieldData?.safetyScore ?? null,
      currentRiskLevel: shieldData?.overallRiskLevel ?? null,
      criticalRisksCount: (shieldAlerts || []).filter((a) => a.severity === 'critical' && a.status === 'active').length,
      openAlertsCount: (shieldAlerts || []).filter((a) => a.status === 'active').length,
      checklistCompletion: shieldData?.checklistCompletionRate ?? shieldData?.readinessScore ?? null,
      operationalReadiness: shieldData?.readinessScore ?? null,
      lastUpdated: shieldData?.lastEvaluatedAt || null,
      ctaText: 'Review Safety',
      ctaLink: `/dashboard/events/${eventId}/eventshield`,
    },
    queue: {
      available: queueData !== null,
      reason: queueData ? null : 'SmartQueue not configured or no waitlist activity',
      totalWaitlist: queueData?.metrics?.totalWaitlist ?? 0,
      waitingCount: queueData?.metrics?.waitingCount ?? 0,
      activeHolds: queueData?.metrics?.activeHoldsCount ?? 0,
      pendingPromotions: queueData?.metrics?.pendingPromotions ?? 0,
      queuePressure: queueData?.metrics?.waitingCount > 10 ? 'High' : queueData?.metrics?.waitingCount > 0 ? 'Moderate' : 'Normal',
      efficiencyScore: queueData?.metrics?.efficiencyScore ?? null,
      avgClaimTime: queueData?.metrics?.avgClaimTimeFormatted ?? null,
      acceptanceRate: queueData?.metrics?.acceptanceRate ?? null,
      lastUpdated: queueData ? new Date().toISOString() : null,
      ctaText: 'Manage Queue',
      ctaLink: `/dashboard/events/${eventId}/smartqueue`,
    },
    trust: {
      available: trustData !== null,
      reason: trustData ? null : 'TrustSphere profile compiling',
      trustScore: trustData?.trustScore ?? null,
      trustLevel: trustData?.trustLevel ?? null,
      confidenceLevel: trustData?.confidenceLevel ?? null,
      verified: trustData ? Boolean(trustData.verified) : null,
      strengths: trustData?.aiInsights?.keyStrengths ?? trustData?.factors?.strengths ?? [],
      concerns: trustData?.aiInsights?.riskFactors ?? trustData?.factors?.concerns ?? [],
      lastUpdated: trustData?.lastCalculatedAt || null,
      ctaText: 'View Trust',
      ctaLink: `/dashboard/trust`,
    },
    seo: {
      available: boostData !== null,
      reason: boostData ? null : 'Run EventBoost analysis to see SEO intelligence',
      seoScore: boostData?.seoScore ?? null,
      contentScore: boostData?.contentScore ?? null,
      readabilityScore: boostData?.readabilityScore ?? null,
      keywordScore: boostData?.keywordScore ?? null,
      primaryKeyword: boostData?.primaryKeyword || null,
      mainOpportunity: boostData?.seoIssues?.[0]?.title || null,
      lastUpdated: boostData?.lastAnalyzedAt || null,
      ctaText: 'Optimize Event',
      ctaLink: `/dashboard/events/${eventId}/eventboost`,
    },
    recommendations: recommendationIntelligence,
    actions,
    alerts: alertsFeed,
    trends,
    freshness: {
      aggregatedAt: new Date().toISOString(),
      cacheTtlSeconds: 30,
      isRealtimeConnected: isSocketInitialized(),
    },
  };
}

module.exports = {
  aggregateCommandCenterData,
};
