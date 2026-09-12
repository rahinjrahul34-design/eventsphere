const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Feedback = require('../src/models/Feedback');
const Poll = require('../src/models/Poll');
const Question = require('../src/models/Question');
const EventPrediction = require('../src/models/EventPrediction');
const EventPredictionSnapshot = require('../src/models/EventPredictionSnapshot');
const PredictionOutcome = require('../src/models/PredictionOutcome');

const BaselineModel = require('../src/services/eventpulse/models/baselineModel');
const RegressionModel = require('../src/services/eventpulse/models/regressionModel');
const EnsembleModel = require('../src/services/eventpulse/models/ensembleModel');
const { calculateRegistrationVelocity } = require('../src/services/eventpulse/velocityService');
const { calculateExpectedAttendance } = require('../src/services/eventpulse/attendanceService');
const { calculateEngagementScore } = require('../src/services/eventpulse/engagementService');
const { calculateEventHealth } = require('../src/services/eventpulse/healthScoreService');
const { calculatePredictionConfidence } = require('../src/services/eventpulse/confidenceService');
const { extractPredictionDrivers } = require('../src/services/eventpulse/driverService');
const { generateOrganizerRecommendations } = require('../src/services/eventpulse/recommendationActionService');
const { simulateScenario } = require('../src/services/eventpulse/simulationService');
const { evaluateCompletedEvent } = require('../src/services/eventpulse/accuracyService');
const { answerNaturalLanguageQuery } = require('../src/services/eventpulse/aiNarrativeService');

describe('EventPulse AI - Predictive Intelligence Test Suite', () => {
  let organizer, organizerToken;
  let otherUser, otherUserToken;
  let adminUser, adminToken;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    // Clean test accounts
    await User.deleteMany({ email: { $in: ['pulse.org@test.com', 'pulse.other@test.com', 'pulse.adm@test.com'] } });
    await Event.deleteMany({ title: /EventPulse Test Event/i });

    // 1. Create Organizer
    const orgRes = await request(app).post('/api/auth/register').send({
      name: 'Pulse Organizer',
      email: 'pulse.org@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    organizer = orgRes.body.data.user;
    organizerToken = orgRes.body.data.token;
    await User.findByIdAndUpdate(organizer._id, { organizerStatus: 'approved' });

    // 2. Create Other User (Attendee)
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Pulse Attendee',
      email: 'pulse.other@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    otherUser = otherRes.body.data.user;
    otherUserToken = otherRes.body.data.token;

    // 3. Create Admin
    const admRes = await request(app).post('/api/auth/register').send({
      name: 'Pulse Admin',
      email: 'pulse.adm@test.com',
      password: 'Password123!',
      role: 'admin',
    });
    adminUser = admRes.body.data.user;
    adminToken = admRes.body.data.token;
    await User.findByIdAndUpdate(adminUser._id, { role: 'admin' });

    // 4. Create Event
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 6);

    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'EventPulse Test Event 2026',
        description: 'Comprehensive predictive intelligence test event.',
        categorySlug: 'technology',
        eventType: 'offline',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        capacity: 200,
        price: 0,
      });

    testEvent = eventRes.body.data;
  });

  afterAll(async () => {
    await EventPrediction.deleteMany({ eventId: testEvent?._id });
    await EventPredictionSnapshot.deleteMany({ eventId: testEvent?._id });
    await PredictionOutcome.deleteMany({ eventId: testEvent?._id });
    await Event.deleteMany({ _id: testEvent?._id });
    await User.deleteMany({ _id: { $in: [organizer?._id, otherUser?._id, adminUser?._id] } });
    await disconnectDB();
  });

  // ==========================================
  // SECTION 1: Pure Mathematical Prediction Logic (Unit Tests)
  // ==========================================

  describe('Core Prediction Mathematics & Algorithms', () => {
    test('1. calculateRegistrationVelocity detects accelerating momentum correctly', () => {
      const result = calculateRegistrationVelocity({
        velocity: { last24h: 15, prev24h: 5 },
      });
      expect(result.momentumState).toBe('accelerating');
      expect(result.growthRate).toBeGreaterThan(0.25);
      expect(result.label).toContain('Accelerating');
    });

    test('2. calculateRegistrationVelocity detects slowing/declining momentum correctly', () => {
      const slowing = calculateRegistrationVelocity({
        velocity: { last24h: 8, prev24h: 10 },
      });
      expect(slowing.momentumState).toBe('slowing');

      const declining = calculateRegistrationVelocity({
        velocity: { last24h: 2, prev24h: 10 },
      });
      expect(declining.momentumState).toBe('declining');
    });

    test('3. calculateExpectedAttendance computes attendance rate, no-shows and valid prediction intervals', () => {
      const mockFeatures = {
        event: { isLive: false, isCompleted: false },
        registrations: { totalConfirmed: 100, currentCheckedIns: 0 },
        timing: { daysRemaining: 5 },
      };

      const result = calculateExpectedAttendance(mockFeatures, 100, 0.75);
      expect(result.expectedAttendees).toBe(75);
      expect(result.expectedNoShows).toBe(25);
      expect(result.attendanceRate).toBe(75.0);
      expect(result.noShowRate).toBe(25.0);
      expect(result.lowerBound).toBeLessThanOrEqual(result.expectedAttendees);
      expect(result.upperBound).toBeGreaterThanOrEqual(result.expectedAttendees);
      expect(result.isLiveAdjustment).toBe(false);
    });

    test('4. calculateExpectedAttendance incorporates real-time late arrival decay in live mode', () => {
      const now = Date.now();
      const mockLiveFeatures = {
        event: {
          isLive: true,
          isCompleted: false,
          startDate: new Date(now - 1000 * 60 * 60), // 1 hour elapsed
          endDate: new Date(now + 1000 * 60 * 60 * 3), // 3 hours remaining
        },
        registrations: { totalConfirmed: 100, currentCheckedIns: 50 },
        timing: { daysRemaining: 0 },
      };

      const result = calculateExpectedAttendance(mockLiveFeatures, 100, 0.80);
      expect(result.isLiveAdjustment).toBe(true);
      expect(result.expectedAttendees).toBeGreaterThanOrEqual(50);
      expect(result.lowerBound).toBe(50);
    });

    test('5. calculateExpectedAttendance returns ground truth actuals for completed events', () => {
      const mockCompleted = {
        event: { isLive: false, isCompleted: true },
        registrations: { totalConfirmed: 120, currentCheckedIns: 96 },
        timing: { daysRemaining: 0 },
      };

      const result = calculateExpectedAttendance(mockCompleted, 120, 0.75);
      expect(result.expectedAttendees).toBe(96);
      expect(result.expectedNoShows).toBe(24);
      expect(result.attendanceRate).toBe(80.0);
    });

    test('6. calculateEngagementScore calculates 5-dimension breakdown and appropriate levels', () => {
      const mockFeatures = {
        event: { isLive: false, isCompleted: false, categorySlug: 'technology' },
        registrations: { totalConfirmed: 80, capacityUtilization: 0.8, currentCheckedIns: 0, velocity: { last24h: 5, prev24h: 2, growthRate: 1.5 } },
        engagement: { pollVotes: 40, questionsCount: 15, questionUpvotes: 20, chatMessages: 30, feedbackCount: 10, avgRating: 4.5, positiveFeedbacks: 9 },
        timing: { daysRemaining: 3 },
      };

      const result = calculateEngagementScore(mockFeatures, 60);
      expect(result.score).toBeGreaterThanOrEqual(10);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toHaveProperty('participation');
      expect(result.breakdown).toHaveProperty('interaction');
      expect(result.breakdown).toHaveProperty('liveActivity');
      expect(result.breakdown).toHaveProperty('feedback');
      expect(result.breakdown).toHaveProperty('networking');
      expect(['low', 'medium', 'high', 'very_high']).toContain(result.level);
    });

    test('7. calculateEventHealth computes composite score and status categories', () => {
      const mockFeatures = {
        registrations: { capacityUtilization: 0.85 },
        engagement: { feedbackCount: 5, positiveFeedbacks: 5 },
        event: {},
      };
      const velocityData = { momentumState: 'growing' };
      const attendanceData = { attendanceRate: 78.0 };
      const engagementData = { score: 82 };

      const health = calculateEventHealth(mockFeatures, velocityData, attendanceData, engagementData);
      expect(health.score).toBeGreaterThanOrEqual(65);
      expect(['healthy', 'good', 'attention', 'at_risk']).toContain(health.status);
    });

    test('8. calculatePredictionConfidence evaluates data completeness and sample size', () => {
      const mockColdStart = {
        event: { isLive: false, isCompleted: false, ticketTypesCount: 0, views: 0 },
        registrations: { totalConfirmed: 2 },
        historical: { hasOrgHistory: false, historicalEventsCount: 0 },
        timing: { daysRemaining: 30, daysSincePublication: 1 },
        engagement: { chatMessages: 0, pollVotes: 0 },
      };
      const coldConf = calculatePredictionConfidence(mockColdStart);
      expect(coldConf.level).toBe('low');
      expect(coldConf.reasons.some((r) => r.toLowerCase().includes('cold start'))).toBe(true);

      const mockMature = {
        event: { isLive: false, isCompleted: false, ticketTypesCount: 2, views: 150 },
        registrations: { totalConfirmed: 120 },
        historical: { hasOrgHistory: true, historicalEventsCount: 5 },
        timing: { daysRemaining: 2, daysSincePublication: 14 },
        engagement: { chatMessages: 20, pollVotes: 10 },
      };
      const matureConf = calculatePredictionConfidence(mockMature);
      expect(matureConf.score).toBeGreaterThan(coldConf.score);
      expect(matureConf.level).toBe('high');
    });

    test('9. extractPredictionDrivers synthesizes positive and negative factor attribution', () => {
      const mockFeatures = {
        event: { isPaid: true, categorySlug: 'technology' },
        timing: { daysRemaining: 2 },
        registrations: { capacityUtilization: 0.92, velocity: { avgDailyLast7d: 8 }, recommendationRegs: 20, totalConfirmed: 92 },
        historical: { hasOrgHistory: true, historicalOrgAttendanceRate: 0.82 },
      };
      const velocityData = { momentumState: 'accelerating', growthRate: 0.45, growthRatePct: 45, last24h: 15 };
      const attendanceData = { expectedAttendees: 75 };

      const drivers = extractPredictionDrivers(mockFeatures, velocityData, attendanceData);
      expect(drivers.length).toBeGreaterThanOrEqual(2);
      expect(drivers.some((d) => d.direction === 'positive')).toBe(true);
    });

    test('10. generateOrganizerRecommendations produces signal-tied actions', () => {
      const mockFeatures = {
        event: { isLive: false, isCompleted: false },
        timing: { daysRemaining: 3 },
        registrations: { capacityUtilization: 0.92, totalConfirmed: 92 },
        engagement: { questionsCount: 0 },
      };
      const velocityData = { momentumState: 'slowing', growthRatePct: -25 };
      const attendanceData = { noShowRate: 35.0 };
      const engagementData = { breakdown: { liveActivity: 50 } };

      const actions = generateOrganizerRecommendations(mockFeatures, velocityData, attendanceData, engagementData);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.trigger === 'high_noshow_rate')).toBe(true);
    });

    test('11. simulateScenario executes What-If simulations without database changes', () => {
      const baseFeatures = {
        event: { capacity: 100, isPaid: false, categorySlug: 'technology', eventType: 'offline' },
        timing: { daysRemaining: 10, daysSincePublication: 5 },
        registrations: {
          totalConfirmed: 40,
          capacityUtilization: 0.4,
          velocity: { last24h: 3, prev24h: 3, last7d: 21, avgDailyLast7d: 3 },
        },
        engagement: { pollVotes: 0, questionsCount: 0, questionUpvotes: 0, chatMessages: 0, feedbackCount: 0, avgRating: 0 },
        historical: { hasOrgHistory: false, historicalEventsCount: 0, isColdStart: true },
      };

      const sim = simulateScenario(baseFeatures, {
        capacity: 250,
        isPaid: true,
        reminderSent: true,
      });

      expect(sim.isSimulation).toBe(true);
      expect(sim.simulationTag).toContain('SYNTHETIC DATA');
      expect(sim.attendance).toHaveProperty('expectedAttendees');
      expect(sim.forecast).toHaveProperty('predictedRegistrations');
      // Ensure base features were not mutated
      expect(baseFeatures.event.capacity).toBe(100);
      expect(baseFeatures.event.isPaid).toBe(false);
    });

    test('12. evaluateCompletedEvent computes absolute and percentage error metrics', async () => {
      const mockFeatures = {
        event: { isCompleted: true },
        registrations: { totalConfirmed: 100, currentCheckedIns: 80 },
        engagement: { score: 75 },
      };
      const mockPred = {
        forecast: { predictedRegistrations: 95 },
        attendance: { expectedAttendees: 76, expectedNoShows: 19 },
        engagement: { score: 70 },
      };

      const outcome = await evaluateCompletedEvent(testEvent._id, mockFeatures, mockPred);
      expect(outcome.errors.registrationAE).toBe(5);
      expect(outcome.errors.registrationPE).toBe(5.0);
      expect(outcome.errors.attendanceAE).toBe(4);
      expect(outcome.errors.attendancePE).toBe(5.0);
    });

    test('13. answerNaturalLanguageQuery answers queries deterministically', async () => {
      const mockPred = {
        forecast: { predictedRegistrations: 100, velocity24h: 12, growthRate: 0.2 },
        attendance: { expectedAttendees: 80, attendanceRate: 80, expectedNoShows: 20, noShowRate: 20, lowerBound: 72, upperBound: 88 },
        engagement: { score: 85, level: 'very_high' },
        health: { score: 90, status: 'healthy' },
        confidence: { score: 85 },
        drivers: [{ factor: 'High velocity', impact: 'Strong inflow', direction: 'positive' }],
        recommendations: [{ priority: 'high', title: 'Send reminder', action: 'Broadcast email', rationale: 'Boost readiness' }],
      };
      const mockFeatures = { event: { title: 'AI Hackathon' }, registrations: { totalConfirmed: 80 } };

      const res1 = await answerNaturalLanguageQuery('How many attendees should I expect?', mockPred, mockFeatures);
      expect(res1.answer).toContain('80 attendees');
      expect(res1.answer).toContain('80%');

      const res2 = await answerNaturalLanguageQuery('What can I do to improve attendance?', mockPred, mockFeatures);
      expect(res2.answer).toContain('Send reminder');
    });
  });

  // ==========================================
  // SECTION 2: API Endpoints & Security Authorization
  // ==========================================

  describe('REST API Endpoints & Security', () => {
    test('14. Unauthenticated request to /api/events/:id/eventpulse is rejected with 401', async () => {
      const res = await request(app).get(`/api/events/${testEvent._id}/eventpulse`);
      expect(res.status).toBe(401);
    });

    test('15. Unauthorized attendee is forbidden (403) from viewing private predictions', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventpulse`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(res.status).toBe(403);
    });

    test('16. Event organizer can fetch predictions (GET /api/events/:id/eventpulse)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventpulse`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('forecast');
      expect(res.body.data).toHaveProperty('attendance');
      expect(res.body.data).toHaveProperty('engagement');
      expect(res.body.data).toHaveProperty('health');
      expect(res.body.data).toHaveProperty('confidence');
      expect(res.body.data).toHaveProperty('drivers');
      expect(res.body.data).toHaveProperty('recommendations');
    });

    test('17. Organizer can force recalculation (POST /api/events/:id/eventpulse/analyze)', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/eventpulse/analyze`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.forecast.predictedRegistrations).toBeGreaterThanOrEqual(0);
    });

    test('18. Organizer can fetch prediction history snapshots (GET /api/events/:id/eventpulse/history)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventpulse/history`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('19. Organizer can fetch live signals (GET /api/events/:id/eventpulse/live)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventpulse/live`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentCheckedIns');
      expect(res.body.data).toHaveProperty('engagementScore');
    });

    test('20. Organizer can execute What-If scenario simulations (POST /api/events/:id/eventpulse/simulate)', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/eventpulse/simulate`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          capacity: 350,
          isPaid: true,
          reminderSent: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSimulation).toBe(true);
      expect(res.body.data.attendance.expectedAttendees).toBeGreaterThan(0);
    });

    test('21. Natural language query endpoint functions as expected (POST /api/events/:id/eventpulse/query)', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/eventpulse/query`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          question: 'How many attendees should I expect?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('answer');
      expect(res.body.data).toHaveProperty('confidence');
    });

    test('22. Admin can access platform accuracy metrics (GET /admin/eventpulse/accuracy)', async () => {
      const res = await request(app)
        .get('/api/admin/eventpulse/accuracy')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('evaluatedEventsCount');
      expect(res.body.data).toHaveProperty('registrationMAE');
    });

    test('23. Non-admin is forbidden from admin accuracy endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/eventpulse/accuracy')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
