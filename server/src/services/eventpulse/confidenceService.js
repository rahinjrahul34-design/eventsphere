/**
 * Model Confidence Service
 * Evaluates signal completeness, sample size, and time proximity to calculate confidence.
 * Clearly documents that confidence indicates data completeness, not guaranteed certainty.
 */

const config = require('./config');

function calculatePredictionConfidence(features) {
  const { event, registrations, historical, timing } = features;
  const { totalConfirmed } = registrations;
  const { hasOrgHistory, historicalEventsCount } = historical;
  const { daysRemaining, daysSincePublication } = timing;

  const reasons = [];

  // 1. Proximity factor (30% weight)
  // Confidence is highest when event is close or live
  let proximityScore = 60;
  if (event.isLive || event.isCompleted) {
    proximityScore = 100;
    reasons.push('Event is live/completed with real-time check-in signals active.');
  } else if (daysRemaining <= 3) {
    proximityScore = 90;
    reasons.push('Event starts within 72 hours; registration trends have stabilized.');
  } else if (daysRemaining <= 14) {
    proximityScore = 75;
    reasons.push('Mid-cycle campaign with moderate time-to-event window.');
  } else {
    proximityScore = 50;
    reasons.push('Early pre-event cycle; long-range forecasts have wider natural variance.');
  }

  // 2. Historical Sample Size factor (30% weight)
  let historyScore = 40;
  if (hasOrgHistory && historicalEventsCount >= 4) {
    historyScore = 95;
    reasons.push(`Organizer has strong historical benchmark data across ${historicalEventsCount} completed events.`);
  } else if (hasOrgHistory && historicalEventsCount >= 1) {
    historyScore = 70;
    reasons.push('Moderate organizer historical baseline available.');
  } else {
    historyScore = 35;
    reasons.push('Cold start: Limited organizer history; relying on category baseline models.');
  }

  // 3. Volume factor (25% weight)
  let volumeScore = 40;
  if (totalConfirmed >= 100) {
    volumeScore = 95;
    reasons.push('High registration volume provides strong statistical significance.');
  } else if (totalConfirmed >= 30) {
    volumeScore = 75;
    reasons.push('Moderate registration sample size observed.');
  } else if (totalConfirmed >= 5) {
    volumeScore = 55;
  } else {
    volumeScore = 30;
    reasons.push('Low initial registrations; statistical sample is emerging.');
  }

  // 4. Signal Completeness (15% weight)
  let completenessScore = 60;
  if (event.ticketTypesCount > 0 && event.views > 10) completenessScore += 25;
  if (features.engagement.chatMessages > 0 || features.engagement.pollVotes > 0) completenessScore += 15;
  completenessScore = Math.min(100, completenessScore);

  // Combine weighted scores
  const w = config.CONFIDENCE_WEIGHTS;
  const total = Math.round(
    w.proximity * proximityScore +
    w.history * historyScore +
    w.volume * volumeScore +
    w.completeness * completenessScore
  );

  const score = Math.max(25, Math.min(96, total));

  let level = 'medium';
  if (score >= 75) level = 'high';
  else if (score >= 50) level = 'medium';
  else level = 'low';

  return {
    score,
    level,
    reasons,
    disclaimer: 'Confidence indicates data sufficiency and signal stability, not statistical certainty.',
  };
}

module.exports = {
  calculatePredictionConfidence,
};
