const { TITLE_RULES, POWER_WORDS } = require('./config');

/**
 * Analyzes event title for length, clarity, specificity, keyword presence, and power words.
 *
 * @param {string} title
 * @param {string} primaryKeyword
 * @param {object} eventData
 * @returns {object} { score, issues, strengths, suggestedTitle, whyBetter }
 */
function analyzeTitle(title = '', primaryKeyword = '', eventData = {}) {
  const t = (title || '').trim();
  const issues = [];
  const strengths = [];

  if (!t) {
    return {
      score: 0,
      issues: [
        {
          id: 'title_missing',
          title: 'Event title is missing',
          priority: 'high',
          impact: 'high',
          confidence: 'high',
          effort: 'low',
          reason: 'Search engines and attendees require a clear, informative title.',
          suggestedAction: 'Add a descriptive event title.',
          field: 'title',
          suggestedValue: 'Generative AI & LLM Workshop for Students',
          safeToApply: false,
        },
      ],
      strengths: [],
      suggestedTitle: 'Generative AI & LLM Workshop for Students',
      whyBetter: 'Provides clear topic, format, and audience targeting.',
    };
  }

  let score = 50;

  // 1. Length scoring
  const len = t.length;
  if (len >= TITLE_RULES.idealMin && len <= TITLE_RULES.idealMax) {
    score += 25;
    strengths.push(`Title length is optimal (${len} characters)`);
  } else if (len >= TITLE_RULES.minLength && len < TITLE_RULES.idealMin) {
    score += 15;
    issues.push({
      id: 'title_short',
      title: 'Title is a bit short',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: `Current title is ${len} characters. Titles between ${TITLE_RULES.idealMin}-${TITLE_RULES.idealMax} chars rank higher in search snippets.`,
      suggestedAction: 'Expand title with workshop format or target audience.',
      field: 'title',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (len < TITLE_RULES.minLength) {
    score -= 15;
    issues.push({
      id: 'title_very_short',
      title: 'Title is too short and generic',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: `Current title is only ${len} characters. Short titles struggle to convey intent or capture organic search queries.`,
      suggestedAction: 'Provide a specific, descriptive title.',
      field: 'title',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (len > TITLE_RULES.maxLength) {
    score -= 10;
    issues.push({
      id: 'title_too_long',
      title: 'Title exceeds recommended length',
      priority: 'low',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: `At ${len} characters, search engine results pages (SERPs) may truncate your title.`,
      suggestedAction: 'Trim title to under 70 characters for optimal display.',
      field: 'title',
      suggestedValue: t.slice(0, 68),
      safeToApply: false,
    });
  } else {
    // 71-100 chars
    score += 15;
  }

  // 2. Specificity check (penalize single-word or generic titles)
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && !POWER_WORDS.some((pw) => t.toLowerCase().includes(pw))) {
    score -= 15;
    issues.push({
      id: 'title_low_specificity',
      title: 'Title lacks specificity',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: `"${t}" is too generic. Searchers look for specific topics, tools, or target audiences.`,
      suggestedAction: 'Add the core technology, topic, or target audience to the title.',
      field: 'title',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (words.length >= 4) {
    score += 10;
    strengths.push('Title has good specificity and word count');
  }

  // 3. Keyword Presence
  if (primaryKeyword && primaryKeyword.trim()) {
    const pkNorm = primaryKeyword.toLowerCase().trim();
    if (t.toLowerCase().includes(pkNorm)) {
      score += 20;
      strengths.push(`Title includes primary keyword "${primaryKeyword}"`);
    } else {
      // Check partial overlap
      const pkWords = pkNorm.split(/\s+/).filter((w) => w.length > 2);
      const matched = pkWords.filter((w) => t.toLowerCase().includes(w));
      if (matched.length > 0) {
        score += 10;
        strengths.push(`Title includes related keyword terms (${matched.join(', ')})`);
      } else {
        issues.push({
          id: 'title_missing_keyword',
          title: `Title does not include primary keyword "${primaryKeyword}"`,
          priority: 'high',
          impact: 'high',
          confidence: 'high',
          effort: 'medium',
          reason: 'Including your target search keyword near the beginning of your title significantly aids organic search indexing.',
          suggestedAction: `Naturally incorporate "${primaryKeyword}" into the title.`,
          field: 'title',
          suggestedValue: null,
          safeToApply: false,
        });
      }
    }
  }

  // 4. Power word presence
  const hasPowerWord = POWER_WORDS.some((pw) => t.toLowerCase().includes(pw));
  if (hasPowerWord) {
    score += 10;
    strengths.push('Title contains engaging action/format keywords');
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Generate suggested title
  const suggestedTitle = buildSuggestedTitle(t, primaryKeyword, eventData);
  const whyBetter = `More specific, includes the primary topic/format, and is optimized for search snippet visibility.`;

  return {
    score: finalScore,
    issues,
    strengths,
    suggestedTitle,
    whyBetter,
  };
}

function buildSuggestedTitle(currentTitle, primaryKeyword, eventData = {}) {
  const category = eventData.categorySlug || eventData.category?.name || '';
  const city = eventData.venue?.city || '';
  const isOnline = eventData.eventType === 'online';

  let base = (primaryKeyword || currentTitle || 'Interactive Tech Summit').trim();
  base = base.replace(/^['"]|['"]$/g, '');

  // If title is already well-formed and > 40 chars
  if (base.length >= 40 && base.length <= 70) {
    return base;
  }

  if (base.length < 25) {
    const format = /summit|hackathon|workshop|bootcamp|conference/i.test(base)
      ? ''
      : 'Workshop';
    const audience = eventData.targetAudience || 'for Builders & Students';
    const locationSuffix = isOnline ? 'Online' : city ? `in ${city}` : '';

    const parts = [base, format, audience, locationSuffix].filter(Boolean);
    const combined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return combined.length <= 70 ? combined : combined.slice(0, 70);
  }

  return base;
}

module.exports = { analyzeTitle };
