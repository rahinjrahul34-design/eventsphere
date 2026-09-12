const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventRiskAlert = require('../src/models/EventRiskAlert');
const EventRiskAssessment = require('../src/models/EventRiskAssessment');
const EventPrediction = require('../src/models/EventPrediction');
const EventSEOProfile = require('../src/models/EventSEOProfile');
const OrganizerTrustProfile = require('../src/models/OrganizerTrustProfile');
const { calculateEventHealth, clamp } = require('../src/services/commandCenter/healthScoreEngine');
const { computePriorityScore, deduplicateActions } = require('../src/services/commandCenter/actionEngine');
const { runSimulation } = require('../src/services/commandCenter/simulationEngine');
const { generateDeterministicBrief } = require('../src/services/commandCenter/narrativeService');

describe('AI Command Center - Comprehensive Test Suite', () => {
  let organizer, organizerToken;
  let otherOrganizer, otherOrganizerToken;
  let attendee, attendeeToken;
  let admin, adminToken;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    // Clean test records
    await User.deleteMany({ email: { $in: ['cc.org@test.com', 'cc.other@test.com', 'cc.att@test.com', 'cc.adm@test.com'] } });
    await Event.deleteMany({ title: /Command Center Test/i });

    // 1. Primary Organizer
    const orgRes = await request(app).post('/api/auth/register').send({
      name: 'CC Organizer',
      email: 'cc.org@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    organizer = orgRes.body.data.user;
    organizerToken = orgRes.body.data.token;
    await User.findByIdAndUpdate(organizer._id, { organizerStatus: 'approved' });

    // 2. Secondary Organizer (for unauthorized checks)
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Other Organizer',
      email: 'cc.other@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    otherOrganizer = otherRes.body.data.user;
    otherOrganizerToken = otherRes.body.data.token;
    await User.findByIdAndUpdate(otherOrganizer._id, { organizerStatus: 'approved' });

    // 3. Attendee
    const attRes = await request(app).post('/api/auth/register').send({
      name: 'CC Attendee',
      email: 'cc.att@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee = attRes.body.data.user;
    attendeeToken = attRes.body.data.token;

    // 4. Admin
    const admRes = await request(app).post('/api/auth/register').send({
      name: 'CC Admin',
      email: 'cc.adm@test.com',
      password: 'Password123!',
      role: 'admin',
    });
    admin = admRes.body.data.user;
    adminToken = admRes.body.data.token;
    await User.findByIdAndUpdate(admin._id, { role: 'admin' });

    // 5. Test Event
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Command Center Test Summit 2026',
        shortDescription: 'Operational testing for AI Command Center unification.',
        description: 'Comprehensive test event for orchestrating predictions, safety, queue, SEO, and trust modules.',
        tags: ['AI', 'Command Center', 'DevOps'],
        eventType: 'offline',
        venue: {
          name: 'Tech Grand Arena',
          address: '42 Silicon Avenue, Bangalore',
          city: 'Bangalore',
          coordinates: [77.5946, 12.9716],
        },
        startDate: new Date(Date.now() + 86400000 * 7),
        endDate: new Date(Date.now() + 86400000 * 8),
        capacity: 250,
      });

    testEvent = eventRes.body.data;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['cc.org@test.com', 'cc.other@test.com', 'cc.att@test.com', 'cc.adm@test.com'] } });
    await Event.deleteMany({ title: /Command Center Test/i });
    await disconnectDB();
  });

  describe('1. Security & RBAC Access Control', () => {
    test('Authorized organizer can access command center', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event._id.toString()).toBe(testEvent._id.toString());
      expect(res.body.data.overallHealth).toBeDefined();
    });

    test('Support access via /events/:id/command-center', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/command-center`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Unauthorized organizer receives 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Attendee role receives 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Unauthenticated user receives 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/command-center/${testEvent._id}`);
      expect(res.status).toBe(401);
    });

    test('Platform admin can access command center of any event', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Non-existent event ID returns 404 Not Found', async () => {
      const fakeId = '66d000000000000000000001';
      const res = await request(app)
        .get(`/api/command-center/${fakeId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(404);
    });

    test('Malformed event ID returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/command-center/invalid-id-format')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('2. Aggregation & Structured Schema Completeness', () => {
    test('Returns all required top-level intelligence sections', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      const { data } = res.body;

      expect(data).toHaveProperty('event');
      expect(data).toHaveProperty('overallHealth');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('attendance');
      expect(data).toHaveProperty('safety');
      expect(data).toHaveProperty('queue');
      expect(data).toHaveProperty('trust');
      expect(data).toHaveProperty('seo');
      expect(data).toHaveProperty('recommendations');
      expect(data).toHaveProperty('actions');
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('trends');
      expect(data).toHaveProperty('freshness');
    });

    test('Overall Health contains score, status, formula, breakdown, and drivers', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      const { overallHealth } = res.body.data;
      expect(typeof overallHealth.score).toBe('number');
      expect(overallHealth.score).toBeGreaterThanOrEqual(0);
      expect(overallHealth.score).toBeLessThanOrEqual(100);
      expect(['Excellent', 'Good', 'Needs Attention', 'At Risk', 'Critical']).toContain(overallHealth.status);
      expect(overallHealth.breakdown).toHaveProperty('attendance');
      expect(overallHealth.breakdown).toHaveProperty('safety');
      expect(overallHealth.breakdown).toHaveProperty('registration');
      expect(overallHealth.breakdown).toHaveProperty('queue');
      expect(overallHealth.breakdown).toHaveProperty('content');
      expect(overallHealth.breakdown).toHaveProperty('trust');
      expect(overallHealth.formula).toBeDefined();
      expect(overallHealth.drivers).toBeDefined();
    });

    test('Each intelligence card exposes availability and direct navigation CTA', async () => {
      const res = await request(app)
        .get(`/api/command-center/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      const { attendance, safety, queue, trust, seo } = res.body.data;

      expect(attendance).toHaveProperty('available');
      expect(attendance).toHaveProperty('ctaLink');
      expect(safety).toHaveProperty('available');
      expect(safety).toHaveProperty('ctaLink');
      expect(queue).toHaveProperty('available');
      expect(queue).toHaveProperty('ctaLink');
      expect(trust).toHaveProperty('available');
      expect(trust).toHaveProperty('ctaLink');
      expect(seo).toHaveProperty('available');
      expect(seo).toHaveProperty('ctaLink');
    });
  });

  describe('3. Deterministic Health Score Engine Unit Tests', () => {
    test('Score is bounded strictly between 0 and 100', () => {
      expect(clamp(150)).toBe(100);
      expect(clamp(-50)).toBe(0);
      expect(clamp(NaN)).toBe(0);
      expect(clamp(null)).toBe(0);
    });

    test('Calculates weighted composite health without error', () => {
      const health = calculateEventHealth({
        event: { capacity: 200, registrationCount: 150 },
        pulseData: {
          attendance: { attendanceRate: 80, expectedAttendees: 120, expectedNoShows: 10 },
          health: { score: 85, confidence: 90 },
          registrations: { velocity24h: 5 },
        },
        shieldData: { safetyScore: 85, readinessScore: 90 },
        shieldAlerts: [],
        queueData: { metrics: { efficiencyScore: 80, waitingCount: 5, expirationRate: 10 } },
        boostProfile: { seoScore: 80, contentScore: 85, readabilityScore: 75 },
        trustProfile: { trustScore: 85, verified: true },
      });

      expect(health.score).toBeGreaterThanOrEqual(75);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(health.status).toBe('Good');
      expect(health.isOverridden).toBe(false);
    });

    test('Critical safety override caps score at <= 45 and forces At Risk / Critical status', () => {
      const health = calculateEventHealth({
        event: { capacity: 200, registrationCount: 150 },
        pulseData: { health: { score: 95 } },
        shieldData: { safetyScore: 95 },
        shieldAlerts: [
          { severity: 'critical', status: 'active', message: 'Venue fire exit blocked' },
        ],
        queueData: { metrics: { efficiencyScore: 90 } },
        boostProfile: { seoScore: 90 },
        trustProfile: { trustScore: 95, verified: true },
      });

      expect(health.score).toBeLessThanOrEqual(45);
      expect(['At Risk', 'Critical']).toContain(health.status);
      expect(health.isOverridden).toBe(true);
      expect(health.overrideReason).toContain('critical safety alert');
    });

    test('Overcapacity > 110% triggers override cap', () => {
      const health = calculateEventHealth({
        event: { capacity: 100, registrationCount: 125 }, // 125% capacity
        shieldAlerts: [],
      });

      expect(health.score).toBeLessThanOrEqual(45);
      expect(health.isOverridden).toBe(true);
    });
  });

  describe('4. Action Prioritization & Deduplication Unit Tests', () => {
    test('Assigns accurate priority tiers based on severity, impact, urgency', () => {
      expect(computePriorityScore('critical', 4, 4).priority).toBe('Critical');
      expect(computePriorityScore('high', 3, 3).priority).toBe('High');
      expect(computePriorityScore('medium', 2, 2).priority).toBe('Medium');
      expect(computePriorityScore('low', 1, 1).priority).toBe('Low');
    });

    test('Deduplicates duplicate alerts across same source and actionType', () => {
      const actions = [
        { source: 'eventshield', sourceId: 'alert1', actionType: 'capacity_overflow', title: 'Overflow 1' },
        { source: 'eventshield', sourceId: 'alert1', actionType: 'capacity_overflow', title: 'Overflow 1 duplicate' },
        { source: 'eventpulse', sourceId: 'pulse1', actionType: 'high_no_show_risk', title: 'No show' },
      ];

      const deduped = deduplicateActions(actions);
      expect(deduped.length).toBe(2);
      expect(deduped.map((a) => a.actionType)).toEqual(['capacity_overflow', 'high_no_show_risk']);
    });
  });

  describe('5. What-If Scenario Simulator', () => {
    test('POST /api/command-center/:eventId/simulate recalculates before and after metrics', async () => {
      const res = await request(app)
        .post(`/api/command-center/${testEvent._id}/simulate`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          registrationDeltaPct: 20,
          expectedAttendanceRate: 90,
          noShowRate: 5,
          capacityDelta: 50,
          safetyReadinessBoost: 15,
          seoScoreBoost: 15,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const sim = res.body.data;

      expect(sim.isSimulation).toBe(true);
      expect(sim).toHaveProperty('before');
      expect(sim).toHaveProperty('after');
      expect(sim).toHaveProperty('deltas');
      expect(sim.after.capacity).toBe(testEvent.capacity + 50);
      expect(sim.after.attendanceRate).toBe(90);
      expect(sim.disclaimer).toBeDefined();
    });

    test('runSimulation handles empty scenario gracefully', () => {
      const sim = runSimulation({ event: { capacity: 100, registrationCount: 50 } }, {});
      expect(sim.isSimulation).toBe(true);
      expect(sim.deltas.capacity).toBe(0);
    });
  });

  describe('6. AI Executive Brief & Narrative Fallback', () => {
    test('Deterministic fallback produces complete structured narrative without external AI', () => {
      const brief = generateDeterministicBrief({
        event: testEvent,
        health: { score: 82, status: 'Good' },
        actions: [
          {
            title: 'Attendance Reminder',
            whyItMatters: 'Mitigates no-show drop-off.',
            recommendedAction: 'Send 24h reminder push.',
            priority: 'High',
            ctaText: 'Send Notification',
            ctaLink: '/dashboard/events/test/notifications',
          },
        ],
      });

      expect(brief.engine).toBe('deterministic-fallback');
      expect(brief.situation).toContain(testEvent.title);
      expect(brief.situation).toContain('82/100');
      expect(Array.isArray(brief.positiveSignals)).toBe(true);
      expect(Array.isArray(brief.problems)).toBe(true);
      expect(brief.topAction).toBeDefined();
      expect(brief.topAction.action).toBe('Attendance Reminder');
      expect(brief.outlook).toBeDefined();
    });

    test('POST /api/command-center/:eventId/brief returns executive brief', async () => {
      const res = await request(app)
        .post(`/api/command-center/${testEvent._id}/brief`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('situation');
      expect(res.body.data).toHaveProperty('positiveSignals');
      expect(res.body.data).toHaveProperty('topAction');
      expect(res.body.data).toHaveProperty('outlook');
    });
  });

  describe('7. Action Resolution API', () => {
    test('PATCH /api/command-center/:eventId/actions/:actionId updates supported alert status', async () => {
      // Create test alert
      const alert = await EventRiskAlert.create({
        eventId: testEvent._id,
        type: 'capacity_warning',
        severity: 'high',
        message: 'High capacity utilization',
        status: 'active',
      });

      const res = await request(app)
        .patch(`/api/command-center/${testEvent._id}/actions/${alert._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updated).toBe(true);

      const check = await EventRiskAlert.findById(alert._id);
      expect(check.status).toBe('resolved');
    });
  });
});
