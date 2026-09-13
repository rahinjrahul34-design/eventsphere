const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const User = require('../models/User');
const Event = require('../models/Event');
const OrganizerTrustProfile = require('../models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../models/OrganizerTrustSnapshot');
const trustProfileService = require('../services/trustsphere/trustProfileService');
const trustSimulationService = require('../services/trustsphere/trustSimulationService');
const aiInsightsService = require('../services/trustsphere/aiInsightsService');

/**
 * GET /api/trust/organizers/:organizerId
 * Public trust card with privacy protections for attendees.
 */
const getOrganizerTrust = asyncHandler(async (req, res) => {
  const { organizerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(organizerId)) {
    throw ApiError.badRequest('Invalid organizer ID format');
  }

  const organizer = await User.findById(organizerId).select('_id name company location avatar organizerStatus');
  if (!organizer) {
    throw ApiError.notFound('Organizer not found');
  }

  const profile = await trustProfileService.getOrganizerTrustProfile(organizerId, {
    userRole: req.user ? req.user.role : 'attendee',
    requestingUserId: req.user ? req.user._id : null,
  });

  ok(res, profile);
});

/**
 * GET /api/trust/organizers/:organizerId/history
 * Historical trust snapshots for charts and sparklines.
 */
const getOrganizerTrustHistory = asyncHandler(async (req, res) => {
  const { organizerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(organizerId)) {
    throw ApiError.badRequest('Invalid organizer ID format');
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const history = await trustProfileService.getOrganizerTrustHistory(organizerId, { limit });

  ok(res, history);
});

/**
 * GET /api/trust/events/:eventId/organizer
 * Quick helper to get the organizer's trust profile for a specific event.
 */
const getEventOrganizerTrust = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw ApiError.badRequest('Invalid event ID format');
  }

  const event = await Event.findById(eventId).select('organizer title');
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const profile = await trustProfileService.getOrganizerTrustProfile(event.organizer, {
    userRole: req.user ? req.user.role : 'attendee',
    requestingUserId: req.user ? req.user._id : null,
  });

  ok(res, profile);
});

/**
 * GET /api/trust/me
 * Authenticated organizer's comprehensive trust dashboard profile.
 */
const getMyTrust = asyncHandler(async (req, res) => {
  const profile = await trustProfileService.getOrganizerTrustProfile(req.user._id, {
    userRole: req.user.role,
    requestingUserId: req.user._id,
  });

  ok(res, profile);
});

/**
 * GET /api/trust/me/ai-insights
 * Get AI reputation insights with optional force refresh.
 */
const getMyAiInsights = asyncHandler(async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  let profile = await trustProfileService.getOrganizerTrustProfile(req.user._id, {
    userRole: req.user.role,
    requestingUserId: req.user._id,
  });

  if (forceRefresh || !profile.aiInsights || !profile.aiInsights.summary) {
    const aiInsights = await aiInsightsService.getAiTrustInsights(profile, { forceFresh: forceRefresh });
    await OrganizerTrustProfile.updateOne(
      { organizer: req.user._id },
      { $set: { aiInsights } }
    );
    profile.aiInsights = aiInsights;
  }

  ok(res, profile.aiInsights);
});

/**
 * POST /api/trust/me/simulate
 * Safe what-if scenario simulation sandbox for organizers.
 */
const simulateTrust = asyncHandler(async (req, res) => {
  const simulationOverrides = req.body || {};
  const result = await trustSimulationService.simulateTrustScenario(req.user._id, simulationOverrides);

  ok(res, result);
});

/**
 * POST /api/trust/me/recalculate
 * Manual recalculation triggered by organizer.
 */
const recalculateMyTrust = asyncHandler(async (req, res) => {
  const profile = await trustProfileService.calculateAndSaveTrustProfile(
    req.user._id,
    'MANUAL_RECALCULATION',
    'Organizer triggered manual trust recalculation'
  );

  ok(res, profile, 200, { message: 'Trust profile successfully updated' });
});

/**
 * GET /api/trust/admin/analytics
 * Platform-wide trust distribution and risk radar for administrators.
 */
const getAdminTrustAnalytics = asyncHandler(async (req, res) => {
  const [
    totalProfiles,
    levelDistribution,
    verifiedStats,
    scoreBandDistribution,
    flaggedProfiles,
    recentSnapshots,
  ] = await Promise.all([
    OrganizerTrustProfile.countDocuments(),
    OrganizerTrustProfile.aggregate([
      {
        $group: {
          _id: '$trustLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$trustScore' },
        },
      },
    ]),
    OrganizerTrustProfile.aggregate([
      {
        $group: {
          _id: '$verified',
          count: { $sum: 1 },
        },
      },
    ]),
    // Score-band distribution (90-100 / 80-89 / ... / below 60) — CORE FEATURE 37
    OrganizerTrustProfile.aggregate([
      {
        $bucket: {
          groupBy: '$trustScore',
          boundaries: [0, 40, 60, 70, 80, 90, 101],
          default: 'unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    OrganizerTrustProfile.find({
      $or: [
        { trustScore: { $lt: 60 } },
        { 'metrics.confirmedViolationsCount': { $gt: 0 } },
        { trustLevel: { $in: ['needs_improvement', 'low_trust'] } },
      ],
    })
      .populate('organizer', 'name email company organizerStatus')
      .sort({ trustScore: 1 })
      .limit(20)
      .lean(),
    OrganizerTrustSnapshot.find()
      .populate('organizer', 'name company')
      .sort({ calculatedAt: -1 })
      .limit(15)
      .lean(),
  ]);

  // Compute platform average
  const totalScoreSum = levelDistribution.reduce((sum, item) => sum + (item.avgScore * item.count), 0);
  const platformAvgTrustScore = totalProfiles > 0 ? Math.round((totalScoreSum / totalProfiles) * 10) / 10 : 0;

  // Format level breakdown
  const levelsMap = {
    excellent: 0,
    very_good: 0,
    good: 0,
    fair: 0,
    needs_improvement: 0,
    low_trust: 0,
  };
  levelDistribution.forEach((lvl) => {
    if (lvl._id && levelsMap[lvl._id] !== undefined) {
      levelsMap[lvl._id] = lvl.count;
    }
  });

  const verifiedCount = (verifiedStats.find((v) => v._id === true) || {}).count || 0;
  const verifiedPercentage = totalProfiles > 0 ? Math.round((verifiedCount / totalProfiles) * 100) : 0;

  ok(res, {
    totalProfiles,
    platformAvgTrustScore,
    verifiedCount,
    verifiedPercentage,
    distribution: levelsMap,
    scoreBandDistribution,
    flaggedOrganizers: flaggedProfiles.map((p) => ({
      _id: p._id,
      organizer: p.organizer,
      trustScore: p.trustScore,
      trustLevel: p.trustLevel,
      confidenceLevel: p.confidenceLevel,
      completionRate: p.metrics?.completionRate || 0,
      cancellationRate: p.metrics?.cancellationRate || 0,
      confirmedViolationsCount: p.metrics?.confirmedViolationsCount || 0,
      confirmedViolationsList: p.metrics?.confirmedViolationsList || [],
      lastCalculatedAt: p.lastCalculatedAt,
    })),
    recentSnapshots: recentSnapshots.map((s) => ({
      _id: s._id,
      organizer: s.organizer,
      score: s.score,
      trustLevel: s.trustLevel,
      scoreDelta: s.scoreDelta,
      trigger: s.trigger,
      changeReason: s.changeReason,
      calculatedAt: s.calculatedAt,
    })),
  });
});

module.exports = {
  getOrganizerTrust,
  getOrganizerTrustHistory,
  getEventOrganizerTrust,
  getMyTrust,
  getMyAiInsights,
  simulateTrust,
  recalculateMyTrust,
  getAdminTrustAnalytics,
};
