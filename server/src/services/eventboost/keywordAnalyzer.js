const { STOP_WORDS, KEYWORD_RULES } = require('./config');

/**
 * Extracts candidate keywords from event data.
 *
 * @param {object} event
 * @param {Array} speakers
 * @returns {object} { primaryCandidate, secondaryCandidates, relatedTerms }
 */
function extractKeywords(event = {}, speakers = []) {
  const wordsMap = new Map();

  const addText = (text, weight = 1) => {
    if (!text) return;
    const tokens = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const token of tokens) {
      wordsMap.set(token, (wordsMap.get(token) || 0) + weight);
    }
  };

  // Add event signals
  addText(event.title, 4);
  addText(event.categorySlug, 3);
  (event.tags || []).forEach((t) => addText(t, 3));
  addText(event.shortDescription, 2);
  addText(event.venue?.city, 2);
  addText(event.description, 1);

  // Add speaker signals
  (speakers || []).forEach((s) => {
    addText(s.name, 1);
    (s.skills || []).forEach((sk) => addText(sk, 2));
  });

  // Sort by weighted frequency
  const sortedTokens = [...wordsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  // Bigrams from title & description
  const bigrams = extractNgrams(event.title || '', 2);
  const descBigrams = extractNgrams((event.description || '').slice(0, 500), 2);
  const candidatePhrases = [...new Set([...bigrams, ...descBigrams])].filter(
    (p) => !STOP_WORDS.has(p.split(' ')[0]) && !STOP_WORDS.has(p.split(' ')[1])
  );

  // Determine primary keyword candidate
  let primaryCandidate = '';
  if (candidatePhrases.length > 0) {
    primaryCandidate = candidatePhrases[0]
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } else if (event.tags && event.tags.length > 0) {
    primaryCandidate = event.tags[0];
  } else if (sortedTokens.length > 0) {
    primaryCandidate = sortedTokens[0].charAt(0).toUpperCase() + sortedTokens[0].slice(1);
  } else {
    primaryCandidate = 'Tech Workshop';
  }

  // Secondary keywords
  const secondaryCandidates = [];
  candidatePhrases.slice(1, 5).forEach((p) => {
    secondaryCandidates.push(
      p.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
  });
  (event.tags || []).forEach((tag) => {
    if (!secondaryCandidates.includes(tag) && tag !== primaryCandidate) {
      secondaryCandidates.push(tag);
    }
  });

  // Related terms (locations, speakers, formats)
  const relatedTerms = [];
  if (event.venue?.city) relatedTerms.push(event.venue.city);
  if (event.eventType) relatedTerms.push(event.eventType === 'offline' ? 'In-Person' : event.eventType);
  sortedTokens.slice(0, 8).forEach((t) => {
    const formatted = t.charAt(0).toUpperCase() + t.slice(1);
    if (!relatedTerms.includes(formatted) && formatted !== primaryCandidate) {
      relatedTerms.push(formatted);
    }
  });

  return {
    primaryCandidate,
    secondaryCandidates: secondaryCandidates.slice(0, 5),
    relatedTerms: relatedTerms.slice(0, 6),
  };
}

function extractNgrams(text, n = 2) {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const ngrams = [];
  for (let i = 0; i <= clean.length - n; i += 1) {
    const slice = clean.slice(i, i + n);
    if (slice.every((w) => w.length > 1 && !STOP_WORDS.has(w))) {
      ngrams.push(slice.join(' '));
    }
  }
  return ngrams;
}

/**
 * Analyzes keyword coverage, density, and detects keyword stuffing.
 *
 * @param {string} primaryKeyword
 * @param {Array<string>} secondaryKeywords
 * @param {object} event
 * @returns {object} { score, coveragePercentage, checks, isStuffed, stuffingWarning, issues, strengths }
 */
function analyzeKeywords(primaryKeyword = '', secondaryKeywords = [], event = {}) {
  const issues = [];
  const strengths = [];
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const tags = (event.tags || []).map((t) => t.toLowerCase());

  const allWordsInDesc = desc.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const totalDescWords = Math.max(1, allWordsInDesc.length);

  const pk = (primaryKeyword || '').trim().toLowerCase();
  const secondaries = (secondaryKeywords || []).map((s) => s.trim().toLowerCase()).filter(Boolean);

  let isStuffed = false;
  let stuffingWarning = '';
  const checks = [];

  // If no primary keyword is provided
  if (!pk) {
    issues.push({
      id: 'keyword_missing_primary',
      title: 'No primary keyword targeted',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: 'Targeting a primary keyword aligns your event with search queries users type into Google.',
      suggestedAction: 'Select or input a primary keyword for this event.',
      field: 'primaryKeyword',
      suggestedValue: event.tags?.[0] || 'Tech Workshop',
      safeToApply: true,
    });

    return {
      score: 30,
      coveragePercentage: 20,
      checks: [],
      isStuffed: false,
      stuffingWarning: '',
      issues,
      strengths: ['Secondary topic signals present'],
    };
  }

  // 1. Primary Keyword Evaluation
  const pkRegex = new RegExp(`\\b${escapeRegExp(pk)}\\b`, 'gi');
  const pkMatches = (desc.match(pkRegex) || []).length;
  const pkDensity = pkMatches > 0 ? (pkMatches * pk.split(' ').length) / totalDescWords : 0;

  const pkWords = pk.split(/\s+/).filter((w) => w.length > 2);
  const foundInTitle = title.includes(pk) || (pkWords.length > 0 && pkWords.every((w) => title.includes(w)));
  const foundInDesc = desc.includes(pk) || (pkWords.length > 0 && pkWords.every((w) => desc.includes(w)));
  const foundInTags = tags.some((t) => t.includes(pk) || pk.includes(t) || (pkWords.length > 0 && pkWords.some((w) => t.includes(w))));

  let pkStatus = 'optimal';
  if (pkDensity > KEYWORD_RULES.maxDensity && pkMatches >= 2) {
    pkStatus = 'stuffed';
    isStuffed = true;
    stuffingWarning = `Keyword stuffing detected for "${primaryKeyword}" (${(pkDensity * 100).toFixed(1)}% density). Use natural language instead of repeating the same keyword.`;
    issues.push({
      id: 'keyword_stuffing',
      title: 'Keyword stuffing detected',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'medium',
      reason: stuffingWarning,
      suggestedAction: 'Reduce keyword repetition and use natural variations or synonyms.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (!foundInTitle && !foundInDesc) {
    pkStatus = 'missing';
    issues.push({
      id: 'keyword_pk_missing_all',
      title: `Primary keyword "${primaryKeyword}" is not found in content`,
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: 'Search engines rank pages whose content naturally contains the query terms.',
      suggestedAction: `Include "${primaryKeyword}" naturally in the title and description overview.`,
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (!foundInDesc) {
    pkStatus = 'low';
    issues.push({
      id: 'keyword_pk_missing_desc',
      title: `Primary keyword "${primaryKeyword}" missing from description`,
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'The event description should mention your primary keyword in the opening paragraphs.',
      suggestedAction: `Include "${primaryKeyword}" in the first 2 paragraphs.`,
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  checks.push({
    keyword: primaryKeyword,
    foundInTitle,
    foundInDescription: foundInDesc,
    foundInTags,
    density: Number((pkDensity * 100).toFixed(2)),
    count: pkMatches,
    status: pkStatus,
  });

  if (foundInTitle && foundInDesc && !isStuffed) {
    strengths.push(`Primary keyword "${primaryKeyword}" naturally appears in Title and Description`);
  }

  // 2. Secondary Keywords Evaluation
  let secondaryCovered = 0;
  secondaries.forEach((sk) => {
    const skRegex = new RegExp(`\\b${escapeRegExp(sk)}\\b`, 'gi');
    const matches = (desc.match(skRegex) || []).length;
    const density = (matches * sk.split(' ').length) / totalDescWords;
    const skWords = sk.split(/\s+/).filter((w) => w.length > 2);
    const inTitle = title.includes(sk) || (skWords.length > 0 && skWords.every((w) => title.includes(w)));
    const inDesc = desc.includes(sk) || (skWords.length > 0 && skWords.every((w) => desc.includes(w)));
    const inTags = tags.some((t) => t.includes(sk) || sk.includes(t) || (skWords.length > 0 && skWords.some((w) => t.includes(w))));

    const status = (density > KEYWORD_RULES.maxDensity && matches >= 2) ? 'stuffed' : (inDesc || inTitle || inTags) ? 'optimal' : 'missing';
    if (inDesc || inTitle || inTags) secondaryCovered += 1;

    checks.push({
      keyword: sk,
      foundInTitle: inTitle,
      foundInDescription: inDesc,
      foundInTags: inTags,
      density: Number((density * 100).toFixed(2)),
      count: matches,
      status,
    });
  });

  if (secondaries.length === 0) {
    issues.push({
      id: 'keyword_secondary_missing',
      title: 'No secondary keywords defined',
      priority: 'low',
      impact: 'low',
      confidence: 'high',
      effort: 'low',
      reason: 'Targeting 2-3 secondary keywords captures long-tail search intent.',
      suggestedAction: 'Add 2-3 related secondary keywords from suggestions.',
      field: 'secondaryKeywords',
      suggestedValue: event.tags?.slice(0, 3) || [],
      safeToApply: true,
    });
  } else if (secondaryCovered > 0) {
    strengths.push(`${secondaryCovered}/${secondaries.length} secondary keywords covered`);
  }

  // Calculate Coverage Percentage
  let points = 0;
  let maxPoints = 5;
  if (foundInTitle) points += 2;
  if (foundInDesc) points += 2;
  if (foundInTags) points += 1;
  if (secondaries.length > 0) {
    maxPoints += secondaries.length;
    points += secondaryCovered;
  }
  const coveragePercentage = Math.round((points / maxPoints) * 100);

  // Scoring
  let score = 50;
  if (foundInTitle) score += 20;
  if (foundInDesc) score += 20;
  if (foundInTags) score += 10;
  if (secondaryCovered >= 2) score += 10;

  // Penalize stuffing heavily
  if (isStuffed) {
    score = Math.min(score, 45);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    coveragePercentage,
    checks,
    isStuffed,
    stuffingWarning,
    issues,
    strengths,
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { extractKeywords, analyzeKeywords };
