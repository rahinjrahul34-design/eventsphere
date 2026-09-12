const mongoose = require('mongoose');

const eventRiskAlertSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metricValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    threshold: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true,
    },
    actionRequired: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventRiskAlertSchema.index({ eventId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('EventRiskAlert', eventRiskAlertSchema);
