/**
 * Command Center What-If Scenario Simulator
 *
 * Deterministically computes hypothetical operational outcomes and recalculates
 * the Event Health Score when organizers adjust scenario parameters such as:
 *   - Registration delta (% change)
 *   - Expected attendance rate (% turnout)
 *   - Expected no-show rate (%)
 *   - Venue capacity adjustments (seats added or removed)
 *   - Safety readiness improvements (+ points)
 *   - SEO / Content score improvements (+ points)
 *
 * All results are explicitly tagged with `isSimulation: true` and accompanied by
 * clear before vs after delta comparisons.
 */

const { calculateEventHealth, clamp } = require('./healthScoreEngine');

/**
 * Runs a what-if scenario simulation against baseline event data.
 *
 * @param {object} params
 * @param {object} params.baseline - Baseline aggregation data { event, pulseData, shieldData, queueData, boostProfile, trustProfile, health }
 * @param {object} params.scenario - Scenario adjustment parameters
 * @returns {object} Simulation result containing before, after, and delta comparisons
 */
function runSimulation(baseline, scenario = {}) {
  const {
    registrationDeltaPct = 0,
    expectedAttendanceRate,
    noShowRate,
    capacityDelta = 0,
    safetyReadinessBoost = 0,
    seoScoreBoost = 0,
  } = scenario;

  const originalEvent = baseline.event || {};
  const originalPulse = baseline.pulseData || {};
  const originalShield = baseline.shieldData || {};
  const originalQueue = baseline.queueData || {};
  const originalBoost = baseline.boostProfile || {};
  const originalTrust = baseline.trustProfile || {};
  const originalHealth = baseline.health || calculateEventHealth({
    event: originalEvent,
    pulseData: originalPulse,
    shieldData: originalShield,
    shieldAlerts: baseline.shieldAlerts || [],
    queueData: originalQueue,
    boostProfile: originalBoost,
    trustProfile: originalTrust,
  });

  // 1. Simulate Event modifications
  const originalCapacity = Math.max(1, originalEvent.capacity || 100);
  const simCapacity = Math.max(1, originalCapacity + Number(capacityDelta || 0));

  const originalRegs = originalEvent.registrationCount || 0;
  const regMultiplier = 1 + Number(registrationDeltaPct || 0) / 100;
  const simRegs = Math.max(0, Math.round(originalRegs * regMultiplier));

  const simulatedEvent = {
    ...originalEvent,
    capacity: simCapacity,
    registrationCount: simRegs,
  };

  // 2. Simulate EventPulse modifications
  const originalAttRate = originalPulse.attendance?.attendanceRate ?? 75;
  const simAttRate = expectedAttendanceRate !== undefined
    ? clamp(Number(expectedAttendanceRate))
    : originalAttRate;

  const originalNoShowRate = originalPulse.attendance?.expectedNoShows && originalRegs > 0
    ? (originalPulse.attendance.expectedNoShows / originalRegs) * 100
    : 15;
  const simNoShowRate = noShowRate !== undefined
    ? clamp(Number(noShowRate))
    : originalNoShowRate;

  const simExpectedAttendance = Math.round(simRegs * (simAttRate / 100));
  const simExpectedNoShows = Math.round(simRegs * (simNoShowRate / 100));

  const simulatedPulse = {
    ...originalPulse,
    attendance: {
      ...originalPulse.attendance,
      attendanceRate: simAttRate,
      expectedAttendees: simExpectedAttendance,
      expectedNoShows: simExpectedNoShows,
    },
    registrations: {
      ...originalPulse.registrations,
      predictedTotal: simRegs,
    },
  };

  // 3. Simulate EventShield modifications
  const originalReadiness = originalShield.readinessScore ?? 70;
  const simReadiness = clamp(originalReadiness + Number(safetyReadinessBoost || 0));
  const simSafetyScore = clamp((originalShield.safetyScore ?? 75) + Number(safetyReadinessBoost || 0) * 0.5);

  const simulatedShield = {
    ...originalShield,
    readinessScore: simReadiness,
    safetyScore: simSafetyScore,
  };

  // 4. Simulate SmartQueue modifications
  const originalWaiting = originalQueue.metrics?.waitingCount || 0;
  // If registrations exceed capacity, overflow into simulated waitlist
  const simulatedOverflow = Math.max(0, simRegs - simCapacity);
  const simWaiting = simulatedOverflow > 0 ? simulatedOverflow : Math.max(0, originalWaiting - Number(capacityDelta || 0));

  const simulatedQueue = {
    ...originalQueue,
    metrics: {
      ...(originalQueue.metrics || {}),
      waitingCount: simWaiting,
      totalWaitlist: simWaiting,
      efficiencyScore: simWaiting > 20 ? 65 : 85,
    },
  };

  // 5. Simulate EventBoost modifications
  const originalSeoScore = originalBoost.seoScore ?? 50;
  const simSeoScore = clamp(originalSeoScore + Number(seoScoreBoost || 0));
  const simulatedBoost = {
    ...originalBoost,
    seoScore: simSeoScore,
    contentScore: clamp((originalBoost.contentScore ?? simSeoScore) + Number(seoScoreBoost || 0) * 0.8),
  };

  // 6. Recalculate Event Health under simulated conditions
  const simulatedHealth = calculateEventHealth({
    event: simulatedEvent,
    pulseData: simulatedPulse,
    shieldData: simulatedShield,
    shieldAlerts: simRegs > simCapacity * 1.15
      ? [{ severity: 'critical', status: 'active', message: 'Simulated overcapacity critical alert' }]
      : [],
    queueData: simulatedQueue,
    boostProfile: simulatedBoost,
    trustProfile: originalTrust,
  });

  // 7. Calculate deltas
  const deltas = {
    healthScore: simulatedHealth.score - originalHealth.score,
    attendanceRate: simAttRate - originalAttRate,
    expectedAttendees: simExpectedAttendance - (originalPulse.attendance?.expectedAttendees || 0),
    registrationCount: simRegs - originalRegs,
    capacity: simCapacity - originalCapacity,
    readinessScore: simReadiness - originalReadiness,
    seoScore: simSeoScore - originalSeoScore,
  };

  return {
    isSimulation: true,
    scenario,
    before: {
      healthScore: originalHealth.score,
      status: originalHealth.status,
      capacity: originalCapacity,
      registrationCount: originalRegs,
      attendanceRate: originalAttRate,
      expectedAttendees: originalPulse.attendance?.expectedAttendees || Math.round(originalRegs * (originalAttRate / 100)),
      noShowRate: Math.round(originalNoShowRate),
      readinessScore: originalReadiness,
      seoScore: originalSeoScore,
      queueWaiting: originalWaiting,
    },
    after: {
      healthScore: simulatedHealth.score,
      status: simulatedHealth.status,
      capacity: simCapacity,
      registrationCount: simRegs,
      attendanceRate: simAttRate,
      expectedAttendees: simExpectedAttendance,
      noShowRate: Math.round(simNoShowRate),
      readinessScore: simReadiness,
      seoScore: simSeoScore,
      queueWaiting: simWaiting,
    },
    deltas,
    simulatedBreakdown: simulatedHealth.breakdown,
    disclaimer: 'Hypothetical what-if projection. Results are calculated using deterministic models and should be treated as guidance, not guaranteed outcomes.',
    simulatedAt: new Date().toISOString(),
  };
}

module.exports = {
  runSimulation,
};
