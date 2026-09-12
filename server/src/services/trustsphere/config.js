module.exports = {
  SCORE_VERSION: 'TRUST_V1',

  // Component weights (must sum to 1.0)
  COMPONENT_WEIGHTS: {
    completion: 0.25,
    satisfaction: 0.25,
    attendance: 0.15,
    compliance: 0.15,
    verification: 0.10,
    experience: 0.10,
  },

  // Bayesian smoothing parameters for attendee satisfaction ratings
  BAYESIAN_PRIOR: {
    mean: 4.0, // Platform global average rating prior (out of 5.0)
    weight: 5, // Equivalent to 5 virtual prior reviews
  },

  // Strict cold-start threshold: organizers with less than these metrics are labeled "Building Trust History"
  COLD_START_THRESHOLDS: {
    minCompletedEvents: 2,
    minAttendeesServed: 15,
  },

  // Multi-tier confidence requirements
  CONFIDENCE_LEVELS: {
    HIGH: {
      minEvents: 8,
      minAttendees: 200,
      minReviews: 15,
    },
    MEDIUM: {
      minEvents: 4,
      minAttendees: 50,
      minReviews: 5,
    },
    LOW: {
      minEvents: 2,
      minAttendees: 15,
      minReviews: 0,
    },
  },

  // Trust score grade tiers
  TRUST_SCORE_TIERS: [
    { min: 90, level: 'excellent', label: 'Excellent', description: 'Highest level of platform reliability and verified attendee satisfaction.' },
    { min: 80, level: 'very_good', label: 'Very Good', description: 'Consistently hosts successful events with strong fulfillment.' },
    { min: 70, level: 'good', label: 'Good', description: 'Reliable host with dependable delivery and positive reviews.' },
    { min: 60, level: 'fair', label: 'Fair', description: 'Moderate reliability; opportunities exist to improve completion and attendance.' },
    { min: 40, level: 'needs_improvement', label: 'Needs Improvement', description: 'Recent cancellations or feedback below platform benchmarks.' },
    { min: 0, level: 'low_trust', label: 'Low Trust', description: 'Significant history of cancellations or confirmed platform policy violations.' },
  ],

  // Recency time-decay weights
  RECENCY_WEIGHTS: {
    DAYS_90: { maxAgeMs: 90 * 86400000, weight: 1.0 },
    DAYS_180: { maxAgeMs: 180 * 86400000, weight: 0.85 },
    DAYS_365: { maxAgeMs: 365 * 86400000, weight: 0.70 },
    OLDER: { weight: 0.50 },
  },

  // Deduction per confirmed moderator-resolved violation
  VIOLATION_PENALTIES: {
    fraud: 35,
    fake_event: 30,
    inappropriate: 20,
    spam: 15,
    incorrect_info: 10,
    other: 10,
  },

  // Cache freshness
  CACHE_TTL_MS: 3600000, // 1 hour
};
