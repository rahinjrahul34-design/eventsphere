const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const Event = require('../models/Event');
const {
  getRecommendedEvents,
  getRecommendationFeed,
  getSimilarEvents,
  getTrendingEvents,
  getNearbyEvents,
  getExplorationRecommendation,
  generateExplanation,
  recordInteraction,
  getRecommendationAnalytics,
  buildUserProfile,
} = require('../services/recommendationService');
const { scoreEvent } = require('../services/recommendation/scoringEngine');

/**
 * GET /api/recommendations
 * Primary list of recommended events for current user.
 */
const getRecommendedList = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || '8', 10);
  const isDebug = req.query.debug === 'true' && (req.user?.role === 'admin' || process.env.NODE_ENV !== 'production');

  const result = await getRecommendedEvents(req.user || null, { limit, debug: isDebug });
  ok(res, result);
});

/**
 * GET /api/recommendations/feed
 * Multi-section personalized discovery feed for the home page.
 */
const getFeed = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || '6', 10);
  const isDebug = req.query.debug === 'true' && (req.user?.role === 'admin' || process.env.NODE_ENV !== 'production');

  const feed = await getRecommendationFeed(req.user || null, { limit, debug: isDebug });
  ok(res, feed);
});

/**
 * GET /api/recommendations/similar/:eventId
 * Detailed similar events for an event detail page.
 */
const getSimilar = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).lean();
  if (!event) throw ApiError.notFound('Event not found');

  const limit = parseInt(req.query.limit || '4', 10);
  const similar = await getSimilarEvents(event, { limit });
  ok(res, similar);
});

/**
 * GET /api/recommendations/trending
 * Personalized trending events matching user domain.
 */
const getTrending = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || '6', 10);
  const trending = await getTrendingEvents(req.user || null, { limit });
  ok(res, trending);
});

/**
 * GET /api/recommendations/nearby
 * Location and online events.
 */
const getNearby = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || '6', 10);
  const nearby = await getNearbyEvents(req.user || null, { limit });
  ok(res, nearby);
});

/**
 * GET /api/recommendations/explore
 * Serendipity / exploration recommendation from adjacent domain.
 */
const getExplore = asyncHandler(async (req, res) => {
  const explore = await getExplorationRecommendation(req.user || null);
  ok(res, explore);
});

/**
 * GET /api/recommendations/explanation/:eventId and /api/recommendations/:eventId/explanation
 * Detailed "Why this event?" breakdown with AI narrative and verified evidence.
 */
const getExplanation = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.params.id;
  const event = await Event.findById(eventId)
    .populate('category', 'name slug')
    .lean();

  if (!event) throw ApiError.notFound('Event not found');

  const userProfile = await buildUserProfile(req.user || null);
  const scored = scoreEvent(event, userProfile, { isDebug: true });
  const explanation = await generateExplanation(scored, userProfile);

  ok(res, {
    eventId: event._id,
    title: event.title,
    matchPercentage: scored.matchPercentage,
    confidence: scored.confidence,
    reasons: scored.reasons,
    aiExplanation: explanation.narrative,
    narrative: explanation.narrative,
    engine: explanation.engine,
    evidence: explanation.evidence,
  });
});

/**
 * POST /api/recommendations/interaction
 * Logs user clicks, views, and dismissals.
 */
const trackInteraction = asyncHandler(async (req, res) => {
  const { eventId, interactionType, recommendationSource, meta } = req.body;
  if (!eventId || !interactionType) {
    throw ApiError.badRequest('eventId and interactionType are required');
  }

  const record = await recordInteraction({
    userId: req.user?._id,
    eventId,
    interactionType,
    recommendationSource,
    meta,
  });

  created(res, { recorded: !!record });
});

/**
 * POST /api/recommendations/feedback and POST /api/recommendations/:eventId/feedback
 * Records user feedback (thumbs up / down) and reason.
 */
const submitFeedback = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  const feedbackType = req.body.feedbackType || req.body.feedback;
  const feedbackReason = req.body.feedbackReason || req.body.reason;
  const recommendationSource = req.body.recommendationSource;

  if (!eventId || !feedbackType) {
    throw ApiError.badRequest('eventId and feedbackType are required');
  }

  await recordInteraction({
    userId: req.user?._id,
    eventId,
    interactionType: 'feedback',
    feedbackType,
    feedbackReason,
    recommendationSource,
  });

  ok(res, { success: true, message: 'Feedback recorded to improve your recommendations.' });
});

/**
 * GET /api/recommendations/analytics
 * Oversight analytics for admin dashboard.
 */
const getAnalytics = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    throw ApiError.forbidden('Admin access required');
  }

  const analytics = await getRecommendationAnalytics();
  ok(res, analytics);
});

module.exports = {
  getRecommendedList,
  getFeed,
  getSimilar,
  getTrending,
  getNearby,
  getExplore,
  getExplanation,
  trackInteraction,
  submitFeedback,
  getAnalytics,
};
