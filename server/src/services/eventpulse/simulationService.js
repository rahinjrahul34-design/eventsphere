/**
 * Simulation Service (Demo Mode / What-If Simulator)
 * Calculates simulated forecast scenarios without modifying production records.
 * Labeled explicitly as synthetic data for viva / academic demonstrations.
 */

const BaselineModel = require('./models/baselineModel');
const RegressionModel = require('./models/regressionModel');
const EnsembleModel = require('./models/ensembleModel');
const { calculateRegistrationVelocity } = require('./velocityService');
const { calculateExpectedAttendance } = require('./attendanceService');
const { calculateEngagementScore } = require('./engagementService');
const { calculateEventHealth } = require('./healthScoreService');
const { calculatePredictionConfidence } = require('./confidenceService');
const { extractPredictionDrivers } = require('./driverService');
const { generateOrganizerRecommendations } = require('./recommendationActionService');

function simulateScenario(baseFeatures, overrides = {}) {
  // Deep clone features to prevent state mutation
  const simulatedFeatures = JSON.parse(JSON.stringify(baseFeatures));

  // Apply user-provided simulation parameters
  if (overrides.capacity !== undefined) {
    simulatedFeatures.event.capacity = Math.max(10, Number(overrides.capacity));
  }
  if (overrides.isPaid !== undefined) {
    simulatedFeatures.event.isPaid = Boolean(overrides.isPaid);
  }
  if (overrides.daysRemaining !== undefined) {
    simulatedFeatures.timing.daysRemaining = Math.max(0, Number(overrides.daysRemaining));
  }
  if (overrides.currentRegistrations !== undefined) {
    simulatedFeatures.registrations.totalConfirmed = Math.max(0, Number(overrides.currentRegistrations));
  }
  if (overrides.velocity24h !== undefined) {
    simulatedFeatures.registrations.velocity.last24h = Math.max(0, Number(overrides.velocity24h));
  }
  if (overrides.reminderSent) {
    // A reminder decreases drop-out rate by ~15%
    if (simulatedFeatures.historical.hasOrgHistory && simulatedFeatures.historical.historicalOrgAttendanceRate) {
      simulatedFeatures.historical.historicalOrgAttendanceRate = Math.min(0.95, simulatedFeatures.historical.historicalOrgAttendanceRate + 0.10);
    }
  }

  // Recalculate capacity utilization
  simulatedFeatures.registrations.capacityUtilization = Number(
    (simulatedFeatures.registrations.totalConfirmed / Math.max(1, simulatedFeatures.event.capacity)).toFixed(3)
  );

  // Run ensemble model
  const ensembleResult = EnsembleModel.predict(simulatedFeatures);
  const velocityData = calculateRegistrationVelocity(simulatedFeatures.registrations);
  const attendanceData = calculateExpectedAttendance(
    simulatedFeatures,
    ensembleResult.predictedRegistrations,
    ensembleResult.attendanceRate
  );
  const engagementData = calculateEngagementScore(simulatedFeatures, attendanceData.expectedAttendees);
  const healthData = calculateEventHealth(simulatedFeatures, velocityData, attendanceData, engagementData);
  const confidenceData = calculatePredictionConfidence(simulatedFeatures);
  const drivers = extractPredictionDrivers(simulatedFeatures, velocityData, attendanceData);
  const recommendations = generateOrganizerRecommendations(simulatedFeatures, velocityData, attendanceData, engagementData);

  return {
    isSimulation: true,
    simulationTag: 'DEMO / SIMULATION MODE — SYNTHETIC DATA',
    overrides,
    forecast: {
      predictedRegistrations: ensembleResult.predictedRegistrations,
      lowerBound: Math.max(simulatedFeatures.registrations.totalConfirmed, Math.round(ensembleResult.predictedRegistrations * 0.9)),
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
  };
}

module.exports = {
  simulateScenario,
};
