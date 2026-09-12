const mongoose = require('mongoose');

const predictionOutcomeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
      index: true,
    },
    predicted: {
      registrations: { type: Number, required: true },
      attendance: { type: Number, required: true },
      noShows: { type: Number, required: true },
      engagement: { type: Number, required: true },
    },
    actual: {
      registrations: { type: Number, required: true },
      attendance: { type: Number, required: true },
      noShows: { type: Number, required: true },
      engagement: { type: Number, required: true },
    },
    errors: {
      registrationAE: { type: Number, default: 0 },
      registrationPE: { type: Number, default: 0 },
      attendanceAE: { type: Number, default: 0 },
      attendancePE: { type: Number, default: 0 },
      engagementAE: { type: Number, default: 0 },
      engagementPE: { type: Number, default: 0 },
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
    modelVersion: {
      type: String,
      default: 'eventpulse-v1.0',
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

predictionOutcomeSchema.index({ evaluatedAt: -1 });

module.exports = mongoose.model('PredictionOutcome', predictionOutcomeSchema);
