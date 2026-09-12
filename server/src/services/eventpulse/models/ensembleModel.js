/**
 * Ensemble Model
 * Combines BaselineModel and RegressionModel with dynamic weighting based on
 * available sample size, days active, and historical records.
 */

const BaselineModel = require('./baselineModel');
const RegressionModel = require('./regressionModel');

class EnsembleModel {
  static predict(features) {
    const { registrations, historical, timing } = features;
    const { totalConfirmed } = registrations;
    const { hasOrgHistory, historicalEventsCount } = historical;
    const { daysSincePublication } = timing;

    const baseRegs = BaselineModel.predictRegistrations(features);
    const regrRegs = RegressionModel.predictRegistrations(features);

    const baseAttRate = BaselineModel.predictAttendanceRate(features);
    const regrAttRate = RegressionModel.predictAttendanceRate(features);

    // Calculate dynamic weight w_regr (0.0 to 1.0) for RegressionModel
    // If cold start or early days, baseline dominates.
    // As registrations accumulate and days progress, regression dominates.
    let wRegr = 0.3; // start with 30% regression

    if (totalConfirmed >= 50) wRegr += 0.35;
    else if (totalConfirmed >= 15) wRegr += 0.20;

    if (daysSincePublication >= 7) wRegr += 0.20;
    else if (daysSincePublication >= 3) wRegr += 0.10;

    if (hasOrgHistory && historicalEventsCount >= 2) wRegr += 0.15;

    wRegr = Math.min(0.90, Math.max(0.15, wRegr));
    const wBase = 1.0 - wRegr;

    const finalPredictedRegistrations = Math.round(wBase * baseRegs + wRegr * regrRegs);
    const finalAttendanceRate = Number((wBase * baseAttRate + wRegr * regrAttRate).toFixed(3));

    return {
      predictedRegistrations: finalPredictedRegistrations,
      attendanceRate: finalAttendanceRate,
      weights: { baseline: Number(wBase.toFixed(2)), regression: Number(wRegr.toFixed(2)) },
    };
  }
}

module.exports = EnsembleModel;
