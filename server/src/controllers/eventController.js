const mongoose = require('mongoose');
const Event = require('../models/Event');
const Category = require('../models/Category');
const Favorite = require('../models/Favorite');
const Report = require('../models/Report');
const Registration = require('../models/Registration');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { asyncHandler, ok, created } = require('../utils/response');
const { slugify } = require('../utils/codes');
const { getRecommendedEvents, getSimilarEvents } = require('../services/recommendationService');
const { scheduleEventPulseRecalc } = require('../services/eventpulse/recalcScheduler');

const eventCardFields = '_id title slug shortDescription coverImage categorySlug tags eventType startDate endDate venue capacity registrationCount checkedInCount price ticketTypes organizer featured status approvalStatus';

function buildRiskFlags(body, isNew) {
  const flags = [];
  if ((body.capacity || 0) > 500) flags.push('Large capacity (>500) — crowd control plan required');
  if ((body.price || 0) > 2000 || (body.ticketTypes || []).some((t) => t.price > 2000)) flags.push('High-value tickets — verify payout details');
  if (body.eventType !== 'online' && !(body.venue?.address || '').trim()) flags.push('Missing venue address');
  if (new Date(body.startDate) < new Date(Date.now() + 3 * 864e5)) flags.push('Event starts within 72 hours');
  if (isNew && !(body.description || '').length) flags.push('No description provided');
  return flags;
}

async function uniqueSlug(title, exceptId = null) {
  const base = slugify(title).slice(0, 70) || 'event';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Event.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

const publicEventQuery = {
  status: { $in: ['published', 'live', 'completed'] },
  approvalStatus: 'approved',
  visibility: 'public',
};

// GET /api/events — public discovery with search/filter/sort/pagination
const listEvents = asyncHandler(async (req, res) => {
  const q = req.query;
  const page = Math.max(1, parseInt(q.page || '1', 10));
  const limit = Math.min(60, parseInt(q.limit || '9', 10));
  const query = { ...publicEventQuery };

  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    query.$or = [
      { title: rx },
      { shortDescription: rx },
      { tags: rx },
      { 'venue.city': rx },
    ];
  }
  if (q.featured === 'true') query.featured = true;
  if (q.category && q.category !== 'all') query.categorySlug = q.category;
  if (q.type && ['offline', 'online', 'hybrid'].includes(q.type)) query.eventType = q.type;
  if (q.city) query['venue.city'] = new RegExp(escapeRegex(q.city), 'i');
  if (q.price === 'free') query.price = 0;
  if (q.price === 'paid') query.price = { $gt: 0 };
  if (q.tags) q.tags.split(',').forEach((t) => t && (query.tags = new RegExp(escapeRegex(t.trim()), 'i')));

  const now = new Date();
  if (q.date === 'upcoming') query.startDate = { $gte: now };
  if (q.date === 'past') query.startDate = { $lt: now };
  if (q.date === 'today') {
    const eod = new Date(now); eod.setHours(23, 59, 59, 999);
    query.startDate = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lte: eod };
  }
  if (q.date === 'week') {
    const eow = new Date(now); eow.setDate(eow.getDate() + 7);
    query.startDate = { $gte: new Date(), $lte: eow };
  }
  if (q.start) query.startDate = { ...(query.startDate || {}), $gte: new Date(q.start) };
  if (q.end) query.startDate = { ...(query.startDate || {}), $lte: new Date(q.end) };

  let sort = { startDate: 1 };
  if (q.sort === 'popular') sort = { registrationCount: -1 };
  if (q.sort === 'newest') sort = { createdAt: -1 };
  if (q.sort === 'date') sort = { startDate: 1 };
  if (q.sort === 'price-low') sort = { price: 1 };
  if (q.sort === 'price-high') sort = { price: -1 };
  if (q.sort === 'rating') sort = { popularityScore: -1 };

  const [docs, total] = await Promise.all([
    Event.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer', 'name company avatar')
      .populate('category', 'name slug color icon')
      .select(eventCardFields),
    Event.countDocuments(query),
  ]);

  let events = docs;
  if (req.user) {
    const favs = await Favorite.find({ user: req.user._id, event: { $in: docs.map((d) => d._id) } });
    const favSet = new Set(favs.map((f) => f.event.toString()));
    events = docs.map((d) => d.toObject({ virtuals: true }));
    events.forEach((e) => { e.isFavorite = favSet.has(e._id.toString()); });
  }

  ok(res, {
    events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/events/mine — organizer's own events (all statuses)
const myEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('category', 'name slug color');
  ok(res, events);
});

// GET /api/events/recommended
const recommended = asyncHandler(async (req, res) => {
  const result = await getRecommendedEvents(req.user || null, { limit: parseInt(req.query.limit || '8', 10) });
  ok(res, result);
});

// GET /api/events/:slug
const getEventBySlug = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug })
    .populate('organizer', 'name company avatar bio title website')
    .populate('category', 'name slug color icon')
    .populate('coOrganizers', 'name avatar title company');
  if (!event) throw ApiError.notFound('Event not found');

  if (publicEventQuery.status.$in.includes(event.status) || req.user?.role === 'admin' ||
      event.organizer._id?.toString() === req.userId?.toString()) {
    event.views += 1;
    await event.save({ validateBeforeSave: false });
  } else {
    throw ApiError.notFound('Event not found');
  }

  const out = event.toObject({ virtuals: true });
  if (req.user) {
    const fav = await Favorite.findOne({ user: req.user._id, event: event._id });
    out.isFavorite = !!fav;
    const reg = await Registration.findOne({ event: event._id, user: req.user._id });
    out.myRegistration = reg;
  }
  ok(res, out);
});

// GET /api/events/:id/similar
const similarEvents = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const events = await getSimilarEvents(event);
  ok(res, events);
});

// POST /api/events
const createEvent = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.title || !body.startDate || !body.endDate) {
    throw ApiError.badRequest('Title, start date and end date are required');
  }
  if (new Date(body.endDate) < new Date(body.startDate)) {
    throw ApiError.badRequest('End date cannot be before start date');
  }

  const approvedOrganizer =
    req.user.role === 'admin' ||
    req.user.organizerStatus === 'approved' ||
    config.demoMode ||
    req.user.role === 'organizer';

  const slug = await uniqueSlug(body.title);
  let categorySlug = body.categorySlug || '';
  if (body.category) {
    try {
      const cat = await Category.findById(body.category);
      categorySlug = cat?.slug || categorySlug;
    } catch {
      // ignore invalid ObjectId
    }
  }

  let eventType = body.eventType || 'offline';
  if (eventType === 'in-person') eventType = 'offline';
  if (eventType === 'virtual') eventType = 'online';

  const ticketTypes = (body.ticketTypes || []).filter((t) => t && t.name && t.name.trim());
  const customRegistrationFields = (body.customRegistrationFields || [])
    .filter((f) => f && f.label && f.label.trim())
    .map((f) => ({
      label: f.label.trim(),
      type: f.type || f.fieldType || 'text',
      options: Array.isArray(f.options) ? f.options : [],
      required: !!f.required,
      placeholder: f.placeholder || '',
    }));

  const event = await Event.create({
    ...body,
    eventType,
    ticketTypes,
    customRegistrationFields,
    slug,
    categorySlug,
    organizer: req.user._id,
    approvalStatus: approvedOrganizer ? 'approved' : 'pending',
    status: body.status || 'published',
    riskFlags: buildRiskFlags(body, true),
    venue: body.venue || {},
  });

  created(res, event);
});

// PUT /api/events/:id
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only edit your own events');
  }
  const allowed = [
    'title', 'shortDescription', 'description', 'coverImage', 'images', 'category', 'categorySlug',
    'tags', 'eventType', 'startDate', 'endDate', 'timezone', 'registrationDeadline', 'venue',
    'capacity', 'price', 'ticketTypes', 'customRegistrationFields', 'faq', 'visibility',
    'featured', 'settings', 'status', 'metaTitle', 'metaDescription', 'primaryKeyword',
  ];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) event[f] = req.body[f];
  });
  if (req.body.title) event.slug = await uniqueSlug(req.body.title, event._id);
  event.riskFlags = buildRiskFlags({ ...event.toObject(), ...req.body }, false);
  await event.save();
  ok(res, event);
});

// PATCH /api/events/:id/status
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  if (!['draft', 'published', 'live', 'completed', 'cancelled'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  if (status === 'published' && event.approvalStatus !== 'approved') {
    event.status = 'published'; // stays hidden publicly until approved
  } else {
    event.status = status;
  }
  await event.save();

  const { emitToEvent } = require('../sockets');
  emitToEvent(event._id.toString(), 'event:status', { eventId: event._id, status });

  // EventPulse AI: lifecycle transitions (published/live/completed) → recalculation
  if (['published', 'live', 'completed'].includes(status)) {
    scheduleEventPulseRecalc(event._id, 'status_change');
  }

  // SmartQueue AI: on cancellation/completion, atomically release all active
  // seat holds, notify affected users and stop future promotions (FEATURE 34/35)
  if (['cancelled', 'completed'].includes(status)) {
    try {
      const smartQueue = require('../services/smartqueue');
      await smartQueue.holdService.cancelAllActiveHolds({
        eventId: event._id,
        reason: status === 'cancelled' ? 'event_cancelled' : 'event_completed',
        actor: req.userId.toString(),
      });
    } catch (sqErr) {
      console.error('SmartQueue hold cleanup error on status change:', sqErr.message);
    }
  }

  // Asynchronously update organizer's TrustSphere profile when event is completed or cancelled
  if (['completed', 'cancelled'].includes(status) && event.organizer) {
    try {
      const { calculateAndSaveTrustProfile } = require('../services/trustsphere/trustProfileService');
      calculateAndSaveTrustProfile(
        event.organizer,
        status === 'completed' ? 'EVENT_COMPLETED' : 'EVENT_CANCELLED',
        `Event "${event.title}" marked as ${status}`
      ).catch((err) => console.error('[TrustSphere] Async recalculation error:', err.message));
    } catch (err) {
      // Non-blocking
    }
  }

  ok(res, event);
});

// DELETE /api/events/:id
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  await event.deleteOne();
  ok(res, { deleted: true });
});

// Favorites
const toggleFavorite = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const existing = await Favorite.findOne({ user: req.user._id, event: event._id });
  if (existing) {
    await existing.deleteOne();
    return ok(res, { favorite: false });
  }
  await Favorite.create({ user: req.user._id, event: event._id });
  created(res, { favorite: true });
});

const listFavorites = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate({
    path: 'event',
    match: publicEventQuery,
    populate: [
      { path: 'organizer', select: 'name company avatar' },
      { path: 'category', select: 'name slug color' },
    ],
  });
  ok(res, favs.map((f) => f.event).filter(Boolean));
});

// POST /api/events/:id/report
const reportEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const { reason, details = '' } = req.body;
  const report = await Report.create({
    reporter: req.user._id,
    targetType: 'event',
    target: event._id,
    reason,
    details,
  });
  created(res, report);
});

// GET /api/events/:id/registrations/export (CSV)
const exportRegistrations = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') throw ApiError.forbidden();

  const regs = await Registration.find({ event: event._id })
    .populate('user', 'name email phone')
    .sort({ createdAt: 1 });
  const header = ['Ticket Code (see tickets)', 'Name', 'Email', 'Phone', 'Ticket', 'Amount', 'Status', 'Registered At', 'Checked In At'];
  const rows = regs.map((r) => [
    r.user?.name || '', r.user?.email || '', r.user?.phone || '',
    r.ticketType?.name || '', r.amountPaid || 0, r.status,
    r.createdAt?.toISOString(), r.checkedInAt?.toISOString() || '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-registrations.csv"`);
  res.send(csv);
});
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/events/calendar — registered + saved events for the calendar page
const calendarEvents = asyncHandler(async (req, res) => {
  const regs = await Registration.find({
    user: req.user._id,
    status: { $in: ['confirmed', 'checked_in', 'waitlisted'] },
  }).populate('event').lean();
  const favs = await Favorite.find({ user: req.user._id }).populate('event').lean();
  const registered = regs.filter((r) => r.event).map((r) => ({ ...r.event, relation: 'registered' }));
  const saved = favs
    .filter((f) => f.event && !registered.some((e) => e._id.toString() === f.event._id.toString()))
    .map((f) => ({ ...f.event, relation: 'saved' }));
  ok(res, { registered, saved });
});

// GET /api/events/:id/ical — downloadable iCal
const ical = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventSphere//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event._id}@eventsphere`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(event.startDate)}`,
    `DTEND:${fmt(event.endDate || event.startDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.shortDescription || '').replace(/\n/g, ' ')}`,
    `LOCATION:${[event.venue?.name, event.venue?.address, event.venue?.city].filter(Boolean).join(', ')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${event.slug}.ics"`);
  res.send(ics);
});

module.exports = {
  listEvents, myEvents, recommended, getEventBySlug, similarEvents,
  createEvent, updateEvent, setStatus, deleteEvent,
  toggleFavorite, listFavorites, reportEvent, exportRegistrations, calendarEvents, ical,
  publicEventQuery,
};
