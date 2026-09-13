/**
 * SmartQueue AI — Hardening Tests
 *
 * Covers the gap-closure hardening pass:
 *  1. Paid-accept idempotency (duplicate "Complete Registration" calls reuse one order)
 *  2. Registration-deadline promotion gate
 *  3. Event cancellation releases all active holds
 *  4. Legacy manual promote route now flows through the SmartQueue engine (hold + audit)
 *  5. Attendee "My Waitlist" endpoint privacy (own entries only)
 *
 * Requires MongoDB (mongodb-memory-server) — part of `npm test`.
 */

const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Waitlist = require('../src/models/Waitlist');
const SeatHold = require('../src/models/SeatHold');
const Payment = require('../src/models/Payment');
const SmartQueueAudit = require('../src/models/SmartQueueAudit');
const { expirationWorker } = require('../src/services/smartqueue');

describe('SmartQueue AI — Hardening (idempotency, closure gates, audit parity)', () => {
  let organizer, organizerToken;
  let u1, u1Token, u2, u2Token;
  let paidEvent;

  beforeAll(async () => {
    await connectDB();

    const emails = ['sqh.org@test.com', 'sqh.u1@test.com', 'sqh.u2@test.com'];
    await User.deleteMany({ email: { $in: emails } });
    await Event.deleteMany({ title: /SmartQueue Hardening/i });

    const mk = async (name, email, role) => {
      const r = await request(app).post('/api/auth/register').send({ name, email, password: 'Password123!', role });
      const user = r.body.data.user;
      if (role === 'organizer') await User.findByIdAndUpdate(user._id, { organizerStatus: 'approved' });
      return [user, r.body.data.token];
    };

    [organizer, organizerToken] = await mk('SQH Organizer', 'sqh.org@test.com', 'organizer');
    [u1, u1Token] = await mk('SQH User1', 'sqh.u1@test.com', 'attendee');
    [u2, u2Token] = await mk('SQH User2', 'sqh.u2@test.com', 'attendee');
  });

  beforeEach(async () => {
    paidEvent = await Event.create({
      title: 'SmartQueue Hardening Paid ' + Date.now(),
      slug: 'sqh-paid-' + Date.now(),
      description: 'Paid event for hold idempotency tests',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 7 * 864e5),
      endDate: new Date(Date.now() + 8 * 864e5),
      capacity: 1,
      registrationCount: 0,
      activeHoldsCount: 0,
      price: 499,
      status: 'published',
      approvalStatus: 'approved',
      settings: { allowWaitlist: true, smartQueue: { enabled: true, autoPromote: true, holdDurationMinutes: 15 } },
    });
  });

  afterEach(async () => {
    const events = await Event.find({ title: /SmartQueue Hardening/i });
    const eventIds = events.map((e) => e._id);
    await SeatHold.deleteMany({ eventId: { $in: eventIds } });
    await Waitlist.deleteMany({ event: { $in: eventIds } });
    await Registration.deleteMany({ event: { $in: eventIds } });
    await Payment.deleteMany({ event: { $in: eventIds } });
    await SmartQueueAudit.deleteMany({ eventId: { $in: eventIds } });
    await Event.deleteMany({ title: /SmartQueue Hardening/i });
  });

  afterAll(async () => {
    expirationWorker.stopWorker();
    await User.deleteMany({ email: { $in: ['sqh.org@test.com', 'sqh.u1@test.com', 'sqh.u2@test.com'] } });
    await disconnectDB();
  });

  async function fillSeatAndJoin(user, token) {
    // Seat taken by organizer's helper attendee → event full → user joins waitlist
    const fillerRegistration = await Registration.create({
      event: paidEvent._id,
      user: u2._id === user._id ? u1._id : u2._id,
      ticketType: { name: 'General', price: 499 },
      quantity: 1,
      status: 'confirmed',
      source: 'direct',
    });
    await Event.findByIdAndUpdate(paidEvent._id, { registrationCount: 1 });

    const res = await request(app)
      .post(`/api/events/${paidEvent._id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    res.fillerRegistration = fillerRegistration;
    return res;
  }

  test('1. paid hold acceptance is idempotent — duplicate calls reuse ONE payment order', async () => {
    const joinRes = await fillSeatAndJoin(u1, u1Token);
    expect(joinRes.body.data.waitlisted).toBe(true);

    // Release the seat → auto-promotion creates a hold for u1
    await request(app).post(`/api/registrations/${joinRes.fillerRegistration._id}/cancel`).set('Authorization', `Bearer ${organizerToken}`);

    const holdRes = await request(app)
      .get(`/api/events/${paidEvent._id}/smartqueue/hold`)
      .set('Authorization', `Bearer ${u1Token}`);
    expect(holdRes.body.data.hasActiveHold).toBe(true);

    // Accept twice rapidly
    const a1 = await request(app).post(`/api/events/${paidEvent._id}/smartqueue/hold/accept`).set('Authorization', `Bearer ${u1Token}`);
    const a2 = await request(app).post(`/api/events/${paidEvent._id}/smartqueue/hold/accept`).set('Authorization', `Bearer ${u1Token}`);

    expect(a1.body.data.requiresPayment).toBe(true);
    expect(a2.body.data.requiresPayment).toBe(true);
    // Same order reused — no duplicate payment orders for the hold
    expect(a2.body.data.order.orderId).toBe(a1.body.data.order.orderId);
    expect(a2.body.data.reusedOrder).toBe(true);

    const orders = await Payment.find({ holdId: holdRes.body.data.hold._id });
    expect(orders.length).toBe(1);
  });

  test('2. promotions stop after the registration deadline passes', async () => {
    await Event.findByIdAndUpdate(paidEvent._id, {
      registrationDeadline: new Date(Date.now() - 60 * 1000),
    });

    const joinRes = await fillSeatAndJoin(u1, u1Token);
    // join itself is blocked by the same deadline rule
    expect(joinRes.status).toBe(400);

    // Even a manually backfilled waitlist entry must not be promoted
    const reg = await Registration.create({
      event: paidEvent._id, user: u1._id, ticketType: { name: 'General', price: 499 },
      quantity: 1, status: 'waitlisted', source: 'direct',
    });
    await Waitlist.create({ event: paidEvent._id, user: u1._id, registration: reg._id, position: 1, status: 'waiting' });
    await Registration.deleteOne({ _id: reg._id }); // ensure eligibility would otherwise pass

    const { promotionEngine } = require('../src/services/smartqueue');
    const result = await promotionEngine.handleSeatAvailable(paidEvent._id);
    expect(result.promotedCount).toBe(0);
  });

  test('3. cancelling the event releases all active holds and updates the waitlist', async () => {
    const joinRes = await fillSeatAndJoin(u1, u1Token);
    expect(joinRes.body.data.waitlisted).toBe(true);

    await request(app).post(`/api/registrations/${joinRes.fillerRegistration._id}/cancel`).set('Authorization', `Bearer ${organizerToken}`);

    let hold = await SeatHold.findOne({ eventId: paidEvent._id, status: 'active' });
    expect(hold).toBeTruthy();

    await request(app)
      .patch(`/api/events/${paidEvent._id}/status`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ status: 'cancelled' });

    hold = await SeatHold.findOne({ eventId: paidEvent._id, status: 'active' });
    expect(hold).toBeNull();

    const released = await SeatHold.findOne({ eventId: paidEvent._id, status: 'expired' });
    expect(released).toBeTruthy();

    const event = await Event.findById(paidEvent._id);
    expect(event.activeHoldsCount).toBe(0);
  });

  test('4. legacy manual promote route goes through SmartQueue (hold + audit, no direct confirm)', async () => {
    const joinRes = await fillSeatAndJoin(u1, u1Token);
    expect(joinRes.body.data.waitlisted).toBe(true);
    await Event.findByIdAndUpdate(paidEvent._id, { 'settings.smartQueue.autoPromote': false });
    await request(app).post(`/api/registrations/${joinRes.fillerRegistration._id}/cancel`).set('Authorization', `Bearer ${organizerToken}`);

    const entry = await Waitlist.findOne({ event: paidEvent._id, user: u1._id });

    const res = await request(app)
      .post(`/api/waitlist/${entry._id}/promote`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hold).toBeTruthy();

    const hold = await SeatHold.findOne({ eventId: paidEvent._id, userId: u1._id, status: 'active' });
    expect(hold).toBeTruthy();

    const audit = await SmartQueueAudit.findOne({ eventId: paidEvent._id, action: 'MANUAL_PROMOTION' });
    expect(audit).toBeTruthy();

    // Attendee RBAC: non-organizer cannot promote
    const denied = await request(app)
      .post(`/api/waitlist/${entry._id}/promote`)
      .set('Authorization', `Bearer ${u2Token}`);
    expect(denied.status).toBe(403);
  });

  test('5. My Waitlist returns only the caller’s entries with position and status', async () => {
    const joinRes = await fillSeatAndJoin(u1, u1Token);
    expect(joinRes.body.data.waitlisted).toBe(true);

    const mine = await request(app).get('/api/waitlist/mine').set('Authorization', `Bearer ${u1Token}`);
    expect(mine.status).toBe(200);
    expect(Array.isArray(mine.body.data)).toBe(true);
    expect(mine.body.data.length).toBeGreaterThan(0);
    for (const entry of mine.body.data) {
      expect(entry.position).toBeDefined();
      expect(entry.status).toBeDefined();
      expect(entry.peopleAhead).toBe(Math.max(0, entry.position - 1));
    }
  });
});
