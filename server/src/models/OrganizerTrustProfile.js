const mongoose = require('mongoose');

const factorSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
    impact: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' },
    weight: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    impact: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  },
  { _id: false }
);

const organizerTrustProfileSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    trustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    trustLevel: {
      type: String,
      enum: ['building_history', 'low_trust', 'needs_improvement', 'fair', 'good', 'very_good', 'excellent'],
      default: 'building_history',
      index: true,
    },
    confidenceLevel: {
      type: String,
      enum: ['limited', 'low', 'medium', 'high'],
      default: 'limited',
      index: true,
    },
    scoreVersion: {
      type: String,
      default: 'TRUST_V1',
    },
    verified: {
      type: Boolean,
      default: false,
    },

    metrics: {
      totalEvents: { type: Number, default: 0 },
      completedEvents: { type: Number, default: 0 },
      cancelledEvents: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }, // 0 - 100
      cancellationRate: { type: Number, default: 0 }, // 0 - 100
      attendeesServed: { type: Number, default: 0 },
      totalRegistrations: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 }, // 0 - 100
      totalFeedbackCount: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }, // 1.0 - 5.0
      satisfactionPercentage: { type: Number, default: 0 }, // 0 - 100
      bayesianRating: { type: Number, default: 4.0 }, // 1.0 - 5.0
      totalReports: { type: Number, default: 0 },
      confirmedViolations: { type: Number, default: 0 },
      dismissedReports: { type: Number, default: 0 },
      successfulEvents: { type: Number, default: 0 },
    },

    components: {
      completion: { type: Number, default: 0 }, // 0 - 100
      cancellation: { type: Number, default: 100 }, // 0 - 100
      attendance: { type: Number, default: 75 }, // 0 - 100
      satisfaction: { type: Number, default: 75 }, // 0 - 100
      compliance: { type: Number, default: 100 }, // 0 - 100
      verification: { type: Number, default: 20 }, // 0 - 100
      experience: { type: Number, default: 0 }, // 0 - 100
    },

    weights: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    badges: {
      type: [String],
      default: [],
    },

    factors: {
      type: [factorSchema],
      default: [],
    },

    aiInsights: {
      summary: { type: String, default: '' },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      recommendations: { type: [recommendationSchema], default: [] },
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isStale: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

organizerTrustProfileSchema.index({ trustScore: -1, confidenceLevel: 1 });

module.exports = mongoose.model('OrganizerTrustProfile', organizerTrustProfileSchema);
