const mongoose = require('mongoose');

const organizerTrustSnapshotSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
    },
    trustLevel: {
      type: String,
      required: true,
    },
    confidenceLevel: {
      type: String,
      required: true,
    },
    components: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    changeReason: {
      type: String,
      default: 'Periodic trust recalculation',
    },
    scoreDelta: {
      type: Number,
      default: 0,
    },
    trigger: {
      type: String,
      enum: [
        'EVENT_COMPLETED',
        'EVENT_CANCELLED',
        'FEEDBACK_SUBMITTED',
        'REPORT_RESOLVED',
        'VERIFICATION_CHANGED',
        'MANUAL_RECALCULATION',
        'SCHEDULED_RECALCULATION',
      ],
      default: 'MANUAL_RECALCULATION',
    },
    scoreVersion: {
      type: String,
      default: 'TRUST_V1',
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

organizerTrustSnapshotSchema.index({ organizer: 1, calculatedAt: -1 });

module.exports = mongoose.model('OrganizerTrustSnapshot', organizerTrustSnapshotSchema);
