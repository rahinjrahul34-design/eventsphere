const {
  SCORE_VERSION,
  COMPONENT_WEIGHTS,
  BAYESIAN_PRIOR,
  COLD_START_THRESHOLDS,
  CONFIDENCE_LEVELS,
  TRUST_SCORE_TIERS,
  RECENCY_WEIGHTS,
  VIOLATION_PENALTIES,
} = require('./config');

/**
 * Calculates Bayesian smoothed satisfaction rating.
 */
function calculateBayesianRating(metrics) {
  const { totalFeedbackCount, averageRating } = metrics;
  const { mean, weight } = BAYESIAN_PRIOR;

  if (!totalFeedbackCount || totalFeedbackCount === 0) {
    return mean;
  }

  const ratingSum = averageRating * totalFeedbackCount;
  const smoothed = (weight * mean + ratingSum) / (weight + totalFeedbackCount);
  return Math.round(smoothed * 100) / 100;
}

/**
 * Evaluates the confidence tier based on completed volume and sample size.
 */
function evaluateConfidence(metrics) {
  const { completedEvents, attendeesServed, totalFeedbackCount } = metrics;

  // Strict cold-start threshold
  if (
    completedEvents < COLD_START_THRESHOLDS.minCompletedEvents ||
    attendeesServed < COLD_START_THRESHOLDS.minAttendeesServed
  ) {
    return 'limited';
  }

  const { HIGH, MEDIUM, LOW } = CONFIDENCE_LEVELS;

  if (
    completedEvents >= HIGH.minEvents &&
    attendeesServed >= HIGH.minAttendees &&
    totalFeedbackCount >= HIGH.minReviews
  ) {
    return 'high';
  }

  if (
    completedEvents >= MEDIUM.minEvents &&
    attendeesServed >= MEDIUM.minAttendees &&
    totalFeedbackCount >= MEDIUM.minReviews
  ) {
    return 'medium';
  }

  if (completedEvents >= LOW.minEvents && attendeesServed >= LOW.minAttendees) {
    return 'low';
  }

  return 'limited';
}

/**
 * Determines trust grade tier.
 */
function determineTrustLevel(score, confidenceLevel) {
  if (confidenceLevel === 'limited') {
    return 'building_history';
  }

  const found = TRUST_SCORE_TIERS.find((t) => score >= t.min);
  return found ? found.level : 'low_trust';
}

/**
 * Evaluates earned trust badges according to verified rules.
 */
function evaluateBadges(metrics, organizer, trustScore, confidenceLevel) {
  const badges = [];

  // 1. Verified Organizer
  if (organizer.organizerStatus === 'approved') {
    badges.push('Verified Organizer');
  }

  // 2. Excellent Organizer (high score + verified confidence)
  if (trustScore >= 90 && ['medium', 'high'].includes(confidenceLevel)) {
    badges.push('Excellent Organizer');
  }

  // 3. Highly Reliable (completion >= 95% with at least 3 completed events)
  if (metrics.completedEvents >= 3 && metrics.completionRate >= 95 && metrics.cancelledEvents === 0) {
    badges.push('Highly Reliable');
  }

  // 4. Top Rated (satisfaction >= 90% with at least 5 reviews)
  if (metrics.totalFeedbackCount >= 5 && metrics.satisfactionPercentage >= 90) {
    badges.push('Top Rated');
  }

  // 5. Consistent Host (>= 5 events)
  if (metrics.completedEvents >= 5) {
    badges.push('Consistent Host');
  }

  return badges;
}

/**
 * Computes deterministic component scores (each 0 - 100).
 */
function calculateComponentScores(metrics, organizer, events) {
  // A. Event Completion Score (0 - 100)
  let completion = 70; // Cold-start baseline
  if (metrics.completedEvents + metrics.cancelledEvents > 0) {
    completion = Math.max(0, Math.min(100, Math.round(metrics.completionRate)));
  }

  // B. Cancellation Reliability Score (0 - 100)
  let cancellation = 100;
  if (metrics.completedEvents + metrics.cancelledEvents > 0) {
    cancellation = Math.max(0, Math.min(100, Math.round(100 - metrics.cancellationRate * 1.5)));
  }

  // C. Attendance Fulfillment Score (0 - 100)
  let attendance = 75; // Neutral baseline if check-in telemetry unavailable
  if (typeof metrics.attendanceRate === 'number' && !isNaN(metrics.attendanceRate)) {
    // 80%+ attendance is considered 100% fulfillment
    attendance = Math.max(20, Math.min(100, Math.round((metrics.attendanceRate / 80) * 100)));
  }

  // D. Attendee Satisfaction Score (0 - 100)
  const bayesianRating = calculateBayesianRating(metrics);
  // Scale 1.0 - 5.0 to 0 - 100
  const satisfaction = Math.max(0, Math.min(100, Math.round(((bayesianRating - 1.0) / 4.0) * 100)));

  // E. Compliance & Complaint History Score (0 - 100)
  let compliance = 100;
  if (metrics.confirmedViolationsList && metrics.confirmedViolationsList.length > 0) {
    let penaltyTotal = 0;
    metrics.confirmedViolationsList.forEach((v) => {
      const penalty = VIOLATION_PENALTIES[v.reason] || 15;
      penaltyTotal += penalty;
    });
    compliance = Math.max(0, 100 - penaltyTotal);
  }

  // F. Verification Score (0 - 100)
  let verification = 25;
  if (organizer.isActive === false) {
    verification = 0; // Suspended
  } else if (organizer.organizerStatus === 'approved') {
    verification = 100;
  } else if (organizer.organizerStatus === 'pending') {
    verification = 50;
  }

  // G. Experience Score (0 - 100)
  // Events scale (60%): 1 event -> 35, 2 -> 50, 5 -> 75, 10+ -> 100
  let eventScale = 0;
  if (metrics.completedEvents >= 10) eventScale = 100;
  else if (metrics.completedEvents >= 5) eventScale = 80;
  else if (metrics.completedEvents >= 3) eventScale = 65;
  else if (metrics.completedEvents >= 2) eventScale = 50;
  else if (metrics.completedEvents >= 1) eventScale = 35;

  // Attendees scale (40%): up to 250 attendees
  const attendeeScale = Math.min(100, Math.round((metrics.attendeesServed / 250) * 100));
  const experience = Math.round(eventScale * 0.6 + attendeeScale * 0.4);

  return {
    completion,
    cancellation,
    attendance,
    satisfaction,
    compliance,
    verification,
    experience,
    bayesianRating,
  };
}

/**
 * Calculates recency time-decay factor across completed events.
 */
function calculateRecencyMultiplier(completedEvents) {
  if (!completedEvents || completedEvents.length === 0) return 1.0;

  const now = Date.now();
  let weightedSum = 0;
  let totalWeights = 0;

  completedEvents.forEach((ev) => {
    const ageMs = now - new Date(ev.endDate || ev.startDate).getTime();
    let weight = RECENCY_WEIGHTS.OLDER.weight;

    if (ageMs <= RECENCY_WEIGHTS.DAYS_90.maxAgeMs) {
      weight = RECENCY_WEIGHTS.DAYS_90.weight;
    } else if (ageMs <= RECENCY_WEIGHTS.DAYS_180.maxAgeMs) {
      weight = RECENCY_WEIGHTS.DAYS_180.weight;
    } else if (ageMs <= RECENCY_WEIGHTS.DAYS_365.maxAgeMs) {
      weight = RECENCY_WEIGHTS.DAYS_365.weight;
    }

    weightedSum += weight;
    totalWeights += 1;
  });

  return totalWeights > 0 ? weightedSum / totalWeights : 1.0;
}

/**
 * Generates explainable positive and negative factor attributions.
 */
function generateFactorAttributions(components, metrics, organizer, confidenceLevel) {
  const factors = [];

  // Completion
  if (metrics.completedEvents > 0 && metrics.completionRate >= 95) {
    factors.push({
      factor: 'completion_rate',
      label: 'High Event Completion',
      value: `${metrics.completionRate}%`,
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.completion,
      description: `${metrics.completedEvents} of ${metrics.completedEvents + metrics.cancelledEvents} eligible events successfully completed.`,
    });
  } else if (metrics.cancellationRate > 15) {
    factors.push({
      factor: 'cancellation_rate',
      label: 'Elevated Cancellation Rate',
      value: `${metrics.cancellationRate}%`,
      impact: 'negative',
      weight: COMPONENT_WEIGHTS.completion,
      description: `${metrics.cancelledEvents} cancelled events have reduced overall reliability.`,
    });
  }

  // Satisfaction
  if (metrics.totalFeedbackCount >= 3 && metrics.satisfactionPercentage >= 85) {
    factors.push({
      factor: 'attendee_satisfaction',
      label: 'Strong Attendee Satisfaction',
      value: `${metrics.satisfactionPercentage}%`,
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.satisfaction,
      description: `${metrics.satisfactionPercentage}% of attendees rated 4 stars or higher (${metrics.averageRating} avg from ${metrics.totalFeedbackCount} reviews).`,
    });
  } else if (metrics.totalFeedbackCount >= 3 && metrics.satisfactionPercentage < 65) {
    factors.push({
      factor: 'attendee_satisfaction',
      label: 'Below-Average Feedback',
      value: `${metrics.averageRating}/5`,
      impact: 'negative',
      weight: COMPONENT_WEIGHTS.satisfaction,
      description: `Attendee satisfaction is currently tracking below platform benchmark.`,
    });
  }

  // Attendance
  if (metrics.attendanceRate !== null && metrics.attendanceRate >= 80) {
    factors.push({
      factor: 'attendance_fulfillment',
      label: 'High Registration Fulfillment',
      value: `${metrics.attendanceRate}%`,
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.attendance,
      description: `Solid check-in rate with ${metrics.attendeesServed} attendees checked in across events.`,
    });
  }

  // Compliance
  if (metrics.confirmedViolationsCount === 0) {
    factors.push({
      factor: 'clean_compliance',
      label: 'Zero Confirmed Policy Violations',
      value: 'Clean Record',
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.compliance,
      description: 'Organizer has no confirmed violations or disciplinary actions.',
    });
  } else {
    factors.push({
      factor: 'confirmed_violations',
      label: 'Confirmed Policy Violations',
      value: `${metrics.confirmedViolationsCount} Violations`,
      impact: 'negative',
      weight: COMPONENT_WEIGHTS.compliance,
      description: `${metrics.confirmedViolationsCount} policy issue(s) confirmed by platform moderators.`,
    });
  }

  // Verification
  if (organizer.organizerStatus === 'approved') {
    factors.push({
      factor: 'verified_status',
      label: 'Verified EventSphere Organizer',
      value: 'Verified',
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.verification,
      description: 'Identity and organizer credentials verified by platform administration.',
    });
  }

  // Experience
  if (metrics.completedEvents >= 5 && metrics.attendeesServed >= 100) {
    factors.push({
      factor: 'proven_experience',
      label: 'Proven Event Track Record',
      value: `${metrics.completedEvents} Events / ${metrics.attendeesServed} Attendees`,
      impact: 'positive',
      weight: COMPONENT_WEIGHTS.experience,
      description: 'Substantial hosting experience across multiple successful events.',
    });
  }

  return factors;
}

/**
 * Master scoring calculation for an organizer.
 */
function scoreOrganizer(extractedData) {
  const { organizer, events, metrics } = extractedData;

  const components = calculateComponentScores(metrics, organizer, events);
  metrics.bayesianRating = components.bayesianRating;

  // Calculate weighted score
  const {
    completion,
    satisfaction,
    attendance,
    compliance,
    verification,
    experience,
  } = components;

  const rawWeightedScore =
    completion * COMPONENT_WEIGHTS.completion +
    satisfaction * COMPONENT_WEIGHTS.satisfaction +
    attendance * COMPONENT_WEIGHTS.attendance +
    compliance * COMPONENT_WEIGHTS.compliance +
    verification * COMPONENT_WEIGHTS.verification +
    experience * COMPONENT_WEIGHTS.experience;

  const recencyMultiplier = calculateRecencyMultiplier(events.completed);

  // Apply slight recency dampening only if organizer has completed events
  let finalScore = rawWeightedScore;
  if (events.completed.length > 0) {
    finalScore = rawWeightedScore * (0.85 + 0.15 * recencyMultiplier);
  }

  // Hard clamp and integer rounding
  const trustScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // Determine confidence & level
  const confidenceLevel = evaluateConfidence(metrics);
  const trustLevel = determineTrustLevel(trustScore, confidenceLevel);

  // Earned badges
  const badges = evaluateBadges(metrics, organizer, trustScore, confidenceLevel);

  // Explainability factors
  const factors = generateFactorAttributions(components, metrics, organizer, confidenceLevel);

  return {
    trustScore,
    trustLevel,
    confidenceLevel,
    scoreVersion: SCORE_VERSION,
    verified: organizer.organizerStatus === 'approved',
    metrics,
    components: {
      completion: Math.round(completion),
      cancellation: Math.round(components.cancellation),
      attendance: Math.round(attendance),
      satisfaction: Math.round(satisfaction),
      compliance: Math.round(compliance),
      verification: Math.round(verification),
      experience: Math.round(experience),
    },
    weights: COMPONENT_WEIGHTS,
    badges,
    factors,
    lastCalculatedAt: new Date(),
  };
}

module.exports = {
  scoreOrganizer,
  calculateBayesianRating,
  evaluateConfidence,
  determineTrustLevel,
  evaluateBadges,
  calculateComponentScores,
};
