/**
 * EventPulse AI Controller
 * HTTP handlers for predictions, recalculations, timeline history, post-event accuracy,
 * live signals, simulation mode, and natural language Q&A.
 */

const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const Event = require('../models/Event');
const { getOrComputePrediction, getPredictionHistory } = require('../services/eventpulse/eventPulseEngine');
const { extractEventFeatures } = require('../services/eventpulse/featureExtractor');
const { simulateScenario } = require('../services/eventpulse/simulationService');
const { answerNaturalLanguageQuery } = require('../services/eventpulse/aiNarrativeService');
const { getAccuracySummary, getPlatformAccuracy } = require('../services/eventpulse/accuracyService');

/**
 * Authorization helper: ensure user is event organizer, co-organizer, or admin
 */
async function authorizeEventAccess(eventId, user) {
  const event = await Event.findById(eventId).lean();
  if (!event) throw ApiError.notFound('Event not found');

  if (user.role === 'admin') return event;

  const isOwner = event.organizer && event.organizer.toString() === user._id.toString();
  const isCoOrg = (event.coOrganizers || []).some((co) => co.toString() === user._id.toString());

  if (!isOwner && !isCoOrg) {
    throw ApiError.forbidden('You are not authorized to view predictive intelligence for this event.');
  }

  return event;
}

// GET /api/events/:id/eventpulse
const getPrediction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const prediction = await getOrComputePrediction(id, false);
  if (!prediction) throw ApiError.notFound('Unable to compute predictions for this event');

  ok(res, prediction);
});

// POST /api/events/:id/eventpulse/analyze
const recalculate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const prediction = await getOrComputePrediction(id, true);
  if (!prediction) throw ApiError.notFound('Event not found for recalculation');

  ok(res, prediction);
});

// GET /api/events/:id/eventpulse/history
const getHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const history = await getPredictionHistory(id);
  ok(res, history);
});

// GET /api/events/:id/eventpulse/accuracy
const getAccuracy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const accuracy = await getAccuracySummary(id);
  ok(res, accuracy || { evaluated: false, message: 'Event is not yet completed or evaluated.' });
});

// GET /api/events/:id/eventpulse/live
const getLiveEngagement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const prediction = await getOrComputePrediction(id, false);
  const features = await extractEventFeatures(id);

  ok(res, {
    isLive: features.event.isLive,
    currentCheckedIns: features.registrations.currentCheckedIns,
    totalConfirmed: features.registrations.totalConfirmed,
    expectedAttendees: prediction.attendance.expectedAttendees,
    engagementScore: prediction.engagement.score,
    engagementLevel: prediction.engagement.level,
    engagementTrend: prediction.engagement.trend,
    breakdown: prediction.engagement.breakdown,
    signals: {
      pollVotes: features.engagement.pollVotes,
      questions: features.engagement.questionsCount,
      messages: features.engagement.chatMessages,
    },
  });
});

// POST /api/events/:id/eventpulse/simulate
const simulate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const baseFeatures = await extractEventFeatures(id);
  if (!baseFeatures) throw ApiError.notFound('Event not found');

  const simulatedResult = simulateScenario(baseFeatures, req.body || {});
  ok(res, simulatedResult);
});

// POST /api/events/:id/eventpulse/query
const queryInsight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await authorizeEventAccess(id, req.user);

  const { question } = req.body;
  if (!question || question.trim().length < 3) {
    throw ApiError.badRequest('Please provide a valid question.');
  }

  const prediction = await getOrComputePrediction(id, false);
  const features = await extractEventFeatures(id);

  const response = await answerNaturalLanguageQuery(question, prediction, features);
  ok(res, response);
});

// GET /api/events/eventpulse/admin/accuracy
const getAdminAccuracy = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw ApiError.forbidden('Admin authorization required.');
  }

  const platformStats = await getPlatformAccuracy();
  ok(res, platformStats);
});

module.exports = {
  getPrediction,
  recalculate,
  getHistory,
  getAccuracy,
  getLiveEngagement,
  simulate,
  queryInsight,
  getAdminAccuracy,
};
