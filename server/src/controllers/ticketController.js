const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const gamification = require('../services/gamificationService');
const { POINTS } = require('../utils/badges');
const { emitToEvent } = require('../sockets');
const { scheduleEventPulseRecalc } = require('../services/eventpulse/recalcScheduler');

// GET /api/tickets/my
const myTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'event',
      populate: [{ path: 'organizer', select: 'name company' }, { path: 'category', select: 'name slug color' }],
    });
  ok(res, tickets);
});

// GET /api/tickets/:idOrCode
const getTicket = asyncHandler(async (req, res) => {
  const lookup = String(req.params.idOrCode ?? req.params.code ?? '').trim();
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(lookup);

  const ticket = await Ticket.findOne(isObjectId ? { _id: lookup } : { code: lookup.toUpperCase() })
    .populate({ path: 'event', populate: { path: 'organizer', select: 'name company' } })
    .populate('user', 'name email phone');

  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (
    ticket.user._id.toString() !== req.userId.toString() &&
    ticket.event.organizer?._id?.toString() !== req.userId.toString() &&
    req.user.role !== 'admin'
  ) {
    throw ApiError.forbidden();
  }
  ok(res, ticket);
});

/**
 * POST /api/tickets/validate — organizer QR check-in.
 * Idempotent: refuses duplicate check-ins, invalid and cancelled tickets.
 */
const validateTicket = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Ticket code is required');

  const ticket = await Ticket.findOne({ code })
    .populate({ path: 'event', select: 'title slug startDate organizer status' })
    .populate('user', 'name email phone avatar title points');
  if (!ticket) {
    return ok(res, { valid: false, reason: 'INVALID', message: 'No ticket exists with this QR code.' });
  }

  // Scanner is tied to an event desk: reject tickets from other events before mutation.
  if (req.body.eventId && ticket.event && ticket.event._id.toString() !== String(req.body.eventId)) {
    return ok(res, {
      valid: false,
      reason: 'WRONG_EVENT',
      message: `This ticket is for “${ticket.event.title}”, not this event.`,
      ticket: summary(ticket),
    });
  }

  // Only the event organizer, an admin, or an assigned volunteer may check in.
  if (
    req.user.role !== 'admin' &&
    ticket.event?.organizer?.toString() !== req.userId.toString()
  ) {
    const Volunteer = require('../models/Volunteer');
    const assigned = await Volunteer.exists({
      event: ticket.event?._id,
      user: req.userId,
      status: { $in: ['assigned', 'accepted', 'completed'] },
    });
    if (!assigned) throw ApiError.forbidden('Only organizers or assigned volunteers can check in tickets');
  }

  if (ticket.status === 'cancelled') {
    return ok(res, { valid: false, reason: 'CANCELLED', message: 'This ticket was cancelled.', ticket: summary(ticket) });
  }

  const registration = await Registration.findById(ticket.registration);
  if (!registration) {
    return ok(res, { valid: false, reason: 'INVALID', message: 'Registration record missing.' });
  }
  if (ticket.status === 'used' || registration.status === 'checked_in') {
    return ok(res, {
      valid: false,
      reason: 'DUPLICATE',
      message: `Already checked in${ticket.checkedInAt ? ` at ${new Date(ticket.checkedInAt).toLocaleString('en-IN')}` : ''}.`,
      ticket: summary(ticket, registration),
    });
  }
  if (registration.status === 'cancelled') {
    return ok(res, { valid: false, reason: 'CANCELLED', message: 'Registration was cancelled.', ticket: summary(ticket) });
  }

  // Perform check-in atomically
  const now = new Date();
  ticket.status = 'used';
  ticket.checkedInAt = now;
  ticket.checkedInBy = req.user._id;
  await ticket.save();

  registration.status = 'checked_in';
  registration.checkedInAt = now;
  registration.checkInMethod = req.body.method === 'manual' ? 'manual' : 'qr';
  registration.checkedInBy = req.user._id;
  await registration.save();

  await Event.updateOne({ _id: ticket.event._id }, { $inc: { checkedInCount: 1 } });

  await gamification.awardPoints({
    userId: ticket.user._id,
    eventId: ticket.event._id,
    points: POINTS.CHECK_IN,
    reason: 'Event check-in',
  });

  emitToEvent(ticket.event._id.toString(), 'event:attendance-update', {
    eventId: ticket.event._id.toString(),
    checkedInAt: now,
    attendee: ticket.user.name,
  });

  ok(res, {
    valid: true,
    reason: 'VALID',
    message: 'VALID TICKET — check-in successful',
    checkInTime: now,
    ticket: summary(ticket, registration),
  });
});

function summary(ticket, registration = null) {
  return {
    code: ticket.code,
    ticketType: ticket.ticketType,
    attendeeName: ticket.user?.name || ticket.attendeeName,
    email: ticket.user?.email,
    avatar: ticket.user?.avatar,
    eventTitle: ticket.event?.title,
    status: ticket.status,
    issuedAt: ticket.issuedAt,
    checkedInAt: ticket.checkedInAt,
    registeredAt: registration?.createdAt || ticket.createdAt,
  };
}

module.exports = { myTickets, getTicket, validateTicket };
