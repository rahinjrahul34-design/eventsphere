const { WEIGHTS, META_TITLE_RULES, META_DESC_RULES } = require('./config');
const { analyzeTitle } = require('./titleAnalyzer');
const { analyzeKeywords, extractKeywords } = require('./keywordAnalyzer');
const { analyzeDescription } = require('./descriptionAnalyzer');
const { analyzeReadability } = require('./readabilityAnalyzer');
const { analyzeSearchIntent } = require('./intentAnalyzer');
const { analyzeConsistency } = require('./consistencyAnalyzer');

/**
 * Deterministic SEO scoring engine.
 * Computes category scores, final 0-100 composite score, checklist, and prioritized issues.
 *
 * @param {object} event
 * @param {string} primaryKeyword
 * @param {Array<string>} secondaryKeywords
 * @param {object} options { speakers, sessions }
 * @returns {object} Full analysis payload
 */
function computeSeoScore(event = {}, primaryKeyword = '', secondaryKeywords = [], options = {}) {
  const { speakers = [], sessions = [] } = options;

  // 1. Title Analysis
  const titleResult = analyzeTitle(event.title, primaryKeyword, event);

  // 2. Keyword Analysis
  const keywordResult = analyzeKeywords(primaryKeyword, secondaryKeywords, event);

  // 3. Description Analysis
  const descResult = analyzeDescription(event.description, event);

  // 4. Readability Analysis
  const readabilityResult = analyzeReadability(event.description);

  // 5. Search Intent Analysis
  const intentResult = analyzeSearchIntent(event, primaryKeyword);

  // 6. Content Consistency
  const inconsistencies = analyzeConsistency(event);

  // 7. Metadata Quality (Meta Title & Meta Description)
  const metaTitle = (event.metaTitle || '').trim();
  const metaDesc = (event.metaDescription || '').trim();
  let metaScore = 30;
  const metaIssues = [];
  const metaStrengths = [];

  if (metaTitle) {
    const tLen = metaTitle.length;
    if (tLen >= META_TITLE_RULES.idealMin && tLen <= META_TITLE_RULES.idealMax) {
      metaScore += 30;
      metaStrengths.push(`Meta title length is optimal (${tLen} chars)`);
    } else {
      metaScore += 15;
    }
  } else {
    metaIssues.push({
      id: 'meta_title_missing',
      title: 'Meta title not customized',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'A concise meta title with branding helps search engines display attractive SERP headlines.',
      suggestedAction: 'Generate and set a 50-60 character meta title.',
      field: 'metaTitle',
      suggestedValue: `${(event.title || 'Event').slice(0, 50)} | EventSphere`,
      safeToApply: true,
    });
  }

  if (metaDesc) {
    const dLen = metaDesc.length;
    if (dLen >= META_DESC_RULES.idealMin && dLen <= META_DESC_RULES.idealMax) {
      metaScore += 40;
      metaStrengths.push(`Meta description is in the recommended range (${dLen}/160 chars)`);
    } else if (dLen >= 80 && dLen < META_DESC_RULES.idealMin) {
      metaScore += 25;
      metaIssues.push({
        id: 'meta_desc_short',
        title: 'Meta description is a bit short',
        priority: 'medium',
        impact: 'medium',
        confidence: 'high',
        effort: 'low',
        reason: `Current meta description is ${dLen} chars. Search snippets display up to ~160 characters.`,
        suggestedAction: 'Expand meta description with an invitation or clear benefits.',
        field: 'metaDescription',
        suggestedValue: null,
        safeToApply: false,
      });
    } else {
      metaScore += 15;
    }
  } else {
    metaIssues.push({
      id: 'meta_desc_missing',
      title: 'Meta description is missing',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: 'A compelling meta description drastically increases search click-through rate (CTR).',
      suggestedAction: 'Add a 140-160 character summary with a clear call-to-action.',
      field: 'metaDescription',
      suggestedValue: buildDefaultMetaDescription(event, primaryKeyword),
      safeToApply: true,
    });
  }
  const metadataQualityScore = Math.min(100, Math.max(0, metaScore));

  // 8. Content Completeness
  let completenessScore = 30;
  const completenessIssues = [];
  const completenessStrengths = [];

  if (event.startDate && event.endDate) completenessScore += 15;
  if (event.categorySlug || event.category) completenessScore += 10;
  if (event.ticketTypes?.length > 0) completenessScore += 10;
  if (event.faq?.length >= 2) {
    completenessScore += 15;
    completenessStrengths.push(`Includes ${event.faq.length} helpful FAQs`);
  } else {
    completenessIssues.push({
      id: 'completeness_faqs',
      title: 'Event FAQ is empty',
      priority: 'low',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'FAQs answer attendee hesitation and enable rich search snippet snippets.',
      suggestedAction: 'Add 2-3 common questions (tickets, certificates, prerequisites).',
      field: 'faq',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  if (sessions.length > 0) {
    completenessScore += 10;
    completenessStrengths.push(`Structured schedule with ${sessions.length} sessions`);
  }
  if (speakers.length > 0) {
    completenessScore += 10;
    completenessStrengths.push(`${speakers.length} speakers attached`);
  }
  const contentCompletenessScore = Math.min(100, Math.max(0, completenessScore));

  // 9. Local Relevance & Mode
  let localScore = 50;
  const localStrengths = [];
  if (event.eventType === 'offline' || event.eventType === 'hybrid') {
    if (event.venue?.city) {
      localScore += 25;
      localStrengths.push(`Local city targeted: ${event.venue.city}`);
    }
    if (event.venue?.name && event.venue?.address) {
      localScore += 25;
      localStrengths.push('Physical venue address complete');
    }
  } else if (event.eventType === 'online') {
    localScore += 50;
    localStrengths.push('Configured for global virtual attendance');
  }
  const localRelevanceScore = Math.min(100, Math.max(0, localScore));

  // 10. Social Readiness
  let socialScore = 40;
  const socialStrengths = [];
  if (event.coverImage && !event.coverImage.includes('default')) {
    socialScore += 35;
    socialStrengths.push('High-resolution cover image ready for social previews');
  }
  if (event.shortDescription && event.shortDescription.length >= 40) {
    socialScore += 25;
    socialStrengths.push('Crisp social sharing summary');
  }
  const socialReadinessScore = Math.min(100, Math.max(0, socialScore));

  // Category Scores Record
  const categoryScores = {
    titleOptimization: titleResult.score,
    descriptionQuality: descResult.score,
    keywordRelevance: keywordResult.score,
    searchIntentMatch: intentResult.score,
    readability: readabilityResult.score,
    metadataQuality: metadataQualityScore,
    contentCompleteness: contentCompletenessScore,
    localRelevance: localRelevanceScore,
    socialReadiness: socialReadinessScore,
  };

  // Compute Total Weighted Score
  let composite = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    composite += (categoryScores[key] || 0) * weight;
  }

  // Safety checks against NaN and bounds
  const rawFinal = Number.isFinite(composite) ? composite : 0;
  const finalSeoScore = Math.max(0, Math.min(100, Math.round(rawFinal)));

  // Consolidate Issues & Sort by (High Impact + Low Effort first)
  const allIssues = [
    ...titleResult.issues,
    ...keywordResult.issues,
    ...descResult.issues,
    ...readabilityResult.issues,
    ...intentResult.issues,
    ...metaIssues,
    ...completenessIssues,
  ];

  const sortedIssues = allIssues.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const effortWeight = { low: 3, medium: 2, high: 1 }; // low effort gives higher rank
    const scoreA = (priorityWeight[a.priority] || 1) * 2 + (effortWeight[a.effort] || 1);
    const scoreB = (priorityWeight[b.priority] || 1) * 2 + (effortWeight[b.effort] || 1);
    return scoreB - scoreA;
  });

  // Consolidated Strengths
  const allStrengths = [
    ...titleResult.strengths,
    ...keywordResult.strengths,
    ...descResult.strengths,
    ...readabilityResult.strengths,
    ...intentResult.strengths,
    ...metaStrengths,
    ...completenessStrengths,
    ...localStrengths,
    ...socialStrengths,
  ];

  // Previews
  const effectiveTitle = metaTitle || event.title || 'EventSphere Event';
  const effectiveDesc = metaDesc || event.shortDescription || (event.description || '').slice(0, 155) || 'Discover and register for this event on EventSphere.';
  const slug = event.slug || 'event';

  const searchPreview = {
    title: `${effectiveTitle} | EventSphere`,
    description: effectiveDesc.length > 160 ? `${effectiveDesc.slice(0, 157)}...` : effectiveDesc,
    url: `eventsphere.demo/events/${slug}`,
    slug,
  };

  const socialPreview = {
    title: effectiveTitle,
    description: effectiveDesc,
    image: event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=70',
    domain: 'eventsphere.demo',
  };

  return {
    seoScore: finalSeoScore,
    contentScore: descResult.qualityScore,
    readabilityScore: readabilityResult.score,
    keywordScore: keywordResult.score,
    searchIntentScore: intentResult.score,
    socialScore: socialReadinessScore,
    categoryScores,
    readabilityMetrics: {
      avgSentenceLength: readabilityResult.avgSentenceLength,
      longSentencesCount: readabilityResult.longSentencesCount,
      paragraphCount: readabilityResult.paragraphCount,
      wordCount: readabilityResult.wordCount,
      fleschReadingEase: readabilityResult.fleschReadingEase,
      gradeLevel: readabilityResult.gradeLevel,
    },
    keywordCoverage: {
      percentage: keywordResult.coveragePercentage,
      checks: keywordResult.checks,
      isStuffed: keywordResult.isStuffed,
      stuffingWarning: keywordResult.stuffingWarning,
    },
    searchIntent: {
      primary: intentResult.primary,
      matchPercentage: intentResult.matchPercentage,
      detectedIntents: intentResult.detectedIntents,
      details: intentResult.details,
    },
    inconsistencies,
    genericContentFlags: descResult.genericFlags,
    seoIssues: sortedIssues,
    strengths: allStrengths.slice(0, 20),
    searchPreview,
    socialPreview,
    titleAnalysis: {
      suggestedTitle: titleResult.suggestedTitle,
      whyBetter: titleResult.whyBetter,
    },
  };
}

function buildDefaultMetaDescription(event, primaryKeyword) {
  const title = event.title || 'workshop';
  const keyword = primaryKeyword || title;
  const city = event.venue?.city ? ` in ${event.venue.city}` : '';
  const online = event.eventType === 'online' ? ' online' : '';

  const snippet = `Join our ${keyword}${city}${online}. Learn practical concepts, connect with peers, and earn your verified certificate on EventSphere. Register today!`;
  return snippet.length > 160 ? snippet.slice(0, 157) + '...' : snippet;
}

module.exports = { computeSeoScore };
