const { INTENT_MARKERS } = require('./config');

/**
 * Analyzes search intent alignment across Informational, Transactional, Educational, and Local categories.
 *
 * @param {object} event
 * @param {string} primaryKeyword
 * @returns {object} { score, primary, matchPercentage, detectedIntents, details, issues, strengths }
 */
function analyzeSearchIntent(event = {}, primaryKeyword = '') {
  const issues = [];
  const strengths = [];
  const fullText = `${event.title || ''} ${event.shortDescription || ''} ${event.description || ''} ${(event.tags || []).join(' ')}`.toLowerCase();

  const intentScores = {
    informational: 0,
    transactional: 0,
    educational: 0,
    local: 0,
  };

  // 1. Informational signals
  INTENT_MARKERS.informational.forEach((marker) => {
    if (fullText.includes(marker)) intentScores.informational += 1;
  });

  // 2. Transactional signals (passes, registration, price, deadline)
  INTENT_MARKERS.transactional.forEach((marker) => {
    if (fullText.includes(marker)) intentScores.transactional += 1;
  });
  if (event.ticketTypes?.length > 0) intentScores.transactional += 2;
  if (event.registrationDeadline) intentScores.transactional += 1;

  // 3. Educational signals (workshop, students, mentors, hands-on, certificate)
  INTENT_MARKERS.educational.forEach((marker) => {
    if (fullText.includes(marker)) intentScores.educational += 1;
  });
  if (event.settings?.certificatesIssued) intentScores.educational += 2;

  // 4. Local signals (city, venue address, offline mode)
  if (event.eventType === 'offline' || event.eventType === 'hybrid') {
    if (event.venue?.city) intentScores.local += 3;
    if (event.venue?.name) intentScores.local += 2;
    if (event.venue?.address) intentScores.local += 1;
    INTENT_MARKERS.local.forEach((marker) => {
      if (fullText.includes(marker)) intentScores.local += 1;
    });
  } else if (event.eventType === 'online') {
    // For online, local is replaced by virtual/remote signals
    if (event.venue?.onlineUrl || fullText.includes('online') || fullText.includes('virtual') || fullText.includes('zoom')) {
      intentScores.local += 5; // maps to remote accessibility
    }
  }

  // Determine detected intents
  const detectedIntents = [];
  if (intentScores.educational >= 2) detectedIntents.push('Educational');
  if (intentScores.transactional >= 2) detectedIntents.push('Transactional / Registration');
  if (intentScores.informational >= 2) detectedIntents.push('Informational');
  if (intentScores.local >= 3) detectedIntents.push(event.eventType === 'online' ? 'Virtual / Remote' : 'Local Intent');

  // Primary Intent
  let primary = 'Informational';
  if (intentScores.educational >= intentScores.informational && intentScores.educational >= intentScores.transactional) {
    primary = 'Educational';
  } else if (intentScores.transactional > intentScores.informational) {
    primary = 'Transactional';
  }

  // Calculate Match Percentage
  const maxPossible = 16;
  const totalEarned = Math.min(
    maxPossible,
    intentScores.informational + intentScores.transactional + intentScores.educational + intentScores.local
  );
  const matchPercentage = Math.min(100, Math.max(20, Math.round((totalEarned / maxPossible) * 100)));

  // Scoring
  let score = 50;
  if (detectedIntents.length >= 3) {
    score += 35;
    strengths.push(`Strong multi-intent coverage: ${detectedIntents.join(' + ')}`);
  } else if (detectedIntents.length >= 2) {
    score += 20;
    strengths.push(`Good intent match: ${detectedIntents.join(' + ')}`);
  } else {
    score -= 10;
    issues.push({
      id: 'intent_weak_signals',
      title: 'Search intent signals are weak',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'medium',
      reason: 'Adding explicit registration details, learning outcomes, or location specifics matches diverse searcher queries.',
      suggestedAction: 'Add clear ticket details and specify what participants will build or learn.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  if (intentScores.transactional < 2) {
    issues.push({
      id: 'intent_missing_transactional',
      title: 'Missing transactional cues (Registration & Tickets)',
      priority: 'medium',
      impact: 'high',
      confidence: 'high',
      effort: 'low',
      reason: 'High-intent attendees search for registration deadlines, pass types, and seat availability.',
      suggestedAction: 'Mention registration deadlines and pass categories clearly.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  const details = [
    `Educational Intent: ${intentScores.educational >= 2 ? 'Strong' : 'Moderate'} (${intentScores.educational} signals)`,
    `Transactional Intent: ${intentScores.transactional >= 2 ? 'High' : 'Low'} (${intentScores.transactional} signals)`,
    `Informational Intent: ${intentScores.informational >= 2 ? 'Strong' : 'Basic'} (${intentScores.informational} signals)`,
    `${event.eventType === 'online' ? 'Remote Accessibility' : 'Local Search'}: ${intentScores.local >= 3 ? 'Clear' : 'Needs attention'}`,
  ];

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    primary,
    matchPercentage,
    detectedIntents,
    details,
    issues,
    strengths,
  };
}

module.exports = { analyzeSearchIntent };
