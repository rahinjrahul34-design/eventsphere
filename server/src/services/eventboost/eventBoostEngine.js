const Event = require('../../models/Event');
const Speaker = require('../../models/Speaker');
const Session = require('../../models/Session');
const EventSEOProfile = require('../../models/EventSEOProfile');
const ApiError = require('../../utils/ApiError');
const { computeSeoScore } = require('./scoringEngine');
const { generateOptimizations, answerSeoQuery } = require('./aiOptimizerService');
const { extractKeywords } = require('./keywordAnalyzer');
const config = require('../../config');

/**
 * Ensures an EventSEOProfile exists for an event, initializing with baseline analysis if absent.
 *
 * @param {string} eventId
 * @returns {Promise<object>} EventSEOProfile document
 */
async function getOrCreateProfile(eventId) {
  let profile = await EventSEOProfile.findOne({ event: eventId });
  if (!profile) {
    const event = await Event.findById(eventId);
    if (!event) throw ApiError.notFound('Event not found');

    const [speakers, sessions] = await Promise.all([
      Speaker.find({ event: eventId }),
      Session.find({ event: eventId }),
    ]);

    const extracted = extractKeywords(event, speakers);
    const initialPK = event.primaryKeyword || extracted.primaryCandidate;
    const initialSK = extracted.secondaryCandidates;

    const analysis = computeSeoScore(event, initialPK, initialSK, { speakers, sessions });

    profile = await EventSEOProfile.create({
      event: eventId,
      primaryKeyword: initialPK,
      secondaryKeywords: initialSK,
      relatedTerms: extracted.relatedTerms,
      metaTitle: event.metaTitle || analysis.searchPreview.title,
      metaDescription: event.metaDescription || analysis.searchPreview.description,
      suggestedTitle: analysis.titleAnalysis.suggestedTitle,
      ...analysis,
      lastAnalyzedAt: new Date(),
    });
  }
  return profile;
}

/**
 * Runs full deterministic SEO analysis for an event, updating the profile.
 *
 * @param {string} eventId
 * @param {object} params { primaryKeyword, secondaryKeywords }
 * @returns {Promise<object>} Updated SEO analysis payload
 */
async function analyzeEvent(eventId, params = {}) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const [speakers, sessions] = await Promise.all([
    Speaker.find({ event: eventId }),
    Session.find({ event: eventId }),
  ]);

  let profile = await EventSEOProfile.findOne({ event: eventId });

  // Priority for keywords: passed params > profile > extracted
  let pk = params.primaryKeyword !== undefined ? params.primaryKeyword : (profile?.primaryKeyword || event.primaryKeyword || '');
  let sk = params.secondaryKeywords !== undefined ? params.secondaryKeywords : (profile?.secondaryKeywords || []);

  if (!pk) {
    const extracted = extractKeywords(event, speakers);
    pk = extracted.primaryCandidate;
    sk = sk.length > 0 ? sk : extracted.secondaryCandidates;
  }

  const analysis = computeSeoScore(event, pk, sk, { speakers, sessions });

  if (!profile) {
    profile = new EventSEOProfile({ event: eventId });
  }

  profile.primaryKeyword = pk;
  profile.secondaryKeywords = sk;
  profile.seoScore = analysis.seoScore;
  profile.contentScore = analysis.contentScore;
  profile.readabilityScore = analysis.readabilityScore;
  profile.keywordScore = analysis.keywordScore;
  profile.searchIntentScore = analysis.searchIntentScore;
  profile.socialScore = analysis.socialScore;
  profile.categoryScores = analysis.categoryScores;
  profile.readabilityMetrics = analysis.readabilityMetrics;
  profile.keywordCoverage = analysis.keywordCoverage;
  profile.searchIntent = analysis.searchIntent;
  profile.inconsistencies = analysis.inconsistencies;
  profile.genericContentFlags = analysis.genericContentFlags;
  profile.seoIssues = analysis.seoIssues;
  profile.strengths = analysis.strengths;
  profile.searchPreview = analysis.searchPreview;
  profile.socialPreview = analysis.socialPreview;
  profile.suggestedTitle = analysis.titleAnalysis.suggestedTitle;
  profile.lastAnalyzedAt = new Date();
  profile.aiProvider = config.gemini?.apiKey ? 'gemini' : 'deterministic-engine';

  await profile.save();
  return profile;
}

/**
 * Generates verified AI optimizations and recalculates the "After" score deterministically.
 *
 * @param {string} eventId
 * @param {object} params { primaryKeyword }
 * @returns {Promise<object>} Optimizations with Before/After comparison
 */
async function optimizeEvent(eventId, params = {}) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const profile = await getOrCreateProfile(eventId);
  const pk = params.primaryKeyword || profile.primaryKeyword;
  const sk = profile.secondaryKeywords || [];

  const [speakers, sessions] = await Promise.all([
    Speaker.find({ event: eventId }),
    Session.find({ event: eventId }),
  ]);

  // Current (Before) Score
  const currentAnalysis = computeSeoScore(event, pk, sk, { speakers, sessions });

  // Generate AI Suggestions
  const suggestions = await generateOptimizations(event, pk, sk, { speakers, sessions });

  // Recalculate After Score with simulated improvements
  const simulatedEvent = {
    ...event.toObject(),
    title: suggestions.suggestedTitle || event.title,
    description: suggestions.suggestedDescription || event.description,
    metaTitle: suggestions.suggestedMetaTitle || event.metaTitle,
    metaDescription: suggestions.suggestedMetaDescription || event.metaDescription,
    tags: [...new Set([...(event.tags || []), ...(suggestions.suggestedKeywords || [])])],
  };

  const afterAnalysis = computeSeoScore(simulatedEvent, pk, suggestions.suggestedKeywords || sk, {
    speakers,
    sessions,
  });

  profile.suggestedTitle = suggestions.suggestedTitle;
  profile.suggestedMetaTitle = suggestions.suggestedMetaTitle;
  profile.suggestedMetaDescription = suggestions.suggestedMetaDescription;
  profile.suggestedDescription = suggestions.suggestedDescription;
  profile.suggestedKeywords = suggestions.suggestedKeywords;
  profile.faqSuggestions = suggestions.faqSuggestions;
  profile.beforeAfter = {
    beforeScore: currentAnalysis.seoScore,
    beforeTitle: event.title,
    beforeDescription: (event.description || '').slice(0, 300),
    afterScore: afterAnalysis.seoScore,
    afterTitle: suggestions.suggestedTitle,
    afterDescription: (suggestions.suggestedDescription || '').slice(0, 300),
  };
  await profile.save();

  return {
    engine: suggestions.engine,
    beforeScore: currentAnalysis.seoScore,
    afterScore: afterAnalysis.seoScore,
    improvements: {
      title: {
        current: event.title,
        suggested: suggestions.suggestedTitle,
      },
      metaTitle: {
        current: event.metaTitle || `${event.title} | EventSphere`,
        suggested: suggestions.suggestedMetaTitle,
      },
      metaDescription: {
        current: event.metaDescription || '',
        suggested: suggestions.suggestedMetaDescription,
      },
      description: {
        current: event.description || '',
        suggested: suggestions.suggestedDescription,
      },
      keywords: {
        primary: pk,
        suggested: suggestions.suggestedKeywords,
      },
      faqSuggestions: suggestions.faqSuggestions,
      socialCaption: suggestions.socialCaption,
    },
  };
}

/**
 * Applies selected SEO optimizations to the event and logs history.
 *
 * @param {string} eventId
 * @param {object} changes { title, metaTitle, metaDescription, description, tags, primaryKeyword }
 * @param {string} userId
 * @returns {Promise<object>} Updated event and SEO score
 */
async function applyOptimizations(eventId, changes = {}, userId = null) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const profile = await getOrCreateProfile(eventId);
  const previousScore = profile.seoScore;
  const appliedChanges = [];

  if (changes.title && changes.title !== event.title) {
    event.title = changes.title;
    appliedChanges.push('Updated event title');
  }
  if (changes.metaTitle && changes.metaTitle !== event.metaTitle) {
    event.metaTitle = changes.metaTitle;
    profile.metaTitle = changes.metaTitle;
    appliedChanges.push('Updated meta title');
  }
  if (changes.metaDescription && changes.metaDescription !== event.metaDescription) {
    event.metaDescription = changes.metaDescription;
    profile.metaDescription = changes.metaDescription;
    appliedChanges.push('Updated meta description');
  }
  if (changes.description && changes.description !== event.description) {
    event.description = changes.description;
    appliedChanges.push('Replaced description with structured version');
  }
  if (changes.primaryKeyword) {
    event.primaryKeyword = changes.primaryKeyword;
    profile.primaryKeyword = changes.primaryKeyword;
    appliedChanges.push(`Set primary keyword to "${changes.primaryKeyword}"`);
  }
  if (Array.isArray(changes.tags) && changes.tags.length > 0) {
    event.tags = [...new Set([...event.tags, ...changes.tags])];
    appliedChanges.push('Added keyword tags');
  }

  await event.save();

  // Recalculate SEO score with updated event data
  const [speakers, sessions] = await Promise.all([
    Speaker.find({ event: eventId }),
    Session.find({ event: eventId }),
  ]);

  const newAnalysis = computeSeoScore(
    event,
    profile.primaryKeyword,
    profile.secondaryKeywords,
    { speakers, sessions }
  );

  // Update profile scores
  profile.seoScore = newAnalysis.seoScore;
  profile.contentScore = newAnalysis.contentScore;
  profile.readabilityScore = newAnalysis.readabilityScore;
  profile.keywordScore = newAnalysis.keywordScore;
  profile.searchIntentScore = newAnalysis.searchIntentScore;
  profile.socialScore = newAnalysis.socialScore;
  profile.categoryScores = newAnalysis.categoryScores;
  profile.seoIssues = newAnalysis.seoIssues;
  profile.strengths = newAnalysis.strengths;
  profile.searchPreview = newAnalysis.searchPreview;
  profile.socialPreview = newAnalysis.socialPreview;

  // Append history entry
  profile.history.unshift({
    timestamp: new Date(),
    seoScore: newAnalysis.seoScore,
    previousScore,
    changes: appliedChanges,
    appliedBy: userId,
    version: 'SEO_V1',
  });

  await profile.save();

  return {
    event,
    profile,
    previousScore,
    newScore: newAnalysis.seoScore,
    appliedChanges,
  };
}

/**
 * Handles conversational SEO Copilot questions.
 */
async function querySeoCopilot(eventId, query = '') {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const profile = await getOrCreateProfile(eventId);
  return answerSeoQuery(query, event, profile);
}

module.exports = {
  getOrCreateProfile,
  analyzeEvent,
  optimizeEvent,
  applyOptimizations,
  querySeoCopilot,
};
