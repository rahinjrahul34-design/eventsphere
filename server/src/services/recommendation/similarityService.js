/**
 * Similar Events Recommendation Service
 * Computes multi-attribute similarity between a source event and candidate events.
 */

const Event = require('../../models/Event');
const { tokenize } = require('./eventFeatureService');

/**
 * Retrieves and scores similar upcoming/live events for an event detail page.
 */
async function findSimilarEvents(sourceEvent, { limit = 4 } = {}) {
  const events = await Event.find({
    _id: { $ne: sourceEvent._id },
    status: { $in: ['published', 'live'] },
    approvalStatus: 'approved',
    endDate: { $gte: new Date(Date.now() - 7 * 864e5) },
  })
    .populate('organizer', 'name company avatar')
    .populate('category', 'name slug color icon')
    .lean();

  const sourceTags = new Set((sourceEvent.tags || []).map((t) => t.toLowerCase()));
  const sourceTitleTokens = tokenize(sourceEvent.title).filter((w) => w.length > 3);
  const sourceDescTokens = tokenize(sourceEvent.shortDescription || sourceEvent.description || '');

  const scored = events
    .map((e) => {
      let score = 0;
      const reasons = [];

      // 1. Category match (Weight: 35)
      if (e.categorySlug === sourceEvent.categorySlug) {
        score += 35;
        reasons.push(`Same category: ${e.category?.name || e.categorySlug}`);
      }

      // 2. Tag overlap (Weight: up to 30)
      const eTags = (e.tags || []).map((t) => t.toLowerCase());
      const tagOverlap = eTags.filter((t) => sourceTags.has(t));
      if (tagOverlap.length > 0) {
        score += Math.min(30, tagOverlap.length * 10);
        reasons.push(`Shares tags: ${tagOverlap.slice(0, 2).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`);
      }

      // 3. Title keyword overlap (Weight: up to 15)
      const titleOverlap = sourceTitleTokens.filter((tok) => e.title.toLowerCase().includes(tok));
      if (titleOverlap.length > 0) {
        score += Math.min(15, titleOverlap.length * 8);
      }

      // 4. Format & location match (Weight: up to 20)
      if (e.eventType === sourceEvent.eventType) {
        score += 8;
      }
      if (
        e.venue?.city &&
        sourceEvent.venue?.city &&
        e.venue.city.toLowerCase() === sourceEvent.venue.city.toLowerCase()
      ) {
        score += 12;
        reasons.push(`Also in ${e.venue.city}`);
      } else if (e.eventType === 'online' && sourceEvent.eventType === 'online') {
        reasons.push('Both are online events');
      }

      // 5. Popularity slight boost
      if ((e.registrationCount || 0) >= 20) {
        score += 5;
      }

      const matchPercentage = Math.min(98, Math.max(45, Math.round(50 + score / 2)));

      return {
        ...e,
        score: Math.round(score),
        matchPercentage,
        topReason: reasons[0] || 'Similar event format and audience',
        reasons,
        recommendationSource: 'SIMILAR_EVENT',
      };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

module.exports = {
  findSimilarEvents,
};
