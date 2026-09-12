const { EXPLORATION_MAP, MAX_CATEGORY_SHARE } = require('./config');

/**
 * Re-ranks candidate events to ensure category diversity in the primary feed.
 * Ensures that no single category dominates more than configured threshold of the top slots.
 */
function applyDiversity(scoredEvents, limit = 8) {
  const result = [];
  const categoryCounts = {};
  const maxPerCategory = Math.max(2, Math.floor(limit * (MAX_CATEGORY_SHARE || 0.4)));
  const remaining = [];

  for (const event of scoredEvents) {
    // Exclude dismissed events
    if (event.isDismissed) continue;

    const cat = event.categorySlug || 'general';
    const currentCount = categoryCounts[cat] || 0;

    if (currentCount < maxPerCategory && result.length < limit) {
      result.push(event);
      categoryCounts[cat] = currentCount + 1;
    } else {
      remaining.push(event);
    }
  }

  // If we haven't reached the limit, fill up with remaining highest-scoring events
  while (result.length < limit && remaining.length > 0) {
    result.push(remaining.shift());
  }

  return result;
}

/**
 * Selects an exploration candidate from an adjacent topic (Serendipity).
 */
function selectExplorationEvent(allEvents, userProfile) {
  // Find user's top categories
  const userCats = Object.keys(userProfile.categoryAffinities);
  const candidateAdjacent = [];

  userCats.forEach((cat) => {
    const adj = EXPLORATION_MAP[cat] || [];
    candidateAdjacent.push(...adj);
  });

  // If user has no category history, pick from a popular general adjacent category
  if (candidateAdjacent.length === 0) {
    candidateAdjacent.push('technology', 'business', 'design');
  }

  // Find an event in adjacent categories that user hasn't registered for or attended
  const exploreEvent = allEvents.find((e) => {
    if (userProfile.registeredEventIds.has(e._id.toString())) return false;
    if (userProfile.dismissedEventIds.has(e._id.toString())) return false;
    return candidateAdjacent.some((adj) => (e.categorySlug || '').includes(adj) || (e.tags || []).some((t) => t.toLowerCase().includes(adj)));
  });

  if (exploreEvent) {
    return {
      ...exploreEvent,
      recommendationSource: 'EXPLORE',
      explorationTag: 'Something new for you',
      topReason: 'Explore an adjacent topic related to your current interests.',
    };
  }

  return null;
}

module.exports = {
  applyDiversity,
  selectExplorationEvent,
};
