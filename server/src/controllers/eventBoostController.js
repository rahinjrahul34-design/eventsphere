const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const Event = require('../models/Event');
const {
  getOrCreateProfile,
  analyzeEvent,
  optimizeEvent,
  applyOptimizations,
  querySeoCopilot,
} = require('../services/eventboost/eventBoostEngine');

/**
 * Validates that current user is the event organizer or an admin.
 */
async function assertOrganizerOrAdmin(eventId, user) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const isOwner = event.organizer.toString() === (user._id || user.id).toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only manage SEO for your own events');
  }
  return event;
}

// GET /api/events/:id/seo
const getSEO = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const profile = await getOrCreateProfile(req.params.id);
  ok(res, profile);
});

// POST /api/events/:id/seo/analyze
const analyze = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const { primaryKeyword, secondaryKeywords } = req.body;
  const updated = await analyzeEvent(req.params.id, { primaryKeyword, secondaryKeywords });
  ok(res, updated);
});

// POST /api/events/:id/seo/optimize
const optimize = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const { primaryKeyword } = req.body;
  const suggestions = await optimizeEvent(req.params.id, { primaryKeyword });
  ok(res, suggestions);
});

// POST /api/events/:id/seo/apply
const apply = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const result = await applyOptimizations(req.params.id, req.body, req.user._id);
  ok(res, result);
});

// POST /api/events/:id/seo/copilot
const copilot = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const { question } = req.body;
  if (!question || !question.trim()) {
    throw ApiError.badRequest('Question is required');
  }
  const answer = await querySeoCopilot(req.params.id, question.trim());
  ok(res, answer);
});

// GET /api/events/:id/seo/history
const getHistory = asyncHandler(async (req, res) => {
  await assertOrganizerOrAdmin(req.params.id, req.user);
  const profile = await getOrCreateProfile(req.params.id);
  ok(res, profile.history || []);
});

module.exports = {
  getSEO,
  analyze,
  optimize,
  apply,
  copilot,
  getHistory,
};
