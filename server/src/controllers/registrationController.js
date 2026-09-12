const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Waitlist = require('../models/Waitlist');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { ticketCode } = require('../utils/codes');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const gamification = require('../services/gamificationService');
const emailService = require('../services/emailService');
const { emitToEvent } = require('../sockets');
const { POINTS } = require('../utils/badges');

function seatsLeft(event) {
  return Math.max(0, event.capacity - (event.registrationCount || 0) - (event.activeHoldsCount || 0));
}

async function createTicket(registration, event, user) {
  const code = ticketCode();
  return Ticket.create({
    code,
    event: event._id,
    registration: registration._id,
    user: user._id,
    ticketType: registration.ticketType.name,
    attendeeName: user.name,
  });
}

// Confirm a registration (shared by free flow and payment verification).
async function confirmRegistration({ event, registration, user, ticketType }) {
  if (seatsLeft(event) <= 0 && registration.status !== 'waitlisted') {
    throw ApiError.conflict('This event is fully booked');
  }
  registration.status = 'confirmed';
  if (ticketType) registration.ticketType = ticketType;
  await registration.save();

  event.registrationCount += 1;
  if (ticketType) {
    const tt = event.ticketTypes.find((t) => t.name === ticketType.name);
    if (tt) tt.soldCount += 1;
  }
  event.popularityScore += 2;
  await event.save();

  const ticket = await createTicket(registration, event, user);

  await gamification.awardPoints({
    userId: user._id,
    eventId: event._id,
    points: POINTS.REGISTRATION,
    reason: 'Event registration',
  });

  const early = new Date(event.startDate).getTime() - Date.now() > 7 * 864e5;
  if (early) await gamification.evaluateBadges(user._id);

  await notificationService.notify({
    user: user._id,
    type: 'registration',
    title: `Registered: ${event.title}`,
    message: `Your ticket ${ticket.code} is ready. Show it at check-in.`,
    link: `/my-tickets/${ticket._id}`,
    email: emailService.templates.registration(user.name, event.title, ticket.code),
  });

  emitToEvent(event._id.toString(), 'registration:update', {
    registrationCount: event.registrationCount,
    seatsLeft: seatsLeft(event),
  });

  return ticket;
}

// POST /api/events/:id/register
const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (!['published', 'live'].includes(event.status) || event.approvalStatus !== 'approved') {
    throw ApiError.badRequest('Registration is not open for this event');
  }
  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    throw ApiError.badRequest('Registration has closed for this event');
  }

  const existing = await Registration.findOne({ event: event._id, user: req.user._id });
  if (existing && ['confirmed', 'checked_in', 'pending'].includes(existing.status)) {
    throw ApiError.conflict('You have already registered for this event');
  }
  if (existing && existing.status === 'waitlisted' && seatsLeft(event) > 0) {
    // Promote own waitlisted entry directly
    await Waitlist.updateMany({ event: event._id, user: req.user._id }, { status: 'promoted', promotedAt: new Date() });
  }

  // Resolve ticket type
  const requestedName = req.body.ticketType;
  let ticketType = { name: 'General', price: event.price };
  if (event.ticketTypes?.length) {
    const tt = event.ticketTypes.find((t) => t.name === requestedName) || event.ticketTypes[0];
    if (tt.quantity > 0 && tt.soldCount >= tt.quantity) {
      throw ApiError.conflict(`"${tt.name}" tickets are sold out`);
    }
    ticketType = { name: tt.name, price: tt.price };
  } else if (event.price > 0) {
    ticketType = { name: 'Standard', price: event.price };
  }
  const quantity = Math.max(1, parseInt(req.body.quantity || '1', 10));
  const amount = ticketType.price * quantity;

  // Full → waitlist
  if (seatsLeft(event) <= 0) {
    if (!event.settings.allowWaitlist) throw ApiError.conflict('This event is fully booked');
    let registration = existing;
    if (!registration) {
      registration = await Registration.create({
        event: event._id,
        user: req.user._id,
        ticketType,
        quantity,
        responses: req.body.responses || [],
        source: req.body.source || 'direct',
        amountPaid: 0,
        status: 'waitlisted',
      });
    } else {
      registration.status = 'waitlisted';
      await registration.save();
    }
    const position = (await Waitlist.countDocuments({
      event: event._id,
      status: { $in: ['waiting', 'notified'] },
    })) + 1;
    await Waitlist.findOneAndUpdate(
      { event: event._id, user: req.user._id },
      { position, status: 'waiting', registration: registration._id },
      { upsert: true, setDefaultsOnInsert: true }
    );
    event.waitlistCount = position;
    await event.save();
    return created(res, { waitlisted: true, position, registration });
  }

  const registrationPayload = {
    event: event._id,
    user: req.user._id,
    ticketType,
    quantity,
    responses: req.body.responses || [],
    source: req.body.source || 'direct',
    amountPaid: 0,
    status: amount > 0 ? 'pending' : 'confirmed',
  };
  // Reuse a cancelled/waitlisted document (unique event+user index).
  let registration;
  if (existing) {
    Object.assign(existing, registrationPayload);
    existing.checkedInAt = undefined;
    existing.checkInMethod = '';
    existing.checkedInBy = undefined;
    registration = await existing.save();
  } else {
    registration = await Registration.create(registrationPayload);
  }

  if (amount === 0) {
    const ticket = await confirmRegistration({ event, registration, user: req.user, ticketType });
    return created(res, { registered: true, free: true, ticket, registration });
  }

  // Paid flow — create payment order (demo or Razorpay)
  const order = await paymentService.createOrder({
    amount,
    receipt: `reg_${registration._id}`,
  });
  await Payment.create({
    event: event._id,
    registration: registration._id,
    user: req.user._id,
    amount,
    provider: order.provider,
    orderId: order.orderId,
    status: 'created',
    ticketType: ticketType.name,
    quantity,
  });
  created(res, { registered: true, free: false, order, registration, ticketType: ticketType.name });
});

// POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId: pid, signature, registrationId } = req.body;
  const payment = await Payment.findOne({ orderId, user: req.user._id });
  if (!payment && registrationId) {
    const reg = await Registration.findById(registrationId);
    if (reg?.user.toString() !== req.userId.toString()) throw ApiError.forbidden();
  }
  const record = payment || (await Payment.findOne({ registration: registrationId, user: req.user._id }));
  if (!record) throw ApiError.notFound('Payment order not found');

  const result = await paymentService.verifyPayment({ orderId, paymentId: pid, signature });
  if (!result.verified) throw ApiError.badRequest('Payment verification failed');

  record.status = 'captured';
  record.paymentId = result.paymentId;
  await record.save();

  const [event, registration] = await Promise.all([
    Event.findById(record.event),
    Registration.findById(record.registration),
  ]);
  registration.amountPaid = record.amount;
  await registration.save();

  const ticket = await confirmRegistration({
    event,
    registration,
    user: req.user,
    ticketType: { name: record.ticketType, price: record.amount / Math.max(1, record.quantity) },
  });

  if (record.holdId) {
    try {
      const smartQueue = require('../services/smartqueue');
      await smartQueue.holdService.acceptSeatHold({ holdId: record.holdId, userId: req.user._id });
    } catch (holdErr) {
      console.warn('SeatHold acceptance warning during payment verification:', holdErr.message);
    }
  }

  ok(res, { success: true, ticket, registration });
});

// POST /api/registrations/:id/cancel — frees a seat and auto-promotes waitlist
const cancelRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration) throw ApiError.notFound('Registration not found');
  if (registration.user.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  const wasConfirmed = ['confirmed', 'checked_in'].includes(registration.status);
  registration.status = 'cancelled';
  await registration.save();
  await Ticket.updateMany({ registration: registration._id }, { status: 'cancelled' });

  const event = await Event.findById(registration.event);
  let promoted = null;
  if (wasConfirmed) {
    event.registrationCount = Math.max(0, event.registrationCount - 1);
    await event.save();

    // Trigger SmartQueue promotion engine
    try {
      const smartQueue = require('../services/smartqueue');
      const promoResult = await smartQueue.promotionEngine.handleSeatAvailable(event._id);
      if (promoResult?.promoted?.length) {
        promoted = promoResult.promoted[0];
      }
    } catch (sqErr) {
      console.error('SmartQueue auto-promotion error upon cancellation:', sqErr);
    }
  }

  emitToEvent(event._id.toString(), 'registration:update', {
    registrationCount: event.registrationCount,
    seatsLeft: seatsLeft(event),
  });
  ok(res, { cancelled: true, promotedTicket: promoted });
});

// GET /api/registrations/my
const myRegistrations = asyncHandler(async (req, res) => {
  const regs = await Registration.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'event',
      populate: [{ path: 'organizer', select: 'name company' }, { path: 'category', select: 'name slug color' }],
    });
  const tickets = await Ticket.find({ user: req.user._id });
  const ticketByReg = {};
  tickets.forEach((t) => { ticketByReg[t.registration.toString()] = t; });
  const data = regs
    .filter((r) => r.event)
    .map((r) => ({ ...r.toObject(), ticket: ticketByReg[r._id.toString()] || null }));
  ok(res, data);
});

// GET /api/events/:id/registrations (organizer)
const eventRegistrations = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') throw ApiError.forbidden();
  const regs = await Registration.find({ event: event._id })
    .sort({ createdAt: -1 })
    .populate('user', 'name email phone avatar title points interests');
  const waitlist = await Waitlist.find({ event: event._id }).sort({ position: 1 }).populate('user', 'name email');
  ok(res, { registrations: regs, waitlist });
});

// POST /api/waitlist/:id/promote (manual)
const promoteWaitlist = asyncHandler(async (req, res) => {
  const entry = await Waitlist.findById(req.params.id);
  if (!entry) throw ApiError.notFound();
  const event = await Event.findById(entry.event);
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== 'admin') throw ApiError.forbidden();
  const reg = await Registration.findById(entry.registration);
  const user = await require('../models/User').findById(entry.user);
  if (!reg || !user) throw ApiError.badRequest('Waitlist entry invalid');
  let ticket = null;
  if ((reg.ticketType?.price || 0) === 0) {
    entry.status = 'promoted';
    entry.promotedAt = new Date();
    await entry.save();
    ticket = await confirmRegistration({ event, registration: reg, user });
  } else {
    entry.status = 'notified';
    entry.notifiedAt = new Date();
    await entry.save();
    await notificationService.notify({
      user: user._id, type: 'waitlist',
      title: `A seat opened for ${event.title}!`, message: 'Complete payment to claim your spot.',
      link: `/events/${event.slug}`,
    });
  }
  ok(res, { promoted: true, ticket });
});

module.exports = {
  registerForEvent,
  verifyPayment,
  cancelRegistration,
  myRegistrations,
  eventRegistrations,
  promoteWaitlist,
  confirmRegistration,
};
