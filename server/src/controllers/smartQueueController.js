const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const Payment = require('../models/Payment');
const SeatHold = require('../models/SeatHold');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { confirmRegistration } = require('./registrationController');
const paymentService = require('../services/paymentService');
const {
  holdService,
  promotionEngine,
  smartQueueAnalytics,
  smartQueueAi,
} = require('../services/smartqueue');

// Helper to verify organizer or admin permissions
async function verifyOrganizerOrAdmin(eventId, user) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');
  if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
    throw ApiError.forbidden('Only event organizer or admin can access queue management');
  }
  return event;
}

// GET /api/events/:id/smartqueue/hold — Get active hold for current user
const getActiveHold = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const hold = await holdService.getActiveHoldForUser(eventId, req.user._id);
  if (!hold) {
    return ok(res, { hasActiveHold: false, hold: null });
  }
  ok(res, { hasActiveHold: true, hold });
});

// POST /api/events/:id/smartqueue/hold/accept — Accept active hold
const acceptHold = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const hold = await SeatHold.findOne({
    eventId,
    userId: req.user._id,
    status: 'active',
    holdExpiresAt: { $gt: new Date() },
  });

  if (!hold) {
    throw ApiError.badRequest('Seat hold has expired, been released, or does not exist');
  }

  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  // Find associated registration document
  const waitlistEntry = await Waitlist.findById(hold.waitlistEntryId);
  let registration = waitlistEntry?.registration
    ? await Registration.findById(waitlistEntry.registration)
    : await Registration.findOne({ event: eventId, user: req.user._id });

  const ticketPrice = hold.ticketType?.price || 0;

  // Free ticket flow
  if (ticketPrice === 0) {
    // Atomically accept hold (decrements activeHoldsCount)
    const acceptResult = await holdService.acceptSeatHold({ holdId: hold._id, userId: req.user._id });
    if (!acceptResult.success) {
      throw ApiError.badRequest(acceptResult.reason || 'Failed to accept hold');
    }

    if (!registration) {
      registration = await Registration.create({
        event: event._id,
        user: req.user._id,
        ticketType: hold.ticketType,
        quantity: 1,
        source: 'waitlist_smartqueue',
        amountPaid: 0,
        status: 'waitlisted',
      });
    }

    const ticket = await confirmRegistration({
      event,
      registration,
      user: req.user,
      ticketType: hold.ticketType,
    });

    return ok(res, {
      accepted: true,
      requiresPayment: false,
      ticket,
      registration,
    });
  }

  // Paid ticket flow — generate payment order
  if (!registration) {
    registration = await Registration.create({
      event: event._id,
      user: req.user._id,
      ticketType: hold.ticketType,
      quantity: 1,
      source: 'waitlist_smartqueue',
      amountPaid: 0,
      status: 'pending',
    });
  }

  const order = await paymentService.createOrder({
    amount: ticketPrice,
    receipt: `hold_${hold._id}`,
  });

  await Payment.create({
    event: event._id,
    registration: registration._id,
    user: req.user._id,
    amount: ticketPrice,
    provider: order.provider,
    orderId: order.orderId,
    status: 'created',
    ticketType: hold.ticketType.name,
    quantity: 1,
    holdId: hold._id,
  });

  ok(res, {
    accepted: false,
    requiresPayment: true,
    order,
    registration,
    hold,
    ticketType: hold.ticketType,
  });
});

// POST /api/events/:id/smartqueue/hold/decline — Decline active hold
const declineHold = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const hold = await SeatHold.findOne({
    eventId,
    userId: req.user._id,
    status: 'active',
  });

  if (!hold) {
    throw ApiError.notFound('No active seat hold found to decline');
  }

  const releaseResult = await holdService.releaseSeatHold({
    holdId: hold._id,
    reason: 'declined',
    actor: req.user._id.toString(),
  });

  if (!releaseResult.success) {
    throw ApiError.badRequest(releaseResult.reason || 'Failed to decline seat hold');
  }

  // Automatically trigger promotion for the next candidate in line
  try {
    await promotionEngine.handleSeatAvailable(eventId);
  } catch (err) {
    console.error('Promotion error after seat hold decline:', err);
  }

  ok(res, { declined: true });
});

// GET /api/events/:id/smartqueue/metrics — Organizer metrics & funnel
const getMetrics = asyncHandler(async (req, res) => {
  await verifyOrganizerOrAdmin(req.params.id, req.user);
  const metrics = await smartQueueAnalytics.getEventSmartQueueMetrics(req.params.id);
  ok(res, metrics);
});

// GET /api/events/:id/smartqueue/ai-insights — Operational AI narrative & recommendations
const getAiInsights = asyncHandler(async (req, res) => {
  await verifyOrganizerOrAdmin(req.params.id, req.user);
  const metrics = await smartQueueAnalytics.getEventSmartQueueMetrics(req.params.id);
  const insights = await smartQueueAi.getOperationalInsights(metrics);
  ok(res, insights);
});

// POST /api/events/:id/smartqueue/simulate — Dry-run simulation
const simulate = asyncHandler(async (req, res) => {
  await verifyOrganizerOrAdmin(req.params.id, req.user);
  const simulation = await promotionEngine.simulatePromotion(req.params.id);
  ok(res, simulation);
});

// POST /api/events/:id/smartqueue/manual-promote — Manual promote action
const manualPromote = asyncHandler(async (req, res) => {
  await verifyOrganizerOrAdmin(req.params.id, req.user);
  const { waitlistEntryId } = req.body;
  if (!waitlistEntryId) throw ApiError.badRequest('waitlistEntryId is required');

  const result = await promotionEngine.promoteCandidateManually(
    req.params.id,
    waitlistEntryId,
    req.user._id
  );
  ok(res, result);
});

// PUT /api/events/:id/smartqueue/settings — Update SmartQueue configuration
const updateSettings = asyncHandler(async (req, res) => {
  const event = await verifyOrganizerOrAdmin(req.params.id, req.user);

  const {
    enabled,
    autoPromote,
    holdDurationMinutes,
    sendReminders,
    ticketTypeSpecific,
    priorityStrategy,
  } = req.body;

  if (!event.settings) event.settings = {};
  if (!event.settings.smartQueue) event.settings.smartQueue = {};

  if (typeof enabled === 'boolean') event.settings.smartQueue.enabled = enabled;
  if (typeof autoPromote === 'boolean') event.settings.smartQueue.autoPromote = autoPromote;
  if (typeof holdDurationMinutes === 'number') {
    event.settings.smartQueue.holdDurationMinutes = Math.min(Math.max(holdDurationMinutes, 5), 60);
  }
  if (typeof sendReminders === 'boolean') event.settings.smartQueue.sendReminders = sendReminders;
  if (typeof ticketTypeSpecific === 'boolean') {
    event.settings.smartQueue.ticketTypeSpecific = ticketTypeSpecific;
  }
  if (priorityStrategy && ['fifo', 'ticket_tier'].includes(priorityStrategy)) {
    event.settings.smartQueue.priorityStrategy = priorityStrategy;
  }

  await event.save();
  ok(res, { settings: event.settings.smartQueue });
});

module.exports = {
  getActiveHold,
  acceptHold,
  declineHold,
  getMetrics,
  getAiInsights,
  simulate,
  manualPromote,
  updateSettings,
};
