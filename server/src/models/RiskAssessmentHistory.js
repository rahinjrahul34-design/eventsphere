const mongoose = require('mongoose');

const riskAssessmentHistorySchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    safetyScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    readinessScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    overallRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    trigger: {
      type: String,
      enum: ['manual', 'scheduled', 'webhook', 'registration_threshold', 'auto_recalc', 'initial'],
      default: 'manual',
    },
    delta: {
      type: Number,
      default: 0,
    },
    improvements: {
      type: [String],
      default: [],
    },
    topRisksCount: {
      type: Number,
      default: 0,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

riskAssessmentHistorySchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('RiskAssessmentHistory', riskAssessmentHistorySchema);
