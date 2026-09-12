/**
 * AI Narrative & Natural Language Explanation Service
 * Uses Google Gemini when configured; falls back gracefully to deterministic rule-engine
 * narrative generation. Also powers the EventPulse Natural Language Query endpoint.
 */

const config = require('../../config');

function generateDeterministicSummary(prediction, features) {
  const { event, timing, registrations } = features;
  const { forecast, attendance, engagement, health, drivers } = prediction;

  let narrative = `EventPulse AI analysis indicates that "${event.title}" is tracking with a ${health.status.toUpperCase()} event health score of ${health.score}/100. `;

  if (forecast.momentumState === 'accelerating' || forecast.momentumState === 'growing') {
    narrative += `Registration velocity is expanding favorably with ${forecast.velocity24h} new registrations in the last 24 hours (${forecast.growthRate > 0 ? '+' : ''}${Math.round(forecast.growthRate * 100)}% day-over-day). `;
  } else if (forecast.momentumState === 'slowing' || forecast.momentumState === 'declining') {
    narrative += `Registration pace has softened recently; however, current momentum still supports an estimated final turnout of ${attendance.expectedAttendees} attendees (${attendance.attendanceRate}% of registered pool). `;
  } else {
    narrative += `Registration intake is stable, on track to reach an expected ${forecast.predictedRegistrations} total registrations. `;
  }

  narrative += `Estimated attendance is projected at ${attendance.expectedAttendees} attendees (likely range: ${attendance.lowerBound}–${attendance.upperBound}), with approximately ${attendance.expectedNoShows} anticipated no-shows (${attendance.noShowRate}% no-show probability). `;

  narrative += `Overall audience engagement is projected at ${engagement.score}/100 (${engagement.level.replace('_', ' ').toUpperCase()}).`;

  return narrative;
}

async function callGeminiForNarrative(prediction, features) {
  if (!config.gemini?.apiKey) return null;

  try {
    const prompt = `You are EventPulse AI, a predictive event engagement and attendance intelligence analyst.
Analyze the following verified deterministic prediction metrics for event "${features.event.title}":
- Current Registrations: ${features.registrations.totalConfirmed} / ${features.event.capacity}
- Predicted Registrations: ${prediction.forecast.predictedRegistrations}
- Velocity (Last 24h): +${prediction.forecast.velocity24h} (Momentum: ${prediction.forecast.momentumState})
- Expected Attendance: ${prediction.attendance.expectedAttendees} (${prediction.attendance.attendanceRate}%)
- Expected No-Shows: ${prediction.attendance.expectedNoShows} (${prediction.attendance.noShowRate}%)
- Prediction Range: ${prediction.attendance.lowerBound} - ${prediction.attendance.upperBound}
- Engagement Score: ${prediction.engagement.score}/100 (${prediction.engagement.level})
- Event Health Score: ${prediction.health.score}/100 (${prediction.health.status})
- Model Confidence: ${prediction.confidence.score}% (${prediction.confidence.level})
- Key Drivers: ${JSON.stringify(prediction.drivers.map((d) => `${d.factor}: ${d.impact}`))}

Write a crisp, professional 2-paragraph executive summary explaining the prediction, key momentum drivers, and expectations.
CRITICAL RULES:
- Use only the provided numbers. NEVER alter or hallucinate attendee numbers, rates, or dates.
- Use probabilistic terms like "estimated", "projected", "expected". Never state predictions as guarantees.
- Output ONLY valid JSON: {"summary": "your text here"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, response_mime_type: 'application/json' },
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text.replace(/```json|```/g, ''));
    return parsed?.summary || null;
  } catch (e) {
    console.warn('EventPulse Gemini summary failed, falling back to deterministic synthesis:', e.message);
    return null;
  }
}

async function answerNaturalLanguageQuery(query, prediction, features) {
  const q = String(query || '').toLowerCase().trim();
  const { forecast, attendance, engagement, health, drivers, recommendations } = prediction;

  // 1. Action / Optimization intent
  if (q.includes('what can i do') || q.includes('action') || q.includes('improve') || q.includes('recommendation') || q.includes('suggest')) {
    const topActions = recommendations.slice(0, 3).map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title}: ${a.action} (${a.rationale})`);
    return {
      answer: `Based on current signals, top recommended organizer actions are:\n${topActions.join('\n')}`,
      confidence: prediction.confidence.score,
      recommendations: recommendations.slice(0, 3),
    };
  }

  // 2. Reason / Driver intent
  if (q.includes('why') || q.includes('reason') || q.includes('falling') || q.includes('rising') || q.includes('driver')) {
    const topPositive = drivers.filter((d) => d.direction === 'positive').map((d) => `• ${d.factor}: ${d.impact}`);
    const topNegative = drivers.filter((d) => d.direction === 'negative').map((d) => `• ${d.factor}: ${d.impact}`);

    let text = `The prediction is driven by several verified signals:\n`;
    if (topPositive.length > 0) text += `Strengths:\n${topPositive.join('\n')}\n`;
    if (topNegative.length > 0) text += `Risk Factors:\n${topNegative.join('\n')}\n`;
    return {
      answer: text.trim(),
      confidence: prediction.confidence.score,
      keyDrivers: drivers.map((d) => d.factor),
    };
  }

  // 3. Quantitative prediction inquiry
  if (q.includes('how many') || q.includes('attendance') || q.includes('attendees') || q.includes('turnout')) {
    return {
      answer: `Current prediction is ${attendance.expectedAttendees} attendees, with an estimated attendance rate of ${attendance.attendanceRate}% (likely range: ${attendance.lowerBound} to ${attendance.upperBound} attendees). Approximately ${attendance.expectedNoShows} no-shows are expected (${attendance.noShowRate}%).`,
      confidence: prediction.confidence.score,
      keyDrivers: drivers.map((d) => d.impact),
    };
  }

  // Fallback query response
  return {
    answer: `EventPulse AI is projecting ${attendance.expectedAttendees} attendees (range: ${attendance.lowerBound}–${attendance.upperBound}) and an engagement score of ${engagement.score}/100 (${engagement.level.toUpperCase()}). Overall Event Health is currently ${health.score}/100 (${health.status.toUpperCase()}).`,
    confidence: prediction.confidence.score,
  };
}

module.exports = {
  generateDeterministicSummary,
  callGeminiForNarrative,
  answerNaturalLanguageQuery,
};
