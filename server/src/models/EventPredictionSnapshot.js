const mongoose = require('mongoose');

const eventPredictionSnapshotSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    snapshotTime: {
      type: Date,
      default: Date.now,
    },
    dayOffset: {
      type: Number,
      default: 0,
    },
    predictedRegistrations: {
      type: Number,
      required: true,
    },
    actualRegistrations: {
      type: Number,
      default: 0,
    },
    expectedAttendance: {
      type: Number,
      required: true,
    },
    actualAttendance: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
    },
    trigger: {
      type: String,
      enum: ['initial', 'daily', 'velocity_shift', 'checkin_milestone', 'status_change', 'manual'],
      default: 'manual',
    },
    modelVersion: {
      type: String,
      default: 'eventpulse-v1.0',
    },
  },
  {
    timestamps: true,
  }
);

eventPredictionSnapshotSchema.index({ eventId: 1, createdAt: -1 });
eventPredictionSnapshotSchema.index({ eventId: 1, snapshotTime: 1 });

module.exports = mongoose.model('EventPredictionSnapshot', eventPredictionSnapshotSchema);
