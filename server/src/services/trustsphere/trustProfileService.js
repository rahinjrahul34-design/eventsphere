const OrganizerTrustProfile = require('../../models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../../models/OrganizerTrustSnapshot');
const AuditLog = require('../../models/AuditLog');
const metricExtractor = require('./metricExtractor');
const scoringEngine = require('./scoringEngine');
const aiInsightsService = require('./aiInsightsService');
const { CACHE_TTL_MS, SCORE_VERSION } = require('./config');

/**
 * Calculates and persists fresh trust metrics and score snapshot.
 */
async function calculateAndSaveTrustProfile(organizerId, trigger = 'MANUAL_RECALCULATION', changeReason = 'Trust score recalculated') {
  const extracted = await metricExtractor.extractOrganizerMetrics(organizerId);
  const scored = scoringEngine.scoreOrganizer(extracted);
  const aiInsights = await aiInsightsService.getAiTrustInsights(scored);

  scored.aiInsights = aiInsights;

  // Check previous profile to record score delta
  const previousProfile = await OrganizerTrustProfile.findOne({ organizer: organizerId });
  const oldScore = previousProfile ? previousProfile.trustScore : scored.trustScore;
  const scoreDelta = scored.trustScore - oldScore;

  // Upsert profile
  const profile = await OrganizerTrustProfile.findOneAndUpdate(
    { organizer: organizerId },
    {
      organizer: organizerId,
      trustScore: scored.trustScore,
      trustLevel: scored.trustLevel,
      confidenceLevel: scored.confidenceLevel,
      scoreVersion: SCORE_VERSION,
      verified: scored.verified,
      metrics: scored.metrics,
      components: scored.components,
      weights: scored.weights,
      badges: scored.badges,
      factors: scored.factors,
      aiInsights,
      lastCalculatedAt: new Date(),
      isStale: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Save historical snapshot if new, score changed, or on specific milestone triggers
  const shouldCreateSnapshot =
    !previousProfile ||
    scoreDelta !== 0 ||
    ['EVENT_COMPLETED', 'EVENT_CANCELLED', 'REPORT_RESOLVED', 'VERIFICATION_CHANGED'].includes(trigger);

  if (shouldCreateSnapshot) {
    await OrganizerTrustSnapshot.create({
      organizer: organizerId,
      score: scored.trustScore,
      trustLevel: scored.trustLevel,
      confidenceLevel: scored.confidenceLevel,
      components: scored.components,
      metrics: scored.metrics,
      changeReason,
      scoreDelta,
      trigger,
      scoreVersion: SCORE_VERSION,
      calculatedAt: new Date(),
    });
  }

  // Audit log entry
  try {
    await AuditLog.create({
      action: 'trust.recalculated',
      targetType: 'user',
      targetId: organizerId,
      meta: {
        score: scored.trustScore,
        level: scored.trustLevel,
        confidence: scored.confidenceLevel,
        trigger,
        delta: scoreDelta,
      },
    });
  } catch (err) {
    // Non-blocking audit error
  }

  return profile;
}

/**
 * Retrieves organizer trust profile with caching and role-based privacy redactions.
 */
async function getOrganizerTrustProfile(organizerId, { forceRecalculate = false, userRole = 'attendee', requestingUserId = null } = {}) {
  let profile = await OrganizerTrustProfile.findOne({ organizer: organizerId }).populate('organizer', 'name company location avatar organizerStatus');

  const isCacheExpired = profile && profile.lastCalculatedAt
    ? Date.now() - new Date(profile.lastCalculatedAt).getTime() > CACHE_TTL_MS
    : true;

  if (!profile || isCacheExpired || forceRecalculate || profile.isStale) {
    profile = await calculateAndSaveTrustProfile(
      organizerId,
      forceRecalculate ? 'MANUAL_RECALCULATION' : 'SCHEDULED_RECALCULATION',
      'Refreshed organizer trust profile'
    );
    profile = await OrganizerTrustProfile.findById(profile._id).populate('organizer', 'name company location avatar organizerStatus');
  }

  const profileObj = profile.toObject();

  // Public Privacy Redaction:
  // Non-admins and non-self viewers must NEVER see private reports or internal moderation details
  const isOwnerOrAdmin =
    userRole === 'admin' ||
    (requestingUserId && requestingUserId.toString() === organizerId.toString());

  if (!isOwnerOrAdmin) {
    if (profileObj.metrics) {
      delete profileObj.metrics.confirmedViolationsList;
      delete profileObj.metrics.openReports;
      delete profileObj.metrics.dismissedReports;
    }
  }

  return profileObj;
}

/**
 * Retrieves historical snapshots for the trust trend chart.
 */
async function getOrganizerTrustHistory(organizerId, { limit = 20 } = {}) {
  const snapshots = await OrganizerTrustSnapshot.find({ organizer: organizerId })
    .sort({ calculatedAt: 1 })
    .limit(limit);

  return snapshots;
}

module.exports = {
  calculateAndSaveTrustProfile,
  getOrganizerTrustProfile,
  getOrganizerTrustHistory,
};
