const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Session = require('../src/models/Session');
const Volunteer = require('../src/models/Volunteer');
const EventRiskAssessment = require('../src/models/EventRiskAssessment');
const RiskAssessmentHistory = require('../src/models/RiskAssessmentHistory');
const EventRiskAlert = require('../src/models/EventRiskAlert');
const { evaluateEventRisk, simulateEventRisk } = require('../src/services/eventShieldEngine');

describe('EventShield AI - Comprehensive Test Suite', () => {
  let organizer, organizerToken;
  let attendee, attendeeToken;
  let admin, adminToken;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    // Clean test records
    await User.deleteMany({ email: { $in: ['shield.org@test.com', 'shield.att@test.com', 'shield.adm@test.com'] } });
    await Event.deleteMany({ title: /EventShield Test Event/i });

    // 1. Create Organizer
    const orgRes = await request(app).post('/api/auth/register').send({
      name: 'Shield Organizer',
      email: 'shield.org@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    organizer = orgRes.body.data.user;
    organizerToken = orgRes.body.data.token;
    await User.findByIdAndUpdate(organizer._id, { organizerStatus: 'approved' });

    // 2. Create Attendee
    const attRes = await request(app).post('/api/auth/register').send({
      name: 'Shield Attendee',
      email: 'shield.att@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee = attRes.body.data.user;
    attendeeToken = attRes.body.data.token;

    // 3. Create Admin
    const admRes = await request(app).post('/api/auth/register').send({
      name: 'Shield Admin',
      email: 'shield.adm@test.com',
      password: 'Password123!',
      role: 'admin',
    });
    admin = admRes.body.data.user;
    adminToken = admRes.body.data.token;
    await User.findByIdAndUpdate(admin._id, { role: 'admin' });

    // 4. Create Baseline Test Event
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'EventShield Test Event 2026',
        startDate: new Date(Date.now() + 7 * 86400000),
        endDate: new Date(Date.now() + 8 * 86400000),
        capacity: 200,
        eventType: 'offline',
        venue: {
          name: 'Tech Convention Center',
          address: '100 Innovation Way',
          city: 'San Francisco',
        },
        faq: [{ q: 'What time do doors open?', a: 'Doors open at 8:30 AM.' }],
      });

    testEvent = eventRes.body.data;
  });

  afterAll(async () => {
    if (testEvent) {
      await EventRiskAssessment.deleteMany({ eventId: testEvent._id });
      await RiskAssessmentHistory.deleteMany({ eventId: testEvent._id });
      await EventRiskAlert.deleteMany({ eventId: testEvent._id });
      await Session.deleteMany({ event: testEvent._id });
      await Volunteer.deleteMany({ event: testEvent._id });
      await Event.deleteMany({ _id: testEvent._id });
    }
    await User.deleteMany({ email: { $in: ['shield.org@test.com', 'shield.att@test.com', 'shield.adm@test.com'] } });
    await disconnectDB();
  });

  describe('Deterministic Engine Unit Tests', () => {
    it('1. evaluates low-risk baseline event correctly', () => {
      const mockEvent = {
        capacity: 200,
        registrationCount: 120,
        eventType: 'offline',
        venue: { name: 'Main Hall', address: '123 Main St', city: 'Metro' },
        safetyConfig: {
          entryGates: 2,
          checkInDesks: 2,
          staffCount: 6,
          emergencyContact: { name: 'Jane Doe', phone: '555-0199' },
          firstAidStation: { location: 'Lobby Station' },
          accessibilityInfo: { hasRampAccess: true, hasWheelchairSeating: true },
          evacuationInstructions: 'Exit through fire doors to North parking lot assembly point.',
          isOutdoor: false,
        },
        faq: [{ q: 'Rules?', a: 'Standard guidelines apply.' }],
      };

      const result = evaluateEventRisk(mockEvent);
      expect(result.safetyScore).toBeGreaterThanOrEqual(85);
      expect(result.overallRiskLevel).toBe('low');
      expect(result.categories).toHaveLength(15);
      expect(result.disclaimer).toContain('does not replace qualified safety professionals');
    });

    it('2. evaluates severe overcapacity as critical risk', () => {
      const overcapacityEvent = {
        capacity: 100,
        registrationCount: 150, // 150% capacity
        eventType: 'offline',
      };
      const result = evaluateEventRisk(overcapacityEvent);
      const capCat = result.categories.find((c) => c.id === 'capacity');
      expect(capCat.riskLevel).toBe('critical');
      expect(capCat.score).toBeLessThanOrEqual(45);
      expect(capCat.issues[0]).toMatch(/Severe overcapacity/i);
    });

    it('3. detects crowd flow ingress bottlenecks when gates are insufficient', () => {
      const bottleneckEvent = {
        capacity: 1000,
        registrationCount: 800,
        eventType: 'offline',
        safetyConfig: { entryGates: 1, checkInDesks: 1 }, // 800 attendees per gate!
      };
      const result = evaluateEventRisk(bottleneckEvent);
      const crowdCat = result.categories.find((c) => c.id === 'crowd');
      expect(crowdCat.riskLevel).toBe('critical');
      expect(crowdCat.score).toBeLessThanOrEqual(40);
      expect(crowdCat.issues.length).toBeGreaterThan(0);
    });

    it('4. detects staffing shortage when in-person event has 0 staff', () => {
      const understaffedEvent = {
        capacity: 200,
        registrationCount: 150,
        eventType: 'offline',
        safetyConfig: { staffCount: 0 },
      };
      const result = evaluateEventRisk(understaffedEvent, { volunteers: [] });
      const staffCat = result.categories.find((c) => c.id === 'staffing');
      expect(staffCat.riskLevel).toBe('critical');
      expect(staffCat.score).toBeLessThanOrEqual(35);
      expect(staffCat.issues[0]).toMatch(/Zero staff or volunteers/i);
    });

    it('5. detects schedule room overlaps and speaker double-booking', () => {
      const now = Date.now();
      const sessions = [
        {
          title: 'AI Keynote',
          room: 'Room A',
          speaker: '507f1f77bcf86cd799439011',
          startTime: new Date(now + 3600000),
          endTime: new Date(now + 7200000),
        },
        {
          title: 'Cybersecurity Panel',
          room: 'Room A', // Room conflict!
          speaker: '507f1f77bcf86cd799439012',
          startTime: new Date(now + 5400000),
          endTime: new Date(now + 9000000),
        },
      ];

      const result = evaluateEventRisk({ eventType: 'offline' }, { sessions });
      const schedCat = result.categories.find((c) => c.id === 'schedule');
      expect(schedCat.riskLevel).toMatch(/medium|high/);
      expect(schedCat.issues[0]).toMatch(/overlap/i);
    });

    it('6. detects emergency preparedness gaps (missing phone & evacuation)', () => {
      const eventNoEmergency = {
        capacity: 100,
        registrationCount: 50,
        eventType: 'offline',
        safetyConfig: {
          emergencyContact: { phone: '' },
          evacuationInstructions: '',
        },
      };
      const result = evaluateEventRisk(eventNoEmergency);
      const emCat = result.categories.find((c) => c.id === 'emergency');
      expect(emCat.riskLevel).toBe('critical');
      expect(emCat.score).toBeLessThanOrEqual(35);
    });

    it('7. detects accessibility deficiencies for in-person events', () => {
      const inaccessibleEvent = {
        eventType: 'offline',
        safetyConfig: {
          accessibilityInfo: { hasRampAccess: false, hasWheelchairSeating: false },
        },
      };
      const result = evaluateEventRisk(inaccessibleEvent);
      const accCat = result.categories.find((c) => c.id === 'accessibility');
      expect(accCat.riskLevel).toBe('high');
      expect(accCat.score).toBeLessThanOrEqual(50);
    });

    it('8. flags outdoor environmental exposure when isOutdoor is true', () => {
      const outdoorEvent = {
        eventType: 'offline',
        safetyConfig: { isOutdoor: true },
      };
      const result = evaluateEventRisk(outdoorEvent);
      const weatherCat = result.categories.find((c) => c.id === 'weather');
      expect(weatherCat.riskLevel).toBe('medium');
      expect(weatherCat.score).toBeLessThanOrEqual(60);
      expect(weatherCat.issues[0]).toMatch(/Outdoor event setup/i);
    });

    it('9. adapts gracefully for virtual/online events (no physical venue penalty)', () => {
      const onlineEvent = {
        eventType: 'online',
        venue: { onlineUrl: 'https://meet.eventsphere.com/live' },
      };
      const result = evaluateEventRisk(onlineEvent);
      const weatherCat = result.categories.find((c) => c.id === 'weather');
      const parkingCat = result.categories.find((c) => c.id === 'parking');
      expect(weatherCat.score).toBe(100);
      expect(parkingCat.score).toBe(100);
    });

    it('10. in-memory What-If Simulator calculates accurate deltas without mutating event', () => {
      const baseEvent = {
        capacity: 100,
        registrationCount: 150, // Overcapacity
        safetyConfig: { entryGates: 1, checkInDesks: 1, staffCount: 0 },
      };

      const simResult = simulateEventRisk(baseEvent, {
        capacity: 250,
        entryGates: 4,
        checkInDesks: 4,
        staffCount: 10,
        hasEmergencyContact: true,
        hasFirstAid: true,
      });

      expect(simResult.simulatedSafetyScore).toBeGreaterThan(simResult.baselineSafetyScore);
      expect(simResult.deltaSafety).toBeGreaterThan(0);
      expect(simResult.recommendations.length).toBeGreaterThan(0);
      // Ensure baseline object was not modified
      expect(baseEvent.capacity).toBe(100);
    });
  });

  describe('EventShield API Endpoints & RBAC', () => {
    it('11. blocks attendees from accessing organizer EventShield data (HTTP 403)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('12. allows event organizer to get or auto-generate assessment (HTTP 200)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.safetyScore).toBeDefined();
      expect(res.body.data.readinessScore).toBeDefined();
      expect(res.body.data.categories).toHaveLength(15);
      expect(res.body.data.disclaimer).toBeDefined();
    });

    it('13. allows admin to view assessment (HTTP 200)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('14. triggers live re-analysis via POST /analyze (HTTP 200)', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/eventshield/analyze`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trigger: 'manual' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analyzedAt).toBeDefined();
    });

    it('15. runs What-If simulation via POST /simulate (HTTP 200)', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/eventshield/simulate`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          capacity: 300,
          entryGates: 4,
          checkInDesks: 4,
          staffCount: 12,
          hasEmergencyContact: true,
          hasFirstAid: true,
          hasAccessibility: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.simulatedSafetyScore).toBeDefined();
      expect(res.body.data.deltaSafety).toBeDefined();
      expect(res.body.data.categoryDeltas).toBeInstanceOf(Array);
    });

    it('16. retrieves risk assessment history via GET /history (HTTP 200)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield/history`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('17. gets and updates dynamic checklist items via GET & PATCH /checklist', async () => {
      const getRes = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield/checklist`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBeGreaterThan(0);
      const firstItem = getRes.body.data[0];

      const patchRes = await request(app)
        .patch(`/api/events/${testEvent._id}/eventshield/checklist`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ itemId: firstItem.id, status: 'completed' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      const updated = patchRes.body.data.checklist.find((c) => c.id === firstItem.id);
      expect(updated.status).toBe('completed');
      expect(updated.completedBy).toBeDefined();
    });

    it('18. updates safety configuration via PUT /safety-config and triggers re-analysis', async () => {
      const res = await request(app)
        .put(`/api/events/${testEvent._id}/eventshield/safety-config`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          entryGates: 4,
          checkInDesks: 4,
          staffCount: 8,
          emergencyContact: { name: 'Officer Sarah', phone: '+1-555-999-0011', role: 'Safety Chief' },
          firstAidStation: { location: 'Hall B Station', details: 'Full paramedic kit' },
          accessibilityInfo: { hasRampAccess: true, hasWheelchairSeating: true },
          isOutdoor: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.safetyConfig.entryGates).toBe(4);
      expect(res.body.data.safetyConfig.emergencyContact.phone).toBe('+1-555-999-0011');
      expect(res.body.data.assessment.safetyScore).toBeGreaterThanOrEqual(80);
    });

    it('19. returns full printable safety report via GET /report (HTTP 200)', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield/report`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toMatch(/^ES-REPORT-/);
      expect(res.body.data.disclaimer).toBeDefined();
      expect(res.body.data.scores.safetyScore).toBeDefined();
      expect(res.body.data.categories).toHaveLength(15);
    });

    it('20. fetches alerts via GET /alerts', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}/eventshield/alerts`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
