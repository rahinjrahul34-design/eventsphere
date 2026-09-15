/* eslint-disable no-console, no-await-in-loop */
/**
 * Post-seed verification: prints collection counts and validates referential
 * integrity, capacity invariants and counter consistency across the seeded
 * EventSphere dataset. Exits non-zero when any hard check fails.
 *
 * Usage: npm run seed:verify  (uses the same MONGO_URI / demo in-memory DB as the app)
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

const User = require('../models/User');
const Event = require('../models/Event');
const Category = require('../models/Category');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Speaker = require('../models/Speaker');
const Session = require('../models/Session');
const Sponsor = require('../models/Sponsor');
const Volunteer = require('../models/Volunteer');
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Waitlist = require('../models/Waitlist');
const SeatHold = require('../models/SeatHold');
const SmartQueueAudit = require('../models/SmartQueueAudit');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const RecommendationInteraction = require('../models/RecommendationInteraction');
const PredictionOutcome = require('../models/PredictionOutcome');
const EventPrediction = require('../models/EventPrediction');
const EventPredictionSnapshot = require('../models/EventPredictionSnapshot');
const EventPulseAlert = require('../models/EventPulseAlert');
const EventRiskAssessment = require('../models/EventRiskAssessment');
const EventRiskAlert = require('../models/EventRiskAlert');
const RiskAssessmentHistory = require('../models/RiskAssessmentHistory');
const EventSEOProfile = require('../models/EventSEOProfile');
const OrganizerTrustProfile = require('../models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../models/OrganizerTrustSnapshot');
const { PointActivity, UserBadge } = require('../models/Gamification');

const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const warn = (msg) => warnings.push(msg);

// Returns ids present in `fromIds` that do not exist in the target model.
async function danglingIds(fromIds, Model) {
  const found = await Model.find({ _id: { $in: fromIds } }).select('_id').lean();
  const foundSet = new Set(found.map((d) => String(d._id)));
  return fromIds.filter((id) => !foundSet.has(String(id)));
}

async function verifyRef(label, Model, field, TargetModel) {
  // fast path: collect distinct referenced ids, then check existence
  const refs = await Model.distinct(field);
  const ids = refs.filter((v) => v && mongoose.isValidObjectId(v)).slice(0, 20000);
  const dangling = await danglingIds(ids, TargetModel);
  if (dangling.length) fail(`${label}: ${dangling.length} dangling reference(s) → ${Model.modelName}.${field} (${Model.collection.name})`);
}

async function main() {
  await connectDB();
  console.log('\n──────── EventSphere seed verification ────────\n');

  // ── 1. Collection counts (Phase 23 report) ──
  const COLLECTIONS = {
    users: User, events: Event, categories: Category, registrations: Registration,
    tickets: Ticket, payments: Payment, sessions: Session, speakers: Speaker,
    sponsors: Sponsor, volunteers: Volunteer, polls: Poll, questions: Question,
    waitlists: Waitlist, seatHolds: SeatHold, smartQueueAudits: SmartQueueAudit,
    reports: Report, feedback: Feedback, notifications: Notification,
    recommendationInteractions: RecommendationInteraction, pointActivities: PointActivity,
    userBadges: UserBadge, predictions: EventPrediction, predictionSnapshots: EventPredictionSnapshot,
    predictionOutcomes: PredictionOutcome, eventPulseAlerts: EventPulseAlert,
    riskAssessments: EventRiskAssessment, riskAlerts: EventRiskAlert,
    riskAssessmentHistories: RiskAssessmentHistory, trustProfiles: OrganizerTrustProfile,
    trustSnapshots: OrganizerTrustSnapshot, seoProfiles: EventSEOProfile,
  };
  const countMap = {};
  for (const [name, Model] of Object.entries(COLLECTIONS)) {
    countMap[name] = await Model.countDocuments();
    console.log(`  ${name.padEnd(28)} ${countMap[name]}`);
  }

  // ── 2. Reference integrity ──
  console.log('\n  ─ reference integrity ─');
  await verifyRef('registrations→event', Registration, 'event', Event);
  await verifyRef('registrations→user', Registration, 'user', User);
  await verifyRef('tickets→event', Ticket, 'event', Event);
  await verifyRef('tickets→registration', Ticket, 'registration', Registration);
  await verifyRef('tickets→user', Ticket, 'user', User);
  await verifyRef('payments→registration', Payment, 'registration', Registration);
  await verifyRef('sessions→event', Session, 'event', Event);
  await verifyRef('sessions→speaker', Session, 'speaker', Speaker);
  await verifyRef('speakers→user', Speaker, 'user', User);
  await verifyRef('sponsors→event', Sponsor, 'event', Event);
  await verifyRef('volunteers→event', Volunteer, 'event', Event);
  await verifyRef('volunteers→user', Volunteer, 'user', User);
  await verifyRef('polls→event', Poll, 'event', Event);
  await verifyRef('questions→event', Question, 'event', Event);
  await verifyRef('questions→session', Question, 'session', Session);
  await verifyRef('waitlists→event', Waitlist, 'event', Event);
  await verifyRef('waitlists→user', Waitlist, 'user', User);
  await verifyRef('waitlists→registration', Waitlist, 'registration', Registration);
  await verifyRef('seatHolds→event', SeatHold, 'eventId', Event);
  await verifyRef('seatHolds→user', SeatHold, 'userId', User);
  await verifyRef('seatHolds→waitlist', SeatHold, 'waitlistEntryId', Waitlist);
  await verifyRef('audits→event', SmartQueueAudit, 'eventId', Event);
  await verifyRef('audits→hold', SmartQueueAudit, 'holdId', SeatHold);
  await verifyRef('feedback→event', Feedback, 'event', Event);
  await verifyRef('feedback→user', Feedback, 'user', User);
  await verifyRef('notifications→user', Notification, 'user', User);
  await verifyRef('interactions→event', RecommendationInteraction, 'event', Event);
  await verifyRef('interactions→user', RecommendationInteraction, 'user', User);
  await verifyRef('predictions→event', EventPrediction, 'eventId', Event);
  await verifyRef('outcomes→event', PredictionOutcome, 'eventId', Event);
  await verifyRef('riskAssessments→event', EventRiskAssessment, 'eventId', Event);
  await verifyRef('riskHistory→event', RiskAssessmentHistory, 'eventId', Event);
  await verifyRef('trustProfiles→organizer', OrganizerTrustProfile, 'organizer', User);
  await verifyRef('seoProfiles→event', EventSEOProfile, 'event', Event);
  console.log('  checked 30+ reference edges across all seeded collections');

  // ── 3. Capacity invariants ──
  console.log('\n  ─ capacity & counter invariants ─');
  const overbooked = await Registration.aggregate([
    { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
    { $group: { _id: '$event', confirmed: { $sum: 1 } } },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $match: { $expr: { $gt: ['$confirmed', '$ev.capacity'] } } },
    { $project: { title: '$ev.title', confirmed: 1, capacity: '$ev.capacity' } },
  ]);
  if (overbooked.length) fail(`capacity: ${overbooked.length} event(s) overbooked → ${overbooked.slice(0, 5).map((o) => `${o.title} (${o.confirmed}/${o.capacity})`).join(', ')}`);

  const [predDupes, outcomeDupes, waitDupes, ticketDupes] = await Promise.all([
    EventPrediction.aggregate([{ $group: { _id: '$eventId', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]),
    PredictionOutcome.aggregate([{ $group: { _id: '$eventId', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]),
    Waitlist.aggregate([{ $group: { _id: { e: '$event', u: '$user' }, c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]),
    Ticket.aggregate([{ $group: { _id: '$code', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]),
  ]);
  if (predDupes.length && predDupes[0].n) fail(`predictions: ${predDupes[0].n} events have >1 EventPrediction`);
  if (outcomeDupes.length && outcomeDupes[0].n) fail(`outcomes: ${outcomeDupes[0].n} events have >1 PredictionOutcome`);
  if (waitDupes.length && waitDupes[0].n) fail(`waitlist: ${waitDupes[0].n} duplicate (event,user) entries`);
  if (ticketDupes.length && ticketDupes[0].n) fail(`tickets: ${ticketDupes[0].n} duplicate codes`);

  // Stored counters vs reality (warn-only — they are denormalized caches)
  const counterMismatches = await Registration.aggregate([
    { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
    { $group: { _id: '$event', confirmed: { $sum: 1 } } },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $match: { $expr: { $ne: ['$confirmed', '$ev.registrationCount'] } } },
    { $count: 'n' },
  ]);
  if (counterMismatches.length && counterMismatches[0].n) warn(`registrationCount drift on ${counterMismatches[0].n} event(s) — recompute or leave as demo variance`);

  // Points consistency for users that have a point ledger
  const pointsMismatch = await PointActivity.aggregate([
    { $group: { _id: '$user', total: { $sum: '$points' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $match: { $expr: { $ne: ['$total', '$u.points'] } } },
    { $count: 'n' },
  ]);
  if (pointsMismatch.length && pointsMismatch[0].n) warn(`User.points differs from point ledger on ${pointsMismatch[0].n} account(s)`);

  // Date sanity
  const badDates = await Event.countDocuments({ $expr: { $gte: ['$startDate', '$endDate'] } });
  if (badDates) fail(`events: ${badDates} with startDate >= endDate`);
  const completedFuture = await Event.countDocuments({ status: 'completed', startDate: { $gt: new Date() } });
  if (completedFuture) warn(`${completedFuture} event(s) marked completed but start in the future`);

  // ── 4. Verdict ──
  console.log('\n──────── verdict ────────');
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`\n  FAILED with ${failures.length} hard error(s).\n`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ All integrity checks passed (${warnings.length} warning(s)).\n`);
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await disconnectDB(); });
