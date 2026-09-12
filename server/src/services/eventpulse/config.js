/**
 * EventPulse AI Configuration
 * Centralized weights, thresholds, baseline parameters, and versioning.
 */

module.exports = {
  MODEL_VERSION: 'eventpulse-v1.0',
  ALGORITHM_VERSION: 'hybrid-ensemble-v1.0',

  // Cache configuration
  CACHE_TTL_MINUTES: 15,

  // Baseline attendance probabilities by event mode
  MODE_BASE_ATTENDANCE: {
    offline: 0.75, // in-person events typically average 75%
    online: 0.55,  // webinars / virtual events typically average 55%
    hybrid: 0.68,  // hybrid events typically average 68%
  },

  // Pricing modifier on attendance commitment
  PRICING_ATTENDANCE_MODIFIER: {
    paid: 0.12,    // +12% commitment for paid events
    free: -0.06,   // -6% commitment for free events
  },

  // Category baseline capacity utilization for cold start (when no historical event data exists)
  CATEGORY_UTILIZATION_BENCHMARKS: {
    'technology': 0.82,
    'hackathons': 0.88,
    'workshops': 0.78,
    'business': 0.72,
    'cultural': 0.85,
    'sports': 0.80,
    'default': 0.75,
  },

  // Velocity momentum thresholds
  VELOCITY_THRESHOLDS: {
    ACCELERATING_GROWTH: 0.25, // > +25%
    GROWING_MIN: 0.05,        // +5% to +25%
    STABLE_MIN: -0.10,        // -10% to +5%
    SLOWING_MIN: -0.30,       // -10% to -30%
    // < -30% is declining
  },

  // Health Score Weightings (Total = 1.0)
  HEALTH_WEIGHTS: {
    velocity: 0.30,
    capacity: 0.25,
    attendance: 0.20,
    engagement: 0.15,
    sentiment: 0.10,
  },

  // Engagement Score Dimensions (Total = 1.0)
  ENGAGEMENT_WEIGHTS: {
    participation: 0.25,
    interaction: 0.25,
    liveActivity: 0.20,
    feedback: 0.15,
    networking: 0.15,
  },

  // Confidence Weightings (Total = 1.0)
  CONFIDENCE_WEIGHTS: {
    proximity: 0.30,
    history: 0.30,
    volume: 0.25,
    completeness: 0.15,
  },

  // Alert thresholds
  ALERT_THRESHOLDS: {
    VELOCITY_SLOWDOWN_DROP: -0.30,
    HIGH_NO_SHOW_RATE: 35.0, // %
    CAPACITY_PRESSURE_UTILIZATION: 90.0, // %
    LOW_ENGAGEMENT_PACE_SCORE: 40.0,
    ATTENDANCE_PACE_DEFICIT_RATE: 0.25,
  },
};
