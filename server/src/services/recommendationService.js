const Event = require('../models/Event');
const { ALGORITHM_VERSION } = require('./recommendation/config');
const { buildUserProfile } = require('./recommendation/userProfileService');
const { getCandidateEvents } = require('./recommendation/candidateService');
const { scoreEvent } = require('./recommendation/scoringEngine');
const { applyDiversity, selectExplorationEvent } = require('./recommendation/diversityService');
const { generateRankedFeed } = require('./recommendation/rankingService');
const { findSimilarEvents } = require('./recommendation/similarityService');
const { generateExplanation } = require('./recommendation/explainabilityService');
const { recordInteraction, getRecommendationAnalytics } = require('./recommendation/interactionService');

/**
 * AI Event Recommendation 2.0 Engine
 * Backward-compatible facade preserving existing functions while exposing v2 multi-section feeds.
 */
async function getRecommendedEvents(user, { limit = 8, debug = false } = {}) {
  const userProfile = await buildUserProfile(user);
  const candidates = await getCandidateEvents({ userProfile });

  const maxBatchRegs = Math.max(1, ...candidates.map((e) => e.registrationCount || 0));

  const scoredEvents = candidates.map((event) =>
    scoreEvent(event, userProfile, { maxBatchRegs, isDebug: debug })
  );

  // Sort descending by match percentage / score
  scoredEvents.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Apply diversity to prevent single-category saturation
  const diverseTop = applyDiversity(scoredEvents, limit);

  // Generate section summary
  let summary = 'Recommended from trending events near you';
  if (userProfile.interests.length > 0) {
    const formatted = userProfile.interests
      .slice(0, 2)
      .map((i) => i.charAt(0).toUpperCase() + i.slice(1))
      .join(' and ');
    summary = `Recommended because you follow ${formatted}`;
  }
  if (userProfile.attendedEvents.length >= 2) {
    summary += ` and attended ${userProfile.attendedEvents.length} events`;
  }

  return {
    events: diverseTop,
    summary,
    attendedCount: userProfile.attendedEvents.length,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

/**
 * Multi-section personalized discovery feed for the upgraded Homepage.
 */
async function getRecommendationFeed(user, { limit = 6, debug = false } = {}) {
  const userProfile = await buildUserProfile(user);
  return generateRankedFeed(userProfile, { limit, debug });
}

/**
 * Advanced similar events recommendation for Event Details page.
 */
async function getSimilarEvents(event, { limit = 4 } = {}) {
  return findSimilarEvents(event, { limit });
}

/**
 * Personalized Trending events matching user interests and high velocity.
 */
async function getTrendingEvents(user, { limit = 6 } = {}) {
  const userProfile = await buildUserProfile(user);
  const candidates = await getCandidateEvents({ userProfile });
  const maxBatchRegs = Math.max(1, ...candidates.map((e) => e.registrationCount || 0));

  const scoredEvents = candidates
    .map((e) => scoreEvent(e, userProfile, { maxBatchRegs }))
    .filter((e) => !e.isDismissed);

  // Sort by registration count and match percentage
  scoredEvents.sort((a, b) => {
    const aVelocity = (a.registrationCount || 0) + a.matchPercentage * 0.5;
    const bVelocity = (b.registrationCount || 0) + b.matchPercentage * 0.5;
    return bVelocity - aVelocity;
  });

  return scoredEvents.slice(0, limit).map((e) => ({
    ...e,
    recommendationSource: 'TRENDING',
  }));
}

/**
 * Nearby and online events for location-aware discovery.
 */
async function getNearbyEvents(user, { limit = 6 } = {}) {
  const userProfile = await buildUserProfile(user);
  const candidates = await getCandidateEvents({ userProfile });
  const scoredEvents = candidates
    .map((e) => scoreEvent(e, userProfile))
    .filter((e) => !e.isDismissed && (e.eventType === 'online' || (e.reasons || []).some((r) => r.type === 'location')))
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return scoredEvents.slice(0, limit).map((e) => ({
    ...e,
    recommendationSource: 'NEARBY',
  }));
}

/**
 * Exploration & serendipity candidate event from adjacent domain.
 */
async function getExplorationRecommendation(user) {
  const userProfile = await buildUserProfile(user);
  const candidates = await getCandidateEvents({ userProfile });
  return selectExplorationEvent(candidates, userProfile);
}

module.exports = {
  getRecommendedEvents,
  getRecommendationFeed,
  getSimilarEvents,
  getTrendingEvents,
  getNearbyEvents,
  getExplorationRecommendation,
  generateExplanation,
  recordInteraction,
  getRecommendationAnalytics,
  buildUserProfile,
};
