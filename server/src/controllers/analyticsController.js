const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const { eventAnalytics } = require('../services/analyticsService');

const eventStats = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  const days = parseInt(req.query.days || '30', 10);
  const data = await eventAnalytics(event._id, days);
  ok(res, data);
});

module.exports = { eventStats };
