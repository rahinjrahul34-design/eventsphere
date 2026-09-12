/**
 * Event Health Score Service
 * Calculates the overall commercial, operational, and engagement health score (0-100)
 * distinct from EventShield's physical/crowd safety score.
 */

const config = require('./config');

function calculateEventHealth(features, velocityData, attendanceData, engagementData) {
  const { registrations, engagement, event } = features;
  const { capacityUtilization } = registrations;

  // 1. Velocity Health Sub-score (0-100)
  let velocityScore = 70; // baseline
  if (velocityData.momentumState === 'accelerating') velocityScore = 95;
  else if (velocityData.momentumState === 'growing') velocityScore = 85;
  else if (velocityData.momentumState === 'stable') velocityScore = 75;
  else if (velocityData.momentumState === 'slowing') velocityScore = 55;
  else if (velocityData.momentumState === 'declining') velocityScore = 35;

  // 2. Capacity Health Sub-score (0-100)
  // Ideal range is 70% to 100% capacity fill
  let capacityScore = Math.min(100, Math.round(capacityUtilization * 100));
  if (capacityUtilization > 1.0) capacityScore = 95; // waitlisted is healthy

  // 3. Attendance Commitment Sub-score (0-100)
  // Reflects the predicted attendance rate
  const attendanceScore = Math.round(attendanceData.attendanceRate);

  // 4. Engagement Health Sub-score (0-100)
  const engagementScore = engagementData.score;

  // 5. Sentiment Sub-score (0-100)
  let sentimentScore = 75;
  if (engagement.feedbackCount > 0) {
    const positiveRatio = engagement.positiveFeedbacks / engagement.feedbackCount;
    sentimentScore = Math.round(positiveRatio * 100);
  }

  // Weighted combination
  const w = config.HEALTH_WEIGHTS;
  const total = Math.round(
    w.velocity * velocityScore +
    w.capacity * capacityScore +
    w.attendance * attendanceScore +
    w.engagement * engagementScore +
    w.sentiment * sentimentScore
  );

  const clampedScore = Math.max(10, Math.min(100, total));

  let status = 'healthy';
  if (clampedScore >= 80) status = 'healthy';
  else if (clampedScore >= 65) status = 'good';
  else if (clampedScore >= 45) status = 'attention';
  else status = 'at_risk';

  return {
    score: clampedScore,
    status,
    breakdown: {
      velocity: velocityScore,
      capacity: capacityScore,
      attendance: attendanceScore,
      engagement: engagementScore,
      sentiment: sentimentScore,
    },
  };
}

module.exports = {
  calculateEventHealth,
};
