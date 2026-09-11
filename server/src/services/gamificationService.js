const User = require('../models/User');
const Registration = require('../models/Registration');
const Connection = require('../models/Connection');
const Certificate = require('../models/Certificate');
const { PointActivity, UserBadge } = require('../models/Gamification');
const { BADGES, POINTS } = require('../utils/badges');
const { emitToEvent, emitToUser } = require('../sockets');

async function awardPoints({ userId, eventId = null, points, reason, meta = {} }) {
  if (!points || !userId) return null;
  const activity = await PointActivity.create({ user: userId, event: eventId, points, reason, meta });
  const user = await User.findByIdAndUpdate(userId, { $inc: { points } }, { new: true });
  if (eventId) {
    emitToEvent(eventId, 'event:leaderboard-update', {
      userId: userId.toString(),
      name: user?.name,
      points: user?.points,
    });
  }
  emitToUser(userId, 'points:awarded', { points, reason, total: user?.points });
  await evaluateBadges(userId);
  return activity;
}

async function awardBadge(userId, code) {
  const def = BADGES.find((b) => b.code === code);
  if (!def) return null;
  const existing = await UserBadge.findOne({ user: userId, code });
  if (existing) return existing;
  const badge = await UserBadge.create({
    user: userId,
    code: def.code,
    name: def.name,
    icon: def.icon,
    description: def.description,
  });
  emitToUser(userId, 'badge:awarded', badge);
  return badge;
}

// Re-evaluates all badge rules for a user.
async function evaluateBadges(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const registrations = await Registration.find({
    user: userId,
    status: { $in: ['confirmed', 'checked_in'] },
  }).populate('event', 'startDate categorySlug');

  const [connections, certs, checkins, chatActivities] = await Promise.all([
    Connection.countDocuments({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    }),
    Certificate.countDocuments({ user: userId }),
    Registration.countDocuments({ user: userId, status: 'checked_in' }),
    PointActivity.countDocuments({ user: userId, reason: /live chat/i }),
  ]);

  const now = Date.now();
  const earlyBird = registrations.some(
    (r) => r.event && new Date(r.event.startDate).getTime() - now > 7 * 864e5
  );
  const joinedHackathon = registrations.some((r) => r.event?.categorySlug === 'hackathon');

  if (earlyBird) await awardBadge(userId, 'EARLY_BIRD');
  if (registrations.length >= 3) await awardBadge(userId, 'EXPLORER');
  if (checkins >= 1) await awardBadge(userId, 'CHECKED_IN');
  if (connections >= 3) await awardBadge(userId, 'TOP_NETWORKER');
  if (joinedHackathon) await awardBadge(userId, 'HACKATHON_HERO');
  if ((user.points || 0) >= 300) await awardBadge(userId, 'EVENT_CHAMPION');
  if (certs >= 1) await awardBadge(userId, 'CERTIFIED');
  if (chatActivities >= 5) await awardBadge(userId, 'SOCIAL_BUTTERFLY');
}

async function getLeaderboard(eventId) {
  if (eventId) {
    const regs = await Registration.find({
      event: eventId,
      status: { $in: ['confirmed', 'checked_in'] },
    }).populate('user', 'name avatar title points');
    return regs
      .map((r, i) => ({
        userId: r.user?._id,
        name: r.user?.name || 'Attendee',
        avatar: r.user?.avatar,
        title: r.user?.title,
        points: r.user?.points || 0,
        checkedIn: r.status === 'checked_in',
        rank: i + 1,
      }))
      .sort((a, b) => b.points - a.points)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
  const users = await User.find({ points: { $gt: 0 } })
    .sort({ points: -1 })
    .limit(20)
    .select('name avatar title points');
  return users.map((u, i) => ({
    userId: u._id,
    name: u.name,
    avatar: u.avatar,
    title: u.title,
    points: u.points,
    rank: i + 1,
  }));
}

async function getGamificationProfile(userId) {
  const [activities, badges] = await Promise.all([
    PointActivity.find({ user: userId }).sort({ createdAt: -1 }).limit(50).populate('event', 'title slug'),
    UserBadge.find({ user: userId }).sort({ createdAt: 1 }),
  ]);
  return { activities, badges, catalogue: BADGES, points: POINTS };
}

module.exports = { awardPoints, awardBadge, evaluateBadges, getLeaderboard, getGamificationProfile, POINTS };
