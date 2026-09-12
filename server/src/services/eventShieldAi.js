/**
 * EventShield AI - Contextual AI Reasoning Layer
 * Integrates Google Gemini when configured; falls back gracefully
 * to deterministic natural language synthesis so system is 100% resilient offline.
 */

const config = require('../config');

/**
 * Deterministic fallback narrative generator
 */
function generateDeterministicNarrative(assessment, event) {
  const { safetyScore, readinessScore, overallRiskLevel, topRisks, categories } = assessment;

  const statusMap = {
    low: 'in a robust, low-risk operational posture',
    medium: 'at moderate risk with manageable logistical adjustments required',
    high: 'under elevated operational risk requiring immediate organizer intervention',
    critical: 'at critical risk status; key life-safety or venue capacity limits are currently breached',
  };

  const riskIntro = statusMap[overallRiskLevel] || 'under ongoing risk evaluation';

  let narrative = `EventShield AI assessed "${event.title || 'the event'}" and determined it is currently ${riskIntro} (Safety Score: ${safetyScore}/100, Operational Readiness: ${readinessScore}%).\n\n`;

  if (topRisks && topRisks.length > 0) {
    narrative += `Key areas requiring attention include:\n`;
    topRisks.forEach((risk, i) => {
      narrative += `${i + 1}. [${risk.severity.toUpperCase()}] ${risk.title} — ${risk.recommendation}\n`;
    });
    narrative += '\n';
  } else {
    narrative += 'All monitored safety categories meet or exceed recommended operational thresholds.\n\n';
  }

  // Highlight standout strengths
  const strongCats = categories?.filter((c) => c.score >= 90) || [];
  if (strongCats.length > 0) {
    narrative += `Operational strengths: ${strongCats.slice(0, 3).map((c) => c.name).join(', ')} are configured with high confidence.`;
  }

  return narrative.trim();
}

/**
 * Call Gemini API with structured safety prompt
 */
async function callGeminiForSafety(assessment, event) {
  if (!config.gemini?.apiKey) return null;

  try {
    const prompt = `You are EventShield AI, a premier event safety, crowd operations, and risk intelligence analyst.
Review this deterministic risk assessment data for event "${event.title}":
- Safety Score: ${assessment.safetyScore}/100
- Operational Readiness: ${assessment.readinessScore}%
- Risk Level: ${assessment.overallRiskLevel}
- Top Risks: ${JSON.stringify(assessment.topRisks)}
- Key Metrics: ${JSON.stringify(assessment.metricsSnapshot)}

Generate a professional, actionable 3-paragraph executive summary explaining:
1. Overall safety status and major vulnerability drivers.
2. Direct operational implications for attendees, staff, and venue.
3. Top prioritized actions the organizer must take before opening doors.

Respond ONLY with valid JSON:
{"summary": "your concise 2-3 paragraph executive summary here"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, response_mime_type: 'application/json' },
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text.replace(/```json|```/g, ''));
    return parsed?.summary || null;
  } catch (err) {
    console.warn('EventShield Gemini synthesis failed, falling back to deterministic narrative:', err.message);
    return null;
  }
}

/**
 * Enhance deterministic assessment with AI reasoning
 */
async function enrichAssessmentWithAi(assessment, event) {
  const aiSummary = await callGeminiForSafety(assessment, event);

  if (aiSummary) {
    return {
      ...assessment,
      summary: aiSummary,
      engine: 'hybrid-gemini',
    };
  }

  return {
    ...assessment,
    summary: generateDeterministicNarrative(assessment, event),
    engine: 'hybrid-deterministic',
  };
}

module.exports = {
  enrichAssessmentWithAi,
  generateDeterministicNarrative,
};
