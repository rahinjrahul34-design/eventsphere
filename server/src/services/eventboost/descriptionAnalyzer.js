const { DESC_RULES, GENERIC_PHRASES } = require('./config');

/**
 * Analyzes event description for length, structure, audience, outcomes, CTA, and generic fluff.
 *
 * @param {string} description
 * @param {object} eventData
 * @returns {object} { score, qualityScore, issues, strengths, genericFlags, missingSections }
 */
function analyzeDescription(description = '', eventData = {}) {
  const d = (description || '').trim();
  const issues = [];
  const strengths = [];
  const genericFlags = [];
  const missingSections = [];

  if (!d) {
    return {
      score: 0,
      qualityScore: 0,
      issues: [
        {
          id: 'desc_missing',
          title: 'Event description is missing',
          priority: 'high',
          impact: 'high',
          confidence: 'high',
          effort: 'medium',
          reason: 'A detailed event description is essential for search engines to index and for attendees to convert.',
          suggestedAction: 'Add a comprehensive description outlining what attendees will learn, the agenda, and who should join.',
          field: 'description',
          suggestedValue: null,
          safeToApply: false,
        },
      ],
      strengths: [],
      genericFlags: [],
      missingSections: ['Overview', 'What You\'ll Learn', 'Who Should Attend', 'Call to Action'],
    };
  }

  let score = 40;
  const len = d.length;

  // 1. Length scoring
  if (len >= DESC_RULES.idealMin && len <= DESC_RULES.idealMax) {
    score += 25;
    strengths.push(`Description length is optimal (${len} characters)`);
  } else if (len >= DESC_RULES.minLength && len < DESC_RULES.idealMin) {
    score += 15;
    issues.push({
      id: 'desc_short',
      title: 'Description is slightly brief',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'medium',
      reason: `At ${len} characters, expanding with key highlights and takeaways improves search comprehension and registration conversion.`,
      suggestedAction: 'Add a section detailing the agenda or learning outcomes.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  } else if (len < DESC_RULES.minLength) {
    score -= 10;
    issues.push({
      id: 'desc_very_short',
      title: 'Description is too short',
      priority: 'high',
      impact: 'high',
      confidence: 'high',
      effort: 'medium',
      reason: 'Descriptions under 150 characters provide insufficient context for SEO indexing.',
      suggestedAction: 'Write at least 2-3 structured paragraphs explaining the event.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  } else {
    // Over idealMax
    score += 20;
    strengths.push('Comprehensive, in-depth description provided');
  }

  // 2. Structural Formatting (paragraphs & sections)
  const paragraphs = d.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    score += 15;
    strengths.push(`Well-structured with ${paragraphs.length} distinct sections`);
  } else if (paragraphs.length === 1 && len > 350) {
    issues.push({
      id: 'desc_wall_of_text',
      title: 'Description is a single block of text',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'Dense walls of text have lower reading engagement and higher bounce rates.',
      suggestedAction: 'Break the description into shorter paragraphs with distinct headings.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  const dLower = d.toLowerCase();

  // 3. Target Audience check
  const hasAudience = /who should attend|target audience|designed for|for students|for developers|for professionals|beginners|curious about|anyone interested/i.test(d);
  if (hasAudience) {
    score += 10;
    strengths.push('Clearly specifies target audience');
  } else {
    missingSections.push('Who Should Attend');
    issues.push({
      id: 'desc_missing_audience',
      title: 'Target audience not explicitly specified',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'Searchers frequently query audience qualifiers like "for beginners" or "for students".',
      suggestedAction: 'Add a "Who Should Attend" sentence or bullet points.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  // 4. Learning outcomes / Benefits
  const hasOutcomes = /what you'll learn|takeaways|benefits|outcomes|gain|hands-on|learn how to|build|skills/i.test(d);
  if (hasOutcomes) {
    score += 10;
    strengths.push('Highlights key takeaways and learning outcomes');
  } else {
    missingSections.push('What You\'ll Learn');
    issues.push({
      id: 'desc_missing_outcomes',
      title: 'Key takeaways or benefits missing',
      priority: 'medium',
      impact: 'medium',
      confidence: 'medium',
      effort: 'medium',
      reason: 'Detailing concrete benefits helps search engines classify the educational and practical value of your event.',
      suggestedAction: 'List 3-4 bullet points of what attendees will gain.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  // 5. Call to Action (CTA)
  const hasCta = /register|reserve|join us|sign up|grab your ticket|book your seat|seats are limited|rsvp/i.test(d);
  if (hasCta) {
    score += 5;
    strengths.push('Contains clear registration call-to-action');
  } else {
    missingSections.push('Call to Action');
    issues.push({
      id: 'desc_missing_cta',
      title: 'Missing a clear call-to-action (CTA)',
      priority: 'low',
      impact: 'low',
      confidence: 'high',
      effort: 'low',
      reason: 'Concluding with an actionable invitation drives attendee registration.',
      suggestedAction: 'Add a concluding sentence encouraging attendees to register.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  // 6. Generic Content / Fluff Detection
  GENERIC_PHRASES.forEach((phrase) => {
    if (dLower.includes(phrase)) {
      genericFlags.push({
        detected: true,
        reason: `Contains generic phrasing: "${phrase}"`,
        suggestion: 'Replace generic hype with specific topics, speakers, or practical activities.',
      });
    }
  });

  if (genericFlags.length > 0) {
    score -= Math.min(15, genericFlags.length * 5);
    issues.push({
      id: 'desc_generic_content',
      title: 'Generic or filler content detected',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: `Found ${genericFlags.length} generic phrase(s). Search engines favor authentic, factual value over vague promotional words.`,
      suggestedAction: 'Replace generic adjectives with concrete event specifics.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const qualityScore = Math.max(0, Math.min(100, Math.round(score * 0.95 + (genericFlags.length === 0 ? 5 : 0))));

  return {
    score: finalScore,
    qualityScore,
    issues,
    strengths,
    genericFlags,
    missingSections,
  };
}

module.exports = { analyzeDescription };
