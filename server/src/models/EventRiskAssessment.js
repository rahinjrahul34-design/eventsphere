const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    confidence: { type: Number, default: 0.95 },
    issues: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    evidence: { type: [String], default: [] },
    probability: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    impact: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  },
  { _id: false }
);

const topRiskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    reason: { type: String, default: '' },
    evidence: { type: String, default: '' },
    recommendation: { type: String, default: '' },
  },
  { _id: false }
);

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const matrixItemSchema = new mongoose.Schema(
  {
    risk: { type: String, required: true },
    probability: { type: String, enum: ['low', 'medium', 'high'], required: true },
    impact: { type: String, enum: ['low', 'medium', 'high'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    action: { type: String, required: true },
  },
  { _id: false }
);

const eventRiskAssessmentSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
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
    summary: {
      type: String,
      default: '',
    },
    disclaimer: {
      type: String,
      default:
        'EventShield provides AI-assisted operational insights and planning recommendations. It does not replace qualified safety professionals, venue requirements, emergency services, or local laws and regulations.',
    },
    engine: {
      type: String,
      enum: ['hybrid-gemini', 'hybrid-deterministic', 'deterministic'],
      default: 'hybrid-deterministic',
    },
    categories: {
      type: [categorySchema],
      default: [],
    },
    topRisks: {
      type: [topRiskSchema],
      default: [],
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    matrix: {
      type: [matrixItemSchema],
      default: [],
    },
    metricsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
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

module.exports = mongoose.model('EventRiskAssessment', eventRiskAssessmentSchema);
