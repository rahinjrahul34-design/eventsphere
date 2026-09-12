/**
 * Event Feature Extraction Service
 * Normalizes event attributes into structured, weighted recommendation features.
 */

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Extracts normalized features from an event document.
 */
function extractEventFeatures(event, { maxBatchRegs = 100 } = {}) {
  const tags = (event.tags || []).map((t) => t.trim().toLowerCase());
  const titleTokens = tokenize(event.title);
  const descTokens = tokenize(event.shortDescription || event.description || '');

  // Extract explicit and implicit skills from tags, title, and speaker profiles
  const skillsSet = new Set();
  const topicsSet = new Set([...tags]);

  titleTokens.forEach((t) => {
    if (t.length > 3) topicsSet.add(t);
  });

  // Extract speaker skills if populated
  if (Array.isArray(event.speakers)) {
    event.speakers.forEach((sp) => {
      (sp.skills || []).forEach((s) => {
        skillsSet.add(s.trim().toLowerCase());
        topicsSet.add(s.trim().toLowerCase());
      });
    });
  }

  // Tags that are commonly technical skills
  tags.forEach((tag) => {
    skillsSet.add(tag);
  });

  const coordinates = event.venue?.coordinates?.coordinates; // [lng, lat]
  const popularityVelocity = Math.min(1.0, (event.registrationCount || 0) / Math.max(1, maxBatchRegs));

  return {
    eventId: event._id.toString(),
    title: event.title,
    category: event.categorySlug || 'general',
    topics: Array.from(topicsSet),
    skills: Array.from(skillsSet),
    mode: event.eventType || 'offline',
    city: (event.venue?.city || '').trim().toLowerCase(),
    coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? coordinates : null,
    popularityScore: event.popularityScore || popularityVelocity,
    registrationCount: event.registrationCount || 0,
    capacity: event.capacity || 100,
    startDate: event.startDate,
    endDate: event.endDate,
    price: event.price || 0,
    isFree: event.price === 0,
  };
}

module.exports = {
  extractEventFeatures,
  tokenize,
};
