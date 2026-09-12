const { DEFAULT_WEIGHTS, PENALTIES, DISTANCE_THRESHOLDS } = require('./config');
const { computeSemanticSimilarity } = require('./semanticService');

/**
 * Calculates Haversine distance in kilometers between two coordinates.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalizes text string to clean set of words.
 */
function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Evaluates candidate event against user profile using the hybrid 10-factor formula.
 */
function scoreEvent(event, userProfile, { maxBatchRegs = 1, weights = DEFAULT_WEIGHTS, isDebug = false } = {}) {
  const eventIdStr = event._id.toString();
  const eventTags = (event.tags || []).map((t) => t.toLowerCase());
  const eventTitleTokens = tokenize(event.title);
  const eventDescTokens = tokenize(event.shortDescription || event.description || '');
  const allEventTokens = new Set([...eventTags, ...eventTitleTokens, ...eventDescTokens]);

  const reasons = [];
  const matchedSkills = [];
  const matchedInterests = [];
  let pastAttendedCount = 0;

  // 1. Skill Match (0 - 1.0)
  let skillMatchScore = 0;
  if (userProfile.skills.length > 0) {
    userProfile.skills.forEach((skill) => {
      const skillTokens = tokenize(skill);
      const isMatch =
        eventTags.some((t) => t.includes(skill) || skill.includes(t)) ||
        skillTokens.some((tok) => allEventTokens.has(tok));

      if (isMatch) {
        matchedSkills.push(skill);
      }
    });

    if (matchedSkills.length > 0) {
      skillMatchScore = Math.min(1.0, 0.4 + matchedSkills.length * 0.3);
      reasons.push({
        type: 'skill_match',
        label: 'Matches your skills',
        detail: `Matches your experience in ${matchedSkills.slice(0, 2).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' and ')}.`,
        tokens: matchedSkills,
      });
    }
  }

  // 2. Interest Match (0 - 1.0)
  let interestMatchScore = 0;
  if (userProfile.interests.length > 0) {
    userProfile.interests.forEach((interest) => {
      const intTokens = tokenize(interest);
      const isMatch =
        (event.categorySlug && event.categorySlug.includes(interest.replace(/\s/g, ''))) ||
        eventTags.some((t) => t.includes(interest) || interest.includes(t)) ||
        intTokens.some((tok) => allEventTokens.has(tok));

      if (isMatch) {
        matchedInterests.push(interest);
      }
    });

    if (matchedInterests.length > 0) {
      interestMatchScore = Math.min(1.0, 0.4 + matchedInterests.length * 0.3);
      reasons.push({
        type: 'interest_match',
        label: 'Matches your interests',
        detail: `Directly aligns with your interest in ${matchedInterests.slice(0, 2).map((i) => i.charAt(0).toUpperCase() + i.slice(1)).join(' and ')}.`,
        tokens: matchedInterests,
      });
    }
  }

  // 3. Category Match (0 - 1.0)
  let categoryMatchScore = 0;
  const catSlug = event.categorySlug || '';
  if (
    userProfile.interests.some((i) => catSlug.includes(i.replace(/\s/g, '')) || i.includes(catSlug)) ||
    (userProfile.categoryAffinities[catSlug] && userProfile.categoryAffinities[catSlug] > 0)
  ) {
    categoryMatchScore = 1.0;
  }

  // 4. Behavior Match (0 - 1.0)
  let behaviorMatchScore = 0;
  if (userProfile.categoryAffinities[catSlug]) {
    behaviorMatchScore = Math.min(1.0, userProfile.categoryAffinities[catSlug] / 3);
  }

  // Organizer affinity boost
  const orgIdStr = (event.organizer?._id || event.organizer)?.toString();
  if (orgIdStr && userProfile.organizerAffinities && userProfile.organizerAffinities[orgIdStr]) {
    behaviorMatchScore = Math.min(1.0, behaviorMatchScore + 0.35);
    reasons.push({
      type: 'organizer',
      label: 'Organized by a host you know',
      detail: 'You previously attended events hosted by this organizer.',
    });
  }

  // 5. Past Event Similarity (0 - 1.0)
  let pastEventSimilarityScore = 0;
  if (userProfile.attendedEvents.length > 0) {
    const matchingPast = userProfile.attendedEvents.filter(
      (p) => p.categorySlug === catSlug || (p.tags || []).some((t) => eventTags.includes(t.toLowerCase()))
    );
    pastAttendedCount = matchingPast.length;
    if (pastAttendedCount > 0) {
      pastEventSimilarityScore = Math.min(1.0, 0.5 + pastAttendedCount * 0.2);
      reasons.push({
        type: 'history',
        label: 'Similar to past events',
        detail: `You attended ${pastAttendedCount} related event${pastAttendedCount > 1 ? 's' : ''}.`,
        evidenceCount: pastAttendedCount,
      });
    }
  }

  // Favorite boost
  const isFavorite = userProfile.favoriteEventIds.has(eventIdStr);
  if (isFavorite) {
    behaviorMatchScore = Math.min(1.0, behaviorMatchScore + 0.3);
    reasons.push({
      type: 'favorite',
      label: 'Saved event',
      detail: 'You saved this event to your favorites.',
    });
  }

  // 6. Location Match (0 - 1.0) with Haversine distance
  let locationMatchScore = 0.5; // Default neutral
  let distanceKm = null;
  const isOnline = event.eventType === 'online';

  if (isOnline) {
    locationMatchScore = 1.0;
    reasons.push({
      type: 'location',
      label: 'Online event',
      detail: 'Join from anywhere with no travel required.',
    });
  } else {
    // Check coordinate distance if both user and event have coordinates
    const eventCoords = event.venue?.coordinates?.coordinates; // [lng, lat]
    const userCoords = userProfile.coordinates; // [lng, lat]

    if (Array.isArray(eventCoords) && eventCoords.length === 2 && Array.isArray(userCoords) && userCoords.length === 2) {
      distanceKm = Math.round(calculateDistanceKm(userCoords[1], userCoords[0], eventCoords[1], eventCoords[0]));
      if (distanceKm <= (DISTANCE_THRESHOLDS?.LOCAL_KM || 30)) {
        locationMatchScore = 1.0;
        reasons.push({
          type: 'location',
          label: 'Near you',
          detail: `Happening within ${distanceKm} km of your location.`,
        });
      } else if (distanceKm <= (DISTANCE_THRESHOLDS?.REGIONAL_KM || 75)) {
        locationMatchScore = 0.8;
      } else if (distanceKm <= (DISTANCE_THRESHOLDS?.FAR_KM || 150)) {
        locationMatchScore = 0.5;
      } else {
        locationMatchScore = 0.2;
      }
    } else if (userProfile.location && event.venue?.city) {
      const eventCity = event.venue.city.toLowerCase();
      if (userProfile.location.includes(eventCity) || eventCity.includes(userProfile.location)) {
        locationMatchScore = 1.0;
        reasons.push({
          type: 'location',
          label: 'Near you',
          detail: `Taking place in ${event.venue.city}, your preferred location.`,
        });
      } else {
        locationMatchScore = 0.4;
      }
    }
  }

  // 7. Semantic / Contextual Similarity (0 - 1.0)
  const semanticResult = computeSemanticSimilarity(userProfile, event);
  let semanticScore = semanticResult.score;

  if (semanticResult.matchedClusters.length > 0 && matchedSkills.length === 0 && matchedInterests.length === 0) {
    reasons.push({
      type: 'semantic_match',
      label: 'Topic alignment',
      detail: `Aligns with your focus in ${semanticResult.matchedClusters[0].label}.`,
    });
  }

  // 8. Freshness (0 - 1.0)
  const daysSinceCreated = Math.max(0, (Date.now() - new Date(event.createdAt || event.startDate).getTime()) / 86400000);
  const freshnessScore = Math.max(0.1, 1.0 - daysSinceCreated / 30);

  // 9. Popularity (0 - 1.0)
  const popularityScore = Math.min(1.0, (event.registrationCount || 0) / Math.max(1, maxBatchRegs));
  if (popularityScore > 0.6) {
    reasons.push({
      type: 'trending',
      label: 'Trending now',
      detail: 'High registration velocity among fellow attendees.',
    });
  }

  // 10. Time Relevance (0 - 1.0)
  const daysUntilStart = Math.max(0, (new Date(event.startDate).getTime() - Date.now()) / 86400000);
  let timeRelevanceScore = 0.5;
  if (daysUntilStart <= 14) timeRelevanceScore = 1.0;
  else if (daysUntilStart <= 30) timeRelevanceScore = 0.8;
  else timeRelevanceScore = 0.4;

  // Compute weighted base score (0.0 to 1.0)
  let rawScore =
    skillMatchScore * weights.skillMatch +
    interestMatchScore * weights.interestMatch +
    categoryMatchScore * weights.categoryMatch +
    behaviorMatchScore * weights.behaviorMatch +
    pastEventSimilarityScore * weights.pastEventSimilarity +
    locationMatchScore * weights.locationMatch +
    semanticScore * weights.semanticSimilarity +
    freshnessScore * weights.freshness +
    popularityScore * weights.popularity +
    timeRelevanceScore * weights.timeRelevance;

  // Baseline boost for cold-start users with no history
  if (!userProfile.hasHistory) {
    rawScore = Math.max(rawScore, 0.4 + popularityScore * 0.3 + (categoryMatchScore > 0 ? 0.25 : 0));
    if (reasons.length === 0) {
      reasons.push({
        type: 'popular',
        label: 'Popular with new members',
        detail: 'Trending upcoming event in EventSphere.',
      });
    }
  }

  // Organizer Trust boost / penalty
  const organizerTrust = event.organizerTrustScore || (event.organizer && event.organizer.trustScore);
  if (typeof organizerTrust === 'number') {
    if (organizerTrust >= 80) {
      rawScore = Math.min(1.0, rawScore + 0.05);
      reasons.push({
        type: 'trusted_organizer',
        label: 'Verified Trusted Host',
        detail: `Organizer holds a verified high TrustScore (${organizerTrust}/100) on EventSphere.`,
      });
    } else if (organizerTrust < 40) {
      rawScore = Math.max(0, rawScore - 0.08);
    }
  }

  // Apply negative penalties
  let penaltyDeduction = 0;
  if (userProfile.registeredEventIds.has(eventIdStr)) {
    penaltyDeduction += PENALTIES.alreadyRegistered;
  }
  if (userProfile.dismissedEventIds.has(eventIdStr)) {
    penaltyDeduction += PENALTIES.dismissedEvent;
  }
  if (userProfile.cancelledEventIds && userProfile.cancelledEventIds.has(eventIdStr)) {
    penaltyDeduction += PENALTIES.cancelledEvent || 15;
  }
  if (userProfile.dislikedCategories.has(catSlug)) {
    penaltyDeduction += PENALTIES.negativeCategoryFeedback;
  }
  if (distanceKm !== null && distanceKm > (DISTANCE_THRESHOLDS?.FAR_KM || 150) && !isOnline) {
    penaltyDeduction += PENALTIES.distancePenalty || 15;
  }

  // Expired check
  const isExpired = new Date(event.endDate).getTime() < Date.now();
  if (isExpired) {
    penaltyDeduction += 50;
  }

  // Calculate Match Percentage (35% to 98%)
  const percentageBase = Math.round(rawScore * 100);
  let matchPercentage = Math.max(35, Math.min(98, percentageBase));

  // If user has strong skills & interests matching this event, ensure top-tier 90%+ match
  if (
    matchedSkills.length >= 2 ||
    (matchedSkills.length >= 1 && matchedInterests.length >= 1) ||
    (pastAttendedCount >= 2 && matchedSkills.length >= 1)
  ) {
    matchPercentage = Math.max(90, Math.min(96, 88 + matchedSkills.length * 3 + pastAttendedCount * 2));
  }

  // Deduct penalties from match percentage if applicable
  if (penaltyDeduction > 0) {
    matchPercentage = Math.max(20, matchPercentage - penaltyDeduction);
  }

  const confidence =
    userProfile.hasHistory && (matchedSkills.length > 0 || matchedInterests.length > 0)
      ? 'high'
      : userProfile.interests.length > 0 || userProfile.skills.length > 0
      ? 'medium'
      : 'low';

  // Determine recommendation source label
  let recommendationSource = 'PERSONALIZED';
  if (matchedSkills.length > 0 && skillMatchScore >= 0.7) {
    recommendationSource = 'SKILL_MATCH';
  } else if (!isOnline && locationMatchScore >= 0.9) {
    recommendationSource = 'NEARBY';
  } else if (popularityScore > 0.7) {
    recommendationSource = 'TRENDING';
  }

  const topReason = reasons[0]?.detail || null;

  const result = {
    ...event,
    matchPercentage,
    confidence,
    reasons: reasons.slice(0, 4),
    topReason,
    recommendationSource,
    distanceKm,
    isFavorite,
    isRegistered: userProfile.registeredEventIds.has(eventIdStr),
    isCancelled: !!userProfile.cancelledEventIds?.has(eventIdStr),
    isDismissed: userProfile.dismissedEventIds.has(eventIdStr),
    isExpired,
    matchedSkills,
    matchedInterests,
    pastAttendedCount,
    semanticClusters: semanticResult.matchedClusters.map((c) => c.label),
  };

  if (isDebug) {
    result._debug = {
      rawScore,
      skillMatchScore,
      interestMatchScore,
      categoryMatchScore,
      behaviorMatchScore,
      pastEventSimilarityScore,
      locationMatchScore,
      distanceKm,
      semanticScore,
      freshnessScore,
      popularityScore,
      timeRelevanceScore,
      penaltyDeduction,
      confidence,
      weights,
    };
  }

  return result;
}

module.exports = {
  scoreEvent,
  tokenize,
  calculateDistanceKm,
};
