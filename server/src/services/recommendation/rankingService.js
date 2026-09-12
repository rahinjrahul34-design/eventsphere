/**
 * Smart Ranking Pipeline Service
 * Orchestrates candidate filtering, scoring, diversity re-ranking, and section partitioning.
 */

const { ALGORITHM_VERSION } = require('./config');
const { getCandidateEvents } = require('./candidateService');
const { scoreEvent } = require('./scoringEngine');
const { applyDiversity, selectExplorationEvent } = require('./diversityService');

/**
 * Executes full ranking pipeline to produce multi-section discovery feeds.
 */
async function generateRankedFeed(userProfile, { limit = 8, debug = false } = {}) {
  const candidates = await getCandidateEvents({ userProfile });
  const maxBatchRegs = Math.max(1, ...candidates.map((e) => e.registrationCount || 0));

  const scoredEvents = candidates.map((event) =>
    scoreEvent(event, userProfile, { maxBatchRegs, isDebug: debug })
  );

  // Sort descending by match percentage and raw score
  scoredEvents.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // 1. Primary "Recommended For You" with category diversity
  const recommended = applyDiversity(scoredEvents, limit);

  // 2. "Based on Your Skills"
  const basedOnSkills = scoredEvents
    .filter((e) => e.matchedSkills && e.matchedSkills.length > 0 && !e.isDismissed)
    .slice(0, 4);

  // 3. "Similar to Events You Attended"
  const similarToAttended = scoredEvents
    .filter((e) => e.pastAttendedCount > 0 && !e.isDismissed && !e.isRegistered)
    .slice(0, 4);

  // 4. "Near You & Online"
  const nearYou = scoredEvents
    .filter((e) => (e.reasons || []).some((r) => r.type === 'location') && !e.isDismissed)
    .slice(0, 4);

  // 5. "Something New For You" (Serendipity / Exploration)
  const exploreSomethingNew = selectExplorationEvent(candidates, userProfile);

  // 6. "Trending in Your Interests"
  const trendingInInterests = scoredEvents
    .filter(
      (e) =>
        (e.matchedInterests?.length > 0 || e.matchedSkills?.length > 0) &&
        (e.registrationCount || 0) >= 10 &&
        !e.isDismissed
    )
    .slice(0, 4);

  // Dynamic summary string
  let summary = 'Personalized recommendations based on your preferences';
  if (userProfile.skills.length > 0 && userProfile.interests.length > 0) {
    const s = userProfile.skills[0].toUpperCase();
    const i = userProfile.interests[0].charAt(0).toUpperCase() + userProfile.interests[0].slice(1);
    summary = `Personalized for your ${s} skills and ${i} interests`;
  } else if (userProfile.interests.length > 0) {
    const formatted = userProfile.interests
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(' and ');
    summary = `Recommended because you follow ${formatted}`;
  } else if (userProfile.attendedEvents.length >= 2) {
    summary = `Recommended based on your attendance in ${userProfile.attendedEvents.length} events`;
  }

  return {
    recommended,
    basedOnSkills,
    similarToAttended,
    nearYou,
    exploreSomethingNew,
    trendingInInterests,
    userSkills: userProfile.skills,
    userInterests: userProfile.interests,
    isColdStart: !!userProfile.isColdStart,
    hasHistory: userProfile.hasHistory,
    summary,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

module.exports = {
  generateRankedFeed,
};
