const mongoose = require('mongoose');

const eventPulseAlertSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'REGISTRATION_SLOWDOWN',
        'HIGH_NO_SHOW_RISK',
        'CAPACITY_PRESSURE',
        'LOW_ENGAGEMENT_PACE',
        'ATTENDANCE_PACE_DEFICIT',
      ],
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
    actionRecommended: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventPulseAlertSchema.index({ eventId: 1, type: 1, status: 1 });
eventPulseAlertSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('EventPulseAlert', eventPulseAlertSchema);
