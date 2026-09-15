/* eslint-disable no-console */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Report = require('../models/Report');
const RecommendationInteraction = require('../models/RecommendationInteraction');
const PredictionOutcome = require('../models/PredictionOutcome');
const EventPrediction = require('../models/EventPrediction');
const EventPredictionSnapshot = require('../models/EventPredictionSnapshot');
const EventPulseAlert = require('../models/EventPulseAlert');
const EventRiskAssessment = require('../models/EventRiskAssessment');
const EventRiskAlert = require('../models/EventRiskAlert');
const EventSEOProfile = require('../models/EventSEOProfile');
const OrganizerTrustProfile = require('../models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../models/OrganizerTrustSnapshot');
const RiskAssessmentHistory = require('../models/RiskAssessmentHistory');
const SeatHold = require('../models/SeatHold');
const SmartQueueAudit = require('../models/SmartQueueAudit');
const { PointActivity, UserBadge } = require('../models/Gamification');

const PREMIUM_COVERS = {
  'ai-innovation-summit': '/images/events/premium-ai-summit.jpg',
  'fintech-founders-roundtable': '/images/events/premium-founder-forum.jpg',
  'indie-music-night': '/images/events/premium-creative-festival.jpg',
  'robotics-workshop': '/images/events/premium-robotics-lab.jpg',
  'women-in-tech-conference': '/images/events/premium-women-tech.jpg',
};

const rand = (seed) => {
  const x = Math.sin(seed * 99.13) * 10000;
  return x - Math.floor(x);
};
const pick = (arr, i) => arr[i % arr.length];
const oid = (value) => new mongoose.Types.ObjectId(value);

async function seedPremiumData({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const [events, users] = await Promise.all([
    Event.find().sort({ startDate: 1 }),
    User.find({ role: 'attendee' }).sort({ createdAt: 1 }),
  ]);
  if (!events.length || !users.length) {
    log('↷ Premium seed skipped: base EventSphere data is not available.');
    return { skipped: true };
  }
  if (await EventPrediction.exists({ 'featureSnapshot.premiumSeed': true })) {
    log('↷ Premium seed skipped (premium demo data already present).');
    return { skipped: true };
  }

  for (const event of events) {
    if (PREMIUM_COVERS[event.slug]) {
      event.coverImage = PREMIUM_COVERS[event.slug];
      event.images = [PREMIUM_COVERS[event.slug]];
      event.views = Math.max(event.views || 0, 820 + Math.floor(rand(event.title.length) * 4200));
      await event.save();
    }
  }

  // The advanced collections are reset as a group so repeated seed runs remain deterministic.
  await Promise.all([
    RecommendationInteraction.deleteMany({}), PredictionOutcome.deleteMany({}), EventPrediction.deleteMany({}), EventPredictionSnapshot.deleteMany({}),
    EventPulseAlert.deleteMany({}), EventRiskAssessment.deleteMany({}), EventRiskAlert.deleteMany({}),
    EventSEOProfile.deleteMany({}), OrganizerTrustProfile.deleteMany({}), OrganizerTrustSnapshot.deleteMany({}), RiskAssessmentHistory.deleteMany({}), SeatHold.deleteMany({}),
    SmartQueueAudit.deleteMany({}), Poll.deleteMany({}), Question.deleteMany({}),
  ]);

  const now = Date.now();
  const predictionDocs = [];
  const outcomeDocs = [];
  const riskDocs = [];
  const historyDocs = [];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const registered = event.registrationCount || 0;
    const attendance = event.checkedInCount || Math.round(registered * (0.62 + rand(i + 8) * 0.28));
    const forecast = Math.min(event.capacity, Math.max(registered + 18, Math.round(registered * (1.08 + rand(i) * 0.34))));
    const engagement = 62 + Math.floor(rand(i * 11 + 2) * 33);
    const riskLevel = event.slug === 'esports-arena-2026' ? 'medium' : event.capacity > 300 ? 'medium' : 'low';
    predictionDocs.push({
      eventId: event._id,
      forecast: { predictedRegistrations: forecast, lowerBound: Math.max(0, forecast - 24), upperBound: Math.min(event.capacity, forecast + 38), velocity24h: 7 + Math.floor(rand(i + 4) * 24), growthRate: 8 + Math.floor(rand(i + 9) * 31), momentumState: rand(i + 5) > 0.35 ? 'growing' : 'stable' },
      attendance: { expectedAttendees: attendance, expectedNoShows: Math.max(2, Math.round(attendance * 0.1)), attendanceRate: Math.round((attendance / Math.max(registered, 1)) * 100), noShowRate: 10, lowerBound: Math.max(0, attendance - 16), upperBound: attendance + 20 },
      engagement: { score: engagement, level: engagement > 84 ? 'very_high' : engagement > 70 ? 'high' : 'medium', trend: 'rising', breakdown: { participation: engagement - 4, interaction: engagement - 9, liveActivity: engagement - 2, feedback: engagement - 14, networking: engagement - 6 } },
      health: { score: Math.min(98, engagement + 8), status: engagement > 78 ? 'healthy' : 'good', breakdown: { velocity: 82, capacity: 88, attendance: 79, engagement, sentiment: 91 } },
      confidence: { score: 87, level: 'high', reasons: ['Strong registration velocity', 'Comparable historical events', 'Healthy engagement signals'] },
      drivers: [{ factor: 'Registration velocity', impact: 'Registrations are trending above the event baseline', direction: 'positive', magnitude: 'high' }, { factor: 'Venue capacity', impact: 'Capacity is well matched to demand', direction: 'positive', magnitude: 'medium' }],
      recommendations: [{ id: `rec-${i}-1`, priority: 'high', title: 'Promote the strongest session', action: 'Feature the highest-engagement session in the event feed', rationale: 'Session interest is a strong conversion signal', trigger: 'engagement' }, { id: `rec-${i}-2`, priority: 'medium', title: 'Nudge waitlisted guests', action: 'Send a reminder with seat-release timing', rationale: 'Conversion improves when urgency is clear', trigger: 'capacity' }],
      aiSummary: `Premium EventPulse forecast: ${event.title} is healthy, trending upward, and projected to welcome approximately ${forecast} registered guests.`,
      modelVersion: 'eventpulse-v2.1-premium', engine: 'hybrid-deterministic', featureSnapshot: { registrations: registered, capacity: event.capacity, views: event.views, premiumSeed: true }, generatedAt: new Date(now - i * 3600000), expiresAt: new Date(now + 7 * 86400000),
    });
    if (event.status === 'completed' || event.startDate < new Date()) {
      const actual = Math.max(registered, attendance);
      outcomeDocs.push({ eventId: event._id, predicted: { registrations: forecast, attendance, noShows: Math.round(attendance * 0.1), engagement }, actual: { registrations: actual, attendance, noShows: Math.max(1, registered - attendance), engagement: Math.max(48, engagement - 3) }, errors: { registrationAE: Math.abs(forecast - actual), attendanceAE: 0, engagementAE: 3 }, modelVersion: 'eventpulse-v2.1-premium' });
    }
    riskDocs.push({
      eventId: event._id, safetyScore: riskLevel === 'medium' ? 88 : 95, readinessScore: 91, overallRiskLevel: riskLevel,
      summary: `Operational readiness review for ${event.title}: staffing, entry flow, emergency contacts and accessibility checks are in place.`, engine: 'hybrid-deterministic',
      categories: [{ id: 'crowd', name: 'Crowd Management', score: 92, riskLevel: 'low', confidence: 0.96, issues: [], recommendations: ['Keep two staffed entry lanes open'], evidence: ['Capacity plan', 'Check-in staffing roster'], probability: 'low', impact: 'medium', priority: 'low' }, { id: 'venue', name: 'Venue & Facilities', score: 90, riskLevel: 'low', confidence: 0.94, issues: ['Final signage walk-through pending'], recommendations: ['Complete venue walk-through 2 hours before doors'], evidence: ['Venue brief', 'Accessibility checklist'], probability: 'low', impact: 'medium', priority: 'medium' }],
      topRisks: [{ title: 'Peak arrival congestion', category: 'crowd', severity: riskLevel, reason: 'Registrations cluster near doors-open time', evidence: `${registered} registrations and ${event.capacity} capacity`, recommendation: 'Open QR lanes 30 minutes early' }],
      checklist: [{ id: 'entry-flow', title: 'Confirm QR check-in lanes', category: 'operations', priority: 'high', status: 'completed', completedAt: new Date(), completedBy: event.organizer }, { id: 'first-aid', title: 'Verify first-aid station signage', category: 'safety', priority: 'medium', status: 'pending' }, { id: 'speaker-brief', title: 'Send speaker arrival brief', category: 'program', priority: 'medium', status: 'completed', completedAt: new Date(), completedBy: event.organizer }],
      matrix: [{ risk: 'Peak arrival congestion', probability: 'medium', impact: 'medium', priority: 'medium', action: 'Open early check-in lanes' }], metricsSnapshot: { capacity: event.capacity, registrations: registered, checkedIn: event.checkedInCount || 0 }, version: 2,
    });
    historyDocs.push({ eventId: event._id, safetyScore: riskLevel === 'medium' ? 88 : 95, readinessScore: 91, overallRiskLevel: riskLevel, trigger: 'initial', delta: 4, improvements: ['Added QR check-in lane', 'Confirmed first-aid station'], topRisksCount: 1, analyzedAt: new Date(now - i * 86400000) });
  }
  await Promise.all([EventPrediction.insertMany(predictionDocs), EventRiskAssessment.insertMany(riskDocs), RiskAssessmentHistory.insertMany(historyDocs)]);
  if (outcomeDocs.length) await PredictionOutcome.insertMany(outcomeDocs);

  const snapshotDocs = [];
  const pulseAlertDocs = [];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const registered = event.registrationCount || 0;
    for (let d = 0; d < 7; d += 1) {
      const projected = Math.min(event.capacity, Math.round(Math.max(registered * 0.4, registered + (d - 3) * 8 + rand(i + d) * 18)));
      snapshotDocs.push({ eventId: event._id, snapshotTime: new Date(now - (6 - d) * 86400000), dayOffset: d - 6, predictedRegistrations: projected, actualRegistrations: d >= 4 ? registered : Math.round(projected * 0.92), expectedAttendance: Math.round(projected * 0.82), actualAttendance: d >= 5 ? event.checkedInCount || Math.round(projected * 0.74) : 0, engagementScore: 58 + Math.floor(rand(i * 7 + d) * 38), trigger: d === 0 ? 'initial' : d === 3 ? 'velocity_shift' : 'daily', modelVersion: 'eventpulse-v2.1-premium' });
    }
    if (registered < event.capacity * 0.35) pulseAlertDocs.push({ eventId: event._id, type: 'REGISTRATION_SLOWDOWN', severity: 'medium', message: `Registration velocity for ${event.title} is below the premium benchmark.`, metricValue: registered, threshold: Math.round(event.capacity * 0.35), status: i % 3 === 0 ? 'acknowledged' : 'active', actionRecommended: 'Launch a targeted reminder to users who viewed but did not save this event.' });
    if (registered > event.capacity * 0.8) pulseAlertDocs.push({ eventId: event._id, type: 'CAPACITY_PRESSURE', severity: 'high', message: `${event.title} is approaching capacity and may need waitlist messaging.`, metricValue: registered, threshold: Math.round(event.capacity * 0.8), status: 'active', actionRecommended: 'Enable extra check-in lanes and publish seat-release guidance.' });
    pulseAlertDocs.push({ eventId: event._id, type: 'LOW_ENGAGEMENT_PACE', severity: i % 4 === 0 ? 'low' : 'medium', message: `Engagement monitor recorded a weekly pulse for ${event.title}.`, metricValue: 62 + (i % 29), threshold: 70, status: i % 4 === 0 ? 'resolved' : 'active', actionRecommended: 'Feature a session, poll, or networking prompt in the event feed.' });
  }
  await EventPredictionSnapshot.insertMany(snapshotDocs);
  await EventPulseAlert.insertMany(pulseAlertDocs);

  const riskAlertDocs = events.slice(0, 12).map((event, i) => ({
    eventId: event._id,
    type: i % 3 === 0 ? 'ACCESSIBILITY_REVIEW' : i % 3 === 1 ? 'CROWD_FLOW_CHECK' : 'EMERGENCY_PLAN_REFRESH',
    severity: i % 5 === 0 ? 'medium' : 'low',
    message: `EventShield recommends a final operational review for ${event.title}.`,
    metricValue: { readinessScore: 88 + (i % 8), checklistCompletion: 72 + (i % 25) },
    threshold: { readinessScore: 90, checklistCompletion: 80 },
    status: i % 4 === 0 ? 'acknowledged' : 'active',
    actionRequired: 'Assign an owner and complete the final venue walk-through before doors open.',
  }));
  await EventRiskAlert.insertMany(riskAlertDocs);

  const seoDocs = events.map((event, i) => {
    const keyword = `${event.categorySlug || 'community'} events ${event.venue?.city || 'India'}`;
    const score = 78 + (i % 19);
    return {
      event: event._id,
      primaryKeyword: keyword,
      secondaryKeywords: [...(event.tags || []).slice(0, 4), 'EventSphere'],
      relatedTerms: ['tickets', 'schedule', 'speakers', 'networking', '2026'],
      metaTitle: `${event.title} | EventSphere`,
      metaDescription: `${event.shortDescription || event.title}. Explore the schedule, speakers, tickets and community experience on EventSphere.`,
      suggestedTitle: event.title,
      suggestedDescription: event.description?.slice(0, 260) || event.shortDescription,
      suggestedMetaTitle: `${event.title} — Tickets, Schedule & Speakers`,
      suggestedMetaDescription: `Discover ${event.title}, explore the full program, and reserve your EventSphere pass today.`,
      suggestedKeywords: [keyword, ...(event.tags || []).slice(0, 3)],
      seoScore: score, contentScore: Math.min(99, score + 4), readabilityScore: 86, keywordScore: 82, searchIntentScore: 91, socialScore: 79,
      categoryScores: { titleOptimization: 90, descriptionQuality: 88, keywordRelevance: 84, searchIntentMatch: 92, readability: 86, metadataQuality: 81, contentCompleteness: 89, localRelevance: 87, socialReadiness: 79 },
      searchIntent: { primary: 'Transactional', matchPercentage: 91, detectedIntents: ['ticket purchase', 'event discovery', 'speaker research'], details: ['Clear date and venue signals', 'Strong category and city relevance'] },
      readabilityMetrics: { avgSentenceLength: 17, longSentencesCount: 2, paragraphCount: 4, wordCount: 180 + i * 11, fleschReadingEase: 64, gradeLevel: 'Standard' },
      keywordCoverage: { percentage: 86, checks: [{ keyword, foundInTitle: true, foundInDescription: true, foundInTags: true, density: 1.4, count: 5, status: 'optimal' }], isStuffed: false },
      seoIssues: i % 3 === 0 ? [{ id: `seo-${i}`, title: 'Add one more venue detail', priority: 'low', impact: 'medium', confidence: 'high', effort: 'low', reason: 'Local visitors benefit from arrival context.', suggestedAction: 'Add parking and transit directions.', field: 'description', safeToApply: true }] : [],
      strengths: ['Strong event intent match', 'Clear local relevance', 'Good social preview coverage'],
      faqSuggestions: [{ q: `Who should attend ${event.title}?`, a: 'Builders, students, operators and community members looking for practical connections and learning.', basedOn: 'event details' }],
      socialPreview: { title: event.title, description: event.shortDescription || event.title, image: event.coverImage, domain: 'eventsphere.demo' },
      searchPreview: { title: event.title, description: event.shortDescription || event.title, url: `https://eventsphere.demo/events/${event.slug}`, slug: event.slug },
      beforeAfter: { beforeScore: score - 12, beforeTitle: event.title, beforeDescription: event.shortDescription || '', afterScore: score, afterTitle: `${event.title} — Tickets, Schedule & Speakers`, afterDescription: event.description?.slice(0, 180) || '' },
      history: [{ timestamp: new Date(now - 7 * 86400000), seoScore: score - 12, previousScore: score - 20, changes: ['Expanded local keyword coverage', 'Added social image'], appliedBy: event.organizer, version: 'SEO_V2' }, { timestamp: new Date(now), seoScore: score, previousScore: score - 12, changes: ['Improved FAQ coverage', 'Added venue intent terms'], appliedBy: event.organizer, version: 'SEO_V2.1' }],
      analysisVersion: 'SEO_V2.1-PREMIUM', lastAnalyzedAt: new Date(now), aiProvider: 'deterministic-premium-engine',
    };
  });
  await EventSEOProfile.insertMany(seoDocs);

  const organizers = await User.find({ role: 'organizer' });
  const trustProfiles = [];
  const trustSnapshots = [];
  for (let i = 0; i < organizers.length; i += 1) {
    const organizer = organizers[i];
    const owned = events.filter((event) => String(event.organizer) === String(organizer._id));
    const totalRegs = owned.reduce((sum, event) => sum + (event.registrationCount || 0), 0);
    const score = organizer.organizerStatus === 'approved' ? 86 + (i % 10) : 64;
    const trustLevel = score >= 90 ? 'excellent' : score >= 80 ? 'very_good' : 'fair';
    const metrics = { totalEvents: owned.length, completedEvents: owned.filter((event) => event.status === 'completed').length, cancelledEvents: 0, completionRate: 96, cancellationRate: 0, attendeesServed: totalRegs, totalRegistrations: totalRegs, attendanceRate: 82, totalFeedbackCount: 74 + i * 9, averageRating: 4.5, satisfactionPercentage: 91, bayesianRating: 4.4, totalReports: 2, confirmedViolations: 0, dismissedReports: 2, successfulEvents: Math.max(1, owned.length - 1) };
    const components = { completion: 96, cancellation: 100, attendance: 82, satisfaction: 91, compliance: 94, verification: organizer.organizerStatus === 'approved' ? 90 : 45, experience: Math.min(98, 58 + owned.length * 8) };
    trustProfiles.push({ organizer: organizer._id, trustScore: score, trustLevel, confidenceLevel: 'high', scoreVersion: 'TRUST_V2.1-PREMIUM', verified: organizer.organizerStatus === 'approved', metrics, components, weights: { completion: 0.2, attendance: 0.16, satisfaction: 0.2, compliance: 0.18, verification: 0.12, experience: 0.14 }, badges: ['verified-host', 'reliable-operator', 'community-builder'], factors: [{ factor: 'completion_rate', label: 'Completion rate', value: metrics.completionRate, impact: 'positive', weight: 0.2, description: 'Events consistently reach their published end date.' }, { factor: 'satisfaction', label: 'Attendee satisfaction', value: metrics.satisfactionPercentage, impact: 'positive', weight: 0.2, description: 'Feedback is strong across completed events.' }], aiInsights: { summary: `${organizer.name} has a strong operating history with ${metrics.totalEvents} active and completed events serving ${metrics.attendeesServed} attendees.`, strengths: ['Reliable event delivery', 'High attendee satisfaction', 'Clear operational planning'], weaknesses: ['Continue building verified history across more cities'], recommendations: [{ title: 'Publish post-event reports', description: 'Share outcomes and feedback highlights after each event.', impact: 'medium' }] }, lastCalculatedAt: new Date(now), isStale: false });
    trustSnapshots.push({ organizer: organizer._id, score, trustLevel, confidenceLevel: 'high', components, metrics, changeReason: 'Premium dataset trust recalculation', scoreDelta: i === 0 ? 4 : 2, trigger: 'SCHEDULED_RECALCULATION', scoreVersion: 'TRUST_V2.1-PREMIUM', calculatedAt: new Date(now - i * 86400000) });
  }
  if (trustProfiles.length) await OrganizerTrustProfile.insertMany(trustProfiles);
  if (trustSnapshots.length) await OrganizerTrustSnapshot.insertMany(trustSnapshots);

  const interactionTypes = ['impression', 'view', 'click', 'save', 'feedback', 'dismiss'];
  const interactionDocs = [];
  for (let i = 0; i < Math.min(users.length, 80); i += 1) {
    for (let j = 0; j < Math.min(events.length, 12); j += 1) {
      const type = pick(interactionTypes, i + j);
      interactionDocs.push({ user: users[i]._id, event: events[j]._id, interactionType: type, feedbackType: type === 'feedback' ? (rand(i + j) > 0.2 ? 'like' : 'dislike') : 'none', feedbackReason: type === 'feedback' ? 'Relevant topic and strong speaker lineup' : '', recommendationSource: pick(['PERSONALIZED', 'TRENDING', 'NEARBY', 'COLLABORATIVE'], i + j), algorithmVersion: 'recommendation-v2.1-premium', createdAt: new Date(now - ((i * 12 + j) % 45) * 86400000) });
    }
  }
  await RecommendationInteraction.insertMany(interactionDocs);

  const liveEvents = events.filter((e) => ['live', 'published'].includes(e.status)).slice(0, 6);
  const pollQuestions = ['Which session should get an encore?', 'What is your biggest takeaway so far?', 'Which track should we add next?', 'How would you rate the event energy?', 'Which format helps you learn fastest?', 'What should organizers improve next?'];
  const pollChoices = [['Keynote', 'Workshop', 'Panel', 'Networking'], ['A new skill', 'A useful connection', 'A fresh idea', 'A career lead'], ['AI agents', 'Cloud', 'Product design', 'Founder stories'], ['Electric', 'Excellent', 'Good', 'Building'], ['Hands-on labs', 'Lightning talks', 'Peer circles', 'Office hours'], ['More breaks', 'More Q&A', 'More demos', 'Everything is great']];
  for (let i = 0; i < liveEvents.length; i += 1) {
    const voters = users.slice(i * 5, i * 5 + 28);
    await Poll.create({ event: liveEvents[i]._id, createdBy: liveEvents[i].organizer, question: pollQuestions[i], options: pollChoices[i].map((text, k) => ({ text, voters: voters.filter((u, n) => n % pollChoices[i].length === k).map((u) => u._id) })), multiple: i === 2, closed: liveEvents[i].status === 'completed' });
    const questionTexts = ['Can you share the slides after this session?', 'What is the best way to continue this conversation after the event?', 'Are there beginner resources for this topic?', 'Will there be a recording or replay?', 'How can attendees volunteer for the next edition?', 'Which companies are hiring for this skill?'];
    for (let q = 0; q < questionTexts.length; q += 1) {
      const user = users[(i * 7 + q) % users.length];
      await Question.create({ event: liveEvents[i]._id, user: user._id, userName: user.name, text: questionTexts[q], upvotes: users.slice(q, q + 3 + (q % 4)).map((u) => u._id), answered: q % 3 !== 1, answer: q % 3 !== 1 ? 'Great question — the host team will share a detailed follow-up in the event resources.' : '', answeredByName: q % 3 !== 1 ? 'EventSphere Host Team' : '' });
    }
  }

  const queueEvent = events.find((e) => e.slug === 'cyber-security-bootcamp') || events[0];
  const queueUsers = users.slice(0, 8);
  const waiters = await Waitlist.find({ event: queueEvent._id }).limit(8);
  const holdDocs = [];
  for (let i = 0; i < Math.min(waiters.length, queueUsers.length); i += 1) {
    const wait = waiters[i];
    const status = i < 2 ? 'expired' : i === 2 ? 'active' : 'accepted';
    const hold = await SeatHold.create({ eventId: queueEvent._id, userId: wait.user, waitlistEntryId: wait._id, ticketType: { name: 'Lab Seat', price: queueEvent.price }, status, holdExpiresAt: new Date(now + (status === 'active' ? 20 : -20) * 60000), holdDurationMinutes: 20, idempotencyKey: `premium-hold-${i}` });
    if (status === 'active') { wait.status = 'hold_active'; wait.activeHold = hold._id; await wait.save(); }
    holdDocs.push(hold);
    const actions = status === 'active' ? ['WAITLIST_JOINED', 'ELIGIBILITY_CHECKED', 'SEAT_HELD', 'NOTIFICATION_SENT'] : ['WAITLIST_JOINED', 'ELIGIBILITY_CHECKED', status === 'accepted' ? 'HOLD_ACCEPTED' : 'HOLD_EXPIRED', 'SEAT_RELEASED'];
    await SmartQueueAudit.insertMany(actions.map((action, k) => ({ eventId: queueEvent._id, userId: wait.user, holdId: hold._id, waitlistEntryId: wait._id, action, details: { position: wait.position, ticketType: 'Lab Seat', demo: true }, actor: k === 0 ? 'user' : 'system', createdAt: new Date(now - (actions.length - k) * 3600000) })));
  }
  queueEvent.activeHoldsCount = holdDocs.filter((h) => h.status === 'active').length;
  await queueEvent.save();

  await Report.insertMany(events.slice(0, 10).map((event, i) => ({ reporter: users[(i + 11) % users.length]._id, targetType: 'event', target: event._id, reason: pick(['incorrect_info', 'spam', 'other', 'inappropriate'], i), details: `Premium demo moderation case ${i + 1}: review venue, schedule and attendee-facing copy.`, status: pick(['open', 'reviewing', 'resolved', 'dismissed'], i), moderatorNote: i > 1 ? 'Reviewed by demo moderation team.' : '' })));

  const pointDocs = [];
  const pointReasons = ['Session attendance', 'Saved a recommended event', 'Joined a networking circle', 'Answered a poll', 'Completed profile', 'Shared event feedback'];
  for (let i = 0; i < users.length; i += 1) {
    for (let k = 0; k < 3; k += 1) pointDocs.push({ user: users[i]._id, event: events[(i + k) % events.length]._id, points: [20, 10, 15, 25, 5, 30][(i + k) % 6], reason: pointReasons[(i + k) % pointReasons.length], meta: { source: 'premium-demo-seed', streak: (i % 7) + 1 } });
  }
  await PointActivity.insertMany(pointDocs);
  const badgeRows = [];
  const badges = [{ code: 'EXPLORER', name: 'Explorer', icon: 'Compass', description: 'Registered for 3 different events' }, { code: 'TOP_NETWORKER', name: 'Top Networker', icon: 'Users', description: 'Made meaningful connections' }, { code: 'SOCIAL_BUTTERFLY', name: 'Social Butterfly', icon: 'MessageCircle', description: 'Active in live event conversations' }];
  for (let i = 0; i < users.length; i += 1) badgeRows.push({ user: users[i]._id, ...badges[i % badges.length] });
  await UserBadge.bulkWrite(badgeRows.map((row) => ({ updateOne: { filter: { user: row.user, code: row.code }, update: { $setOnInsert: row }, upsert: true } })));

  log(`✓ Premium seed complete: ${predictionDocs.length} predictions · ${snapshotDocs.length} prediction snapshots · ${interactionDocs.length} recommendation interactions · ${pulseAlertDocs.length} pulse alerts · ${riskAlertDocs.length} risk alerts · ${seoDocs.length} SEO profiles · ${trustProfiles.length} trust profiles · ${pointDocs.length} point activities · ${await Question.countDocuments()} questions`);
  return { skipped: false, predictions: predictionDocs.length, recommendationInteractions: interactionDocs.length, pointActivities: pointDocs.length };
}

if (require.main === module) {
  const { connectDB, disconnectDB } = require('../config/db');
  const { runSeed } = require('./seed');
  (async () => { await connectDB(); await runSeed({ force: true, silent: false }); await seedPremiumData(); await disconnectDB(); })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seedPremiumData, PREMIUM_COVERS };
