const RecommendationInteraction = require('../../models/RecommendationInteraction');
const Registration = require('../../models/Registration');

/**
 * Logs a user interaction with a recommended event.
 */
async function recordInteraction({ userId, eventId, interactionType, recommendationSource, feedbackType, feedbackReason, meta }) {
  if (!userId || !eventId) return null;

  return RecommendationInteraction.create({
    user: userId,
    event: eventId,
    interactionType,
    recommendationSource: recommendationSource || 'PERSONALIZED',
    feedbackType: feedbackType || 'none',
    feedbackReason: feedbackReason || '',
    meta: meta || {},
  });
}

/**
 * Aggregates recommendation analytics for the admin overview.
 */
async function getRecommendationAnalytics() {
  const [totalInteractions, clicks, dismissals, likes, dislikes, recentInteractions] = await Promise.all([
    RecommendationInteraction.countDocuments(),
    RecommendationInteraction.countDocuments({ interactionType: 'click' }),
    RecommendationInteraction.countDocuments({ interactionType: 'dismiss' }),
    RecommendationInteraction.countDocuments({ feedbackType: 'like' }),
    RecommendationInteraction.countDocuments({ feedbackType: 'dislike' }),
    RecommendationInteraction.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'name email')
      .populate('event', 'title slug')
      .lean(),
  ]);

  const ctr = totalInteractions > 0 ? ((clicks / totalInteractions) * 100).toFixed(1) : '0.0';
  const feedbackRatio = likes + dislikes > 0 ? ((likes / (likes + dislikes)) * 100).toFixed(1) : '100.0';

  return {
    totalInteractions,
    clicks,
    dismissals,
    likes,
    dislikes,
    ctr: `${ctr}%`,
    satisfactionRate: `${feedbackRatio}%`,
    recentInteractions,
  };
}

module.exports = {
  recordInteraction,
  getRecommendationAnalytics,
};
