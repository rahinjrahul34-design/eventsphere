/**
 * Driver Service (Feature Attribution)
 * Explains "What is driving the prediction?" by identifying key positive and negative
 * factors affecting the forecast.
 */

function extractPredictionDrivers(features, velocityData, attendanceData) {
  const { event, timing, registrations, historical } = features;
  const drivers = [];

  // 1. Velocity driver
  if (velocityData.momentumState === 'accelerating' || velocityData.growthRate > 0.2) {
    drivers.push({
      factor: 'Registration Acceleration',
      impact: `Velocity surged +${velocityData.growthRatePct}% in the last 24h (+${velocityData.last24h} new registrations).`,
      direction: 'positive',
      magnitude: 'high',
    });
  } else if (velocityData.momentumState === 'slowing' || velocityData.momentumState === 'declining') {
    drivers.push({
      factor: 'Registration Momentum Slowdown',
      impact: `Inflow softened by ${Math.abs(velocityData.growthRatePct)}% compared to the previous day.`,
      direction: 'negative',
      magnitude: 'medium',
    });
  } else {
    drivers.push({
      factor: 'Stable Registration Run-Rate',
      impact: `Consistent inflow averaging ${registrations.velocity.avgDailyLast7d} registrations/day.`,
      direction: 'positive',
      magnitude: 'medium',
    });
  }

  // 2. Capacity utilization driver
  if (registrations.capacityUtilization >= 0.85) {
    drivers.push({
      factor: 'High Capacity Fill',
      impact: `Event has reached ${Math.round(registrations.capacityUtilization * 100)}% of total venue/tier capacity.`,
      direction: 'positive',
      magnitude: 'high',
    });
  } else if (registrations.capacityUtilization <= 0.25 && timing.daysRemaining < 7) {
    drivers.push({
      factor: 'Low Capacity Utilization Window',
      impact: `Only ${Math.round(registrations.capacityUtilization * 100)}% capacity claimed with ${timing.daysRemaining} days remaining.`,
      direction: 'negative',
      magnitude: 'high',
    });
  }

  // 3. Ticket pricing & commitment
  if (event.isPaid) {
    drivers.push({
      factor: 'Paid Ticket Commitment',
      impact: 'Financial commitment strongly correlates with lower no-show probability (+12% attendance rate).',
      direction: 'positive',
      magnitude: 'medium',
    });
  } else {
    drivers.push({
      factor: 'Free Event Drop-off Risk',
      impact: 'Free registration tiers typically experience higher voluntary no-show rates (~35-45%).',
      direction: 'negative',
      magnitude: 'medium',
    });
  }

  // 4. Proximity to event start
  if (timing.daysRemaining <= 3 && !event.isCompleted) {
    drivers.push({
      factor: 'Urgency Surge Window',
      impact: 'Upcoming event date triggers late-stage attendee registrations and final commitments.',
      direction: 'positive',
      magnitude: 'medium',
    });
  }

  // 5. Organizer historical benchmark
  if (historical.hasOrgHistory && historical.historicalOrgAttendanceRate) {
    const ratePct = Math.round(historical.historicalOrgAttendanceRate * 100);
    if (ratePct >= 75) {
      drivers.push({
        factor: 'Strong Organizer Track Record',
        impact: `Organizer's historical events averaged ${ratePct}% verified check-ins.`,
        direction: 'positive',
        magnitude: 'medium',
      });
    } else if (ratePct < 60) {
      drivers.push({
        factor: 'Historical Organizer Drop-out Pattern',
        impact: `Past events averaged ${ratePct}% check-ins, pulling down the expected baseline.`,
        direction: 'negative',
        magnitude: 'low',
      });
    }
  }

  // 6. Recommendation conversion
  if (registrations.recommendationRegs > 0) {
    const share = Math.round((registrations.recommendationRegs / Math.max(1, registrations.totalConfirmed)) * 100);
    if (share >= 15) {
      drivers.push({
        factor: 'AI Recommendation Inflow',
        impact: `${share}% of confirmed registrations were discovered via AI recommendations.`,
        direction: 'positive',
        magnitude: 'low',
      });
    }
  }

  return drivers.slice(0, 5);
}

module.exports = {
  extractPredictionDrivers,
};
