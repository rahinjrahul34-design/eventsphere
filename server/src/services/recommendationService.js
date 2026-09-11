const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Favorite = require('../models/Favorite');

/**
 * Personalized event recommendation engine.
 * Score = category match + tag match + past behaviour + saved events
 *         + location + popularity. Every score ships with human reasons ("Why recommended?").
 */
async function getRecommendedEvents(user, { limit = 8 } = {}) {
  const [events, pastRegs, favorites] = await Promise.all([
    Event.find({
      status: { $in: ['published', 'live'] },
      approvalStatus: 'approved',
      endDate: { $gte: new Date() },
    })
      .populate('organizer', 'name company')
      .populate('category', 'name slug color')
      .lean(),
    user
      ? Registration.find({ user: user._id, status: { $in: ['confirmed', 'checked_in', 'waitlisted'] } })
          .populate('event', 'categorySlug tags venue')
          .lean()
      : Promise.resolve([]),
    user ? Favorite.find({ user: user._id }).lean() : Promise.resolve([]),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.event.toString()));
  const pastCategories = {};
  const pastTitles = [];
  pastRegs.forEach((r) => {
    if (r.event?.categorySlug) pastCategories[r.event.categorySlug] = (pastCategories[r.event.categorySlug] || 0) + 1;
    if (r.event) pastTitles.push(r.event);
  });
  const maxRegs = Math.max(1, ...events.map((e) => e.registrationCount || 0));
  const interests = (user?.interests || []).map((i) => i.toLowerCase());
  const skills = (user?.skills || []).map((s) => s.toLowerCase());
  const attendedTechCount = pastRegs.length;

  const scored = events.map((event) => {
    let score = 0;
    const reasons = [];
    const tags = (event.tags || []).map((t) => t.toLowerCase());

    // Category affinity
    if (interests.some((i) => event.categorySlug?.toLowerCase().includes(i.replace(/[^a-z]/g, '')) || i.includes(event.categorySlug?.replace(/[^a-z]/g, '')))) {
      score += 22;
      reasons.push(`Matches your interest in ${event.category?.name || event.categorySlug}`);
    }
    // Tag overlap with interests and skills
    const tagHits = [...new Set(tags.filter((t) => interests.some((i) => t.includes(i.replace(/\s/g, '')) || i.replace(/\s/g, '').includes(t))))];
    const skillHits = tags.filter((t) => skills.some((s) => t.includes(s) || s.includes(t)));
    score += Math.min(24, tagHits.length * 8);
    score += Math.min(15, skillHits.length * 5);
    if (tagHits.length) reasons.push(`Matches ${tagHits.length} of your interests`);

    // Past registrations
    if (pastCategories[event.categorySlug]) {
      score += Math.min(25, 10 + pastCategories[event.categorySlug] * 5);
      reasons.push(`You attended ${pastCategories[event.categorySlug]} similar event${pastCategories[event.categorySlug] > 1 ? 's' : ''}`);
    }

    // Saved events
    if (favoriteIds.has(event._id.toString())) {
      score += 8;
      reasons.push('You saved a related event');
    }

    // Location
    if (user?.location && event.venue?.city && user.location.toLowerCase().includes(event.venue.city.toLowerCase())) {
      score += 10;
      reasons.push(`Happening in ${event.venue.city}, your area`);
    }

    // Popularity
    const popularity = ((event.registrationCount || 0) / maxRegs) * 15;
    score += popularity;
    if (popularity > 10) reasons.push('Trending among attendees right now');

    if (reasons.length === 0) reasons.push('Fresh event you might enjoy');

    return { ...event, score: Math.round(score), reasons: reasons.slice(0, 3), isFavorite: favoriteIds.has(event._id.toString()) };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Summary reason used in the section header
  let summary = 'Recommended from trending events near you';
  if (interests.length) summary = `Recommended because you follow ${interests.slice(0, 2).join(' and ')}`;
  if (attendedTechCount >= 3) summary += ` and attended ${attendedTechCount} events`;

  return { events: top, summary, attendedCount: attendedTechCount };
}

async function getSimilarEvents(event, { limit = 4 } = {}) {
  const events = await Event.find({
    _id: { $ne: event._id },
    status: { $in: ['published', 'live'] },
    approvalStatus: 'approved',
    endDate: { $gte: new Date(Date.now() - 7 * 864e5) },
  })
    .populate('organizer', 'name company')
    .populate('category', 'name slug color')
    .lean();

  const tagSet = new Set((event.tags || []).map((t) => t.toLowerCase()));
  const scored = events
    .map((e) => {
      let score = 0;
      if (e.categorySlug === event.categorySlug) score += 30;
      (e.tags || []).forEach((t) => {
        if (tagSet.has(t.toLowerCase())) score += 8;
      });
      if (e.eventType === event.eventType) score += 4;
      if (e.venue?.city && event.venue?.city && e.venue.city === event.venue.city) score += 8;
      return { ...e, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}

module.exports = { getRecommendedEvents, getSimilarEvents };
