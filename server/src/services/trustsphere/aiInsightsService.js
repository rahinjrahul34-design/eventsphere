const config = require('../../config');

/**
 * Generates rule-based deterministic operational explanations from verified trust metrics.
 */
function generateDeterministicInsights(scoringResult) {
  const { trustScore, trustLevel, confidenceLevel, metrics, components, factors, verified } = scoringResult;
  const { completedEvents, completionRate, attendeesServed, satisfactionPercentage, averageRating, attendanceRate, confirmedViolationsCount } = metrics;

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  // Strengths
  if (verified) {
    strengths.push('Officially verified EventSphere organizer profile');
  }
  if (completionRate >= 95 && completedEvents > 0) {
    strengths.push(`Flawless ${completionRate}% event completion rate`);
  }
  if (satisfactionPercentage >= 85) {
    strengths.push(`High attendee satisfaction (${satisfactionPercentage}% satisfied, ${averageRating}★ average)`);
  }
  if (attendanceRate !== null && attendanceRate >= 80) {
    strengths.push(`Strong registration fulfillment (${attendanceRate}% check-in rate)`);
  }
  if (confirmedViolationsCount === 0) {
    strengths.push('Clean platform compliance record with zero confirmed policy violations');
  }
  if (completedEvents >= 5) {
    strengths.push(`Proven host experience with ${completedEvents} completed events and ${attendeesServed} attendees served`);
  }

  // Weaknesses
  if (confidenceLevel === 'limited') {
    weaknesses.push('Limited event history on EventSphere; confidence will grow as more events conclude');
  }
  if (metrics.cancellationRate > 10) {
    weaknesses.push(`Cancellation rate is ${metrics.cancellationRate}%, which dampens reliability scoring`);
  }
  if (attendanceRate !== null && attendanceRate < 70) {
    weaknesses.push(`Check-in fulfillment (${attendanceRate}%) is below platform average`);
  }
  if (metrics.totalFeedbackCount > 0 && satisfactionPercentage < 75) {
    weaknesses.push(`Attendee feedback satisfaction (${satisfactionPercentage}%) has room for improvement`);
  }
  if (confirmedViolationsCount > 0) {
    weaknesses.push(`${confirmedViolationsCount} confirmed moderation violation(s) impacting compliance score`);
  }

  // Actionable recommendations
  if (confidenceLevel === 'limited') {
    recommendations.push({
      title: 'Complete your first 3 approved events',
      description: 'Completing initial events successfully establishes a permanent, high-confidence trust track record.',
      impact: 'high',
    });
  }

  if (metrics.cancellationRate > 0) {
    recommendations.push({
      title: 'Minimize late event cancellations',
      description: 'Maintaining a 95%+ completion rate is the fastest way to boost your reliability component to 100.',
      impact: 'high',
    });
  }

  if (attendanceRate !== null && attendanceRate < 80) {
    recommendations.push({
      title: 'Drive higher check-in fulfillment with automated reminders',
      description: 'Send multi-channel reminders 24 hours and 2 hours prior to the event to reduce attendee no-shows.',
      impact: 'medium',
    });
  }

  if (metrics.totalFeedbackCount < 5 && completedEvents > 0) {
    recommendations.push({
      title: 'Encourage post-event feedback collection',
      description: 'Verified reviews trigger Bayesian credibility smoothing, unlocking the Top Rated trust badge.',
      impact: 'medium',
    });
  }

  if (!verified) {
    recommendations.push({
      title: 'Complete organizer verification',
      description: 'Submit your organizer credentials for admin approval to instantly gain +75 points in verification status.',
      impact: 'high',
    });
  }

  // Executive narrative summary
  let summary = '';
  if (confidenceLevel === 'limited') {
    summary = `This organizer is actively building their reputation on EventSphere with ${completedEvents} completed event(s) and ${attendeesServed} attendee(s) served. Trust score will dynamically mature as more verified events conclude.`;
  } else if (trustScore >= 85) {
    summary = `Highly dependable organizer with an exceptional ${completionRate}% completion rate and ${satisfactionPercentage}% attendee satisfaction across ${completedEvents} events. Maintains full platform compliance and verified host credentials.`;
  } else if (trustScore >= 70) {
    summary = `Reliable event organizer with good platform standing and ${attendeesServed} attendees served. Opportunities exist to strengthen the score by increasing registration check-in rates and gathering more post-event reviews.`;
  } else {
    summary = `Organizer reputation profile shows opportunities to improve event completion reliability and attendee satisfaction. Addressing cancellations and maintaining consistent delivery will elevate the trust grade.`;
  }

  return {
    summary,
    strengths,
    weaknesses,
    recommendations,
  };
}

/**
 * Uses Gemini AI to enhance operational trust narrative if API key is configured.
 */
async function getAiTrustInsights(scoringResult) {
  const baseInsights = generateDeterministicInsights(scoringResult);

  if (!config.gemini?.apiKey) {
    return baseInsights;
  }

  try {
    const { trustScore, trustLevel, confidenceLevel, metrics, components } = scoringResult;
    const prompt = `You are TrustSphere AI, an enterprise marketplace reputation and trust analyst for the EventSphere platform.
Analyze the following verified platform behavior metrics for an event organizer:
- Trust Score: ${trustScore}/100 (${trustLevel.replace('_', ' ').toUpperCase()})
- Confidence Level: ${confidenceLevel.toUpperCase()}
- Completed Events: ${metrics.completedEvents}
- Completion Rate: ${metrics.completionRate}%
- Cancellation Rate: ${metrics.cancellationRate}%
- Attendees Served: ${metrics.attendeesServed}
- Attendance Fulfillment: ${metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : 'No data yet'}
- Attendee Satisfaction: ${metrics.satisfactionPercentage}% (${metrics.averageRating}/5 from ${metrics.totalFeedbackCount} reviews)
- Confirmed Violations: ${metrics.confirmedViolationsCount}
- Verified Status: ${scoringResult.verified ? 'Verified' : 'Unverified'}

Write a professional, concise 2-paragraph executive reputation narrative explaining:
1. The primary drivers that determine this organizer's trust score.
2. Constructive operational advice on how to maintain or improve attendee confidence.

CRITICAL RULES:
- Use ONLY the provided numbers. Never fabricate or hallucinate metrics.
- Output ONLY valid JSON: {"summary": "your text here"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.summary) {
          baseInsights.summary = parsed.summary;
        }
      }
    }
  } catch (err) {
    console.warn('TrustSphere Gemini narrative fallback:', err.message);
  }

  return baseInsights;
}

module.exports = {
  getAiTrustInsights,
  generateDeterministicInsights,
};
