const User = require('../models/User');
const Connection = require('../models/Connection');
const Registration = require('../models/Registration');

const GOAL_LABELS = {
  'co-founder': 'a co-founder',
  job: 'job opportunities',
  internship: 'internships',
  collaboration: 'collaborators',
  mentorship: 'mentorship',
  friends: 'like-minded friends',
};

/**
 * "People you should meet" — compatibility based on shared interests,
 * skills, goals, location and co-attendance of events.
 */
async function getSuggestions(user, { limit = 12 } = {}) {
  const [people, connections, myRegs] = await Promise.all([
    User.find({
      _id: { $ne: user._id },
      isActive: true,
      networkingOpen: true,
    })
      .limit(200)
      .lean(),
    Connection.find({
      $or: [{ requester: user._id }, { recipient: user._id }],
    }).lean(),
    Registration.find({ user: user._id }).distinct('event'),
  ]);

  const linked = new Map();
  connections.forEach((c) => {
    const other = [c.requester, c.recipient].find((id) => id.toString() !== user._id.toString());
    linked.set(other.toString(), c.status);
  });

  const coAttendEvents = await Registration.aggregate([
    { $match: { event: { $in: myRegs }, user: { $ne: user._id } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const coAttendMap = new Map(coAttendEvents.map((r) => [r._id.toString(), r.count]));

  const myInterests = (user.interests || []).map((s) => s.toLowerCase());
  const mySkills = (user.skills || []).map((s) => s.toLowerCase());

  const suggestions = people
    .filter((p) => !linked.has(p._id.toString()))
    .map((p) => {
      let score = 40; // everyone starts at a visible baseline
      const reasons = [];
      const pInterests = (p.interests || []).map((s) => s.toLowerCase());
      const pSkills = (p.skills || []).map((s) => s.toLowerCase());

      const sharedInterests = pInterests.filter((i) => myInterests.includes(i));
      const sharedSkills = pSkills.filter((s) => mySkills.includes(s));

      score += Math.min(30, sharedInterests.length * 12);
      score += Math.min(20, sharedSkills.length * 8);

      if (sharedInterests.length) reasons.push(`Both interested in ${sharedInterests.slice(0, 3).join(', ')}`);
      if (sharedSkills.length) reasons.push(`Shared skills: ${sharedSkills.slice(0, 3).join(', ')}`);

      if (p.networkingGoal && user.networkingGoal) {
        if (p.networkingGoal === user.networkingGoal) {
          score += 8;
          reasons.push(`Both looking for ${GOAL_LABELS[p.networkingGoal] || p.networkingGoal}`);
        } else {
          score += 4;
        }
      }
      if (p.location && user.location && p.location === user.location) {
        score += 6;
        reasons.push(`Based in ${p.location}`);
      }
      const co = coAttendMap.get(p._id.toString()) || 0;
      if (co) {
        score += Math.min(12, co * 6);
        reasons.push(`Attending ${co} of the same events`);
      }
      if (!reasons.length) reasons.push('Active in the EventSphere community');

      return {
        _id: p._id,
        name: p.name,
        avatar: p.avatar,
        title: p.title,
        company: p.company,
        bio: p.bio,
        location: p.location,
        interests: p.interests,
        skills: p.skills,
        networkingGoal: p.networkingGoal,
        score: Math.min(99, Math.round(score)),
        reasons: reasons.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return suggestions;
}

async function getConnections(userId) {
  const conns = await Connection.find({
    $or: [
      { requester: userId, status: { $in: ['pending', 'accepted'] } },
      { recipient: userId, status: { $in: ['pending', 'accepted'] } },
    ],
  })
    .populate('requester', 'name avatar title company interests skills networkingGoal bio location')
    .populate('recipient', 'name avatar title company interests skills networkingGoal bio location')
    .sort({ createdAt: -1 });

  return conns.map((c) => {
    const isRequester = c.requester._id.toString() === userId.toString();
    const other = isRequester ? c.recipient : c.requester;
    return {
      _id: c._id,
      user: other,
      status: c.status,
      direction: isRequester ? 'outgoing' : 'incoming',
      matchedScore: c.matchedScore,
      matchedReason: c.matchedReason,
      createdAt: c.createdAt,
    };
  });
}

module.exports = { getSuggestions, getConnections, GOAL_LABELS };
