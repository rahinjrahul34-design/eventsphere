/**
 * Action Center Engine
 *
 * Scans signals from all six EventSphere intelligence modules, applies
 * deterministic priority scoring, and deduplicates actions across modules.
 *
 * Priority Score:
 *   score = (severity * 25) + (impact * 15) + (urgency * 10)
 *
 * Priority Tiers:
 *   - Critical: >= 140
 *   - High: 100 - 139
 *   - Medium: 60 - 99
 *   - Low: < 60
 */

const SEVERITY_MAP = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function computePriorityScore(severity = 'low', impact = 2, urgency = 2) {
  const sevVal = SEVERITY_MAP[severity.toLowerCase()] || 1;
  const impVal = Math.max(1, Math.min(4, impact));
  const urgVal = Math.max(1, Math.min(4, urgency));

  const total = sevVal * 25 + impVal * 15 + urgVal * 10;
  if (sevVal === 4 || total >= 160) return { priority: 'Critical', score: total };
  if (total >= 110) return { priority: 'High', score: total };
  if (total >= 70) return { priority: 'Medium', score: total };
  return { priority: 'Low', score: total };
}

/**
 * Extracts and synthesizes recommended actions from structured module metrics.
 */
function extractModuleActions({
  event,
  pulseData = null,
  shieldData = null,
  shieldAlerts = [],
  queueData = null,
  boostProfile = null,
  trustProfile = null,
}) {
  const actions = [];
  const eventId = event?._id?.toString() || '';

  // ----------------------------------------------------
  // 1. EventShield AI Actions
  // ----------------------------------------------------
  if (shieldAlerts && shieldAlerts.length > 0) {
    shieldAlerts
      .filter((a) => a.status === 'active')
      .forEach((alert) => {
        const isCrit = alert.severity === 'critical';
        const { priority, score } = computePriorityScore(
          alert.severity,
          isCrit ? 4 : 3,
          isCrit ? 4 : 3
        );

        actions.push({
          id: `shield_alert_${alert._id || alert.type}`,
          source: 'eventshield',
          sourceId: alert._id?.toString() || alert.type,
          actionType: alert.type || 'safety_alert',
          title: `Safety: ${alert.message || 'Operational Risk Alert'}`,
          problem: alert.message,
          whyItMatters: isCrit
            ? 'Critical safety risk directly threatens attendee physical security and caps overall Event Health.'
            : 'Unresolved safety warnings increase event liability and reduce overall operational readiness.',
          recommendedAction: alert.actionRequired || 'Review event safety protocols and assign certified volunteers or venue staff.',
          ctaText: 'Review Safety',
          ctaLink: `/dashboard/events/${eventId}/eventshield`,
          severity: alert.severity,
          priority,
          priorityScore: score,
          timestamp: alert.createdAt || new Date(),
          status: 'open',
          actionable: true,
        });
      });
  }

  // EventShield checklist readiness action
  if (shieldData && shieldData.readinessScore !== undefined && shieldData.readinessScore < 70) {
    const { priority, score } = computePriorityScore('medium', 3, 2);
    actions.push({
      id: `shield_readiness_${eventId}`,
      source: 'eventshield',
      sourceId: eventId,
      actionType: 'safety_readiness',
      title: 'Safety Checklist Incomplete',
      problem: `Operational safety checklist is only ${shieldData.readinessScore}% completed.`,
      whyItMatters: 'Completing the pre-event safety protocol ensures staff, emergency contacts, and venue zones are prepared.',
      recommendedAction: 'Complete the remaining safety checklist tasks before opening event doors.',
      ctaText: 'Open Checklist',
      ctaLink: `/dashboard/events/${eventId}/eventshield`,
      severity: 'medium',
      priority,
      priorityScore: score,
      timestamp: shieldData.lastEvaluatedAt || new Date(),
      status: 'open',
      actionable: true,
    });
  }

  // ----------------------------------------------------
  // 2. EventPulse AI Actions
  // ----------------------------------------------------
  if (pulseData) {
    const { attendance, registrations, alerts = [] } = pulseData;

    // Pulse alerts
    alerts.forEach((alert) => {
      const { priority, score } = computePriorityScore(
        alert.severity || 'high',
        3,
        alert.severity === 'critical' ? 4 : 3
      );
      actions.push({
        id: `pulse_alert_${alert._id || alert.type}`,
        source: 'eventpulse',
        sourceId: alert._id?.toString() || alert.type,
        actionType: alert.type,
        title: `Attendance: ${alert.type?.replace(/_/g, ' ')}`,
        problem: alert.message,
        whyItMatters: 'Discrepancies between registered volume and expected attendance can lead to budget loss or overprepared catering.',
        recommendedAction: alert.actionRecommended || 'Send an email reminder campaign or adjust venue session seating.',
        ctaText: 'View EventPulse',
        ctaLink: `/dashboard/events/${eventId}/eventpulse`,
        severity: alert.severity || 'high',
        priority,
        priorityScore: score,
        timestamp: alert.createdAt || new Date(),
        status: 'open',
        actionable: true,
      });
    });

    // Elevated No-Show Rate Check
    const expectedNoShows = attendance?.expectedNoShows || 0;
    const expectedTotal = registrations?.predictedTotal || event?.registrationCount || 0;
    const noShowRate = expectedTotal > 0 ? (expectedNoShows / expectedTotal) * 100 : 0;

    if (noShowRate > 22 && !actions.some((a) => a.actionType === 'HIGH_NO_SHOW_RISK')) {
      const { priority, score } = computePriorityScore('high', 3, 3);
      actions.push({
        id: `pulse_noshow_${eventId}`,
        source: 'eventpulse',
        sourceId: eventId,
        actionType: 'high_no_show_risk',
        title: 'Elevated Attendance No-Show Risk',
        problem: `Forecasted no-show rate is ${Math.round(noShowRate)}% (${expectedNoShows} attendees unlikely to turn up).`,
        whyItMatters: 'Empty seats reduce speaker enthusiasm and waste hall allocation while locking out waitlisted attendees.',
        recommendedAction: 'Send a calendar invite reconfirmation and activate SmartQueue waitlist seat releases.',
        ctaText: 'Manage Attendance',
        ctaLink: `/dashboard/events/${eventId}/eventpulse`,
        severity: 'high',
        priority,
        priorityScore: score,
        timestamp: new Date(),
        status: 'open',
        actionable: true,
      });
    }

    // Registration Slowdown
    if (registrations?.velocity24h === 0 && (event?.registrationCount || 0) < (event?.capacity || 100) * 0.5) {
      const { priority, score } = computePriorityScore('medium', 3, 2);
      actions.push({
        id: `pulse_slowdown_${eventId}`,
        source: 'eventpulse',
        sourceId: eventId,
        actionType: 'registration_stagnation',
        title: 'Registration Momentum Stalled',
        problem: 'Zero new registrations recorded in the last 24 hours while event is below 50% capacity.',
        whyItMatters: 'Late promotional pushes have significantly lower conversion rates than continuous campaign pacing.',
        recommendedAction: 'Broadcast an announcement on social channels or share promotional discount passes.',
        ctaText: 'Promote Event',
        ctaLink: `/dashboard/events/${eventId}/eventboost`,
        severity: 'medium',
        priority,
        priorityScore: score,
        timestamp: new Date(),
        status: 'open',
        actionable: true,
      });
    }
  }

  // ----------------------------------------------------
  // 3. SmartQueue AI Actions
  // ----------------------------------------------------
  if (queueData?.metrics) {
    const { metrics, activeHolds = [] } = queueData;

    // High queue pressure with waiting attendees
    if (metrics.waitingCount > 10 && event?.capacity && event.registrationCount >= event.capacity) {
      const { priority, score } = computePriorityScore('high', 3, 3);
      actions.push({
        id: `queue_pressure_${eventId}`,
        source: 'smartqueue',
        sourceId: eventId,
        actionType: 'waitlist_pressure',
        title: 'Strong Waitlist Demand',
        problem: `${metrics.waitingCount} attendees are waiting on the queue while venue is at capacity.`,
        whyItMatters: 'Unfulfilled waitlist demand represents unrealized ticket revenue and high attendee interest.',
        recommendedAction: 'Release expired seat holds or consider expanding venue capacity or adding a virtual stream.',
        ctaText: 'Manage Queue',
        ctaLink: `/dashboard/events/${eventId}/smartqueue`,
        severity: 'high',
        priority,
        priorityScore: score,
        timestamp: new Date(),
        status: 'open',
        actionable: true,
      });
    }

    // Expiring holds backlog
    const nearExpiry = activeHolds.filter((h) => h.secondsRemaining && h.secondsRemaining < 600);
    if (nearExpiry.length > 3) {
      const { priority, score } = computePriorityScore('low', 2, 2);
      actions.push({
        id: `queue_expiring_${eventId}`,
        source: 'smartqueue',
        sourceId: eventId,
        actionType: 'expiring_holds',
        title: 'Pending Seat Holds Expiring Soon',
        problem: `${nearExpiry.length} temporary seat holds will expire within 10 minutes without completion.`,
        whyItMatters: 'Held seats prevent other waitlisted attendees from purchasing until the timer lapses.',
        recommendedAction: 'Let SmartQueue auto-expire holds and promote next candidates in line.',
        ctaText: 'View Holds',
        ctaLink: `/dashboard/events/${eventId}/smartqueue`,
        severity: 'low',
        priority,
        priorityScore: score,
        timestamp: new Date(),
        status: 'open',
        actionable: true,
      });
    }
  }

  // ----------------------------------------------------
  // 4. EventBoost AI Actions
  // ----------------------------------------------------
  if (boostProfile) {
    // Inconsistency alert
    if (boostProfile.inconsistencies && boostProfile.inconsistencies.length > 0) {
      const inc = boostProfile.inconsistencies[0];
      const { priority, score } = computePriorityScore('high', 3, 3);
      actions.push({
        id: `boost_inconsistency_${eventId}`,
        source: 'eventboost',
        sourceId: eventId,
        actionType: 'content_inconsistency',
        title: 'Content Inconsistency Detected',
        problem: inc.message || 'Contradictory details found between event description and logistics.',
        whyItMatters: 'Contradictions confuse search engine crawlers and mislead potential attendees.',
        recommendedAction: inc.suggestion || 'Review venue, pricing, and timing details in the EventBoost tab.',
        ctaText: 'Fix Inconsistency',
        ctaLink: `/dashboard/events/${eventId}/eventboost`,
        severity: 'high',
        priority,
        priorityScore: score,
        timestamp: boostProfile.lastAnalyzedAt || new Date(),
        status: 'open',
        actionable: true,
      });
    }

    // Low SEO score
    if (boostProfile.seoScore < 60) {
      const { priority, score } = computePriorityScore('medium', 2, 2);
      actions.push({
        id: `boost_seo_${eventId}`,
        source: 'eventboost',
        sourceId: eventId,
        actionType: 'low_seo_score',
        title: 'Search & Content Discoverability Below Target',
        problem: `Event SEO score is ${boostProfile.seoScore}/100. Missing key meta tags or primary keywords.`,
        whyItMatters: 'Search-optimized event listings rank higher on Google SERP and attract 3x more organic registrations.',
        recommendedAction: 'Use EventBoost AI One-Click Optimize to generate meta tags and clear structured descriptions.',
        ctaText: 'Optimize with AI',
        ctaLink: `/dashboard/events/${eventId}/eventboost`,
        severity: 'medium',
        priority,
        priorityScore: score,
        timestamp: boostProfile.lastAnalyzedAt || new Date(),
        status: 'open',
        actionable: true,
      });
    }
  }

  // ----------------------------------------------------
  // 5. TrustSphere Actions
  // ----------------------------------------------------
  if (trustProfile && !trustProfile.verified) {
    const { priority, score } = computePriorityScore('low', 2, 1);
    actions.push({
      id: `trust_verify_${trustProfile.organizer || eventId}`,
      source: 'trustsphere',
      sourceId: (trustProfile.organizer || eventId).toString(),
      actionType: 'identity_verification',
      title: 'Organizer Verification Pending',
      problem: 'Your organizer profile is not yet identity verified.',
      whyItMatters: 'Verified organizers receive a public trust badge and rank higher in attendee recommendations.',
      recommendedAction: 'Complete identity verification on TrustSphere to boost attendee registration confidence.',
      ctaText: 'Verify Profile',
      ctaLink: `/dashboard/trust`,
      severity: 'low',
      priority,
      priorityScore: score,
      timestamp: new Date(),
      status: 'open',
      actionable: true,
    });
  }

  // ----------------------------------------------------
  // Deduplicate and Sort Actions
  // ----------------------------------------------------
  const deduplicated = deduplicateActions(actions);

  // Sort descending by priorityScore
  deduplicated.sort((a, b) => b.priorityScore - a.priorityScore);

  return deduplicated;
}

/**
 * Deduplicates actions strictly by composite key:
 * key = source:sourceId:actionType
 */
function deduplicateActions(actions) {
  const seen = new Set();
  const result = [];

  for (const act of actions) {
    const key = `${act.source}:${act.sourceId}:${act.actionType}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(act);
    }
  }

  return result;
}

module.exports = {
  computePriorityScore,
  extractModuleActions,
  deduplicateActions,
};
