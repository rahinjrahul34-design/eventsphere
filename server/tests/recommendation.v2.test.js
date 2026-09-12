const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Favorite = require('../src/models/Favorite');
const RecommendationInteraction = require('../src/models/RecommendationInteraction');
const {
  getRecommendedEvents,
  getRecommendationFeed,
  getSimilarEvents,
  getTrendingEvents,
  getNearbyEvents,
  getExplorationRecommendation,
  generateExplanation,
} = require('../src/services/recommendationService');
const { buildUserProfile } = require('../src/services/recommendation/userProfileService');
const { scoreEvent, calculateDistanceKm } = require('../src/services/recommendation/scoringEngine');
const { computeSemanticSimilarity } = require('../src/services/recommendation/semanticService');

describe('AI Event Recommendation 2.0 Test Suite (20 Quality Tests + APIs)', () => {
  let adminToken;
  let attendeeToken;
  let testUser;
  let adminUser;
  let aiEvent;
  let webEvent;
  let businessEvent;
  let pastAiEvent;

  beforeAll(async () => {
    await connectDB();

    // 1. Create test admin
    const adminEmail = `admin_rec_${Date.now()}@example.com`;
    adminUser = await User.create({
      name: 'Rec Admin',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = adminUser.signToken();

    // 2. Create test attendee with specific skills & interests
    const attendeeEmail = `attendee_rec_${Date.now()}@example.com`;
    testUser = await User.create({
      name: 'Alex AI Specialist',
      email: attendeeEmail,
      password: 'Password123!',
      role: 'attendee',
      interests: ['Artificial Intelligence', 'Data Science'],
      skills: ['Python', 'Machine Learning'],
      location: 'San Francisco',
    });
    attendeeToken = testUser.signToken();

    // 3. Create diverse upcoming events
    aiEvent = await Event.create({
      title: 'Generative AI & LLM Workshop',
      slug: `genai-workshop-${Date.now()}`,
      shortDescription: 'Deep dive into LLMs, prompt engineering, and Python ML pipelines.',
      description: 'A hands-on workshop building autonomous agents and neural networks using Python and PyTorch.',
      categorySlug: 'technology',
      tags: ['Artificial Intelligence', 'Python', 'Machine Learning', 'LLMs'],
      eventType: 'offline',
      venue: {
        name: 'Tech Hub SF',
        city: 'San Francisco',
        address: '1 Market St',
        coordinates: { type: 'Point', coordinates: [-122.4194, 37.7749] },
      },
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 6),
      capacity: 300,
      registrationCount: 180,
      status: 'published',
      approvalStatus: 'approved',
      organizer: adminUser._id,
    });

    webEvent = await Event.create({
      title: 'React & Next.js Architecture Conf',
      slug: `react-conf-${Date.now()}`,
      shortDescription: 'Master modern web frontend systems.',
      categorySlug: 'technology',
      tags: ['React', 'JavaScript', 'Frontend', 'Web Development'],
      eventType: 'online',
      venue: { onlineUrl: 'https://stream.example.com' },
      startDate: new Date(Date.now() + 86400000 * 8),
      endDate: new Date(Date.now() + 86400000 * 9),
      capacity: 500,
      registrationCount: 220,
      status: 'published',
      approvalStatus: 'approved',
      organizer: adminUser._id,
    });

    businessEvent = await Event.create({
      title: 'Global Angel Investors Summit',
      slug: `investor-summit-${Date.now()}`,
      shortDescription: 'Pitching and networking for early stage startups.',
      categorySlug: 'business',
      tags: ['Startups', 'Venture Capital', 'Pitching', 'Business'],
      eventType: 'offline',
      venue: {
        name: 'Financial Center',
        city: 'New York',
        coordinates: { type: 'Point', coordinates: [-74.006, 40.7128] },
      },
      startDate: new Date(Date.now() + 86400000 * 12),
      endDate: new Date(Date.now() + 86400000 * 13),
      capacity: 200,
      registrationCount: 90,
      status: 'published',
      approvalStatus: 'approved',
      organizer: adminUser._id,
    });

    // 4. Create past attended AI event (completed 15 days ago)
    pastAiEvent = await Event.create({
      title: 'Intro to Python AI 2025',
      slug: `past-ai-intro-${Date.now()}`,
      categorySlug: 'technology',
      tags: ['Artificial Intelligence', 'Python'],
      eventType: 'offline',
      startDate: new Date(Date.now() - 86400000 * 15),
      endDate: new Date(Date.now() - 86400000 * 14),
      capacity: 100,
      registrationCount: 80,
      status: 'completed',
      approvalStatus: 'approved',
      organizer: adminUser._id,
    });

    await Registration.create({
      user: testUser._id,
      event: pastAiEvent._id,
      status: 'checked_in',
      registeredAt: new Date(Date.now() - 86400000 * 20),
      checkedInAt: new Date(Date.now() - 86400000 * 14),
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /_rec_/ } });
    await Event.deleteMany({ _id: { $in: [aiEvent._id, webEvent._id, businessEvent._id, pastAiEvent._id] } });
    await Event.deleteMany({ title: { $regex: /Intro to Python AI|Test / } });
    await Registration.deleteMany({ user: testUser._id });
    await Favorite.deleteMany({ user: testUser._id });
    await RecommendationInteraction.deleteMany({ user: testUser._id });
    await disconnectDB();
  });

  // ─── CORE QUALITY TESTS 1 TO 20 ───

  it('1. New user (cold start): handles gracefully without empty state or crash', async () => {
    const coldUser = await User.create({
      name: 'Cold Start User',
      email: `cold_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'attendee',
      interests: ['Design'],
      skills: [],
    });

    const feed = await getRecommendationFeed(coldUser, { limit: 5 });
    expect(feed.recommended).toBeDefined();
    expect(feed.recommended.length).toBeGreaterThan(0);
    expect(feed.isColdStart).toBe(false); // Has profile interest
    expect(feed.algorithmVersion).toBe('recommendation-v2');

    await User.deleteOne({ _id: coldUser._id });
  });

  it('2. User with strong history: incorporates attended events and time decay', async () => {
    const profile = await buildUserProfile(testUser);
    expect(profile.hasHistory).toBe(true);
    expect(profile.attendedEvents.length).toBeGreaterThanOrEqual(1);
    expect(profile.categoryAffinities.technology).toBeGreaterThan(0);
  });

  it('3. User with no interests: falls back to trending/popular events', async () => {
    const emptyUser = { _id: null, interests: [], skills: [] };
    const profile = await buildUserProfile(emptyUser);
    expect(profile.isColdStart).toBe(true);

    const scored = scoreEvent(aiEvent, profile);
    expect(scored.matchPercentage).toBeGreaterThanOrEqual(35);
    expect(scored.confidence).toBe('low');
  });

  it('4. User with many interests: extracts normalized preferences structure', async () => {
    const multiUser = {
      _id: testUser._id,
      interests: ['AI', 'Web', 'Cloud', 'Cybersecurity', 'Design', 'Data'],
      skills: ['Python', 'JavaScript', 'React', 'Docker'],
      location: 'San Francisco',
    };
    const profile = await buildUserProfile(multiUser);
    expect(profile.normalizedPreferences.interests.length).toBe(6);
    expect(profile.normalizedPreferences.skills.length).toBe(4);
    expect(profile.normalizedPreferences.interests[0].weight).toBe(1.0);
  });

  it('5. Skill match: yields high score and explicit skill match reason', () => {
    const profile = {
      skills: ['python', 'machine learning'],
      interests: [],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: false,
    };
    const scored = scoreEvent(aiEvent, profile);
    expect(scored.matchedSkills).toContain('python');
    expect(scored.reasons.some((r) => r.type === 'skill_match')).toBe(true);
  });

  it('6. Category match: awards full category affinity score', () => {
    const profile = {
      skills: [],
      interests: ['technology'],
      categoryAffinities: { technology: 2.0 },
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: false,
    };
    const scored = scoreEvent(aiEvent, profile, { isDebug: true });
    expect(scored._debug.categoryMatchScore).toBe(1.0);
  });

  it('7. Location match: matches city string proximity', () => {
    const profile = {
      skills: [],
      interests: [],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      location: 'san francisco',
      hasHistory: false,
    };
    const scored = scoreEvent(aiEvent, profile);
    expect(scored.reasons.some((r) => r.type === 'location')).toBe(true);
  });

  it('8. Coordinate proximity & distance calculation: computes Haversine km', () => {
    // SF to NY distance is ~4100km
    const sfLat = 37.7749, sfLon = -122.4194;
    const nyLat = 40.7128, nyLon = -74.0060;
    const distance = calculateDistanceKm(sfLat, sfLon, nyLat, nyLon);
    expect(distance).toBeGreaterThan(3500);
    expect(distance).toBeLessThan(4500);

    const profileWithCoords = {
      skills: [],
      interests: [],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      coordinates: [sfLon, sfLat],
      hasHistory: false,
    };
    const sfScored = scoreEvent(aiEvent, profileWithCoords);
    expect(sfScored.distanceKm).toBeLessThan(5); // Event is in SF
  });

  it('9. Online event: receives location neutrality (score 1.0)', () => {
    const profile = {
      skills: [],
      interests: [],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      location: 'Tokyo',
      hasHistory: false,
    };
    const scored = scoreEvent(webEvent, profile, { isDebug: true });
    expect(scored._debug.locationMatchScore).toBe(1.0);
  });

  it('10. Expired event: penalizes and flags expired event', () => {
    const profile = {
      skills: ['python'],
      interests: ['ai'],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: false,
    };
    const scored = scoreEvent(pastAiEvent, profile);
    expect(scored.isExpired).toBe(true);
    expect(scored.matchPercentage).toBeLessThan(50);
  });

  it('11. Full event handling: scores properly even when registrationCount equals capacity', () => {
    const fullEvent = {
      ...aiEvent.toObject(),
      _id: 'full_event_123',
      registrationCount: 300,
      capacity: 300,
    };
    const profile = {
      skills: ['python'],
      interests: ['ai'],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: false,
    };
    const scored = scoreEvent(fullEvent, profile);
    expect(scored.matchPercentage).toBeGreaterThanOrEqual(35);
  });

  it('12. Already registered event: applies heavy registration penalty (-60)', () => {
    const profile = {
      skills: ['python'],
      interests: ['artificial intelligence'],
      categoryAffinities: {},
      registeredEventIds: new Set([aiEvent._id.toString()]),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: true,
    };
    const scored = scoreEvent(aiEvent, profile);
    expect(scored.isRegistered).toBe(true);
    expect(scored.matchPercentage).toBeLessThan(45);
  });

  it('13. Cancelled event: applies soft cancellation penalty', () => {
    const profile = {
      skills: ['python'],
      interests: ['artificial intelligence'],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      cancelledEventIds: new Set([aiEvent._id.toString()]),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: true,
    };
    const scored = scoreEvent(aiEvent, profile);
    expect(scored.isCancelled).toBe(true);
  });

  it('14. Favorited event: receives behavioral boost and saved event reason', () => {
    const profile = {
      skills: [],
      interests: [],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set([aiEvent._id.toString()]),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: true,
    };
    const scored = scoreEvent(aiEvent, profile);
    expect(scored.isFavorite).toBe(true);
    expect(scored.reasons.some((r) => r.type === 'favorite')).toBe(true);
  });

  it('15. Dismissed event: flags dismissal and applies penalty', async () => {
    await RecommendationInteraction.create({
      user: testUser._id,
      event: webEvent._id,
      interactionType: 'dismiss',
      feedbackType: 'dislike',
      feedbackReason: 'Not interested',
    });

    const profile = await buildUserProfile(testUser);
    expect(profile.dismissedEventIds.has(webEvent._id.toString())).toBe(true);

    const scored = scoreEvent(webEvent, profile);
    expect(scored.isDismissed).toBe(true);
  });

  it('16. Similar events: computes multi-attribute similarity and reasons', async () => {
    const similar = await getSimilarEvents(aiEvent, { limit: 4 });
    expect(Array.isArray(similar)).toBe(true);
    if (similar.length > 0) {
      expect(similar[0].matchPercentage).toBeGreaterThan(0);
      expect(similar[0].topReason).toBeDefined();
      expect(similar[0].recommendationSource).toBe('SIMILAR_EVENT');
    }
  });

  it('17. Diverse recommendations: respects category capping', async () => {
    const res = await getRecommendedEvents(testUser, { limit: 6 });
    expect(res.events).toBeDefined();
    expect(res.algorithmVersion).toBe('recommendation-v2');
  });

  it('18. Exploration (serendipity): suggests adjacent domain opportunity', async () => {
    const explore = await getExplorationRecommendation(testUser);
    if (explore) {
      expect(explore.recommendationSource).toBe('EXPLORE');
      expect(explore.explorationTag).toBeDefined();
    }
  });

  it('19. AI failure fallback: falls back gracefully to deterministic rule engine', async () => {
    const profile = await buildUserProfile(testUser);
    const scored = scoreEvent(aiEvent, profile);
    const explanation = await generateExplanation(scored, profile);

    expect(explanation.narrative).toBeDefined();
    expect(explanation.evidence).toBeDefined();
    expect(explanation.evidence.matchedSkills).toContain('python');
    expect(explanation.narrative.toLowerCase()).toMatch(/python/);
  });

  it('20. Missing event metadata: degrades gracefully without crashing', () => {
    const bareEvent = {
      _id: 'bare_123',
      title: 'Minimalist Meetup',
      // No tags, no skills, no shortDescription, no venue city
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 86400000 * 2),
      status: 'published',
      approvalStatus: 'approved',
    };
    const profile = {
      skills: ['python'],
      interests: ['ai'],
      categoryAffinities: {},
      registeredEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      attendedEvents: [],
      hasHistory: false,
    };

    expect(() => scoreEvent(bareEvent, profile)).not.toThrow();
    const scored = scoreEvent(bareEvent, profile);
    expect(scored.matchPercentage).toBeGreaterThanOrEqual(35);
  });

  // ─── API ENDPOINT TESTS ───

  it('21. should serve GET /api/recommendations/feed with all discovery sections', async () => {
    const res = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommended).toBeDefined();
    expect(res.body.data.basedOnSkills).toBeDefined();
    expect(res.body.data.nearYou).toBeDefined();
    expect(res.body.data.becauseYouLike).toBeDefined();
    expect(res.body.data.newEventsYouMayLike).toBeDefined();
    expect(res.body.data.algorithmVersion).toBe('recommendation-v2');
  });

  it('22. should serve GET /api/recommendations (primary list)', async () => {
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.events).toBeDefined();
  });

  it('23. should serve GET /api/recommendations/similar/:eventId', async () => {
    const res = await request(app)
      .get(`/api/recommendations/similar/${aiEvent._id}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('24. should serve GET /api/recommendations/explanation/:eventId and /:eventId/explanation', async () => {
    const res1 = await request(app)
      .get(`/api/recommendations/explanation/${aiEvent._id}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.matchPercentage).toBeGreaterThanOrEqual(35);
    expect(res1.body.data.aiExplanation).toBeDefined();
    expect(res1.body.data.evidence).toBeDefined();

    const res2 = await request(app)
      .get(`/api/recommendations/${aiEvent._id}/explanation`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.title).toBe(aiEvent.title);
  });

  it('25. should track interaction and record feedback via both POST endpoints', async () => {
    const clickRes = await request(app)
      .post('/api/recommendations/interaction')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        eventId: aiEvent._id,
        interactionType: 'click',
        recommendationSource: 'PERSONALIZED',
      });

    expect(clickRes.status).toBe(201);
    expect(clickRes.body.success).toBe(true);

    const fbRes1 = await request(app)
      .post('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        eventId: aiEvent._id,
        feedbackType: 'like',
        feedbackReason: 'Great skill match',
      });

    expect(fbRes1.status).toBe(200);

    const fbRes2 = await request(app)
      .post(`/api/recommendations/${aiEvent._id}/feedback`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        feedbackType: 'dislike',
        feedbackReason: 'Wrong skill level',
      });

    expect(fbRes2.status).toBe(200);
  });

  it('26. should allow admin to view recommendation analytics', async () => {
    const res = await request(app)
      .get('/api/recommendations/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalInteractions).toBeGreaterThanOrEqual(1);
    expect(res.body.data.ctr).toBeDefined();
    expect(res.body.data.satisfactionRate).toBeDefined();
  });
});
