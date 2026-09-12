/**
 * EventPulse AI Master Orchestrator Engine
 * Coordinates feature extraction, predictive modeling, confidence estimation,
 * persistence, snapshot logging, caching, and real-time Socket.IO broadcasts.
 */

const EventPrediction = require('../../models/EventPrediction');
const EventPredictionSnapshot = require('../../models/EventPredictionSnapshot');
const Event = require('../../models/Event');
const config = require('./config');

const { extractEventFeatures } = require('./featureExtractor');
const { extractEventFeatures: extractFeatures } = require('./featureExtractor');
const EnsembleModel = require('./models/ensembleModel');
const { calculateRegistrationVelocity } = require('./velocityService');
const { calculateExpectedAttendance } = require('./attendanceService');
const { calculateEngagementScore } = require('./engagementService');
const { calculateEventHealth } = require('./healthScoreService');
const { calculatePredictionConfidence } = require('./confidenceService');
const { extractPredictionDrivers } = require('./driverService');
const { generateOrganizerRecommendations } = require('./recommendationActionService');
const { evaluateRiskAlerts } = require('./riskAlertService');
const { evaluateCompletedEvent } = require('./accuracyService');
const { callGeminiForNarrative, generateDeterministicSummary } = require('./aiNarrativeService');

let socketHelpers = null;
try {
  socketHelpers = require('../../sockets');
} catch (e) {
  // Safe fallback if sockets not yet initialized (e.g. in test runner)
}

const EventPulseAlert = require('../../models/EventPulseAlert');

/** Lightweight read of currently-active alerts (used on cached reads). */
async function activeAlertsFor(eventId) {
  try {
    return await EventPulseAlert.find({ eventId, status: 'active' }).sort({ createdAt: -1 }).lean();
  } catch (e) {
    return [];
  }
}

/**
 * Generate or retrieve cached prediction for an event
 */
async function getOrComputePrediction(eventId, forceRefresh = false) {
  const now = new Date();

  // 1. Check cache if not forcing refresh
  if (!forceRefresh) {
    const cached = await EventPrediction.findOne({
      eventId,
      expiresAt: { $gt: now },
    }).lean();

    if (cached) {
      // Attach a fresh (read-only) feature extract so the dashboard keeps its
      // live signals (trend history, current counts, live monitor) even on
      // cached reads — WITHOUT rerunning the expensive model/AI/write pipeline.
      try {
        const features = await extractEventFeatures(eventId);
        return { ...cached, activeAlerts: await activeAlertsFor(eventId), features };
      } catch (e) {
        return cached;
      }
    }
  }

  // 2. Extract features
  const features = await extractEventFeatures(eventId);
  if (!features) return null;

  // 3. Compute predictive components
  const ensembleResult = EnsembleModel.predict(features);
  const velocityData = calculateRegistrationVelocity(features.registrations);
  const attendanceData = calculateExpectedAttendance(
    features,
    ensembleResult.predictedRegistrations,
    ensembleResult.attendanceRate
  );
  const engagementData = calculateEngagementScore(features, attendanceData.expectedAttendees);
  const healthData = calculateEventHealth(features, velocityData, attendanceData, engagementData);
  const confidenceData = calculatePredictionConfidence(features);
  const drivers = extractPredictionDrivers(features, velocityData, attendanceData);
  const recommendations = generateOrganizerRecommendations(features, velocityData, attendanceData, engagementData);

  // 4. Form preliminary prediction object
  const preliminaryPrediction = {
    eventId,
    forecast: {
      predictedRegistrations: ensembleResult.predictedRegistrations,
      lowerBound: Math.max(features.registrations.totalConfirmed, Math.round(ensembleResult.predictedRegistrations * 0.9)),
      upperBound: Math.round(ensembleResult.predictedRegistrations * 1.1),
      velocity24h: velocityData.last24h,
      growthRate: velocityData.growthRate,
      momentumState: velocityData.momentumState,
    },
    attendance: attendanceData,
    engagement: engagementData,
    health: healthData,
    confidence: confidenceData,
    drivers,
    recommendations,
    isColdStart: features.historical.isColdStart,
    modelVersion: config.MODEL_VERSION,
  };

  // 5. AI Narrative Enrichment (Gemini + fallback)
  let aiSummary = await callGeminiForNarrative(preliminaryPrediction, features);
  let engine = 'hybrid-gemini';

  if (!aiSummary) {
    aiSummary = generateDeterministicSummary(preliminaryPrediction, features);
    engine = 'hybrid-deterministic';
  }

  // 6. Evaluate operational and predictive risk alerts
  const activeAlerts = await evaluateRiskAlerts(
    eventId,
    features,
    velocityData,
    attendanceData,
    engagementData
  );

  // 7. If completed, evaluate actuals vs prediction
  if (features.event.isCompleted) {
    await evaluateCompletedEvent(eventId, features, preliminaryPrediction);
  }

  // 8. Cache expiration (15 minutes from now)
  const expiresAt = new Date(now.getTime() + config.CACHE_TTL_MINUTES * 60 * 1000);

  // 9. Persist in EventPrediction
  const updatedPrediction = await EventPrediction.findOneAndUpdate(
    { eventId },
    {
      $set: {
        forecast: preliminaryPrediction.forecast,
        attendance: preliminaryPrediction.attendance,
        engagement: preliminaryPrediction.engagement,
        health: preliminaryPrediction.health,
        confidence: preliminaryPrediction.confidence,
        drivers: preliminaryPrediction.drivers,
        recommendations: preliminaryPrediction.recommendations,
        aiSummary,
        isColdStart: preliminaryPrediction.isColdStart,
        modelVersion: preliminaryPrediction.modelVersion,
        engine,
        featureSnapshot: {
          totalConfirmed: features.registrations.totalConfirmed,
          capacity: features.event.capacity,
          daysRemaining: features.timing.daysRemaining,
          currentCheckedIns: features.registrations.currentCheckedIns,
        },
        generatedAt: now,
        expiresAt,
      },
    },
    { upsert: true, new: true }
  ).lean();

  // 10. Record snapshot for prediction timeline (CORE FEATURE 34)
  // Pre-event: at most one snapshot per calendar day (upserted, so the day's
  // point always reflects the latest model state). Live events: a new point
  // per recalculation, because intra-day prediction evolution is valuable.
  const snapshotPayload = {
    eventId,
    predictedRegistrations: preliminaryPrediction.forecast.predictedRegistrations,
    actualRegistrations: features.registrations.totalConfirmed,
    expectedAttendance: preliminaryPrediction.attendance.expectedAttendees,
    actualAttendance: features.registrations.currentCheckedIns,
    engagementScore: preliminaryPrediction.engagement.score,
    trigger: forceRefresh ? 'manual' : 'daily',
    modelVersion: config.MODEL_VERSION,
  };
  if (features.event.isLive) {
    await EventPredictionSnapshot.create({ ...snapshotPayload, snapshotTime: now, dayOffset: Math.round(features.timing.daysSincePublication) });
  } else {
    const dayOffset = Math.round(features.timing.daysSincePublication);
    await EventPredictionSnapshot.findOneAndUpdate(
      { eventId, dayOffset },
      { $set: { ...snapshotPayload, snapshotTime: now } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // 11. Broadcast update to event room via Socket.IO
  if (socketHelpers?.emitToEvent) {
    socketHelpers.emitToEvent(String(eventId), 'eventpulse:updated', {
      prediction: updatedPrediction,
      activeAlertsCount: activeAlerts.length,
    });
  }

  return {
    ...updatedPrediction,
    activeAlerts,
    features,
  };
}

/**
 * Retrieve prediction history snapshots for timeline chart
 */
async function getPredictionHistory(eventId) {
  const snapshots = await EventPredictionSnapshot.find({ eventId })
    .sort({ snapshotTime: 1 })
    .limit(30)
    .lean();
  return snapshots;
}

module.exports = {
  getOrComputePrediction,
  getPredictionHistory,
};
