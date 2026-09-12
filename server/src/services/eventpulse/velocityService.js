/**
 * Velocity Service
 * Computes registration momentum, velocity changes, acceleration, and state labels.
 */

const config = require('./config');

function calculateRegistrationVelocity(registrations) {
  const { velocity } = registrations;
  const v1 = velocity.last24h || 0;
  const v2 = velocity.prev24h || 0;

  // Growth rate = (V1 - V2) / max(1, V2)
  const growthRate = v2 > 0 ? (v1 - v2) / v2 : v1 > 0 ? 1.0 : 0.0;

  // Acceleration = change per hour over 24 hours
  const acceleration = Number(((v1 - v2) / 24).toFixed(3));

  // Determine momentum state
  let momentumState = 'stable';
  if (v1 >= 3 && growthRate > config.VELOCITY_THRESHOLDS.ACCELERATING_GROWTH) {
    momentumState = 'accelerating';
  } else if (growthRate > config.VELOCITY_THRESHOLDS.GROWING_MIN) {
    momentumState = 'growing';
  } else if (growthRate >= config.VELOCITY_THRESHOLDS.STABLE_MIN) {
    momentumState = 'stable';
  } else if (growthRate >= config.VELOCITY_THRESHOLDS.SLOWING_MIN) {
    momentumState = 'slowing';
  } else {
    momentumState = 'declining';
  }

  const momentumLabels = {
    accelerating: '🔥 Accelerating',
    growing: '📈 Growing',
    stable: '➡ Stable',
    slowing: '📉 Slowing',
    declining: '⚠ Declining',
  };

  const descriptions = {
    accelerating: `Registration velocity surged +${Math.round(growthRate * 100)}% in the last 24h (+${v1} registrations).`,
    growing: `Registration pace is expanding steadily (+${Math.round(growthRate * 100)}% day-over-day).`,
    stable: `Registration inflow is consistent and tracking on schedule.`,
    slowing: `Registration momentum eased by ${Math.abs(Math.round(growthRate * 100))}% over the last 24h.`,
    declining: `Inflow has slowed significantly compared to previous days. Promotional boost recommended.`,
  };

  return {
    last24h: v1,
    prev24h: v2,
    growthRate: Number(growthRate.toFixed(3)),
    growthRatePct: Math.round(growthRate * 100),
    acceleration,
    momentumState,
    label: momentumLabels[momentumState],
    description: descriptions[momentumState],
  };
}

module.exports = {
  calculateRegistrationVelocity,
};
