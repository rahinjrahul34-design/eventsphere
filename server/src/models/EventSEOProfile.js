const mongoose = require('mongoose');

const seoIssueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    impact: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    effort: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    reason: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
    field: { type: String, default: '' },
    suggestedValue: { type: mongoose.Schema.Types.Mixed, default: null },
    safeToApply: { type: Boolean, default: true },
  },
  { _id: false }
);

const keywordCheckSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true },
    foundInTitle: { type: Boolean, default: false },
    foundInDescription: { type: Boolean, default: false },
    foundInTags: { type: Boolean, default: false },
    density: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    status: { type: String, enum: ['optimal', 'missing', 'low', 'stuffed'], default: 'missing' },
  },
  { _id: false }
);

const inconsistencySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, enum: ['warning', 'error', 'info'], default: 'warning' },
    message: { type: String, required: true },
    suggestion: { type: String, default: '' },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    seoScore: { type: Number, required: true },
    previousScore: { type: Number, default: 0 },
    changes: { type: [String], default: [] },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: String, default: 'SEO_V1' },
  },
  { _id: true }
);

const faqSuggestionSchema = new mongoose.Schema(
  {
    q: { type: String, required: true },
    a: { type: String, required: true },
    basedOn: { type: String, default: 'event details' },
  },
  { _id: false }
);

const eventSEOProfileSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
      index: true,
    },
    primaryKeyword: { type: String, default: '', trim: true },
    secondaryKeywords: { type: [String], default: [] },
    relatedTerms: { type: [String], default: [] },

    metaTitle: { type: String, default: '', maxlength: 100 },
    metaDescription: { type: String, default: '', maxlength: 300 },

    suggestedTitle: { type: String, default: '' },
    suggestedDescription: { type: String, default: '' },
    suggestedMetaTitle: { type: String, default: '' },
    suggestedMetaDescription: { type: String, default: '' },
    suggestedKeywords: { type: [String], default: [] },

    // Scores (0-100 deterministic)
    seoScore: { type: Number, min: 0, max: 100, default: 0 },
    contentScore: { type: Number, min: 0, max: 100, default: 0 },
    readabilityScore: { type: Number, min: 0, max: 100, default: 0 },
    keywordScore: { type: Number, min: 0, max: 100, default: 0 },
    searchIntentScore: { type: Number, min: 0, max: 100, default: 0 },
    socialScore: { type: Number, min: 0, max: 100, default: 0 },

    categoryScores: {
      titleOptimization: { type: Number, min: 0, max: 100, default: 0 },
      descriptionQuality: { type: Number, min: 0, max: 100, default: 0 },
      keywordRelevance: { type: Number, min: 0, max: 100, default: 0 },
      searchIntentMatch: { type: Number, min: 0, max: 100, default: 0 },
      readability: { type: Number, min: 0, max: 100, default: 0 },
      metadataQuality: { type: Number, min: 0, max: 100, default: 0 },
      contentCompleteness: { type: Number, min: 0, max: 100, default: 0 },
      localRelevance: { type: Number, min: 0, max: 100, default: 0 },
      socialReadiness: { type: Number, min: 0, max: 100, default: 0 },
    },

    searchIntent: {
      primary: { type: String, default: 'Informational' },
      matchPercentage: { type: Number, min: 0, max: 100, default: 0 },
      detectedIntents: { type: [String], default: [] },
      details: { type: [String], default: [] },
    },

    readabilityMetrics: {
      avgSentenceLength: { type: Number, default: 0 },
      longSentencesCount: { type: Number, default: 0 },
      paragraphCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      fleschReadingEase: { type: Number, default: 0 },
      gradeLevel: { type: String, default: 'Standard' },
    },

    keywordCoverage: {
      percentage: { type: Number, min: 0, max: 100, default: 0 },
      checks: { type: [keywordCheckSchema], default: [] },
      isStuffed: { type: Boolean, default: false },
      stuffingWarning: { type: String, default: '' },
    },

    inconsistencies: { type: [inconsistencySchema], default: [] },
    genericContentFlags: {
      type: [
        {
          detected: { type: Boolean, default: false },
          reason: { type: String, default: '' },
          suggestion: { type: String, default: '' },
        },
      ],
      default: [],
    },

    seoIssues: { type: [seoIssueSchema], default: [] },
    strengths: { type: [String], default: [] },
    faqSuggestions: { type: [faqSuggestionSchema], default: [] },

    socialPreview: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      domain: { type: String, default: 'eventsphere.demo' },
    },

    searchPreview: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      url: { type: String, default: '' },
      slug: { type: String, default: '' },
    },

    beforeAfter: {
      beforeScore: { type: Number, default: 0 },
      beforeTitle: { type: String, default: '' },
      beforeDescription: { type: String, default: '' },
      afterScore: { type: Number, default: 0 },
      afterTitle: { type: String, default: '' },
      afterDescription: { type: String, default: '' },
    },

    history: { type: [historyEntrySchema], default: [] },

    analysisVersion: { type: String, default: 'SEO_V1' },
    lastAnalyzedAt: { type: Date, default: Date.now },
    aiProvider: { type: String, default: 'deterministic-engine' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventSEOProfile', eventSEOProfileSchema);
