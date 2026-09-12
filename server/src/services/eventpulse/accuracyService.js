/**
 * Accuracy & Evaluation Service
 * Evaluates predictions against actual results for completed events and computes MAE/MAPE error metrics.
 */

const PredictionOutcome = require('../../models/PredictionOutcome');
const EventPrediction = require('../../models/EventPrediction');
const Event = require('../../models/Event');
const config = require('./config');

async function evaluateCompletedEvent(eventId, features, prediction) {
  const { event, registrations, engagement } = features;
  const actualRegs = registrations.totalConfirmed;
  const actualAtt = registrations.currentCheckedIns;
  const actualNoShows = Math.max(0, actualRegs - actualAtt);
  const actualEngagement = engagement.score || 70;

  const predRegs = prediction.forecast.predictedRegistrations;
  const predAtt = prediction.attendance.expectedAttendees;
  const predNoShows = prediction.attendance.expectedNoShows;
  const predEngagement = prediction.engagement.score;

  // Absolute Errors
  const regAE = Math.abs(predRegs - actualRegs);
  const attAE = Math.abs(predAtt - actualAtt);
  const engAE = Math.abs(predEngagement - actualEngagement);

  // Percentage Errors
  const regPE = actualRegs > 0 ? Number(((regAE / actualRegs) * 100).toFixed(2)) : 0;
  const attPE = actualAtt > 0 ? Number(((attAE / actualAtt) * 100).toFixed(2)) : 0;
  const engPE = actualEngagement > 0 ? Number(((engAE / actualEngagement) * 100).toFixed(2)) : 0;

  const outcome = await PredictionOutcome.findOneAndUpdate(
    { eventId },
    {
      $set: {
        predicted: {
          registrations: predRegs,
          attendance: predAtt,
          noShows: predNoShows,
          engagement: predEngagement,
        },
        actual: {
          registrations: actualRegs,
          attendance: actualAtt,
          noShows: actualNoShows,
          engagement: actualEngagement,
        },
        errors: {
          registrationAE: regAE,
          registrationPE: regPE,
          attendanceAE: attAE,
          attendancePE: attPE,
          engagementAE: engAE,
          engagementPE: engPE,
        },
        evaluatedAt: new Date(),
        modelVersion: config.MODEL_VERSION,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return outcome;
}

async function getAccuracySummary(eventId) {
  const outcome = await PredictionOutcome.findOne({ eventId }).lean();
  return outcome;
}

async function getPlatformAccuracy() {
  const outcomes = await PredictionOutcome.find().lean();
  if (outcomes.length === 0) {
    return {
      evaluatedEventsCount: 0,
      averageRegistrationErrorPct: 0,
      averageAttendanceErrorPct: 0,
      registrationMAE: 0,
      attendanceMAE: 0,
      modelVersion: config.MODEL_VERSION,
    };
  }

  const count = outcomes.length;
  const totalRegAE = outcomes.reduce((s, o) => s + (o.errors?.registrationAE || 0), 0);
  const totalAttAE = outcomes.reduce((s, o) => s + (o.errors?.attendanceAE || 0), 0);
  const totalRegPE = outcomes.reduce((s, o) => s + (o.errors?.registrationPE || 0), 0);
  const totalAttPE = outcomes.reduce((s, o) => s + (o.errors?.attendancePE || 0), 0);

  return {
    evaluatedEventsCount: count,
    averageRegistrationErrorPct: Number((totalRegPE / count).toFixed(2)),
    averageAttendanceErrorPct: Number((totalAttPE / count).toFixed(2)),
    registrationMAE: Number((totalRegAE / count).toFixed(1)),
    attendanceMAE: Number((totalAttAE / count).toFixed(1)),
    modelVersion: config.MODEL_VERSION,
  };
}

module.exports = {
  evaluateCompletedEvent,
  getAccuracySummary,
  getPlatformAccuracy,
};
