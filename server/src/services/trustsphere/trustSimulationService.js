const metricExtractor = require('./metricExtractor');
const scoringEngine = require('./scoringEngine');

/**
 * Runs an isolated what-if reputation simulation without modifying any real database records.
 *
 * @param {string|mongoose.Types.ObjectId} organizerId
 * @param {Object} hypotheticalOverrides
 * @returns {Promise<Object>} Simulated score projection
 */
async function simulateTrustScenario(organizerId, hypotheticalOverrides = {}) {
  const extracted = await metricExtractor.extractOrganizerMetrics(organizerId);
  const originalScored = scoringEngine.scoreOrganizer(extracted);

  // Clone extracted data for in-memory simulation
  const simulatedExtracted = {
    organizer: extracted.organizer,
    events: {
      ...extracted.events,
      completed: [...extracted.events.completed],
    },
    metrics: {
      ...extracted.metrics,
    },
  };

  // Apply hypothetical modifications safely
  if (typeof hypotheticalOverrides.completionRate === 'number') {
    simulatedExtracted.metrics.completionRate = Math.min(100, Math.max(0, hypotheticalOverrides.completionRate));
    simulatedExtracted.metrics.cancellationRate = Math.max(0, 100 - simulatedExtracted.metrics.completionRate);
  }

  if (typeof hypotheticalOverrides.cancellationRate === 'number') {
    simulatedExtracted.metrics.cancellationRate = Math.min(100, Math.max(0, hypotheticalOverrides.cancellationRate));
  }

  if (typeof hypotheticalOverrides.satisfactionPercentage === 'number') {
    simulatedExtracted.metrics.satisfactionPercentage = Math.min(100, Math.max(0, hypotheticalOverrides.satisfactionPercentage));
    // Scale averageRating approximately with satisfaction
    simulatedExtracted.metrics.averageRating = Math.round((1.0 + (simulatedExtracted.metrics.satisfactionPercentage / 100) * 4.0) * 10) / 10;
  }

  if (typeof hypotheticalOverrides.attendanceRate === 'number') {
    simulatedExtracted.metrics.attendanceRate = Math.min(100, Math.max(0, hypotheticalOverrides.attendanceRate));
  }

  if (typeof hypotheticalOverrides.additionalCompletedEvents === 'number') {
    const additional = Math.max(0, hypotheticalOverrides.additionalCompletedEvents);
    simulatedExtracted.metrics.completedEvents += additional;
    simulatedExtracted.metrics.successfulEvents += additional;
    // Add simulated recent events for recency weighting
    for (let i = 0; i < additional; i++) {
      simulatedExtracted.events.completed.push({
        endDate: new Date(),
        status: 'completed',
      });
    }
  }

  if (typeof hypotheticalOverrides.additionalAttendeesServed === 'number') {
    simulatedExtracted.metrics.attendeesServed += Math.max(0, hypotheticalOverrides.additionalAttendeesServed);
  }

  if (typeof hypotheticalOverrides.confirmedViolationsCount === 'number') {
    simulatedExtracted.metrics.confirmedViolationsCount = Math.max(0, hypotheticalOverrides.confirmedViolationsCount);
    if (simulatedExtracted.metrics.confirmedViolationsCount === 0) {
      simulatedExtracted.metrics.confirmedViolationsList = [];
    }
  }

  // Calculate simulated score using same deterministic engine
  const simulatedScored = scoringEngine.scoreOrganizer(simulatedExtracted);

  return {
    isSimulation: true,
    warning: 'SIMULATION MODE ONLY — Does not modify live platform data or database records.',
    organizerId,
    original: {
      trustScore: originalScored.trustScore,
      trustLevel: originalScored.trustLevel,
      confidenceLevel: originalScored.confidenceLevel,
      components: originalScored.components,
      badges: originalScored.badges,
    },
    simulated: {
      trustScore: simulatedScored.trustScore,
      trustLevel: simulatedScored.trustLevel,
      confidenceLevel: simulatedScored.confidenceLevel,
      components: simulatedScored.components,
      badges: simulatedScored.badges,
      factors: simulatedScored.factors,
    },
    scoreDelta: simulatedScored.trustScore - originalScored.trustScore,
    appliedOverrides: hypotheticalOverrides,
  };
}

module.exports = {
  simulateTrustScenario,
};
