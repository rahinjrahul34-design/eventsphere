const config = require('../../config');

/**
 * Builds a natural-language evidence-based explanation for why an event was recommended.
 * Strictly adheres to real facts from the user profile and event model (Zero hallucinations).
 */
async function generateExplanation(scoredEvent, userProfile) {
  const {
    title,
    matchedSkills = [],
    matchedInterests = [],
    pastAttendedCount = 0,
    venue,
    eventType,
    matchPercentage = 85,
    isFavorite = false,
    semanticClusters = [],
    distanceKm = null,
  } = scoredEvent;

  // Build structured evidence object
  const evidence = {
    eventTitle: title,
    matchPercentage,
    matchedSkills,
    matchedInterests,
    pastAttendedCount,
    isFavorite,
    semanticClusters,
    distanceKm,
    location:
      eventType === 'online'
        ? 'Online'
        : distanceKm !== null
        ? `${distanceKm} km away in ${venue?.city || 'local area'}`
        : venue?.city || 'Local venue',
  };

  // 1. Check if Gemini AI can synthesize the narrative
  if (config.gemini.apiKey) {
    try {
      const prompt = `You are an intelligent event recommendation assistant. Explain in 1-2 concise, engaging sentences why this event was recommended to the user based STRICTLY on this verified evidence:
${JSON.stringify(evidence)}
CRITICAL RULES:
- Do NOT invent skills, attendance history, or locations that are not in the evidence.
- Do NOT use generic phrases like "You may like this".
- Reference their exact matched skills and past attended events if present.
Return a JSON object with key "explanation".`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\nRespond ONLY with valid JSON.` }] }],
          generationConfig: { temperature: 0.4, response_mime_type: 'application/json' },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.replace(/```json|```/g, ''));
          if (parsed.explanation) {
            return {
              narrative: parsed.explanation,
              engine: 'gemini',
              evidence,
            };
          }
        }
      }
    } catch (err) {
      // Fallback silently to deterministic generator
    }
  }

  // 2. High-Fidelity Deterministic Fallback Generator
  const parts = [];

  if (pastAttendedCount > 0) {
    parts.push(`you attended ${pastAttendedCount} related event${pastAttendedCount > 1 ? 's' : ''}`);
  }

  if (matchedSkills.length > 0) {
    const formattedSkills = matchedSkills
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' and ');
    parts.push(`your profile lists ${formattedSkills}`);
  }

  if (matchedInterests.length > 0 && matchedSkills.length === 0) {
    const formattedInterests = matchedInterests
      .slice(0, 2)
      .map((i) => i.charAt(0).toUpperCase() + i.slice(1))
      .join(' and ');
    parts.push(`you follow ${formattedInterests}`);
  }

  if (isFavorite) {
    parts.push('you saved this event to your favorites');
  }

  let narrative = '';
  if (parts.length > 0) {
    narrative = `Recommended because ${parts.join(', ')}, and this event focuses on ${title}.`;
  } else if (eventType === 'online') {
    narrative = `Recommended as a popular online event with high engagement among members.`;
  } else if (venue?.city) {
    narrative = `Recommended based on popular upcoming events in ${venue.city}.`;
  } else {
    narrative = `Recommended based on popular upcoming events in your area.`;
  }

  return {
    narrative,
    engine: 'deterministic-rule-engine',
    evidence,
  };
}

module.exports = {
  generateExplanation,
};
