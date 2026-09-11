const Event = require('../models/Event');
const User = require('../models/User');
const Category = require('../models/Category');
const Speaker = require('../models/Speaker');
const { asyncHandler, ok } = require('../utils/response');

// GET /api/search?q= — grouped global search (Ctrl/⌘ + K)
const globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, { events: [], people: [], organizers: [], categories: [], speakers: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const eventMatch = {
    approvalStatus: 'approved',
    status: { $in: ['published', 'live'] },
    $or: [{ title: rx }, { shortDescription: rx }, { tags: rx }, { 'venue.city': rx }],
  };
  const [events, people, organizers, categories, speakers] = await Promise.all([
    Event.find(eventMatch).limit(6)
      .populate('organizer', 'name company')
      .populate('category', 'name slug color')
      .select('title slug shortDescription coverImage startDate venue categorySlug eventType price'),
    User.find({ isActive: true, $or: [{ name: rx }, { title: rx }, { company: rx }, { skills: rx }] })
      .limit(5).select('name avatar title company skills role'),
    User.find({ role: 'organizer', isActive: true, $or: [{ name: rx }, { company: rx }] })
      .limit(4).select('name avatar company bio title'),
    Category.find({ isActive: true, $or: [{ name: rx }, { description: rx }] }).limit(5),
    Speaker.find({ $or: [{ name: rx }, { company: rx }, { skills: rx }, { title: rx }] }).limit(5),
  ]);
  ok(res, { events, people, organizers, categories, speakers });
});

module.exports = { globalSearch };
