const Registration = require('../../models/Registration');
const Favorite = require('../../models/Favorite');
const Feedback = require('../../models/Feedback');
const RecommendationInteraction = require('../../models/RecommendationInteraction');
const { TIME_DECAY_LAMBDA } = require('./config');

/**
 * Builds a normalized, weighted user preference profile.
 * Incorporates active profile interests, skills, registration history,
 * saved favorites, event feedback ratings, and negative signals with time decay.
 */
async function buildUserProfile(user) {
  if (!user || !user._id) {
    const fallbackInterests = (user?.interests || []).map((i) => i.trim().toLowerCase()).filter(Boolean);
    const fallbackSkills = (user?.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
    return {
      userId: user?._id ? user._id.toString() : null,
      interests: fallbackInterests,
      skills: fallbackSkills,
      categoryAffinities: {},
      organizerAffinities: {},
      attendedEvents: [],
      registeredEventIds: new Set(),
      cancelledEventIds: new Set(),
      favoriteEventIds: new Set(),
      dismissedEventIds: new Set(),
      dislikedCategories: new Set(),
      preferredModes: {},
      normalizedPreferences: {
        interests: fallbackInterests.map((name) => ({ name, weight: 1.0 })),
        skills: fallbackSkills.map((name) => ({ name, weight: 1.0 })),
        preferredCategories: [],
        preferredModes: [],
        preferredLocation: {},
      },
      location: (user?.location || '').trim().toLowerCase(),
      hasHistory: false,
      isColdStart: fallbackInterests.length === 0 && fallbackSkills.length === 0,
    };
  }

  const [registrations, favorites, interactions, feedbacks] = await Promise.all([
    Registration.find({ user: user._id })
      .populate('event', 'categorySlug tags venue startDate eventType organizer')
      .lean(),
    Favorite.find({ user: user._id }).lean(),
    RecommendationInteraction.find({ user: user._id }).lean(),
    Feedback.find({ user: user._id })
      .populate('event', 'categorySlug organizer')
      .lean(),
  ]);

  const registeredEventIds = new Set();
  const cancelledEventIds = new Set();
  const attendedEvents = [];
  const categoryAffinities = {};
  const organizerAffinities = {};
  const modeCounts = { offline: 0, online: 0, hybrid: 0 };
  const now = Date.now();

  for (const reg of registrations) {
    if (!reg.event) continue;
    const eventIdStr = (reg.event._id || reg.event).toString();

    if (reg.status === 'cancelled') {
      cancelledEventIds.add(eventIdStr);
    } else {
      registeredEventIds.add(eventIdStr);
    }

    if (reg.event.eventType && modeCounts[reg.event.eventType] !== undefined) {
      modeCounts[reg.event.eventType] += 1;
    }

    const isAttended = ['confirmed', 'checked_in'].includes(reg.status);
    if (isAttended) {
      attendedEvents.push(reg.event);
      const cat = reg.event.categorySlug;
      if (cat) {
        // Apply time decay: days since event registration
        const daysAgo = Math.max(0, (now - new Date(reg.registeredAt || reg.createdAt).getTime()) / 86400000);
        const weight = Math.exp(-TIME_DECAY_LAMBDA * daysAgo);
        categoryAffinities[cat] = (categoryAffinities[cat] || 0) + 1.5 * weight;
      }

      // Track organizer affinity
      const orgIdStr = (reg.event.organizer?._id || reg.event.organizer)?.toString();
      if (orgIdStr) {
        organizerAffinities[orgIdStr] = (organizerAffinities[orgIdStr] || 0) + 1.0;
      }
    }
  }

  // Incorporate Feedback ratings (Positive: 4-5 stars boosts category; Negative: 1-2 stars softens category)
  for (const fb of feedbacks) {
    if (!fb.event) continue;
    const cat = fb.event.categorySlug;
    if (cat) {
      if (fb.rating >= 4 || fb.wouldRecommend === true) {
        categoryAffinities[cat] = (categoryAffinities[cat] || 0) + 1.2;
      } else if (fb.rating <= 2) {
        categoryAffinities[cat] = Math.max(0, (categoryAffinities[cat] || 0) - 1.0);
      }
    }
  }

  const favoriteEventIds = new Set(favorites.map((f) => f.event.toString()));

  // Process interactions: dismissals and negative feedback
  const dismissedEventIds = new Set();
  const dislikedCategories = new Set();

  for (const inter of interactions) {
    const eventIdStr = (inter.event?._id || inter.event)?.toString();
    if (!eventIdStr) continue;

    if (inter.interactionType === 'dismiss' || inter.feedbackType === 'dislike') {
      dismissedEventIds.add(eventIdStr);
    }
    if (inter.feedbackType === 'dislike' && (inter.feedbackReason === 'Wrong category' || inter.feedbackReason === 'Not interested')) {
      if (inter.meta?.categorySlug) dislikedCategories.add(inter.meta.categorySlug);
    }
  }

  const interests = (user.interests || []).map((i) => i.trim().toLowerCase()).filter(Boolean);
  const skills = (user.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const hasHistory = attendedEvents.length > 0 || favoriteEventIds.size > 0 || registrations.length > 0;
  const isColdStart = !hasHistory && interests.length === 0 && skills.length === 0;

  // Normalized preference representation for Core Feature 2
  const normalizedPreferences = {
    interests: interests.map((name, idx) => ({
      name,
      weight: Math.round(Math.max(0.5, 1.0 - idx * 0.08) * 100) / 100,
    })),
    skills: skills.map((name, idx) => ({
      name,
      weight: Math.round(Math.max(0.5, 1.0 - idx * 0.08) * 100) / 100,
    })),
    preferredCategories: Object.entries(categoryAffinities).map(([name, aff]) => ({
      name,
      weight: Math.round(Math.min(1.0, aff / 3) * 100) / 100,
    })),
    preferredModes: Object.entries(modeCounts)
      .filter(([, count]) => count > 0)
      .map(([mode, count]) => ({
        mode,
        weight: Math.round((count / Math.max(1, registrations.length)) * 100) / 100,
      })),
    preferredLocation: {
      city: (user.location || '').trim().toLowerCase(),
    },
  };

  return {
    userId: user._id.toString(),
    interests,
    skills,
    categoryAffinities,
    organizerAffinities,
    attendedEvents,
    registeredEventIds,
    cancelledEventIds,
    favoriteEventIds,
    dismissedEventIds,
    dislikedCategories,
    preferredModes: modeCounts,
    normalizedPreferences,
    location: (user.location || '').trim().toLowerCase(),
    hasHistory,
    isColdStart,
  };
}

module.exports = {
  buildUserProfile,
};
