const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Waitlist = require('../src/models/Waitlist');
const SeatHold = require('../src/models/SeatHold');
const SmartQueueAudit = require('../src/models/SmartQueueAudit');
const {
  holdService,
  priorityService,
  promotionEngine,
  expirationWorker,
  smartQueueAnalytics,
  smartQueueAi,
} = require('../src/services/smartqueue');

describe('SmartQueue AI - Temporary Seat Reservation & Automatic Promotion Engine', () => {
  let organizer, organizerToken;
  let attendee1, attendee1Token;
  let attendee2, attendee2Token;
  let attendee3, attendee3Token;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    // Clean up any test users/events
    const emails = ['sq.org@test.com', 'sq.att1@test.com', 'sq.att2@test.com', 'sq.att3@test.com'];
    await User.deleteMany({ email: { $in: emails } });
    await Event.deleteMany({ title: /SmartQueue Test Event/i });

    // 1. Organizer
    const orgRes = await request(app).post('/api/auth/register').send({
      name: 'SQ Organizer',
      email: 'sq.org@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    organizer = orgRes.body.data.user;
    organizerToken = orgRes.body.data.token;
    await User.findByIdAndUpdate(organizer._id, { organizerStatus: 'approved' });

    // 2. Attendee 1
    const a1Res = await request(app).post('/api/auth/register').send({
      name: 'SQ Attendee 1',
      email: 'sq.att1@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee1 = a1Res.body.data.user;
    attendee1Token = a1Res.body.data.token;

    // 3. Attendee 2
    const a2Res = await request(app).post('/api/auth/register').send({
      name: 'SQ Attendee 2',
      email: 'sq.att2@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee2 = a2Res.body.data.user;
    attendee2Token = a2Res.body.data.token;

    // 4. Attendee 3
    const a3Res = await request(app).post('/api/auth/register').send({
      name: 'SQ Attendee 3',
      email: 'sq.att3@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee3 = a3Res.body.data.user;
    attendee3Token = a3Res.body.data.token;
  });

  beforeEach(async () => {
    // Create a fresh test event with capacity = 1
    testEvent = await Event.create({
      title: 'SmartQueue Test Event ' + Date.now(),
      slug: 'smartqueue-test-event-' + Date.now(),
      description: 'Testing temporary seat holds and promotions',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 7 * 864e5),
      endDate: new Date(Date.now() + 8 * 864e5),
      capacity: 1,
      registrationCount: 0,
      activeHoldsCount: 0,
      price: 0,
      status: 'published',
      approvalStatus: 'approved',
      settings: {
        allowWaitlist: true,
        smartQueue: {
          enabled: true,
          autoPromote: true,
          holdDurationMinutes: 15,
          sendReminders: true,
        },
      },
    });
  });

  afterAll(async () => {
    expirationWorker.stopWorker();
    await User.deleteMany({ email: { $in: ['sq.org@test.com', 'sq.att1@test.com', 'sq.att2@test.com', 'sq.att3@test.com'] } });
    await Event.deleteMany({ title: /SmartQueue Test Event/i });
    await disconnectDB();
  });

  describe('1. Atomic Capacity Reservation & Race Condition Protection', () => {
    test('strictly enforces "ONE SEAT = ONE ACTIVE ALLOCATION" under concurrent load', async () => {
      // Create waitlist entries for attendee1 and attendee2
      const [wl1, wl2] = await Promise.all([
        Waitlist.create({
          event: testEvent._id,
          user: attendee1._id,
          position: 1,
          status: 'waiting',
        }),
        Waitlist.create({
          event: testEvent._id,
          user: attendee2._id,
          position: 2,
          status: 'waiting',
        }),
      ]);

      // Attempt 2 concurrent seat holds on an event with capacity = 1
      const [result1, result2] = await Promise.all([
        holdService.createSeatHold({
          eventId: testEvent._id,
          userId: attendee1._id,
          waitlistEntryId: wl1._id,
          holdDurationMinutes: 15,
        }),
        holdService.createSeatHold({
          eventId: testEvent._id,
          userId: attendee2._id,
          waitlistEntryId: wl2._id,
          holdDurationMinutes: 15,
        }),
      ]);

      const successes = [result1, result2].filter((r) => r.success);
      const failures = [result1, result2].filter((r) => !r.success);

      // Invariant: Exactly 1 succeeds, 1 fails
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).toMatch(/No available capacity/i);

      // Verify DB state: activeHoldsCount must equal 1, not 2
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent.activeHoldsCount).toBe(1);
      expect(updatedEvent.registrationCount + updatedEvent.activeHoldsCount).toBe(updatedEvent.capacity);
      expect(updatedEvent.seatsLeft).toBe(0);
      expect(updatedEvent.isFull).toBe(true);
    });
  });

  describe('2. Hold Lifecycle — Acceptance & Ticket Generation', () => {
    test('attendee claims active hold, transitions seat to confirmed registration', async () => {
      const wl = await Waitlist.create({
        event: testEvent._id,
        user: attendee1._id,
        position: 1,
        status: 'waiting',
      });

      const holdResult = await holdService.createSeatHold({
        eventId: testEvent._id,
        userId: attendee1._id,
        waitlistEntryId: wl._id,
        holdDurationMinutes: 15,
      });
      expect(holdResult.success).toBe(true);

      // Attendee checks active hold endpoint
      const checkRes = await request(app)
        .get(`/api/events/${testEvent._id}/smartqueue/hold`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.hasActiveHold).toBe(true);
      expect(checkRes.body.data.hold.secondsRemaining).toBeGreaterThan(0);

      // Attendee accepts the hold
      const acceptRes = await request(app)
        .post(`/api/events/${testEvent._id}/smartqueue/hold/accept`)
        .set('Authorization', `Bearer ${attendee1Token}`)
        .send();

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.accepted).toBe(true);
      expect(acceptRes.body.data.ticket).toBeDefined();

      // Check updated event counts
      const afterEvent = await Event.findById(testEvent._id);
      expect(afterEvent.registrationCount).toBe(1);
      expect(afterEvent.activeHoldsCount).toBe(0);

      // Verify SeatHold doc status
      const updatedHold = await SeatHold.findById(holdResult.hold._id);
      expect(updatedHold.status).toBe('accepted');

      // Verify Waitlist status
      const updatedWl = await Waitlist.findById(wl._id);
      expect(updatedWl.status).toBe('promoted');
    });

    test('rejects acceptance if hold has expired', async () => {
      const wl = await Waitlist.create({
        event: testEvent._id,
        user: attendee1._id,
        position: 1,
        status: 'waiting',
      });

      // Create an already-expired hold
      const expiredHold = await SeatHold.create({
        eventId: testEvent._id,
        userId: attendee1._id,
        waitlistEntryId: wl._id,
        status: 'active',
        holdExpiresAt: new Date(Date.now() - 60000), // 1 min ago
        holdDurationMinutes: 15,
      });
      await Event.findByIdAndUpdate(testEvent._id, { $inc: { activeHoldsCount: 1 } });

      const acceptRes = await request(app)
        .post(`/api/events/${testEvent._id}/smartqueue/hold/accept`)
        .set('Authorization', `Bearer ${attendee1Token}`)
        .send({ holdId: expiredHold._id });

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.message).toMatch(/expired|does not exist/i);
    });
  });

  describe('3. Hold Decline & Automatic Promotion of Next Candidate', () => {
    test('declining a seat hold releases capacity and promotes next waitlisted attendee', async () => {
      // Attendee 1 has hold; Attendee 2 is next in line
      const wl1 = await Waitlist.create({
        event: testEvent._id,
        user: attendee1._id,
        position: 1,
        status: 'waiting',
      });
      const wl2 = await Waitlist.create({
        event: testEvent._id,
        user: attendee2._id,
        position: 2,
        status: 'waiting',
      });

      const holdResult = await holdService.createSeatHold({
        eventId: testEvent._id,
        userId: attendee1._id,
        waitlistEntryId: wl1._id,
        holdDurationMinutes: 15,
      });
      expect(holdResult.success).toBe(true);

      // Attendee 1 declines the hold
      const declineRes = await request(app)
        .post(`/api/events/${testEvent._id}/smartqueue/hold/decline`)
        .set('Authorization', `Bearer ${attendee1Token}`)
        .send();

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.data.declined).toBe(true);

      // Verify Attendee 1 hold was declined
      const hold1 = await SeatHold.findById(holdResult.hold._id);
      expect(hold1.status).toBe('declined');

      // Verify Attendee 2 was automatically promoted into an active hold!
      const hold2 = await SeatHold.findOne({
        eventId: testEvent._id,
        userId: attendee2._id,
        status: 'active',
      });
      expect(hold2).toBeDefined();
      expect(hold2.status).toBe('active');

      // Check event hold count remains exactly 1 (0 + 1)
      const afterEvent = await Event.findById(testEvent._id);
      expect(afterEvent.activeHoldsCount).toBe(1);
    });
  });

  describe('4. Expiration Sweeper Worker', () => {
    test('sweeper marks expired holds as expired and promotes next eligible candidate', async () => {
      const wl1 = await Waitlist.create({
        event: testEvent._id,
        user: attendee1._id,
        position: 1,
        status: 'waiting',
      });
      const wl2 = await Waitlist.create({
        event: testEvent._id,
        user: attendee2._id,
        position: 2,
        status: 'waiting',
      });

      // Create an expired active hold for Attendee 1
      const expiredHold = await SeatHold.create({
        eventId: testEvent._id,
        userId: attendee1._id,
        waitlistEntryId: wl1._id,
        status: 'active',
        holdExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        holdDurationMinutes: 15,
      });
      await Event.findByIdAndUpdate(testEvent._id, { $inc: { activeHoldsCount: 1 } });
      await Waitlist.findByIdAndUpdate(wl1._id, { status: 'hold_active', activeHold: expiredHold._id });

      // Run manual sweep
      const sweepResult = await expirationWorker.sweepExpiredHolds();
      expect(sweepResult.swept).toBeGreaterThanOrEqual(1);

      // Expired hold should now be expired
      const holdAfter = await SeatHold.findById(expiredHold._id);
      expect(holdAfter.status).toBe('expired');

      // Attendee 2 should now have an active hold
      const attendee2Hold = await SeatHold.findOne({
        eventId: testEvent._id,
        userId: attendee2._id,
        status: 'active',
      });
      expect(attendee2Hold).toBeDefined();
    });
  });

  describe('5. Organizer Endpoints, RBAC, Simulation & Settings', () => {
    test('attendees cannot access organizer endpoints (RBAC 403)', async () => {
      const metricsRes = await request(app)
        .get(`/api/events/${testEvent._id}/smartqueue/metrics`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(metricsRes.status).toBe(403);

      const simRes = await request(app)
        .post(`/api/events/${testEvent._id}/smartqueue/simulate`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(simRes.status).toBe(403);
    });

    test('organizer can view metrics, simulation, AI insights, and update settings', async () => {
      // 1. Get metrics
      const metricsRes = await request(app)
        .get(`/api/events/${testEvent._id}/smartqueue/metrics`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.data.metrics).toBeDefined();
      expect(metricsRes.body.data.metrics.efficiencyScore).toBeDefined();

      // 2. Run simulation
      const simRes = await request(app)
        .post(`/api/events/${testEvent._id}/smartqueue/simulate`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(simRes.status).toBe(200);
      expect(simRes.body.data.eventCapacity).toBe(1);

      // 3. Get AI insights
      const aiRes = await request(app)
        .get(`/api/events/${testEvent._id}/smartqueue/ai-insights`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(aiRes.status).toBe(200);
      expect(aiRes.body.data.summary).toBeDefined();
      expect(aiRes.body.data.suggestedHoldMinutes).toBeDefined();

      // 4. Update settings
      const updateRes = await request(app)
        .put(`/api/events/${testEvent._id}/smartqueue/settings`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          holdDurationMinutes: 20,
          sendReminders: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.settings.holdDurationMinutes).toBe(20);
    });
  });

  describe('6. Comprehensive Audit Trail', () => {
    test('records immutable audit actions for queue transitions', async () => {
      const wl = await Waitlist.create({
        event: testEvent._id,
        user: attendee1._id,
        position: 1,
        status: 'waiting',
      });

      await holdService.createSeatHold({
        eventId: testEvent._id,
        userId: attendee1._id,
        waitlistEntryId: wl._id,
        holdDurationMinutes: 15,
      });

      const audits = await SmartQueueAudit.find({ eventId: testEvent._id });
      expect(audits.length).toBeGreaterThan(0);
      const actions = audits.map((a) => a.action);
      expect(actions.some((a) => ['SEAT_HELD', 'ELIGIBILITY_CHECKED', 'HOLD_EXPIRED', 'HOLD_DECLINED'].includes(a))).toBe(true);
    });
  });
});
