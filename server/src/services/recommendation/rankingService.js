/**
 * Smart Ranking Pipeline Service
 * Orchestrates candidate filtering, scoring, diversity re-ranking, and section partitioning.
 */

const { ALGORITHM_VERSION } = require('./config');
const { getCandidateEvents } = require('./candidateService');
const { scoreEvent } = require('./scoringEngine');
const { applyDiversity, selectExplorationEvent } = require('./diversityService');
const OrganizerTrustProfile = require('../../models/OrganizerTrustProfile');

/**
 * TrustSphere × Recommendation 2.0 integration (CORE FEATURE 47).
 *
 * Organizer reliability acts as a *small, bounded* contextual signal — it can
 * nudge an event by at most ±3 points and can NEVER overpower user relevance.
 * Organizers without a trust profile (cold start) receive no adjustment at
 * all, so new organizers are not penalized by the discovery feed.
 */
async function applyTrustSignal(scoredEvents) {
  const organizerIds = [
    ...new Set(
      scoredEvents
        .map((e) => e.organizer?._id?.toString() || e.organizer?.toString())
        .filter(Boolean)
    ),
  ];
  if (organizerIds.length === 0) return scoredEvents;

  const profiles = await OrganizerTrustProfile.find({
    organizer: { $in: organizerIds },
  })
    .select('organizer trustScore trustLevel verified')
    .lean();

  const byOrganizer = Object.fromEntries(profiles.map((p) => [p.organizer.toString(), p]));

  for (const item of scoredEvents) {
    const orgId = item.organizer?._id?.toString() || item.organizer?.toString();
    const profile = orgId ? byOrganizer[orgId] : null;
    if (!profile) continue; // cold-start organizer: zero adjustment

    const trust = profile.trustScore || 0;
    let nudge = 0;
    if (trust >= 90) nudge = 3;
    else if (trust >= 80) nudge = 2;
    else if (trust >= 70) nudge = 1;
    else if (trust > 0 && trust < 50) nudge = -3;

    if (nudge !== 0) {
      item.matchPercentage = Math.max(35, Math.min(98, item.matchPercentage + nudge));
      item.reasons = item.reasons || [];
      item.reasons.push({
        type: nudge > 0 ? 'trust' : 'trust_risk',
        label: nudge > 0 ? 'Organizer has a strong EventSphere reliability record' : 'Organizer reliability record is below platform benchmarks',
        points: nudge,
      });
    }
    item.organizerTrust = { score: trust, level: profile.trustLevel, verified: profile.verified };
  }

  // Re-sort: trust nudges may have reordered near-equal candidates
  scoredEvents.sort((a, b) => b.matchPercentage - a.matchPercentage);
  return scoredEvents;
}

/**
 * Executes full ranking pipeline to produce multi-section discovery feeds.
 */
async function generateRankedFeed(userProfile, { limit = 8, debug = false } = {}) {
  const candidates = await getCandidateEvents({ userProfile });
  const maxBatchRegs = Math.max(1, ...candidates.map((e) => e.registrationCount || 0));

  const scoredEvents = candidates.map((event) =>
    scoreEvent(event, userProfile, { maxBatchRegs, isDebug: debug })
  );

  // TrustSphere contextual signal (bounded ±3) — applied BEFORE diversity
  await applyTrustSignal(scoredEvents);

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

  const becauseYouLike = scoredEvents
    .filter(
      (e) =>
        !e.isDismissed &&
        !e.isRegistered &&
        ((e.pastAttendedCount || 0) > 0 ||
          e.isFavorite ||
          (e.matchedInterests || []).length > 0)
    )
    .slice(0, 4);

  const newEventsYouMayLike = scoredEvents
    .filter((e) => {
      if (e.isDismissed || e.isRegistered || e.isExpired) return false;
      const created = new Date(e.createdAt || e.startDate).getTime();
      const days = (Date.now() - created) / 86400000;
      return days <= 14;
    })
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
    becauseYouLike,
    newEventsYouMayLike,
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
