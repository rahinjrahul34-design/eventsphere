const Event = require('../models/Event');
const Speaker = require('../models/Speaker');
const Session = require('../models/Session');
const Volunteer = require('../models/Volunteer');
const Sponsor = require('../models/Sponsor');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { emitToEvent } = require('../sockets');

async function loadOwnedEvent(eventId, user) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
    throw ApiError.forbidden('You do not manage this event');
  }
  return event;
}

/* ───────── Speakers ───────── */
const listSpeakers = asyncHandler(async (req, res) => {
  const filter = req.params.eventId ? { event: req.params.eventId } : {};
  const speakers = await Speaker.find(filter).sort({ featured: -1, createdAt: 1 });
  ok(res, speakers);
});
const createSpeaker = asyncHandler(async (req, res) => {
  await loadOwnedEvent(req.params.eventId || req.body.event, req.user);
  const speaker = await Speaker.create({ ...req.body, event: req.params.eventId || req.body.event });
  created(res, speaker);
});
const updateSpeaker = asyncHandler(async (req, res) => {
  const speaker = await Speaker.findById(req.params.id);
  if (!speaker) throw ApiError.notFound('Speaker not found');
  if (speaker.event) await loadOwnedEvent(speaker.event, req.user);
  Object.assign(speaker, req.body);
  await speaker.save();
  ok(res, speaker);
});
const deleteSpeaker = asyncHandler(async (req, res) => {
  const speaker = await Speaker.findById(req.params.id);
  if (!speaker) throw ApiError.notFound('Speaker not found');
  if (speaker.event) await loadOwnedEvent(speaker.event, req.user);
  await speaker.deleteOne();
  ok(res, { deleted: true });
});

/* ───────── Sessions / schedule ───────── */
const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ event: req.params.eventId })
    .sort({ startTime: 1, order: 1 })
    .populate('speaker', 'name title company photo bio');
  ok(res, sessions);
});
const createSession = asyncHandler(async (req, res) => {
  const event = await loadOwnedEvent(req.params.eventId, req.user);
  const session = await Session.create({ ...req.body, event: event._id });
  emitToEvent(event._id.toString(), 'event:schedule-update', { session });
  created(res, session);
});
const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) throw ApiError.notFound('Session not found');
  await loadOwnedEvent(session.event, req.user);
  Object.assign(session, req.body);
  await session.save();
  emitToEvent(session.event.toString(), 'event:schedule-update', { session });
  ok(res, session);
});
const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) throw ApiError.notFound('Session not found');
  await loadOwnedEvent(session.event, req.user);
  await session.deleteOne();
  emitToEvent(session.event.toString(), 'event:schedule-update', { removed: req.params.id });
  ok(res, { deleted: true });
});

/* ───────── Volunteers ───────── */
const listVolunteers = asyncHandler(async (req, res) => {
  const volunteers = await Volunteer.find({ event: req.params.eventId })
    .sort({ startTime: 1 })
    .populate('user', 'name email phone avatar');
  ok(res, volunteers);
});
const createVolunteer = asyncHandler(async (req, res) => {
  const event = await loadOwnedEvent(req.params.eventId, req.user);
  let volunteer;
  if (req.body.userId) {
    const user = await User.findById(req.body.userId);
    if (!user) throw ApiError.notFound('User not found');
    volunteer = await Volunteer.create({
      event: event._id,
      user: user._id,
      name: user.name,
      email: user.email,
      role: req.body.role,
      task: req.body.task,
      zone: req.body.zone,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    });
    if (user.role === 'attendee') {
      user.role = 'volunteer';
      await user.save();
    }
  } else {
    volunteer = await Volunteer.create({ ...req.body, event: event._id });
  }
  created(res, volunteer);
});
const updateVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) throw ApiError.notFound('Volunteer assignment not found');
  await loadOwnedEvent(volunteer.event, req.user);
  Object.assign(volunteer, req.body);
  await volunteer.save();
  ok(res, volunteer);
});
const deleteVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) throw ApiError.notFound();
  await loadOwnedEvent(volunteer.event, req.user);
  await volunteer.deleteOne();
  ok(res, { deleted: true });
});

// Volunteer's own assignments
const myAssignments = asyncHandler(async (req, res) => {
  const assignments = await Volunteer.find({
    $or: [{ user: req.user._id }, { email: req.user.email }],
  }).populate({
    path: 'event',
    select: 'title slug startDate venue coverImage organizer',
    populate: { path: 'organizer', select: 'name company phone' },
  });
  ok(res, assignments);
});

/* ───────── Sponsors ───────── */
const listSponsors = asyncHandler(async (req, res) => {
  const filter = req.params.eventId
    ? { event: req.params.eventId }
    : req.query.platform
      ? { event: null }
      : {};
  const sponsors = await Sponsor.find(filter).sort({ amount: -1 });
  ok(res, sponsors);
});
const createSponsor = asyncHandler(async (req, res) => {
  if (!req.params.eventId && req.user.role !== 'admin') throw ApiError.forbidden();
  if (req.params.eventId) await loadOwnedEvent(req.params.eventId, req.user);
  const sponsor = await Sponsor.create({
    ...req.body,
    event: req.params.eventId || null,
  });
  created(res, sponsor);
});
const updateSponsor = asyncHandler(async (req, res) => {
  const sponsor = await Sponsor.findById(req.params.id);
  if (!sponsor) throw ApiError.notFound('Sponsor not found');
  if (sponsor.event) await loadOwnedEvent(sponsor.event, req.user);
  else if (req.user.role !== 'admin') throw ApiError.forbidden();
  Object.assign(sponsor, req.body);
  await sponsor.save();
  ok(res, sponsor);
});
const deleteSponsor = asyncHandler(async (req, res) => {
  const sponsor = await Sponsor.findById(req.params.id);
  if (!sponsor) throw ApiError.notFound();
  if (sponsor.event) await loadOwnedEvent(sponsor.event, req.user);
  else if (req.user.role !== 'admin') throw ApiError.forbidden();
  await sponsor.deleteOne();
  ok(res, { deleted: true });
});

// Speaker's own sessions
const mySpeakingSessions = asyncHandler(async (req, res) => {
  const speaker = await Speaker.findOne({ user: req.user._id });
  if (!speaker) return ok(res, []);
  const sessions = await Session.find({ speaker: speaker._id })
    .populate({ path: 'event', select: 'title slug startDate venue coverImage organizer' });
  ok(res, sessions.map((s) => ({ ...s.toObject(), speakerProfile: speaker })));
});

module.exports = {
  listSpeakers, createSpeaker, updateSpeaker, deleteSpeaker,
  listSessions, createSession, updateSession, deleteSession,
  listVolunteers, createVolunteer, updateVolunteer, deleteVolunteer, myAssignments,
  listSponsors, createSponsor, updateSponsor, deleteSponsor,
  mySpeakingSessions,
};
