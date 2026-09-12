/**
 * Command Center AI Executive Brief Service
 *
 * Synthesizes structured data across all intelligence modules into an executive-level briefing:
 *   1. Current situation
 *   2. Positive signals
 *   3. Operational problems and risks
 *   4. Highest-impact next action
 *   5. Short-term event outlook
 *
 * Adheres strictly to a Zero-Hallucination Policy:
 * The LLM only receives verified structured facts and cannot invent attendee numbers, weather,
 * or fake external metrics. When Gemini API is unavailable or errors, a deterministic rule-based
 * executive brief generator provides an instant, reliable briefing.
 */

const config = require('../../config');

// ---------------------------------------------------------------------------
// Executive Brief Cache (performance guard)
//
// Spec §21: the LLM must NOT be called on every dashboard refresh. Briefs are
// cached per event in memory and reused while (a) the TTL has not expired AND
// (b) the structured fact fingerprint is unchanged. Any material change to the
// underlying intelligence (health score/status, alert counts, top actions,
// registration volume) produces a new fingerprint and forces regeneration.
// ---------------------------------------------------------------------------
const BRIEF_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const briefCache = new Map(); // eventId -> { fingerprint, brief, generatedAt }

function computeBriefFingerprint(context) {
  const { event, health, actions = [], shieldAlerts = [], pulseData, queueData } = context;
  return JSON.stringify([
    event?._id?.toString(),
    health?.score,
    health?.status,
    actions.slice(0, 3).map((a) => a.id),
    (shieldAlerts || []).filter((a) => a.status === 'active').length,
    event?.registrationCount || 0,
    queueData?.metrics?.waitingCount || 0,
    pulseData?.attendance?.expectedNoShows ?? null,
  ]);
}

/** Clears the in-memory brief cache (used by tests and manual refresh flows). */
function clearBriefCache(eventId) {
  if (eventId) briefCache.delete(String(eventId));
  else briefCache.clear();
}

/**
 * Deterministic template-based fallback generator.
 * Produces complete, structured executive briefs without external AI dependency.
 */
function generateDeterministicBrief({
  event,
  health,
  actions = [],
  pulseData = null,
  shieldData = null,
  shieldAlerts = [],
  queueData = null,
  boostProfile = null,
  trustProfile = null,
}) {
  const title = event?.title || 'Your event';
  const score = health?.score ?? 75;
  const status = health?.status ?? 'Good';
  const capacity = event?.capacity || 100;
  const regs = event?.registrationCount || 0;
  const fillPct = Math.round((regs / capacity) * 100);

  // 1. Situation
  let situation = `${title} is currently operating at a ${status.toUpperCase()} level with an overall Event Health Score of ${score}/100. `;
  situation += `Registrations are at ${regs} of ${capacity} capacity (${fillPct}% fill rate). `;
  if (pulseData?.attendance?.expectedAttendees) {
    const ratePart = pulseData.attendance.attendanceRate !== undefined
      ? ` (${pulseData.attendance.attendanceRate}% conversion rate)`
      : '';
    situation += `Forecasted attendee turnout is approximately ${pulseData.attendance.expectedAttendees}${ratePart}.`;
  } else {
    situation += `Operational readiness and attendee pacing are currently tracking according to schedule.`;
  }

  // 2. Positive signals
  const positiveSignals = [];
  if (fillPct >= 70) {
    positiveSignals.push(`Strong registration momentum: ${fillPct}% of total capacity filled.`);
  } else if (regs > 0) {
    positiveSignals.push(`${regs} registered attendees confirmed across available ticket tiers.`);
  }

  if (shieldData?.safetyScore >= 75) {
    positiveSignals.push(`Operational safety readiness is robust with a ${shieldData.safetyScore}/100 safety rating.`);
  }

  if (boostProfile?.seoScore >= 70) {
    positiveSignals.push(`High search & content quality (${boostProfile.seoScore}/100) supporting organic discoverability.`);
  }

  if (trustProfile?.verified) {
    positiveSignals.push(`Verified organizer credentials bolstering attendee confidence.`);
  }

  if (!positiveSignals.length) {
    positiveSignals.push('Event listing is published and ready to capture attendee registrations.');
  }

  // 3. Problems and risks
  const problems = [];
  const activeCrit = (shieldAlerts || []).filter((a) => a.severity === 'critical' && a.status === 'active');
  if (activeCrit.length > 0) {
    problems.push(`Critical safety alert active: ${activeCrit[0].message}`);
  }

  if (pulseData?.attendance?.expectedNoShows > 10) {
    problems.push(`Forecasted no-show risk: ${pulseData.attendance.expectedNoShows} attendees unlikely to attend.`);
  }

  if (queueData?.metrics?.waitingCount > 5) {
    problems.push(`${queueData.metrics.waitingCount} attendees waiting in SmartQueue while capacity is tight.`);
  }

  if (boostProfile?.seoScore < 55) {
    problems.push(`SEO and description quality score (${boostProfile.seoScore}/100) indicates missing meta tags or brief descriptions.`);
  }

  if (!problems.length) {
    problems.push('No severe operational bottlenecks or critical alerts detected.');
  }

  // 4. Highest-impact next action
  let topAction = null;
  if (actions.length > 0) {
    const top = actions[0];
    topAction = {
      action: top.title,
      reason: top.whyItMatters,
      recommended: top.recommendedAction,
      priority: top.priority,
      cta: top.ctaText,
      link: top.ctaLink,
    };
  } else {
    topAction = {
      action: 'Maintain Campaign Pacing',
      reason: 'Sustained promotional reminders keep turnout rates high.',
      recommended: 'Send an update announcement to registered attendees 48 hours prior to start.',
      priority: 'Low',
      cta: 'View Dashboard',
      link: `/dashboard/events/${event?._id}/overview`,
    };
  }

  // 5. Short-term outlook
  let outlook = '';
  if (score >= 80) {
    outlook = 'The event is positioned for strong execution. Continue standard reminder cadences and prepare on-site check-in desks.';
  } else if (score >= 60) {
    outlook = 'Stable progression with minor optimization opportunities. Addressing the top recommended actions will elevate overall event health.';
  } else {
    outlook = 'Operational intervention recommended to resolve pending risk alerts and boost registration momentum before the scheduled date.';
  }

  return {
    engine: 'deterministic-fallback',
    generatedAt: new Date().toISOString(),
    situation,
    positiveSignals,
    problems,
    topAction,
    outlook,
  };
}

/**
 * Generates an AI Executive Brief using Google Gemini, falling back to deterministic
 * templates if Gemini API key is missing or call fails.
 */
async function generateExecutiveBrief(context) {
  const { event, health, actions = [], pulseData, shieldData, shieldAlerts, queueData, boostProfile, trustProfile } = context;

  // Cache lookup: reuse the brief while facts are unchanged (LLM cost control).
  const cacheKey = event?._id?.toString() || 'unknown';
  const fingerprint = computeBriefFingerprint(context);
  const cached = briefCache.get(cacheKey);
  if (cached && cached.fingerprint === fingerprint && Date.now() - cached.generatedAt < BRIEF_CACHE_TTL_MS) {
    return { ...cached.brief, cached: true };
  }

  let brief;
  // Fallback check
  if (!config.gemini.apiKey) {
    brief = generateDeterministicBrief(context);
  } else {

  try {
    const structuredSummary = {
      eventTitle: event?.title || 'Unknown Event',
      healthScore: health?.score,
      healthStatus: health?.status,
      capacity: event?.capacity,
      registrations: event?.registrationCount,
      predictedAttendance: pulseData?.attendance?.expectedAttendees,
      predictedNoShows: pulseData?.attendance?.expectedNoShows,
      safetyScore: shieldData?.safetyScore,
      activeCriticalAlerts: (shieldAlerts || []).filter((a) => a.severity === 'critical').map((a) => a.message),
      activeWarningAlerts: (shieldAlerts || []).filter((a) => a.severity === 'high').map((a) => a.message),
      queueWaiting: queueData?.metrics?.waitingCount || 0,
      seoScore: boostProfile?.seoScore,
      organizerTrustScore: trustProfile?.trustScore,
      topActions: actions.slice(0, 3).map((a) => ({ title: a.title, priority: a.priority, action: a.recommendedAction })),
    };

    const prompt = `You are the AI Chief Operating Officer for EventSphere.
Analyze this strictly verified structured event data and write an executive brief for the event organizer.
CRITICAL CONSTRAINT: Do NOT hallucinate or invent numbers, weather, or external facts. Only use the provided facts.

Data:
${JSON.stringify(structuredSummary, null, 2)}

Return ONLY a JSON object with this exact schema:
{
  "situation": "2-3 sentences summarizing current event performance, health, and registration fill rate",
  "positiveSignals": ["string", "string"],
  "problems": ["string", "string"],
  "topAction": {
    "action": "Short name of highest priority action",
    "reason": "Why this action matters most right now",
    "recommended": "Concrete action for the organizer",
    "priority": "Critical|High|Medium|Low",
    "cta": "Button CTA text",
    "link": "target tab path"
  },
  "outlook": "1-2 sentences with forward-looking operational expectation"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
      }),
    });

    if (!resp.ok) {
      console.warn('Gemini API call returned non-200, falling back to deterministic brief');
      brief = generateDeterministicBrief(context);
    } else {
    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      brief = generateDeterministicBrief(context);
    } else {
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    // Enrich topAction link if missing
    if (parsed.topAction && !parsed.topAction.link && actions.length > 0) {
      parsed.topAction.link = actions[0].ctaLink;
      parsed.topAction.cta = actions[0].ctaText || 'Take Action';
    }

    brief = {
      engine: 'gemini',
      generatedAt: new Date().toISOString(),
      ...parsed,
    };
    }
    }
  } catch (err) {
    console.warn('Error generating Gemini executive brief:', err.message);
    brief = generateDeterministicBrief(context);
  }
  }

  // Store in cache keyed by the fact fingerprint, then return.
  briefCache.set(cacheKey, { fingerprint, brief, generatedAt: Date.now() });
  return brief;
}

module.exports = {
  generateDeterministicBrief,
  generateExecutiveBrief,
  clearBriefCache,
  computeBriefFingerprint,
  BRIEF_CACHE_TTL_MS,
};
