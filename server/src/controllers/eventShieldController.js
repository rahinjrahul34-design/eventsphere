/**
 * EventShield AI Controller
 * Manages risk assessments, what-if simulations, checklists, alerts, history, and reports.
 */

const Event = require('../models/Event');
const Volunteer = require('../models/Volunteer');
const Session = require('../models/Session');
const Registration = require('../models/Registration');
const EventRiskAssessment = require('../models/EventRiskAssessment');
const RiskAssessmentHistory = require('../models/RiskAssessmentHistory');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const {
  evaluateEventRisk,
  simulateEventRisk,
  DISCLAIMER_TEXT,
} = require('../services/eventShieldEngine');
const { enrichAssessmentWithAi } = require('../services/eventShieldAi');
const {
  checkAndSyncAlerts,
  resolveAlert: resolveAlertService,
  getEventAlerts,
} = require('../services/eventShieldAlerts');

/**
 * Authorization guard: Only the event organizer, co-organizers, or platform admins can access EventShield.
 */
function verifyOrganizerAccess(event, req) {
  if (!event) throw ApiError.notFound('Event not found');

  const userId = req.userId?.toString();
  const organizerId = (event.organizer?._id || event.organizer)?.toString();
  const isOwner = organizerId === userId;
  const isCoOrganizer = event.coOrganizers?.some((id) => (id?._id || id)?.toString() === userId);
  const isAdmin = req.user?.role === 'admin';

  if (!isOwner && !isCoOrganizer && !isAdmin) {
    throw ApiError.forbidden('Access denied. Only event organizers and administrators can view EventShield AI.');
  }
}

/**
 * Helper to gather live event operational data
 */
async function gatherEventContext(eventId) {
  const [volunteers, sessions, registrationsCount, checkedInCount, waitlistCount] = await Promise.all([
    Volunteer.find({ event: eventId }),
    Session.find({ event: eventId }),
    Registration.countDocuments({ event: eventId, status: { $in: ['confirmed', 'checked_in'] } }),
    Registration.countDocuments({ event: eventId, status: 'checked_in' }),
    Registration.countDocuments({ event: eventId, status: 'waitlisted' }),
  ]);

  return {
    volunteers,
    sessions,
    registrationsCount,
    checkedInCount,
    waitlistCount,
  };
}

/**
 * GET /api/events/:id/eventshield
 * Retrieve current active risk assessment or auto-generate initial evaluation
 */
const getAssessment = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  let assessment = await EventRiskAssessment.findOne({ eventId: event._id });

  if (!assessment) {
    const context = await gatherEventContext(event._id);
    const evaluated = evaluateEventRisk(event, context);
    const enriched = await enrichAssessmentWithAi(evaluated, event);

    assessment = await EventRiskAssessment.create({
      eventId: event._id,
      ...enriched,
    });

    await RiskAssessmentHistory.create({
      eventId: event._id,
      safetyScore: assessment.safetyScore,
      readinessScore: assessment.readinessScore,
      overallRiskLevel: assessment.overallRiskLevel,
      trigger: 'initial',
      delta: 0,
      improvements: ['Initial baseline risk assessment created.'],
      topRisksCount: assessment.topRisks.length,
    });

    await checkAndSyncAlerts(event, assessment, context);
  }

  ok(res, assessment);
});

/**
 * POST /api/events/:id/eventshield/analyze
 * Force recalculation with live DB telemetry + AI synthesis
 */
const analyzeEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const context = await gatherEventContext(event._id);
  const previous = await EventRiskAssessment.findOne({ eventId: event._id });

  const evaluated = evaluateEventRisk(event, context, previous);
  const enriched = await enrichAssessmentWithAi(evaluated, event);

  const prevScore = previous?.safetyScore ?? enriched.safetyScore;
  const delta = enriched.safetyScore - prevScore;

  const improvements = [];
  if (delta > 0) {
    improvements.push(`Safety score increased by +${delta} points.`);
  } else if (delta < 0) {
    improvements.push(`Safety score decreased by ${Math.abs(delta)} points.`);
  } else {
    improvements.push('Safety score maintained steady.');
  }

  const assessment = await EventRiskAssessment.findOneAndUpdate(
    { eventId: event._id },
    {
      ...enriched,
      version: (previous?.version || 1) + 1,
      analyzedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await RiskAssessmentHistory.create({
    eventId: event._id,
    safetyScore: assessment.safetyScore,
    readinessScore: assessment.readinessScore,
    overallRiskLevel: assessment.overallRiskLevel,
    trigger: req.body.trigger || 'manual',
    delta,
    improvements,
    topRisksCount: assessment.topRisks.length,
  });

  await checkAndSyncAlerts(event, assessment, context);

  ok(res, assessment);
});

/**
 * POST /api/events/:id/eventshield/simulate
 * Fast What-If Simulator (Purely in-memory)
 */
const simulate = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const simulationResult = simulateEventRisk(event, req.body || {});
  ok(res, simulationResult);
});

/**
 * GET /api/events/:id/eventshield/history
 * Chronological risk score evolution
 */
const getHistory = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const history = await RiskAssessmentHistory.find({ eventId: event._id })
    .sort({ createdAt: 1 })
    .limit(100);

  ok(res, history);
});

/**
 * GET /api/events/:id/eventshield/checklist
 * Fetch dynamic safety checklist
 */
const getChecklist = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  let assessment = await EventRiskAssessment.findOne({ eventId: event._id });
  if (!assessment) {
    const context = await gatherEventContext(event._id);
    const evaluated = evaluateEventRisk(event, context);
    assessment = await EventRiskAssessment.create({
      eventId: event._id,
      ...evaluated,
    });
  }

  ok(res, assessment.checklist || []);
});

/**
 * PATCH /api/events/:id/eventshield/checklist
 * Mark checklist items as completed or pending
 */
const updateChecklistItem = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const { itemId, status } = req.body;
  if (!itemId || !status) {
    throw ApiError.badRequest('itemId and status are required');
  }

  let assessment = await EventRiskAssessment.findOne({ eventId: event._id });
  if (!assessment) {
    const context = await gatherEventContext(event._id);
    assessment = await EventRiskAssessment.create({
      eventId: event._id,
      ...evaluateEventRisk(event, context),
    });
  }

  const item = assessment.checklist.find((c) => c.id === itemId);
  if (!item) {
    throw ApiError.notFound('Checklist item not found');
  }

  item.status = status;
  if (status === 'completed') {
    item.completedAt = new Date();
    item.completedBy = req.userId;
  } else {
    item.completedAt = null;
    item.completedBy = null;
  }

  // Adjust readiness score based on checklist progress
  const totalItems = assessment.checklist.length;
  const completedItems = assessment.checklist.filter((c) => c.status === 'completed').length;
  const checklistCompletionPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 100;

  // Boost readiness up to +15% based on checklist diligence
  const baseReadiness = assessment.readinessScore;
  assessment.readinessScore = Math.min(
    100,
    Math.max(20, Math.round(baseReadiness * 0.85 + checklistCompletionPct * 0.15))
  );

  await assessment.save();

  ok(res, {
    checklist: assessment.checklist,
    readinessScore: assessment.readinessScore,
  });
});

/**
 * GET /api/events/:id/eventshield/alerts
 * Active and past alerts for this event
 */
const getAlerts = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const alerts = await getEventAlerts(event._id);
  ok(res, alerts);
});

/**
 * PATCH /api/events/:id/eventshield/alerts/:alertId/resolve
 * Manually resolve an alert
 */
const resolveAlert = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const alert = await resolveAlertService(req.params.alertId, req.userId);
  if (!alert) throw ApiError.notFound('Alert not found');

  ok(res, alert);
});

/**
 * GET /api/events/:id/eventshield/report
 * Printable and exportable audit report payload
 */
const getReport = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email company');
  verifyOrganizerAccess(event, req);

  let assessment = await EventRiskAssessment.findOne({ eventId: event._id });
  if (!assessment) {
    const context = await gatherEventContext(event._id);
    assessment = await EventRiskAssessment.create({
      eventId: event._id,
      ...evaluateEventRisk(event, context),
    });
  }

  const alerts = await getEventAlerts(event._id);
  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const history = await RiskAssessmentHistory.find({ eventId: event._id })
    .sort({ createdAt: 1 })
    .limit(20);

  const report = {
    reportId: `ES-REPORT-${event._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    generatedAt: new Date(),
    disclaimer: DISCLAIMER_TEXT,
    event: {
      id: event._id,
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      venue: event.venue,
      capacity: event.capacity,
      registrationCount: event.registrationCount,
      organizer: event.organizer,
    },
    scores: {
      safetyScore: assessment.safetyScore,
      readinessScore: assessment.readinessScore,
      overallRiskLevel: assessment.overallRiskLevel,
    },
    executiveSummary: assessment.summary,
    topRisks: assessment.topRisks,
    categories: assessment.categories,
    matrix: assessment.matrix,
    checklist: assessment.checklist,
    activeAlerts,
    historyTrend: history.map((h) => ({
      date: h.createdAt,
      safetyScore: h.safetyScore,
      readinessScore: h.readinessScore,
      riskLevel: h.overallRiskLevel,
    })),
  };

  ok(res, report);
});

/**
 * PUT /api/events/:id/eventshield/safety-config
 * Update event safety settings and automatically trigger recalculation
 */
const updateSafetyConfig = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  verifyOrganizerAccess(event, req);

  const allowedFields = [
    'emergencyContact',
    'firstAidStation',
    'entryGates',
    'checkInDesks',
    'staffCount',
    'parkingCapacity',
    'parkingInfo',
    'accessibilityInfo',
    'evacuationInstructions',
    'evacuationPlanUrl',
    'isOutdoor',
  ];

  if (!event.safetyConfig) {
    event.safetyConfig = {};
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      event.safetyConfig[field] = req.body[field];
    }
  });

  await event.save();

  // Auto-recalculate assessment with new safety configurations
  const context = await gatherEventContext(event._id);
  const previous = await EventRiskAssessment.findOne({ eventId: event._id });
  const evaluated = evaluateEventRisk(event, context, previous);
  const enriched = await enrichAssessmentWithAi(evaluated, event);

  const assessment = await EventRiskAssessment.findOneAndUpdate(
    { eventId: event._id },
    { ...enriched, analyzedAt: new Date() },
    { upsert: true, new: true }
  );

  await checkAndSyncAlerts(event, assessment, context);

  ok(res, {
    safetyConfig: event.safetyConfig,
    assessment,
  });
});

module.exports = {
  getAssessment,
  analyzeEvent,
  simulate,
  getHistory,
  getChecklist,
  updateChecklistItem,
  getAlerts,
  resolveAlert,
  getReport,
  updateSafetyConfig,
};
