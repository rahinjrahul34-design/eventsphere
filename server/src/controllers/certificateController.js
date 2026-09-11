const Certificate = require('../models/Certificate');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { certificateId } = require('../utils/codes');
const notificationService = require('../services/notificationService');
const gamification = require('../services/gamificationService');

async function ownedEvent(eventId, user) {
  const event = await Event.findById(eventId).populate('organizer', 'name company');
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer._id.toString() !== user._id.toString() && user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  return event;
}

// POST /api/events/:id/certificates/issue — bulk-issue to checked-in attendees
const issueCertificates = asyncHandler(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user);
  const registrations = await Registration.find({
    event: event._id,
    ...(req.body.userIds?.length ? { user: { $in: req.body.userIds } } : { status: 'checked_in' }),
  }).populate('user', 'name email');

  const organizerName = event.organizer?.name || event.organizer?.company || 'EventSphere';
  const issued = [];
  for (const reg of registrations) {
    if (!reg.user) continue;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Certificate.findOne({ event: event._id, user: reg.user._id });
    if (exists) { issued.push(exists); continue; }
    // eslint-disable-next-line no-await-in-loop
    const cert = await Certificate.create({
      certificateId: certificateId(),
      event: event._id,
      user: reg.user._id,
      registration: reg._id,
      issuedBy: req.user._id,
      recipientName: reg.user.name,
      eventTitle: event.title,
      organizerName,
      type: req.body.type || 'participation',
      eventDate: event.startDate,
    });
    issued.push(cert);
    // eslint-disable-next-line no-await-in-loop
    await notificationService.notify({
      user: reg.user._id,
      type: 'certificate',
      title: `Certificate ready: ${event.title}`,
      message: 'Your verifiable digital certificate has been issued.',
      link: `/my-certificates`,
    });
    // eslint-disable-next-line no-await-in-loop
    await gamification.evaluateBadges(reg.user._id);
  }

  event.settings.certificatesIssued = true;
  await event.save();
  created(res, { issued: issued.length, certificates: issued });
});

// GET /api/certificates/me
const myCertificates = asyncHandler(async (req, res) => {
  const certs = await Certificate.find({ user: req.user._id, revoked: false })
    .sort({ issuedAt: -1 })
    .populate('event', 'title slug startDate coverImage');
  ok(res, certs);
});

// GET /api/certificates/verify/:certificateId — PUBLIC
const verifyCertificate = asyncHandler(async (req, res) => {
  const cert = await Certificate.findOne({ certificateId: req.params.certificateId })
    .populate('event', 'title slug startDate organizer')
    .populate('user', 'name');
  if (!cert) return ok(res, { valid: false, reason: 'NOT_FOUND' });
  if (cert.revoked) return ok(res, { valid: false, reason: 'REVOKED', certificate: cert });
  ok(res, {
    valid: true,
    certificate: {
      certificateId: cert.certificateId,
      recipientName: cert.recipientName,
      eventTitle: cert.eventTitle,
      organizerName: cert.organizerName,
      type: cert.type,
      issuedAt: cert.issuedAt,
      eventDate: cert.eventDate,
    },
  });
});

const revokeCertificate = asyncHandler(async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) throw ApiError.notFound();
  if (req.user.role !== 'admin') {
    const event = await Event.findById(cert.event);
    if (event.organizer.toString() !== req.userId.toString()) throw ApiError.forbidden();
  }
  cert.revoked = true;
  await cert.save();
  ok(res, { revoked: true });
});

const eventCertificates = asyncHandler(async (req, res) => {
  await ownedEvent(req.params.id, req.user);
  const certs = await Certificate.find({ event: req.params.id }).sort({ issuedAt: -1 });
  ok(res, certs);
});

module.exports = { issueCertificates, myCertificates, verifyCertificate, revokeCertificate, eventCertificates };
