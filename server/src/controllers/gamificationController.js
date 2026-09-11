const { asyncHandler, ok } = require('../utils/response');
const gamification = require('../services/gamificationService');
const User = require('../models/User');

const myProfile = asyncHandler(async (req, res) => {
  const profile = await gamification.getGamificationProfile(req.user._id);
  ok(res, { ...profile, points: req.user.points });
});

const leaderboard = asyncHandler(async (req, res) => {
  const rows = await gamification.getLeaderboard(req.query.eventId || null);
  ok(res, rows);
});

const attendeeOfEvent = asyncHandler(async (req, res) => {
  const rows = await gamification.getLeaderboard(req.params.id);
  ok(res, rows);
});

module.exports = { myProfile, leaderboard, attendeeOfEvent };
