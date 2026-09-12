const config = require('../../config');
const { extractKeywords } = require('./keywordAnalyzer');

/**
 * Call Gemini generative AI with temperature & JSON format instruction,
 * returning parsed JSON or null if provider is unavailable/errors.
 */
async function callGemini(prompt, jsonHint = '') {
  if (!config.gemini?.apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nIMPORTANT: Use ONLY the verified event facts provided. Do NOT invent dates, venue, speakers, pricing, or certifications. Respond ONLY with valid JSON. ${jsonHint}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.5, response_mime_type: 'application/json' },
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text.replace(/```json|```/g, '')) : null;
  } catch (err) {
    console.warn('[EventBoost AI] Gemini call failed, using deterministic optimizer:', err.message);
    return null;
  }
}

/**
 * Generates verified AI optimizations for an event (Title, Meta, Description, FAQs, Keywords).
 *
 * @param {object} event
 * @param {string} primaryKeyword
 * @param {Array<string>} secondaryKeywords
 * @param {object} options
 * @returns {object} Suggestions payload
 */
async function generateOptimizations(event = {}, primaryKeyword = '', secondaryKeywords = [], options = {}) {
  const { speakers = [], sessions = [] } = options;

  // Build verified event facts dictionary
  const facts = {
    title: event.title || '',
    category: event.categorySlug || 'Tech',
    eventType: event.eventType || 'offline',
    city: event.venue?.city || '',
    venueName: event.venue?.name || '',
    isPaid: event.price > 0 || (event.ticketTypes || []).some((t) => t.price > 0),
    prices: (event.ticketTypes || []).map((t) => `${t.name}: ₹${t.price}`).join(', ') || (event.price ? `₹${event.price}` : 'Free'),
    hasCertificates: Boolean(event.settings?.certificatesIssued),
    startDate: event.startDate ? new Date(event.startDate).toDateString() : '',
    speakers: speakers.map((s) => s.name).join(', '),
    sessionsCount: sessions.length,
    currentDescription: (event.description || '').slice(0, 1000),
    primaryKeyword: primaryKeyword || event.tags?.[0] || 'Workshop',
  };

  // 1. Try Gemini
  const prompt = `You are an elite SEO & Event Content Specialist for EventSphere.
Optimize this event listing based ONLY on these verified facts:
${JSON.stringify(facts)}

Requirements:
1. suggestedTitle: Max 65 characters. Specific, clear, contains target keyword or format.
2. suggestedMetaTitle: 50-60 characters, format: "[Title] | EventSphere".
3. suggestedMetaDescription: 130-155 characters. Engaging search snippet with a call-to-action.
4. suggestedDescription: A well-structured event description organized into clear sections with markdown headings:
   ## Overview
   ## What You'll Learn
   ## Who Should Attend
   ## Agenda & Key Highlights
   ## Registration & Tickets
   (Preserve all facts, do NOT hallucinate new speakers/certifications/prices).
5. suggestedKeywords: Array of 4-6 high-relevance search keywords.
6. faqSuggestions: Array of 3-4 FAQ items [{q, a, basedOn}] strictly based on the provided facts.
7. socialCaption: Engaging LinkedIn/Twitter caption for promotion.`;

  const geminiResult = await callGemini(
    prompt,
    'Return an object with keys: suggestedTitle, suggestedMetaTitle, suggestedMetaDescription, suggestedDescription, suggestedKeywords, faqSuggestions, socialCaption.'
  );

  if (geminiResult && geminiResult.suggestedTitle && geminiResult.suggestedDescription) {
    return {
      engine: 'gemini',
      ...geminiResult,
    };
  }

  // 2. Deterministic Rule-Based Fallback
  return generateDeterministicOptimizations(event, primaryKeyword, secondaryKeywords, facts, speakers, sessions);
}

/**
 * Deterministic optimization generator used when AI is offline or key not provided.
 */
function generateDeterministicOptimizations(event, primaryKeyword, secondaryKeywords, facts, speakers, sessions) {
  const kwExtraction = extractKeywords(event, speakers);
  const pk = primaryKeyword || kwExtraction.primaryCandidate || 'Innovation Summit';
  const citySuffix = facts.eventType === 'offline' && facts.city ? ` in ${facts.city}` : '';
  const onlineSuffix = facts.eventType === 'online' ? ' (Online)' : '';

  // Title
  let cleanTitle = event.title || pk;
  if (cleanTitle.length < 30) {
    cleanTitle = `${cleanTitle} — Practical ${pk}${citySuffix}${onlineSuffix}`;
  }
  const suggestedTitle = cleanTitle.slice(0, 70);

  // Meta Title
  const suggestedMetaTitle = `${suggestedTitle.slice(0, 50)} | EventSphere`;

  // Meta Description
  const priceSnippet = facts.isPaid ? 'passes available' : 'free entry';
  const certSnippet = facts.hasCertificates ? ' and verifiable certificate' : '';
  const suggestedMetaDescription = `Join ${suggestedTitle}${citySuffix}. Get hands-on insights, networking, ${priceSnippet}${certSnippet} on EventSphere. Register today!`.slice(0, 160);

  // Structured Description
  const overviewText = event.description && event.description.length > 80
    ? event.description.split(/\n\s*\n/)[0]
    : `${suggestedTitle} is an immersive event tailored for creators, students, and professionals eager to learn and innovate in ${facts.category}.`;

  const speakerText = speakers.length > 0
    ? `Featuring expert sessions from ${speakers.map((s) => s.name).join(', ')}.`
    : 'Featuring leading practitioners and interactive discussions.';

  const ticketText = facts.prices
    ? `Ticket Tiers: ${facts.prices}. Seats are allocated on a first-come, first-served basis.`
    : 'Registration is free for all approved attendees.';

  const suggestedDescription = `## Overview\n${overviewText}\n\n## What You'll Learn\n- Practical, hands-on techniques and real-world workflows\n- Emerging tools, frameworks, and modern methodologies\n- Direct peer networking and interactive Q&A\n\n## Who Should Attend\n- Students, developers, and practitioners curious about ${facts.category}\n- Anyone looking to level up their technical skills\n\n## Agenda & Highlights\n${speakerText} The event features ${sessions.length > 0 ? `${sessions.length} structured sessions` : 'keynotes, workshops, and networking'}.\n\n## Registration & Passes\n${ticketText} Register now on EventSphere to secure your pass!`;

  // Suggested Keywords
  const suggestedKeywords = [
    pk,
    ...kwExtraction.secondaryCandidates.slice(0, 4),
  ];

  // FAQ Suggestions from verified facts
  const faqSuggestions = [
    {
      q: 'Who is eligible to participate?',
      a: 'This event is open to students, developers, and professionals interested in the topic.',
      basedOn: 'target audience',
    },
    {
      q: 'How does registration and entry work?',
      a: `Register on EventSphere to receive an instant digital QR ticket. ${facts.prices ? `Passes: ${facts.prices}.` : 'Admission is complimentary.'}`,
      basedOn: 'ticket data',
    },
  ];

  if (facts.hasCertificates) {
    faqSuggestions.push({
      q: 'Will participants receive a certificate?',
      a: 'Yes, all checked-in attendees receive a verifiable digital certificate on EventSphere within 48 hours.',
      basedOn: 'event certificates setting',
    });
  }

  if (facts.eventType === 'offline' && facts.venueName) {
    faqSuggestions.push({
      q: 'Where will the event be hosted?',
      a: `The event takes place at ${facts.venueName}${facts.city ? `, ${facts.city}` : ''}.`,
      basedOn: 'venue address',
    });
  }

  const socialCaption = `🚀 Excited to announce ${suggestedTitle}! Join us for an intensive experience covering ${pk}. Limited passes available on EventSphere. Register today! #${pk.replace(/\s+/g, '')} #EventSphere`;

  return {
    engine: 'deterministic-fallback',
    suggestedTitle,
    suggestedMetaTitle,
    suggestedMetaDescription,
    suggestedDescription,
    suggestedKeywords,
    faqSuggestions,
    socialCaption,
  };
}

/**
 * Conversational SEO Copilot handler answering organizer natural language questions.
 *
 * @param {string} query
 * @param {object} event
 * @param {object} seoProfile
 * @returns {object} { answer, action, suggestedField, suggestedValue }
 */
async function answerSeoQuery(query = '', event = {}, seoProfile = {}) {
  const q = (query || '').trim().toLowerCase();
  const title = event.title || 'Your Event';
  const score = seoProfile.seoScore || 50;

  // 1. Try Gemini for conversational flair
  if (config.gemini?.apiKey) {
    const prompt = `You are EventSphere's SEO Copilot assistant.
Organizer query: "${query}"
Verified Event Details:
- Title: "${event.title}"
- Current SEO Score: ${score}/100
- Primary Keyword: "${seoProfile.primaryKeyword || 'None'}"
- Description length: ${(event.description || '').length} characters
- Meta Description: "${event.metaDescription || 'Missing'}"
- Venue: "${event.venue?.name || ''}, ${event.venue?.city || ''}" (${event.eventType})

Answer the organizer with concise, expert advice (2-3 sentences).
If recommending a specific field change, provide:
- suggestedField: "title" | "metaDescription" | "primaryKeyword" | "description"
- suggestedValue: the proposed text.`;

    const geminiResp = await callGemini(
      prompt,
      'Return an object with keys: answer, suggestedField (optional), suggestedValue (optional).'
    );

    if (geminiResp?.answer) {
      return {
        answer: geminiResp.answer,
        suggestedField: geminiResp.suggestedField || null,
        suggestedValue: geminiResp.suggestedValue || null,
      };
    }
  }

  // 2. Deterministic Intent Matching for SEO Copilot
  if (q.includes('why') && q.includes('low')) {
    const topIssue = (seoProfile.seoIssues || [])[0];
    return {
      answer: `Your current SEO score is ${score}/100. The primary bottleneck is: "${topIssue ? topIssue.title : 'Missing meta description and keyword coverage'}". Addressing this will immediately boost your discoverability score.`,
      suggestedField: topIssue?.field || 'metaDescription',
      suggestedValue: topIssue?.suggestedValue || null,
    };
  }

  if (q.includes('title') || q.includes('rewrite')) {
    const newTitle = seoProfile.suggestedTitle || `${title} — Hands-on Workshop for Students`;
    return {
      answer: `Here is a high-intent title optimized for search snippets: "${newTitle}". It clearly identifies the format and audience.`,
      suggestedField: 'title',
      suggestedValue: newTitle,
    };
  }

  if (q.includes('meta description')) {
    const newMeta = seoProfile.suggestedMetaDescription || `Join ${title} to learn practical concepts and connect with practitioners. Register now on EventSphere!`;
    return {
      answer: `Here is a punchy 150-character meta description designed to maximize click-through rate in Google SERPs: "${newMeta}".`,
      suggestedField: 'metaDescription',
      suggestedValue: newMeta,
    };
  }

  if (q.includes('read') || q.includes('readability')) {
    return {
      answer: `To improve readability, break long paragraphs into 2-3 sentence chunks and use bullet points for learning outcomes and key takeaways.`,
      suggestedField: null,
      suggestedValue: null,
    };
  }

  if (q.includes('keyword')) {
    const kws = seoProfile.suggestedKeywords || ['Tech Workshop', 'Hands-on Bootcamp'];
    return {
      answer: `Recommended target keywords based on your content: ${kws.join(', ')}. Set your primary keyword to "${kws[0]}" to align with active searches.`,
      suggestedField: 'primaryKeyword',
      suggestedValue: kws[0],
    };
  }

  // General improvement advice
  return {
    answer: `To improve "${title}", ensure your primary keyword appears naturally in your title and first paragraph, set a custom 140-160 character meta description, and add 2-3 structured FAQs.`,
    suggestedField: null,
    suggestedValue: null,
  };
}

module.exports = {
  generateOptimizations,
  generateDeterministicOptimizations,
  answerSeoQuery,
};
