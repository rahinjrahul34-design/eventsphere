/**
 * Organizer Action Center Service
 * Generates prioritized, signal-tied recommendations for the event organizer.
 */

function generateOrganizerRecommendations(features, velocityData, attendanceData, engagementData) {
  const { event, timing, registrations } = features;
  const actions = [];

  // 1. If velocity is slowing down before event start
  if (
    (velocityData.momentumState === 'slowing' || velocityData.momentumState === 'declining') &&
    timing.daysRemaining > 1 &&
    registrations.capacityUtilization < 0.9
  ) {
    actions.push({
      id: 'act-promo-push',
      priority: 'high',
      title: 'Boost Promotional Momentum',
      action: 'Share event link or highlight keynote speakers across social channels.',
      rationale: `Registration growth dropped ${Math.abs(velocityData.growthRatePct)}% in the last 24h. An email or social campaign will rekindle interest.`,
      trigger: 'velocity_slowdown',
    });
  }

  // 2. High predicted no-show rate
  if (attendanceData.noShowRate >= 30.0 && timing.daysRemaining <= 5 && !event.isCompleted) {
    actions.push({
      id: 'act-reminder-email',
      priority: 'high',
      title: 'Send Attendee Readiness & Check-in Reminder',
      action: 'Broadcast an announcement with venue directions, parking info, and schedule highlights.',
      rationale: `Predicted no-show rate is ${attendanceData.noShowRate}%. Timely reminders increase confirmation and reduce day-of dropouts by up to 18%.`,
      trigger: 'high_noshow_rate',
    });
  }

  // 3. Approaching capacity
  if (registrations.capacityUtilization >= 0.90 && timing.daysRemaining > 0 && !event.isCompleted) {
    actions.push({
      id: 'act-capacity-expand',
      priority: 'medium',
      title: 'Enable Waitlist or Expand Capacity',
      action: 'Increase ticket tier limits or ensure the waitlist buffer is actively monitored.',
      rationale: `Event is at ${Math.round(registrations.capacityUtilization * 100)}% capacity. High demand indicates potential for expanded seating or overflow rooms.`,
      trigger: 'capacity_pressure',
    });
  }

  // 4. Low live interaction during live events
  if (event.isLive && engagementData.breakdown.liveActivity < 40) {
    actions.push({
      id: 'act-launch-poll',
      priority: 'high',
      title: 'Launch Live Interactive Poll',
      action: 'Publish a quick audience sentiment or Q&A check-in poll from the Live tab.',
      rationale: 'Audience chat and poll participation are currently below expected levels for a live session.',
      trigger: 'live_engagement_lag',
    });
  }

  // 5. Pre-event Q&A warmup
  if (!event.isLive && timing.daysRemaining <= 2 && features.engagement.questionsCount === 0) {
    actions.push({
      id: 'act-open-qa',
      priority: 'low',
      title: 'Prompt Early Q&A Submissions',
      action: 'Invite confirmed attendees to post questions for speakers in advance.',
      rationale: 'Pre-event question activity creates attendee investment and boosts early arrival rates.',
      trigger: 'early_qa_warmup',
    });
  }

  // 6. Post-event feedback prompt
  if (event.isCompleted && features.engagement.feedbackCount < 5) {
    actions.push({
      id: 'act-request-feedback',
      priority: 'medium',
      title: 'Request Post-Event Feedback & Issue Certificates',
      action: 'Send automated feedback requests and release attendance certificates.',
      rationale: 'Attendee reviews provide critical baseline data for refining predictions in future events.',
      trigger: 'post_event_feedback',
    });
  }

  // Fallback if event is running smoothly
  if (actions.length === 0) {
    actions.push({
      id: 'act-steady-monitoring',
      priority: 'low',
      title: 'Maintain Current Execution Plan',
      action: 'All indicators are healthy. Continue tracking check-in pace and attendee questions.',
      rationale: 'Signals match or exceed benchmark expectations across all key performance indicators.',
      trigger: 'healthy_pace',
    });
  }

  return actions;
}

module.exports = {
  generateOrganizerRecommendations,
};
