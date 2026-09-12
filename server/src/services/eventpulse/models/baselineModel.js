/**
 * Baseline Forecasting Model
 * Deterministic heuristic based on industry event lifecycle curves, category benchmarks,
 * and capacity utilization. Used during cold-start or when historical data is scarce.
 */

const config = require('../config');

class BaselineModel {
  static predictRegistrations(features) {
    const { event, timing, registrations } = features;
    const { totalConfirmed } = registrations;
    const { capacity } = event;
    const { daysRemaining, daysSincePublication } = timing;

    // Category benchmark fill rate
    const catBenchmark =
      config.CATEGORY_UTILIZATION_BENCHMARKS[event.categorySlug] ||
      config.CATEGORY_UTILIZATION_BENCHMARKS.default;

    if (daysRemaining <= 0) {
      return totalConfirmed;
    }

    // Velocity projection
    const dailyVelocity = registrations.velocity.avgDailyLast7d || (totalConfirmed / Math.max(1, daysSincePublication));
    const projectedAdditional = Math.round(dailyVelocity * daysRemaining);

    // Baseline combines capacity benchmark and current run-rate
    const benchmarkTarget = Math.round(capacity * catBenchmark);
    const runRateTarget = totalConfirmed + projectedAdditional;

    // Early in publication, anchor toward benchmark; later, follow run-rate
    const weightRunRate = Math.min(0.85, daysSincePublication / (daysSincePublication + daysRemaining + 1));
    const predicted = Math.round((1 - weightRunRate) * benchmarkTarget + weightRunRate * runRateTarget);

    // Clamp between current confirmed and 115% capacity (allowing waitlist)
    return Math.max(totalConfirmed, Math.min(Math.round(capacity * 1.15), predicted));
  }

  static predictAttendanceRate(features) {
    const { event } = features;
    const baseRate = config.MODE_BASE_ATTENDANCE[event.eventType] || config.MODE_BASE_ATTENDANCE.offline;
    const priceMod = event.isPaid
      ? config.PRICING_ATTENDANCE_MODIFIER.paid
      : config.PRICING_ATTENDANCE_MODIFIER.free;

    return Math.max(0.35, Math.min(0.95, baseRate + priceMod));
  }
}

module.exports = BaselineModel;
