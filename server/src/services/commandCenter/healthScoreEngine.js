/**
 * Event Health Score Calculation Engine
 *
 * Computes a deterministic composite Event Health Score (0–100) using transparent,
 * weighted contributions from 6 intelligence dimensions:
 *   - Attendance Health (25%)
 *   - Safety Health (20%)
 *   - Registration Health (20%)
 *   - Queue Health (15%)
 *   - Content & SEO Health (10%)
 *   - Organizer Trust Health (10%)
 *
 * Features a Critical Safety Override rule:
 * If any critical safety alert exists (e.g. overcapacity >110%, severe hazard),
 * total health is capped at <= 45 ('At Risk' or 'Critical') to ensure organizer safety.
 */

const WEIGHTS = {
  attendance: 0.25,
  safety: 0.20,
  registration: 0.20,
  queue: 0.15,
  content: 0.10,
  trust: 0.10,
};

const STATUS_TIERS = [
  { min: 85, label: 'Excellent', color: 'emerald', description: 'Your event is performing exceptionally well across all operational and intelligence metrics.' },
  { min: 70, label: 'Good', color: 'teal', description: 'Your event is performing well with solid attendance pacing and operational readiness.' },
  { min: 55, label: 'Needs Attention', color: 'amber', description: 'Certain operational areas need review to ensure optimal attendee conversion and safety.' },
  { min: 40, label: 'At Risk', color: 'orange', description: 'Critical attendance, queue, or safety indicators require immediate organizer intervention.' },
  { min: 0, label: 'Critical', color: 'red', description: 'Severe operational vulnerabilities or safety risks detected. Immediate mitigation required.' },
];

/**
 * Bounds a value between min and max and ensures valid number.
 */
function clamp(val, min = 0, max = 100) {
  if (val === null || val === undefined || Number.isNaN(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Calculates Attendance Health (0–100)
 * Evaluates predicted attendance vs capacity, attendance velocity, and no-show rate.
 */
function calculateAttendanceHealth(pulseData, event) {
  if (!pulseData || !pulseData.attendance) {
    // Fallback baseline from event if pulse unavailable
    if (!event) return 50;
    const capacity = Math.max(1, event.capacity || 100);
    const regs = event.registrationCount || 0;
    const fillRate = Math.min(100, (regs / capacity) * 100);
    return clamp(fillRate >= 70 ? 75 : fillRate >= 40 ? 60 : 50);
  }

  const { attendance, health, registrations } = pulseData;
  const expectedRate = attendance.attendanceRate !== undefined ? attendance.attendanceRate : 75;
  const noShowRate = attendance.expectedNoShows && registrations?.predictedTotal
    ? (attendance.expectedNoShows / Math.max(1, registrations.predictedTotal)) * 100
    : 15;

  let score = 50;
  // Factor 1: Attendance rate (40% weight of dimension)
  score += ((expectedRate - 50) / 50) * 25;

  // Factor 2: EventPulse internal health score if available (35% weight)
  if (health?.score !== undefined) {
    score = score * 0.65 + health.score * 0.35;
  }

  // Factor 3: No-show penalty (deduct up to 15 pts for >25% no shows)
  if (noShowRate > 25) {
    score -= Math.min(20, (noShowRate - 25) * 1.2);
  } else if (noShowRate < 10) {
    score += 8; // Low no-show bonus
  }

  return clamp(score);
}

/**
 * Calculates Safety Health (0–100)
 * Evaluates EventShield safety score, readiness, and active risk alerts.
 */
function calculateSafetyHealth(shieldData, activeAlerts = []) {
  if (!shieldData) {
    return 70; // Baseline neutral safe state if shield uncomputed
  }

  let baseScore = shieldData.safetyScore !== undefined ? shieldData.safetyScore : 75;
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved');
  const highAlerts = activeAlerts.filter((a) => a.severity === 'high' && a.status !== 'resolved');

  // Direct deductions for unresolved active alerts
  baseScore -= criticalAlerts.length * 35;
  baseScore -= highAlerts.length * 15;

  // Readiness bonus/penalty
  if (shieldData.readinessScore !== undefined) {
    baseScore = baseScore * 0.7 + shieldData.readinessScore * 0.3;
  }

  return clamp(baseScore);
}

/**
 * Calculates Registration Health (0–100)
 * Evaluates registration volume vs target capacity and velocity.
 */
function calculateRegistrationHealth(event, pulseData) {
  if (!event) return 50;
  const capacity = Math.max(1, event.capacity || 100);
  const registrations = event.registrationCount || 0;
  const fillPct = (registrations / capacity) * 100;

  let score = 0;
  if (fillPct >= 95) score = 100;
  else if (fillPct >= 80) score = 90;
  else if (fillPct >= 60) score = 80;
  else if (fillPct >= 40) score = 68;
  else if (fillPct >= 20) score = 55;
  else if (fillPct > 0) score = 45;
  else score = 30;

  // Velocity adjustment from pulse if available
  if (pulseData?.registrations?.velocity24h !== undefined) {
    const vel = pulseData.registrations.velocity24h;
    if (vel > 10) score = Math.min(100, score + 8);
    else if (vel > 3) score = Math.min(100, score + 4);
    else if (vel === 0 && fillPct < 30) score = Math.max(25, score - 8);
  }

  return clamp(score);
}

/**
 * Calculates Queue Health (0–100)
 * Evaluates SmartQueue waitlist dynamics, claim velocity, and churn rate.
 */
function calculateQueueHealth(queueData, event) {
  if (!queueData || !queueData.metrics) {
    // If no queue data, check if event has waitlist or is full
    if (!event) return 75;
    const isFull = (event.registrationCount || 0) >= (event.capacity || 100);
    return isFull ? 80 : 85; // Healthy normal state
  }

  const { metrics, activeCapacity } = queueData;
  // If queue has computed efficiencyScore, incorporate it
  let score = metrics.efficiencyScore !== undefined ? metrics.efficiencyScore : 75;

  // Penalty if expiration rate is high (>30%)
  if (metrics.expirationRate > 30) {
    score -= Math.min(25, (metrics.expirationRate - 30) * 0.6);
  }

  // Bonus for strong conversion/acceptance rate (>70%)
  if (metrics.acceptanceRate > 70) {
    score += 10;
  }

  return clamp(score);
}

/**
 * Calculates Content & SEO Health (0–100)
 * Evaluates EventBoost SEO score, content quality, and readability.
 */
function calculateContentHealth(boostProfile) {
  if (!boostProfile) return 50; // Neutral baseline when not yet analyzed

  const seoScore = boostProfile.seoScore !== undefined ? boostProfile.seoScore : 50;
  const contentScore = boostProfile.contentScore !== undefined ? boostProfile.contentScore : seoScore;
  const readability = boostProfile.readabilityScore !== undefined ? boostProfile.readabilityScore : 70;

  const score = seoScore * 0.5 + contentScore * 0.3 + readability * 0.2;
  return clamp(score);
}

/**
 * Calculates Organizer Trust Health (0–100)
 * Evaluates TrustSphere organizer trust score, verification, and completion history.
 */
function calculateTrustHealth(trustProfile) {
  if (!trustProfile) return 70; // Baseline trust for registered organizers

  const trustScore = trustProfile.trustScore !== undefined ? trustProfile.trustScore : 70;
  let score = trustScore;

  if (trustProfile.verified) {
    score = Math.min(100, score + 5);
  }

  return clamp(score);
}

/**
 * Main Calculation Function
 *
 * @param {object} params
 * @param {object} params.event - Event document
 * @param {object} [params.pulseData] - EventPulse prediction data
 * @param {object} [params.shieldData] - EventShield risk assessment
 * @param {Array}  [params.shieldAlerts] - Active EventShield alerts
 * @param {object} [params.queueData] - SmartQueue metrics
 * @param {object} [params.boostProfile] - EventBoost SEO profile
 * @param {object} [params.trustProfile] - TrustSphere organizer profile
 * @returns {object} Comprehensive Event Health result
 */
function calculateEventHealth({
  event,
  pulseData = null,
  shieldData = null,
  shieldAlerts = [],
  queueData = null,
  boostProfile = null,
  trustProfile = null,
}) {
  // 1. Compute individual dimension scores
  const attendanceScore = calculateAttendanceHealth(pulseData, event);
  const safetyScore = calculateSafetyHealth(shieldData, shieldAlerts);
  const registrationScore = calculateRegistrationHealth(event, pulseData);
  const queueScore = calculateQueueHealth(queueData, event);
  const contentScore = calculateContentHealth(boostProfile);
  const trustScore = calculateTrustHealth(trustProfile);

  // 2. Compute weighted composite
  const rawWeightedScore =
    attendanceScore * WEIGHTS.attendance +
    safetyScore * WEIGHTS.safety +
    registrationScore * WEIGHTS.registration +
    queueScore * WEIGHTS.queue +
    contentScore * WEIGHTS.content +
    trustScore * WEIGHTS.trust;

  let finalScore = clamp(rawWeightedScore);

  // 3. Critical Safety & Overcapacity Override Rule:
  // If there are active critical safety alerts or registrations > 110% of venue capacity without mitigation,
  // cap overall health at <= 45 ('At Risk' / 'Critical')
  const hasCriticalSafetyAlert = (shieldAlerts || []).some(
    (a) => a.severity === 'critical' && a.status === 'active'
  );
  const isSevereOvercapacity = event && event.capacity && (event.registrationCount > event.capacity * 1.10);
  const isOverridden = hasCriticalSafetyAlert || isSevereOvercapacity;

  if (isOverridden) {
    finalScore = Math.min(45, finalScore);
  }

  // 4. Determine status tier
  const tier = STATUS_TIERS.find((t) => finalScore >= t.min) || STATUS_TIERS[STATUS_TIERS.length - 1];
  let status = tier.label;
  if (isOverridden && (status === 'Good' || status === 'Excellent')) {
    status = 'At Risk';
  }

  // 5. Build explainability drivers (Positive & Negative factors)
  const drivers = [];
  const positiveFactors = [];
  const negativeFactors = [];

  // Attendance factors
  if (attendanceScore >= 75) {
    positiveFactors.push({ area: 'Attendance', factor: 'Solid forecasted attendee turnout and conversion' });
  } else if (attendanceScore < 60) {
    negativeFactors.push({ area: 'Attendance', factor: 'Turnout forecast below registration pace or elevated no-show risk' });
  }

  // Safety factors
  if (hasCriticalSafetyAlert) {
    negativeFactors.push({ area: 'Safety Alert', factor: 'Active critical safety alert overrides and caps overall event health' });
  } else if (safetyScore >= 80) {
    positiveFactors.push({ area: 'Safety Readiness', factor: 'Strong operational safety protocols and minimal risk exposure' });
  } else if (safetyScore < 65) {
    negativeFactors.push({ area: 'Safety Risk', factor: 'Unresolved safety checklist items or open warning alerts' });
  }

  // Registration factors
  if (registrationScore >= 80) {
    positiveFactors.push({ area: 'Registration Velocity', factor: 'Strong registration volume nearing target capacity' });
  } else if (registrationScore < 50) {
    negativeFactors.push({ area: 'Registration Volume', factor: 'Registration pace is lagging behind target capacity' });
  }

  // Queue factors
  if (queueScore >= 80) {
    positiveFactors.push({ area: 'Waitlist Efficiency', factor: 'Healthy queue management with rapid seat claim velocity' });
  } else if (queueScore < 60) {
    negativeFactors.push({ area: 'Queue Pressure', factor: 'Elevated hold expirations or unresolved waitlist backlog' });
  }

  // Content/SEO factors
  if (contentScore >= 80) {
    positiveFactors.push({ area: 'Content Quality', factor: 'Event listing is comprehensive, readable, and search-optimized' });
  } else if (contentScore < 55) {
    negativeFactors.push({ area: 'Content Completeness', factor: 'Event description or SEO metadata needs enhancement' });
  }

  // Trust factors
  if (trustScore >= 80) {
    positiveFactors.push({ area: 'Organizer Trust', factor: 'High organizer credibility and verified credentials' });
  }

  return {
    score: finalScore,
    status,
    color: tier.color,
    description: tier.description,
    confidence: pulseData?.health?.confidence || (shieldData ? 88 : 78),
    isOverridden,
    overrideReason: isOverridden
      ? hasCriticalSafetyAlert
        ? 'Overridden due to active critical safety alert'
        : 'Overridden due to venue overcapacity exceeding 110%'
      : null,
    breakdown: {
      attendance: {
        score: attendanceScore,
        weight: WEIGHTS.attendance,
        weightedScore: Math.round(attendanceScore * WEIGHTS.attendance),
        label: 'Attendance & Pacing',
      },
      safety: {
        score: safetyScore,
        weight: WEIGHTS.safety,
        weightedScore: Math.round(safetyScore * WEIGHTS.safety),
        label: 'Safety & Risk Management',
      },
      registration: {
        score: registrationScore,
        weight: WEIGHTS.registration,
        weightedScore: Math.round(registrationScore * WEIGHTS.registration),
        label: 'Registration Progress',
      },
      queue: {
        score: queueScore,
        weight: WEIGHTS.queue,
        weightedScore: Math.round(queueScore * WEIGHTS.queue),
        label: 'Queue & Waitlist Health',
      },
      content: {
        score: contentScore,
        weight: WEIGHTS.content,
        weightedScore: Math.round(contentScore * WEIGHTS.content),
        label: 'SEO & Content Quality',
      },
      trust: {
        score: trustScore,
        weight: WEIGHTS.trust,
        weightedScore: Math.round(trustScore * WEIGHTS.trust),
        label: 'Organizer Trust Profile',
      },
    },
    formula: {
      equation: 'Health = (Attendance × 0.25) + (Safety × 0.20) + (Registration × 0.20) + (Queue × 0.15) + (SEO × 0.10) + (Trust × 0.10)',
      explanation: 'Composite health score aggregates predictive attendance, operational safety, ticket sales velocity, waitlist efficiency, content completeness, and organizer trust with an automatic safety override cap at <= 45 if critical hazards are present.',
    },
    drivers: {
      positive: positiveFactors,
      negative: negativeFactors,
    },
    lastCalculatedAt: new Date().toISOString(),
  };
}

module.exports = {
  WEIGHTS,
  STATUS_TIERS,
  clamp,
  calculateAttendanceHealth,
  calculateSafetyHealth,
  calculateRegistrationHealth,
  calculateQueueHealth,
  calculateContentHealth,
  calculateTrustHealth,
  calculateEventHealth,
};
