const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Feedback = require('../src/models/Feedback');
const Report = require('../src/models/Report');
const OrganizerTrustProfile = require('../src/models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../src/models/OrganizerTrustSnapshot');

const {
  scoringEngine,
  metricExtractor,
  aiInsightsService,
  trustProfileService,
  trustSimulationService,
  config,
} = require('../src/services/trustsphere');

describe('TrustSphere AI - Organizer Reputation & Trust Intelligence Test Suite', () => {
  let coldOrganizer, coldOrgToken;
  let establishedOrganizer, establishedOrgToken;
  let attendeeUser, attendeeToken;
  let adminUser, adminToken;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    const emails = [
      'trust.cold@test.com',
      'trust.est@test.com',
      'trust.att@test.com',
      'trust.adm@test.com',
    ];
    await User.deleteMany({ email: { $in: emails } });
    await Event.deleteMany({ title: /TrustSphere Test/i });

    // 1. Cold-start organizer
    const coldRes = await request(app).post('/api/auth/register').send({
      name: 'Cold Start Host',
      email: 'trust.cold@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    coldOrganizer = coldRes.body.data.user;
    coldOrgToken = coldRes.body.data.token;
    await User.findByIdAndUpdate(coldOrganizer._id, { organizerStatus: 'approved' });

    // 2. Established organizer
    const estRes = await request(app).post('/api/auth/register').send({
      name: 'Established Host',
      email: 'trust.est@test.com',
      password: 'Password123!',
      role: 'organizer',
      company: 'Premier Events Inc.',
    });
    establishedOrganizer = estRes.body.data.user;
    establishedOrgToken = estRes.body.data.token;
    await User.findByIdAndUpdate(establishedOrganizer._id, {
      organizerStatus: 'approved',
      isEmailVerified: true,
      phone: '+15550001111',
    });

    // 3. Attendee
    const attRes = await request(app).post('/api/auth/register').send({
      name: 'Trust Attendee',
      email: 'trust.att@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendeeUser = attRes.body.data.user;
    attendeeToken = attRes.body.data.token;

    // 4. Admin
    const admRes = await request(app).post('/api/auth/register').send({
      name: 'Trust Admin',
      email: 'trust.adm@test.com',
      password: 'Password123!',
      role: 'admin',
    });
    adminUser = admRes.body.data.user;
    adminToken = admRes.body.data.token;
    await User.findByIdAndUpdate(adminUser._id, { role: 'admin' });

    // Seed events for established organizer
    // 3 completed events + 1 live event
    for (let i = 1; i <= 3; i++) {
      const pastEv = await Event.create({
        title: `TrustSphere Test Completed Event ${i}`,
        slug: `trustsphere-test-completed-${i}-${Date.now()}`,
        description: 'Testing reputation scoring for completed events',
        eventType: 'online',
        categorySlug: 'technology',
        startDate: new Date(Date.now() - 30 * 86400000),
        endDate: new Date(Date.now() - 29 * 86400000),
        capacity: 100,
        registrationCount: 25,
        checkedInCount: 22,
        organizer: establishedOrganizer._id,
        status: 'completed',
        approvalStatus: 'approved',
        visibility: 'public',
      });

      // Add verified registrations and feedback
      const reg = await Registration.create({
        event: pastEv._id,
        user: attendeeUser._id,
        status: 'checked_in',
        checkedIn: true,
        checkedInAt: new Date(Date.now() - 29 * 86400000),
      });

      await Feedback.create({
        event: pastEv._id,
        user: attendeeUser._id,
        registration: reg._id,
        rating: 5,
        comment: 'Superb event, expertly organized and seamless experience!',
        sentiment: 'positive',
      });
    }

    testEvent = await Event.create({
      title: 'TrustSphere Test Live Event',
      slug: `trustsphere-test-live-${Date.now()}`,
      description: 'Active event for testing public organizer trust card',
      eventType: 'online',
      categorySlug: 'technology',
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 8 * 86400000),
      capacity: 50,
      registrationCount: 10,
      organizer: establishedOrganizer._id,
      status: 'published',
      approvalStatus: 'approved',
      visibility: 'public',
    });
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'trust.cold@test.com',
          'trust.est@test.com',
          'trust.att@test.com',
          'trust.adm@test.com',
        ],
      },
    });
    await Event.deleteMany({ title: /TrustSphere Test/i });
    await Feedback.deleteMany({});
    await Registration.deleteMany({});
    await Report.deleteMany({});
    await OrganizerTrustProfile.deleteMany({});
    await OrganizerTrustSnapshot.deleteMany({});
  });

  // ==========================================
  // 1. Scoring Engine Unit & Algorithmic Tests
  // ==========================================
  describe('1. Deterministic Scoring Engine & Algorithmic Protection', () => {
    test('1.1. Cold-start organizer with 0 events is marked with limited confidence', () => {
      const mockMetrics = {
        organizer: { _id: 'org1', createdAt: new Date() },
        metrics: {
          totalEvents: 0,
          completedEvents: 0,
          cancelledEvents: 0,
          completionRate: 100,
          cancellationRate: 0,
          attendeesServed: 0,
          reviewsCount: 0,
          averageRating: 0,
          satisfactionPercentage: 80,
          confirmedViolationsCount: 0,
          hasIdentityVerification: false,
          hasEmailVerified: false,
          accountAgeMonths: 0,
        },
        events: { completed: [] },
      };

      const result = scoringEngine.scoreOrganizer(mockMetrics);
      expect(result.confidenceLevel).toBe('limited');
      expect(result.components.completion).toBe(70); // neutral baseline
      expect(result.trustScore).toBeGreaterThanOrEqual(0);
      expect(result.trustScore).toBeLessThanOrEqual(100);
    });

    test('1.2. Bayesian smoothing prevents 1 perfect 5-star review from yielding 100% satisfaction', () => {
      const mockMetrics = {
        organizer: { _id: 'org2', createdAt: new Date(Date.now() - 60 * 86400000) },
        metrics: {
          totalEvents: 3,
          completedEvents: 3,
          cancelledEvents: 0,
          completionRate: 100,
          cancellationRate: 0,
          attendeesServed: 40,
          reviewsCount: 1, // Only 1 review
          averageRating: 5.0,
          satisfactionPercentage: 100,
          confirmedViolationsCount: 0,
          hasIdentityVerification: true,
          hasEmailVerified: true,
          accountAgeMonths: 2,
        },
        events: {
          completed: [
            { endDate: new Date(), status: 'completed' },
            { endDate: new Date(), status: 'completed' },
            { endDate: new Date(), status: 'completed' },
          ],
        },
      };

      const result = scoringEngine.scoreOrganizer(mockMetrics);
      // Smoothed rating = (5*4.0 + 1*5.0) / (5 + 1) = 25 / 6 = 4.167 (out of 5 -> ~83.3%)
      expect(result.metrics.satisfactionPercentage).toBe(100);
      expect(result.components.satisfaction).toBeLessThan(90);
      expect(result.components.satisfaction).toBeGreaterThan(70);
    });

    test('1.3. High cancellation rate significantly penalizes completion component score', () => {
      const mockMetrics = {
        organizer: { _id: 'org3', createdAt: new Date(Date.now() - 180 * 86400000) },
        metrics: {
          totalEvents: 10,
          completedEvents: 5,
          cancelledEvents: 5,
          completionRate: 50,
          cancellationRate: 50,
          attendeesServed: 60,
          reviewsCount: 10,
          averageRating: 4.0,
          satisfactionPercentage: 80,
          confirmedViolationsCount: 0,
          hasIdentityVerification: true,
          hasEmailVerified: true,
          accountAgeMonths: 6,
        },
        events: { completed: [] },
      };

      const result = scoringEngine.scoreOrganizer(mockMetrics);
      expect(result.components.completion).toBeLessThan(60);
      expect(result.factors.some((f) => f.factor === 'cancellation_rate' && f.impact === 'negative')).toBe(true);
    });

    test('1.4. Confirmed violations deduct compliance score while unconfirmed reports do not', () => {
      const mockMetrics = {
        organizer: { _id: 'org4', createdAt: new Date(Date.now() - 180 * 86400000) },
        metrics: {
          totalEvents: 5,
          completedEvents: 5,
          cancelledEvents: 0,
          completionRate: 100,
          cancellationRate: 0,
          attendeesServed: 100,
          reviewsCount: 8,
          averageRating: 4.5,
          satisfactionPercentage: 90,
          confirmedViolationsCount: 1,
          confirmedViolationsList: [{ reason: 'fake_event' }],
          openReports: 3, // Open/pending reports should not affect compliance
          dismissedReports: 2, // Dismissed reports should not affect compliance
          hasIdentityVerification: true,
          hasEmailVerified: true,
          accountAgeMonths: 6,
        },
        events: {
          completed: [
            { endDate: new Date(), status: 'completed' },
            { endDate: new Date(), status: 'completed' },
          ],
        },
      };

      const result = scoringEngine.scoreOrganizer(mockMetrics);
      // fake_event deducts 30 points from 100 -> compliance score = 70
      expect(result.components.compliance).toBe(70);
      expect(result.factors.some((f) => f.factor === 'confirmed_violations' && f.impact === 'negative')).toBe(true);
    });

    test('1.5. Badges are granted appropriately based on verified achievements', () => {
      const mockMetrics = {
        organizer: { _id: 'org5', organizerStatus: 'approved', createdAt: new Date(Date.now() - 365 * 86400000) },
        metrics: {
          totalEvents: 12,
          completedEvents: 12,
          cancelledEvents: 0,
          completionRate: 100,
          cancellationRate: 0,
          attendeesServed: 250,
          totalFeedbackCount: 20,
          reviewsCount: 20,
          averageRating: 4.9,
          satisfactionPercentage: 98,
          confirmedViolationsCount: 0,
          hasIdentityVerification: true,
          hasEmailVerified: true,
          accountAgeMonths: 12,
        },
        events: {
          completed: Array(12).fill({ endDate: new Date(), status: 'completed' }),
        },
      };

      const result = scoringEngine.scoreOrganizer(mockMetrics);
      expect(result.badges).toContain('Highly Reliable');
      expect(result.badges).toContain('Top Rated');
      expect(result.badges).toContain('Consistent Host');
      expect(result.badges).toContain('Verified Organizer');
    });
  });

  // ==========================================
  // 2. What-If Simulation Sandbox Tests
  // ==========================================
  describe('2. What-If Reputation Simulator Sandbox', () => {
    test('2.1. Simulating higher completion improves score in memory without DB mutations', async () => {
      const simulation = await trustSimulationService.simulateTrustScenario(establishedOrganizer._id, {
        completionRate: 100,
        additionalCompletedEvents: 5,
        additionalAttendeesServed: 100,
      });

      expect(simulation.isSimulation).toBe(true);
      expect(simulation).toHaveProperty('original');
      expect(simulation).toHaveProperty('simulated');
      expect(simulation).toHaveProperty('scoreDelta');
      expect(simulation.simulated.trustScore).toBeGreaterThanOrEqual(simulation.original.trustScore);

      // Verify DB record was not mutated by simulation
      const dbProfile = await OrganizerTrustProfile.findOne({ organizer: establishedOrganizer._id });
      if (dbProfile) {
        expect(dbProfile.trustScore).toBe(simulation.original.trustScore);
      }
    });
  });

  // ==========================================
  // 3. API Integration & Role-Based Access Tests
  // ==========================================
  describe('3. TrustSphere HTTP API Endpoints & Role Redactions', () => {
    test('3.1. Public endpoint returns organizer trust with privacy redactions (GET /api/trust/organizers/:id)', async () => {
      const res = await request(app)
        .get(`/api/trust/organizers/${establishedOrganizer._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trustScore');
      expect(res.body.data).toHaveProperty('trustLevel');
      expect(res.body.data).toHaveProperty('badges');
      expect(res.body.data).toHaveProperty('components');

      // Ensure private moderation details are NOT leaked to public
      expect(res.body.data.metrics).not.toHaveProperty('confirmedViolationsList');
      expect(res.body.data.metrics).not.toHaveProperty('openReports');
      expect(res.body.data.metrics).not.toHaveProperty('dismissedReports');
    });

    test('3.2. Public helper retrieves trust for an event host (GET /api/trust/events/:eventId/organizer)', async () => {
      const res = await request(app)
        .get(`/api/trust/events/${testEvent._id}/organizer`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizer._id.toString()).toBe(establishedOrganizer._id.toString());
      expect(res.body.data).toHaveProperty('trustScore');
    });

    test('3.3. Historical snapshots endpoint returns timeline array (GET /api/trust/organizers/:id/history)', async () => {
      const res = await request(app)
        .get(`/api/trust/organizers/${establishedOrganizer._id}/history`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('3.4. Cold-start organizer returns "Building Trust History" confidence level', async () => {
      const res = await request(app)
        .get(`/api/trust/organizers/${coldOrganizer._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.confidenceLevel).toBe('limited');
    });

    test('3.5. Authenticated organizer can view their private trust dashboard (GET /api/trust/me)', async () => {
      const res = await request(app)
        .get('/api/trust/me')
        .set('Authorization', `Bearer ${establishedOrgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trustScore');
      expect(res.body.data).toHaveProperty('factors');
      expect(Array.isArray(res.body.data.factors)).toBe(true);
      expect(res.body.data.factors.some((f) => f.impact === 'positive')).toBe(true);
    });

    test('3.6. Authenticated organizer can request AI Reputation Insights (GET /api/trust/me/ai-insights)', async () => {
      const res = await request(app)
        .get('/api/trust/me/ai-insights')
        .set('Authorization', `Bearer ${establishedOrgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(Array.isArray(res.body.data.strengths)).toBe(true);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    });

    test('3.7. Authenticated organizer can run simulation (POST /api/trust/me/simulate)', async () => {
      const res = await request(app)
        .post('/api/trust/me/simulate')
        .set('Authorization', `Bearer ${establishedOrgToken}`)
        .send({
          additionalCompletedEvents: 3,
          additionalAttendeesServed: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSimulation).toBe(true);
      expect(res.body.data).toHaveProperty('scoreDelta');
    });

    test('3.8. Authenticated organizer can trigger manual recalculation (POST /api/trust/me/recalculate)', async () => {
      const res = await request(app)
        .post('/api/trust/me/recalculate')
        .set('Authorization', `Bearer ${establishedOrgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trustScore');
      expect(res.body.data.lastCalculatedAt).toBeDefined();
    });

    test('3.9. Admin can access platform-wide trust analytics (GET /api/trust/admin/analytics)', async () => {
      const res = await request(app)
        .get('/api/trust/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalProfiles');
      expect(res.body.data).toHaveProperty('platformAvgTrustScore');
      expect(res.body.data).toHaveProperty('distribution');
      expect(res.body.data).toHaveProperty('flaggedOrganizers');
    });

    test('3.10. Non-admin is forbidden from admin trust analytics endpoint', async () => {
      const res = await request(app)
        .get('/api/trust/admin/analytics')
        .set('Authorization', `Bearer ${establishedOrgToken}`);

      expect(res.status).toBe(403);
    });

    test('3.11. Attendee is forbidden from organizer /me endpoint', async () => {
      const res = await request(app)
        .get('/api/trust/me')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
