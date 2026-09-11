const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const ai = require('../services/aiService');
const { getRecommendedEvents } = require('../services/recommendationService');
const config = require('../config');

// POST /api/ai/plan — full event plan from a brief
const plan = asyncHandler(async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.length < 10) throw ApiError.badRequest('Describe your event in at least 10 characters');
  const result = await ai.generatePlan(brief);
  result.provider = config.gemini.apiKey ? 'gemini+demo-fallback' : 'demo-engine';
  ok(res, result);
});

// POST /api/ai/generate — single-asset generators
const generate = asyncHandler(async (req, res) => {
  const { kind, payload = {} } = req.body;
  const allowed = ['description', 'schedule', 'form', 'announcement', 'checklist', 'improve'];
  if (!allowed.includes(kind)) throw ApiError.badRequest(`Unknown generator: ${kind}`);
  const data = await ai.generate(kind, payload);
  ok(res, { kind, engine: config.gemini.apiKey ? 'gemini' : 'demo', data });
});

// GET /api/ai/insights/:eventId — post-event analytics narrative
const insights = asyncHandler(async (req, res) => {
  const report = await ai.postEventInsights(req.params.eventId);
  if (!report) throw ApiError.notFound('Event not found');
  ok(res, report);
});

// GET /api/ai/recommendations — "For You"
const recommendations = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized('Log in for personalized recommendations');
  const result = await getRecommendedEvents(req.user, { limit: parseInt(req.query.limit || '8', 10) });
  ok(res, result);
});

module.exports = { plan, generate, insights, recommendations };
