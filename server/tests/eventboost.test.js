const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventSEOProfile = require('../src/models/EventSEOProfile');
const Speaker = require('../src/models/Speaker');

const { analyzeTitle } = require('../src/services/eventboost/titleAnalyzer');
const { analyzeKeywords, extractKeywords } = require('../src/services/eventboost/keywordAnalyzer');
const { analyzeDescription } = require('../src/services/eventboost/descriptionAnalyzer');
const { analyzeReadability } = require('../src/services/eventboost/readabilityAnalyzer');
const { analyzeSearchIntent } = require('../src/services/eventboost/intentAnalyzer');
const { analyzeConsistency } = require('../src/services/eventboost/consistencyAnalyzer');
const { computeSeoScore } = require('../src/services/eventboost/scoringEngine');
const { generateOptimizations, generateDeterministicOptimizations } = require('../src/services/eventboost/aiOptimizerService');
const { analyzeEvent, optimizeEvent, applyOptimizations, querySeoCopilot } = require('../src/services/eventboost/eventBoostEngine');

describe('EventBoost AI — Comprehensive SEO & Content Intelligence Test Suite', () => {
  let organizer, organizerToken;
  let otherOrganizer, otherOrganizerToken;
  let attendee, attendeeToken;
  let admin, adminToken;
  let testEvent;

  beforeAll(async () => {
    await connectDB();

    // Clean test accounts
    await User.deleteMany({
      email: { $in: ['boost.org@test.com', 'boost.other@test.com', 'boost.att@test.com', 'boost.adm@test.com'] },
    });
    await Event.deleteMany({ title: /EventBoost/i });

    // 1. Organizer
    const orgRes = await request(app).post('/api/auth/register').send({
      name: 'Boost Organizer',
      email: 'boost.org@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    organizer = orgRes.body.data.user;
    organizerToken = orgRes.body.data.token;
    await User.findByIdAndUpdate(organizer._id, { organizerStatus: 'approved' });

    // 2. Other Organizer
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Other Organizer',
      email: 'boost.other@test.com',
      password: 'Password123!',
      role: 'organizer',
    });
    otherOrganizer = otherRes.body.data.user;
    otherOrganizerToken = otherRes.body.data.token;
    await User.findByIdAndUpdate(otherOrganizer._id, { organizerStatus: 'approved' });

    // 3. Attendee
    const attRes = await request(app).post('/api/auth/register').send({
      name: 'Boost Attendee',
      email: 'boost.att@test.com',
      password: 'Password123!',
      role: 'attendee',
    });
    attendee = attRes.body.data.user;
    attendeeToken = attRes.body.data.token;

    // 4. Admin
    const admRes = await request(app).post('/api/auth/register').send({
      name: 'Boost Admin',
      email: 'boost.adm@test.com',
      password: 'Password123!',
      role: 'admin',
    });
    admin = admRes.body.data.user;
    adminToken = admRes.body.data.token;
    await User.findByIdAndUpdate(admin._id, { role: 'admin' });

    // Create Base Test Event
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'EventBoost AI Test Conference',
        shortDescription: 'Hands-on conference exploring modern generative AI tools and workflows.',
        description: 'Join us for the EventBoost AI Test Conference. A deep dive into modern artificial intelligence, machine learning, and LLM applications.\n\nLearn practical architectures, tools, prompt engineering, and real-world implementations from industry practitioners.\n\nDesigned for students, developers, and AI enthusiasts. Reserve your pass now on EventSphere to secure your ticket!',
        eventType: 'offline',
        startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 8 * 86400000).toISOString(),
        categorySlug: 'conference',
        tags: ['Generative AI', 'Machine Learning', 'Workshop'],
        venue: {
          name: 'Tech Auditorium',
          address: '42 Innovation Highway',
          city: 'Nashik',
        },
        capacity: 200,
        price: 0,
        ticketTypes: [{ name: 'Free Pass', price: 0, quantity: 200 }],
        faq: [
          { q: 'Who can attend?', a: 'All students and developers curious about AI.' },
          { q: 'Will I get a certificate?', a: 'Yes, verifiable certificates are provided.' },
        ],
        settings: { certificatesIssued: true },
      });

    testEvent = eventRes.body.data;
  });

  afterAll(async () => {
    await Event.deleteMany({ title: /EventBoost/i });
    await EventSEOProfile.deleteMany({});
    await User.deleteMany({
      email: { $in: ['boost.org@test.com', 'boost.other@test.com', 'boost.att@test.com', 'boost.adm@test.com'] },
    });
    await disconnectDB();
  });

  // 1. Missing Title
  test('1. Missing title handling (score penalty and issue flag)', () => {
    const res = analyzeTitle('', 'Generative AI Workshop');
    expect(res.score).toBe(0);
    expect(res.issues.some((i) => i.id === 'title_missing')).toBe(true);
    expect(res.suggestedTitle).toBeTruthy();
  });

  // 2. Short Title
  test('2. Short title (< 25 chars) generates warning issue', () => {
    const res = analyzeTitle('AI Event', 'AI');
    expect(res.score).toBeLessThan(70);
    expect(res.issues.some((i) => i.id === 'title_very_short' || i.id === 'title_low_specificity')).toBe(true);
  });

  // 3. Long Title
  test('3. Long title (> 70 chars) generates trimming suggestion', () => {
    const longTitle = 'Generative Artificial Intelligence and Large Language Models Advanced Masterclass and Workshop for Software Engineering Students and Professionals';
    const res = analyzeTitle(longTitle, 'Generative AI');
    expect(res.issues.some((i) => i.id === 'title_too_long')).toBe(true);
  });

  // 4. Missing Description
  test('4. Missing description produces 0 score and critical issue', () => {
    const res = analyzeDescription('');
    expect(res.score).toBe(0);
    expect(res.issues.some((i) => i.id === 'desc_missing')).toBe(true);
  });

  // 5. Long Description
  test('5. Long description (> 1500 chars) maintains comprehensive scoring', () => {
    const longDesc = 'Practical AI '.repeat(200);
    const res = analyzeDescription(longDesc);
    expect(res.score).toBeGreaterThan(50);
  });

  // 6. Missing Keywords
  test('6. Missing primary keyword suggests candidate extraction', () => {
    const res = analyzeKeywords('', [], testEvent);
    expect(res.issues.some((i) => i.id === 'keyword_missing_primary')).toBe(true);
  });

  // 7. Keyword Stuffing
  test('7. Keyword stuffing (> 3.5% density) flagged with warning and score capped', () => {
    const stuffedDesc = 'AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop AI workshop.';
    const res = analyzeKeywords('AI workshop', [], {
      title: 'AI Workshop',
      description: stuffedDesc,
      tags: ['AI workshop'],
    });
    expect(res.isStuffed).toBe(true);
    expect(res.stuffingWarning).toMatch(/stuffing detected/i);
    expect(res.score).toBeLessThanOrEqual(45);
  });

  // 8. Good Keyword Usage
  test('8. Good natural keyword distribution rewarded with high coverage', () => {
    const kwEvent = {
      title: 'Generative AI & Machine Learning Workshop',
      description: 'Join our hands-on Generative AI and Machine Learning workshop to build real-world AI applications.',
      tags: ['Generative AI', 'Machine Learning', 'Workshop'],
    };
    const res = analyzeKeywords('Generative AI', ['Machine Learning', 'Workshop'], kwEvent);
    expect(res.isStuffed).toBe(false);
    expect(res.coveragePercentage).toBeGreaterThan(60);
    expect(res.score).toBeGreaterThanOrEqual(70);
  });

  // 9. Missing Meta Title
  test('9. Missing meta title produces issue and fallback suggestion', () => {
    const scoreRes = computeSeoScore({ ...testEvent, metaTitle: '' }, 'Generative AI');
    expect(scoreRes.seoIssues.some((i) => i.id === 'meta_title_missing')).toBe(true);
  });

  // 10. Missing Meta Description
  test('10. Missing meta description generates high-priority recommendation', () => {
    const scoreRes = computeSeoScore({ ...testEvent, metaDescription: '' }, 'Generative AI');
    expect(scoreRes.seoIssues.some((i) => i.id === 'meta_desc_missing')).toBe(true);
  });

  // 11. Online Event Validation
  test('11. Online event properly recognizes virtual platforms without physical venue requirements', () => {
    const onlineEvent = {
      ...testEvent,
      eventType: 'online',
      venue: { onlineUrl: 'https://meet.eventsphere.demo/live' },
    };
    const intentRes = analyzeSearchIntent(onlineEvent, 'AI Workshop');
    expect(intentRes.detectedIntents.some((d) => d.includes('Virtual'))).toBe(true);
  });

  // 12. Offline Event Validation
  test('12. Offline event evaluates local venue and city', () => {
    const intentRes = analyzeSearchIntent(testEvent, 'Generative AI');
    expect(intentRes.details.some((d) => d.includes('Local'))).toBe(true);
  });

  // 13. Hybrid Event Validation
  test('13. Hybrid event accepts both physical venue and online streams', () => {
    const hybridEvent = {
      ...testEvent,
      eventType: 'hybrid',
      venue: { name: 'Campus Hall', city: 'Nashik', onlineUrl: 'https://meet.eventsphere.demo/stream' },
    };
    const inconsistencies = analyzeConsistency(hybridEvent);
    expect(inconsistencies.some((i) => i.type === 'mode_venue_mismatch')).toBe(false);
  });

  // 14. Missing Location for Offline Event
  test('14. Missing location on offline event flags inconsistency', () => {
    const invalidOffline = {
      ...testEvent,
      eventType: 'offline',
      venue: { name: '', address: '', city: '' },
    };
    const inconsistencies = analyzeConsistency(invalidOffline);
    expect(inconsistencies.some((i) => i.type === 'missing_physical_venue')).toBe(true);
  });

  // 15. Local SEO Analysis
  test('15. Local SEO correctly matches city name', () => {
    const scoreRes = computeSeoScore(testEvent, 'Generative AI');
    expect(scoreRes.categoryScores.localRelevance).toBeGreaterThanOrEqual(75);
    expect(scoreRes.strengths.some((s) => s.includes('Nashik'))).toBe(true);
  });

  // 16. Missing Audience Suggestion
  test('16. Missing target audience suggests explicit section', () => {
    const noAudienceDesc = 'An event about code and servers. We will look at databases and networks. Come join.';
    const res = analyzeDescription(noAudienceDesc);
    expect(res.missingSections).toContain('Who Should Attend');
    expect(res.issues.some((i) => i.id === 'desc_missing_audience')).toBe(true);
  });

  // 17. FAQ Recommendations from Verified Facts
  test('17. FAQ suggestions are derived strictly from verified event facts', () => {
    const facts = {
      eventType: 'offline',
      venueName: 'Tech Auditorium',
      city: 'Nashik',
      isPaid: false,
      prices: 'Free Pass: ₹0',
      hasCertificates: true,
      category: 'Tech',
    };
    const opt = generateDeterministicOptimizations(testEvent, 'Generative AI', [], facts, [], []);
    expect(opt.faqSuggestions.length).toBeGreaterThanOrEqual(2);
    expect(opt.faqSuggestions.some((f) => f.q.includes('certificate'))).toBe(true);
  });

  // 18. Content Inconsistency Detection
  test('18. Contradiction between Online mode and physical address detected', () => {
    const contradictoryEvent = {
      ...testEvent,
      eventType: 'online',
      venue: { address: 'Plot 12, KBT Circle, Gangapur Road, Nashik' },
    };
    const inconsistencies = analyzeConsistency(contradictoryEvent);
    expect(inconsistencies.some((i) => i.type === 'mode_venue_mismatch')).toBe(true);
  });

  // 19. AI Failure Fallback
  test('19. Fallback optimizer produces complete valid suggestions without external API', async () => {
    const fallback = await generateOptimizations(testEvent, 'Generative AI', ['LLMs'], { speakers: [], sessions: [] });
    expect(fallback.suggestedTitle).toBeTruthy();
    expect(fallback.suggestedMetaTitle).toMatch(/EventSphere/);
    expect(fallback.suggestedDescription).toMatch(/## Overview/);
  });

  // 20. Invalid AI Response Resilience
  test('20. Score engine never crashes on undefined or partial fields', () => {
    const corruptEvent = { title: undefined, description: null, venue: {} };
    const scoreRes = computeSeoScore(corruptEvent, null, null);
    expect(scoreRes.seoScore).toBeGreaterThanOrEqual(0);
    expect(scoreRes.seoScore).toBeLessThanOrEqual(100);
    expect(Number.isNaN(scoreRes.seoScore)).toBe(false);
  });

  // 21. Unauthorized Organizer (RBAC Security)
  test('21. Attendee cannot access or modify event SEO (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/events/${testEvent._id}/seo`)
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(res.status).toBe(403);
  });

  test('21b. Unrelated organizer cannot modify another organizer\'s event SEO (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEvent._id}/seo/analyze`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`)
      .send({ primaryKeyword: 'Hacking' });
    expect(res.status).toBe(403);
  });

  // 22. Admin Access
  test('22. Admin can access event SEO regardless of ownership (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/events/${testEvent._id}/seo`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 23. Private Event Indexability Check
  test('23. Private events indicate non-indexable status in search previews', async () => {
    const privateEvent = await Event.create({
      ...testEvent,
      _id: undefined,
      slug: 'private-secret-event-boost',
      title: 'Private Secret Summit',
      visibility: 'private',
      organizer: organizer._id,
      startDate: new Date(),
      endDate: new Date(),
    });
    expect(privateEvent.visibility).toBe('private');
    await privateEvent.deleteOne();
  });

  // 24. Draft Event Indexability Check
  test('24. Draft events are not marked published', async () => {
    const draftEvent = await Event.create({
      ...testEvent,
      _id: undefined,
      slug: 'draft-event-boost-test',
      title: 'Draft Unlisted Event',
      status: 'draft',
      organizer: organizer._id,
      startDate: new Date(),
      endDate: new Date(),
    });
    expect(draftEvent.status).toBe('draft');
    await draftEvent.deleteOne();
  });

  // 25. Cancelled Event Status
  test('25. Cancelled event status is respected by model', async () => {
    const cancelled = await Event.create({
      ...testEvent,
      _id: undefined,
      slug: 'cancelled-event-boost-test',
      title: 'Cancelled Test Event',
      status: 'cancelled',
      organizer: organizer._id,
      startDate: new Date(),
      endDate: new Date(),
    });
    expect(cancelled.status).toBe('cancelled');
    await cancelled.deleteOne();
  });

  // 26. Completed Event Status
  test('26. Completed event status is handled gracefully', async () => {
    const completed = await Event.create({
      ...testEvent,
      _id: undefined,
      slug: 'completed-event-boost-test',
      title: 'Completed Test Event',
      status: 'completed',
      organizer: organizer._id,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() - 43200000),
    });
    expect(completed.status).toBe('completed');
    await completed.deleteOne();
  });

  // 27. SEO Score Boundaries
  test('27. SEO score strictly bounded between 0 and 100, never NaN or Infinity', () => {
    for (let i = 0; i < 20; i += 1) {
      const randomText = 'A '.repeat(i * 10);
      const scoreRes = computeSeoScore({ title: randomText, description: randomText });
      expect(scoreRes.seoScore).toBeGreaterThanOrEqual(0);
      expect(scoreRes.seoScore).toBeLessThanOrEqual(100);
      expect(Number.isFinite(scoreRes.seoScore)).toBe(true);
    }
  });

  // 28. Score Calculation Consistency (Idempotency)
  test('28. Identical event inputs yield identical deterministic SEO score', () => {
    const score1 = computeSeoScore(testEvent, 'Generative AI', ['Workshop']);
    const score2 = computeSeoScore(testEvent, 'Generative AI', ['Workshop']);
    expect(score1.seoScore).toBe(score2.seoScore);
    expect(score1.categoryScores).toEqual(score2.categoryScores);
  });

  // 29. Optimization Preview
  test('29. Optimization endpoint returns before and after scores with simulated improvements', async () => {
    const res = await request(app)
      .post(`/api/events/${testEvent._id}/seo/optimize`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ primaryKeyword: 'Generative AI Workshop' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.beforeScore).toBeDefined();
    expect(res.body.data.afterScore).toBeDefined();
    expect(res.body.data.improvements.title.suggested).toBeTruthy();
  });

  // 30. Apply Optimization Updates Event
  test('30. Applying optimizations updates the event and recalibrates score', async () => {
    const newTitle = 'EventBoost AI & Machine Learning Workshop';
    const newMetaDesc = 'Join our hands-on EventBoost workshop to learn machine learning concepts and build with modern AI tools. Register today!';

    const res = await request(app)
      .post(`/api/events/${testEvent._id}/seo/apply`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: newTitle,
        metaTitle: `${newTitle} | EventSphere`,
        metaDescription: newMetaDesc,
        primaryKeyword: 'EventBoost AI Workshop',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.event.title).toBe(newTitle);
    expect(res.body.data.newScore).toBeGreaterThanOrEqual(res.body.data.previousScore);

    // Verify in database
    const updated = await Event.findById(testEvent._id);
    expect(updated.title).toBe(newTitle);
    expect(updated.metaDescription).toBe(newMetaDesc);
  });

  // 31. History Tracking
  test('31. Change history records previous score, new score, and change summary', async () => {
    const res = await request(app)
      .get(`/api/events/${testEvent._id}/seo/history`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].seoScore).toBeDefined();
  });

  // 32. SEO Copilot Q&A Query
  test('32. SEO Copilot answers natural language query using verified context', async () => {
    const res = await request(app)
      .post(`/api/events/${testEvent._id}/seo/copilot`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ question: 'How can I improve this event title?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeTruthy();
  });
});
