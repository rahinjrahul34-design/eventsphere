/**
 * AI Command Center Controller
 *
 * Exposes endpoints for unified event intelligence aggregation, what-if scenario simulations,
 * on-demand AI executive briefing, and action resolution.
 *
 * Security: RBAC guarded. Only authorized organizers, co-organizers, or platform admins
 * can access command center intelligence.
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRiskAlert = require('../models/EventRiskAlert');
const EventPulseAlert = require('../models/EventPulseAlert');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/response');
const { resolveAlert: resolveShieldAlert } = require('../services/eventShieldAlerts');

// Aggregation & simulation services
const { aggregateCommandCenterData } = require('../services/commandCenter/commandCenterAggregator');
const { runSimulation } = require('../services/commandCenter/simulationEngine');
const { generateExecutiveBrief } = require('../services/commandCenter/narrativeService');

/**
 * RBAC Authorization guard
 */
async function authorizeEventAccess(eventId, user) {
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    throw ApiError.badRequest('Invalid event ID format');
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  if (user.role === 'admin') {
    return event;
  }

  const userId = user._id ? user._id.toString() : user.id?.toString();
  const organizerId = (event.organizer?._id || event.organizer)?.toString();
  const isOwner = organizerId === userId;
  const isCoOrganizer = (event.coOrganizers || []).some(
    (co) => (co?._id || co)?.toString() === userId
  );

  if (!isOwner && !isCoOrganizer) {
    throw ApiError.forbidden('You are not authorized to view the Command Center for this event.');
  }

  return event;
}

/**
 * GET /api/command-center/:eventId
 * Retrieves unified command center intelligence.
 */
const getCommandCenter = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.params.id;
  await authorizeEventAccess(eventId, req.user);

  const data = await aggregateCommandCenterData(eventId, req.user);
  ok(res, data);
});

/**
 * POST /api/command-center/:eventId/simulate
 * Runs deterministic What-If scenario simulations.
 */
const simulate = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.params.id;
  await authorizeEventAccess(eventId, req.user);

  const baseline = await aggregateCommandCenterData(eventId, req.user);
  const result = runSimulation({
    event: baseline.event,
    pulseData: {
      attendance: {
        attendanceRate: baseline.attendance.attendanceRate,
        expectedAttendees: baseline.attendance.expectedAttendance,
        expectedNoShows: baseline.attendance.expectedNoShows,
      },
      registrations: {
        predictedTotal: baseline.attendance.expectedRegistrations,
      },
      health: baseline.overallHealth,
    },
    shieldData: {
      safetyScore: baseline.safety.safetyScore,
      readinessScore: baseline.safety.operationalReadiness,
    },
    shieldAlerts: baseline.alerts.filter((a) => a.source === 'eventshield'),
    queueData: {
      metrics: {
        waitingCount: baseline.queue.waitingCount,
        efficiencyScore: baseline.queue.efficiencyScore,
      },
    },
    boostProfile: {
      seoScore: baseline.seo.seoScore,
      contentScore: baseline.seo.contentScore,
    },
    trustProfile: {
      trustScore: baseline.trust.trustScore,
      verified: baseline.trust.verified,
    },
    health: baseline.overallHealth,
  }, req.body || {});

  ok(res, result);
});

/**
 * POST /api/command-center/:eventId/brief
 * Generates an on-demand AI executive brief.
 */
const getAiBrief = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.params.id;
  await authorizeEventAccess(eventId, req.user);

  const baseline = await aggregateCommandCenterData(eventId, req.user);
  const brief = await generateExecutiveBrief({
    event: baseline.event,
    health: baseline.overallHealth,
    actions: baseline.actions,
    pulseData: {
      attendance: {
        expectedAttendees: baseline.attendance.expectedAttendance,
        expectedNoShows: baseline.attendance.expectedNoShows,
        attendanceRate: baseline.attendance.attendanceRate,
      },
    },
    shieldData: {
      safetyScore: baseline.safety.safetyScore,
    },
    shieldAlerts: baseline.alerts.filter((a) => a.source === 'eventshield'),
    queueData: {
      metrics: {
        waitingCount: baseline.queue.waitingCount,
      },
    },
    boostProfile: {
      seoScore: baseline.seo.seoScore,
    },
    trustProfile: {
      trustScore: baseline.trust.trustScore,
    },
  });

  ok(res, brief);
});

/**
 * PATCH /api/command-center/:eventId/actions/:actionId
 * Updates or resolves an action if supported by the underlying module.
 */
const updateActionStatus = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.params.id;
  const { actionId } = req.params;
  const { status = 'resolved' } = req.body;

  await authorizeEventAccess(eventId, req.user);

  let updated = false;

  // 1. Check if actionId corresponds to an EventRiskAlert
  if (mongoose.Types.ObjectId.isValid(actionId)) {
    const shieldAlert = await EventRiskAlert.findById(actionId);
    if (shieldAlert && shieldAlert.eventId.toString() === eventId.toString()) {
      if (status === 'resolved') {
        await resolveShieldAlert(actionId, req.user._id);
      } else {
        shieldAlert.status = status;
        await shieldAlert.save();
      }
      updated = true;
    }

    // 2. Check if actionId corresponds to an EventPulseAlert
    if (!updated) {
      const pulseAlert = await EventPulseAlert.findById(actionId);
      if (pulseAlert && pulseAlert.eventId.toString() === eventId.toString()) {
        pulseAlert.status = status;
        if (status === 'resolved') pulseAlert.resolvedAt = new Date();
        await pulseAlert.save();
        updated = true;
      }
    }
  }

  ok(res, { success: true, actionId, status, updated });
});

module.exports = {
  authorizeEventAccess,
  getCommandCenter,
  simulate,
  getAiBrief,
  updateActionStatus,
};
