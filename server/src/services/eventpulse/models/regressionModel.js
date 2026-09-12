/**
 * Statistical Regression Model
 * Multivariate projection incorporating recent registration momentum, urgency surge,
 * and historical organizer retention distributions.
 */

class RegressionModel {
  static predictRegistrations(features) {
    const { event, timing, registrations } = features;
    const { totalConfirmed, velocity } = registrations;
    const { capacity } = event;
    const { daysRemaining, daysSincePublication } = timing;

    if (daysRemaining <= 0) {
      return totalConfirmed;
    }

    // Weighted velocity giving highest weight to the most recent 24-48 hours
    const runRate = totalConfirmed / Math.max(1, daysSincePublication);
    const weightedDailyVelocity =
      0.55 * (velocity.last24h || 0) +
      0.30 * (velocity.avgDailyLast7d || 0) +
      0.15 * runRate;

    // Surge factor near event date (empirical U-shaped conversion curve)
    // As daysRemaining -> 0, surge factor increases by up to +35%
    const surgeFactor = 1.0 + 0.35 * Math.exp(-daysRemaining / 3.0);

    // Pricing resistance factor: paid events convert ~15% slower at last minute
    const priceResistance = event.isPaid ? 0.85 : 1.0;

    const projectedDelta = Math.round(weightedDailyVelocity * daysRemaining * surgeFactor * priceResistance);
    const predicted = totalConfirmed + projectedDelta;

    // Hard ceiling at 115% capacity
    return Math.max(totalConfirmed, Math.min(Math.round(capacity * 1.15), predicted));
  }

  static predictAttendanceRate(features) {
    const { event, historical, registrations, timing } = features;
    const { hasOrgHistory, historicalOrgAttendanceRate } = historical;
    const { daysRemaining } = timing;

    // Mode base probability
    let prob = event.eventType === 'online' ? 0.55 : event.eventType === 'hybrid' ? 0.68 : 0.75;

    // Paid modifier
    if (event.isPaid) prob += 0.12;
    else prob -= 0.05;

    // Timing lead-time factor: longer lead time increases drop-out risk
    if (daysRemaining > 30) prob -= 0.04;
    else if (daysRemaining <= 3) prob += 0.03;

    // Blend with organizer's empirical track record if historical data exists
    if (hasOrgHistory && historicalOrgAttendanceRate) {
      // Weight organizer history up to 50%
      prob = 0.50 * prob + 0.50 * historicalOrgAttendanceRate;
    }

    return Math.max(0.35, Math.min(0.95, prob));
  }
}

module.exports = RegressionModel;
