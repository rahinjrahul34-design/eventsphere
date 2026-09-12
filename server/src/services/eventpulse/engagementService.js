/**
 * Engagement Intelligence Service
 * Computes 5-dimension engagement breakdown (Participation, Interaction, Live Activity, Feedback, Networking),
 * overall score, level, and trend smoothing.
 */

const config = require('./config');

function calculateEngagementScore(features, expectedAttendees) {
  const { event, registrations, engagement, timing } = features;
  const { totalConfirmed, capacityUtilization, currentCheckedIns } = registrations;
  const { pollVotes, questionsCount, questionUpvotes, chatMessages, feedbackCount, avgRating } = engagement;

  const attendeeBase = Math.max(1, event.isLive ? Math.max(currentCheckedIns, 1) : expectedAttendees);

  // 1. Participation Dimension (0-100)
  // Reflects capacity utilization and check-in rate
  const capScore = Math.min(100, Math.round(capacityUtilization * 90));
  const checkInScore = event.isLive || event.isCompleted
    ? Math.min(100, Math.round((currentCheckedIns / Math.max(1, totalConfirmed)) * 100))
    : capScore;
  const participation = Math.round(0.6 * capScore + 0.4 * checkInScore);

  // 2. Interaction Dimension (0-100)
  // Q&A questions asked and upvoted per attendee
  const questionsPerAttendee = questionsCount / attendeeBase;
  const upvotesPerAttendee = questionUpvotes / attendeeBase;
  const interactionRaw = Math.min(100, Math.round((questionsPerAttendee * 250) + (upvotesPerAttendee * 150)));
  const interaction = event.isLive || questionsCount > 0 ? Math.max(20, interactionRaw) : Math.min(65, capScore);

  // 3. Live Activity Dimension (0-100)
  // Polls cast + chat messages per attendee
  const pollsPerAttendee = pollVotes / attendeeBase;
  const messagesPerAttendee = chatMessages / attendeeBase;
  const liveActivityRaw = Math.min(100, Math.round((pollsPerAttendee * 120) + (messagesPerAttendee * 60)));
  const liveActivity = event.isLive || pollVotes > 0 || chatMessages > 0
    ? Math.max(25, liveActivityRaw)
    : Math.min(60, capScore * 0.8);

  // 4. Feedback Dimension (0-100)
  // Star rating (0-5 -> 0-100) and response volume
  const ratingNormalized = avgRating > 0 ? (avgRating / 5) * 100 : 75;
  const feedbackVolumeScore = Math.min(100, Math.round((feedbackCount / Math.max(1, attendeeBase * 0.3)) * 100));
  const feedback = feedbackCount > 0
    ? Math.round(0.7 * ratingNormalized + 0.3 * feedbackVolumeScore)
    : Math.round(ratingNormalized);

  // 5. Networking Dimension (0-100)
  // Based on participant density and event category
  const isNetworkingHeavy = ['business', 'technology', 'hackathons'].includes(event.categorySlug);
  const networking = Math.min(100, Math.round((isNetworkingHeavy ? 70 : 55) + Math.min(30, totalConfirmed * 0.1)));

  // Weighted Total
  const weights = config.ENGAGEMENT_WEIGHTS;
  const overallScore = Math.round(
    weights.participation * participation +
    weights.interaction * interaction +
    weights.liveActivity * liveActivity +
    weights.feedback * feedback +
    weights.networking * networking
  );

  const clampedScore = Math.max(10, Math.min(100, overallScore));

  let level = 'medium';
  if (clampedScore >= 80) level = 'very_high';
  else if (clampedScore >= 65) level = 'high';
  else if (clampedScore >= 45) level = 'medium';
  else level = 'low';

  // Trend detection based on recent interaction signals
  let trend = 'stable';
  if (event.isLive) {
    if (pollVotes > 10 || chatMessages > 25 || questionsCount > 5) {
      trend = 'rising';
    } else if (timing.daysRemaining <= 0 && pollVotes === 0 && chatMessages < 3) {
      trend = 'declining';
    }
  } else {
    if (registrations.velocity.last24h > registrations.velocity.prev24h && registrations.velocity.last24h >= 2) {
      trend = 'rising';
    } else if (registrations.velocity.growthRate < -0.2) {
      trend = 'declining';
    }
  }

  return {
    score: clampedScore,
    level,
    trend,
    breakdown: {
      participation,
      interaction,
      liveActivity,
      feedback,
      networking,
    },
  };
}

module.exports = {
  calculateEngagementScore,
};
