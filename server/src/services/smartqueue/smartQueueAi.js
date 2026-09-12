const config = require('../../config');

/**
 * Generates rule-based deterministic operational insights from queue metrics.
 */
function generateDeterministicInsights(metricsData) {
  const { metrics, capacity, registrationCount, activeHoldsCount } = metricsData;
  const { totalHoldsCreated, acceptedCount, expiredCount, declinedCount, acceptanceRate, expirationRate, avgClaimTimeSeconds } = metrics;

  const recommendations = [];
  const insights = [];

  // Optimal hold duration recommendation
  let suggestedHoldMinutes = 15;
  if (avgClaimTimeSeconds > 0 && avgClaimTimeSeconds < 180) {
    // Attendees claim very quickly (< 3 mins)
    suggestedHoldMinutes = 10;
    recommendations.push({
      type: 'timing',
      title: 'Shorten hold duration to 10 minutes',
      description: `Attendees claim seats within ${Math.round(avgClaimTimeSeconds / 60)} minutes on average. Shortening the window speeds up turnover without sacrificing claims.`,
    });
  } else if (expirationRate > 40 && totalHoldsCreated >= 3) {
    suggestedHoldMinutes = 25;
    recommendations.push({
      type: 'retention',
      title: 'Extend hold duration to 25 minutes',
      description: `High expiration rate (${expirationRate}%) indicates users may need slightly more time to view notifications and complete checkout.`,
    });
  } else {
    recommendations.push({
      type: 'timing',
      title: 'Current 15-minute hold window is optimal',
      description: 'Balanced trade-off between attendee responsiveness and inventory velocity.',
    });
  }

  // Churn risk level
  let churnRiskLevel = 'LOW';
  if (expirationRate > 45 || (metrics.waitingCount === 0 && activeHoldsCount === 0 && registrationCount < capacity)) {
    churnRiskLevel = 'HIGH';
  } else if (expirationRate > 25 || declinedCount > 2) {
    churnRiskLevel = 'MEDIUM';
  }

  // Notifications and engagement recommendations
  if (metrics.waitingCount > 10) {
    recommendations.push({
      type: 'capacity',
      title: 'Consider expanding venue or livestreaming capacity',
      description: `You have ${metrics.waitingCount} qualified attendees waiting. Adding 10–20% capacity or offering hybrid access could recapture this demand.`,
    });
  }

  recommendations.push({
    type: 'communication',
    title: 'Enable multi-channel T-5m reminder alerts',
    description: 'Ensure automated SMS and push notifications trigger 5 minutes before hold expiration.',
  });

  // Insights
  insights.push({
    metric: 'Claim Conversion',
    value: `${acceptanceRate}%`,
    assessment: acceptanceRate >= 65 ? 'High Conversion' : acceptanceRate >= 40 ? 'Moderate' : 'Underperforming',
  });

  insights.push({
    metric: 'Average Time to Claim',
    value: metrics.avgClaimTimeFormatted,
    assessment: avgClaimTimeSeconds <= 300 ? 'Rapid Response' : 'Standard Response',
  });

  insights.push({
    metric: 'Queue Churn Rate',
    value: `${expirationRate + metrics.declineRate}%`,
    assessment: expirationRate <= 25 ? 'Healthy Retention' : 'Elevated Expiry',
  });

  let summary = `SmartQueue operational analytics show a ${acceptanceRate}% claim conversion rate with an average response time of ${metrics.avgClaimTimeFormatted}. `;
  if (churnRiskLevel === 'HIGH') {
    summary += `High expiration churn (${expirationRate}%) is detected. Recommended adjustment: increase hold duration to ${suggestedHoldMinutes} minutes and verify reminder delivery.`;
  } else {
    summary += `Queue circulation is healthy with an overall Queue Efficiency Score of ${metrics.efficiencyScore}/100.`;
  }

  return {
    summary,
    suggestedHoldMinutes,
    churnRiskLevel,
    recommendations,
    insights,
  };
}

/**
 * Uses Gemini AI to produce an executive operational narrative if API key configured.
 */
async function getOperationalInsights(metricsData) {
  const baseInsights = generateDeterministicInsights(metricsData);

  if (!config.gemini?.apiKey) {
    return baseInsights;
  }

  try {
    const { metrics, capacity, registrationCount, activeHoldsCount } = metricsData;
    const prompt = `You are SmartQueue AI, an enterprise ticket inventory and queue optimization intelligence analyst.
Analyze the following real-time waitlist and seat-hold performance metrics:
- Event Capacity: ${capacity}
- Confirmed Registrations: ${registrationCount}
- Active Holds: ${activeHoldsCount}
- Total Waitlist Depth: ${metrics.totalWaitlist}
- Total Holds Created: ${metrics.totalHoldsCreated}
- Holds Accepted: ${metrics.acceptedCount} (${metrics.acceptanceRate}%)
- Holds Expired: ${metrics.expiredCount} (${metrics.expirationRate}%)
- Holds Declined: ${metrics.declinedCount} (${metrics.declineRate}%)
- Average Claim Time: ${metrics.avgClaimTimeFormatted}
- Queue Efficiency Score: ${metrics.efficiencyScore}/100

Provide a concise, 2-paragraph operational analysis highlighting:
1. Inventory turnover velocity and attendee responsiveness.
2. Concrete queue optimization actions for the event organizer.
CRITICAL: Use ONLY the provided numbers. Do NOT hallucinate stats.
Output strictly valid JSON with key "summary".
Example: {"summary": "..."}`;

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
    // Graceful fallback to deterministic analysis
    console.warn('SmartQueue Gemini operational analysis fallback:', err.message);
  }

  return baseInsights;
}

module.exports = {
  getOperationalInsights,
  generateDeterministicInsights,
};
