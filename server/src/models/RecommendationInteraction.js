const mongoose = require('mongoose');

const recommendationInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    interactionType: {
      type: String,
      enum: ['view', 'click', 'dismiss', 'feedback', 'save'],
      required: true,
    },
    feedbackType: {
      type: String,
      enum: ['like', 'dislike', 'none'],
      default: 'none',
    },
    feedbackReason: {
      type: String,
      default: '',
    },
    recommendationSource: {
      type: String,
      default: 'PERSONALIZED',
    },
    algorithmVersion: {
      type: String,
      default: 'recommendation-v2',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 90 * 86400, // 90-day TTL index auto-cleanup
    },
  },
  { timestamps: true }
);

recommendationInteractionSchema.index({ user: 1, event: 1, interactionType: 1 });
recommendationInteractionSchema.index({ user: 1, feedbackType: 1 });
recommendationInteractionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RecommendationInteraction', recommendationInteractionSchema);
