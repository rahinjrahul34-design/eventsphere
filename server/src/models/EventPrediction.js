const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    impact: { type: String, required: true },
    direction: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'positive' },
    magnitude: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    title: { type: String, required: true },
    action: { type: String, required: true },
    rationale: { type: String, default: '' },
    trigger: { type: String, default: '' },
  },
  { _id: false }
);

const eventPredictionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
      index: true,
    },
    forecast: {
      predictedRegistrations: { type: Number, required: true },
      lowerBound: { type: Number, default: 0 },
      upperBound: { type: Number, default: 0 },
      velocity24h: { type: Number, default: 0 },
      growthRate: { type: Number, default: 0 },
      momentumState: {
        type: String,
        enum: ['accelerating', 'growing', 'stable', 'slowing', 'declining'],
        default: 'stable',
      },
    },
    attendance: {
      expectedAttendees: { type: Number, required: true },
      expectedNoShows: { type: Number, required: true },
      attendanceRate: { type: Number, required: true, min: 0, max: 100 },
      noShowRate: { type: Number, required: true, min: 0, max: 100 },
      lowerBound: { type: Number, default: 0 },
      upperBound: { type: Number, default: 0 },
    },
    engagement: {
      score: { type: Number, required: true, min: 0, max: 100 },
      level: { type: String, enum: ['low', 'medium', 'high', 'very_high'], default: 'medium' },
      trend: { type: String, enum: ['rising', 'stable', 'declining'], default: 'stable' },
      breakdown: {
        participation: { type: Number, default: 0 },
        interaction: { type: Number, default: 0 },
        liveActivity: { type: Number, default: 0 },
        feedback: { type: Number, default: 0 },
        networking: { type: Number, default: 0 },
      },
    },
    health: {
      score: { type: Number, required: true, min: 0, max: 100 },
      status: { type: String, enum: ['healthy', 'good', 'attention', 'at_risk'], default: 'healthy' },
      breakdown: {
        velocity: { type: Number, default: 0 },
        capacity: { type: Number, default: 0 },
        attendance: { type: Number, default: 0 },
        engagement: { type: Number, default: 0 },
        sentiment: { type: Number, default: 0 },
      },
    },
    confidence: {
      score: { type: Number, required: true, min: 0, max: 100 },
      level: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
      reasons: { type: [String], default: [] },
    },
    drivers: {
      type: [driverSchema],
      default: [],
    },
    recommendations: {
      type: [recommendationSchema],
      default: [],
    },
    aiSummary: {
      type: String,
      default: '',
    },
    isColdStart: {
      type: Boolean,
      default: false,
    },
    modelVersion: {
      type: String,
      default: 'eventpulse-v1.0',
    },
    engine: {
      type: String,
      enum: ['hybrid-gemini', 'hybrid-deterministic', 'baseline'],
      default: 'hybrid-deterministic',
    },
    featureSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventPredictionSchema.index({ eventId: 1, expiresAt: 1 });

module.exports = mongoose.model('EventPrediction', eventPredictionSchema);
