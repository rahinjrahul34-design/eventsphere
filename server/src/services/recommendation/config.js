/**
 * AI Event Recommendation 2.0 Configuration & Weights
 * All weights and decay parameters are centralized and easily tunable.
 */

const ALGORITHM_VERSION = 'recommendation-v2';

const DEFAULT_WEIGHTS = {
  interestMatch: 0.20,       // 20% - user profile interests vs event topics/tags
  skillMatch: 0.18,          // 18% - user profile skills vs event tags/skills/description
  behaviorMatch: 0.15,       // 15% - past engagement with similar categories & organizers
  categoryMatch: 0.12,       // 12% - direct category affinity
  pastEventSimilarity: 0.10, // 10% - similarity to checked-in / attended events
  locationMatch: 0.08,       // 8%  - city match, spatial distance (<30km), or online
  semanticSimilarity: 0.07,  // 7%  - contextual text / keyword semantic alignment
  freshness: 0.05,           // 5%  - newly published events boost
  popularity: 0.03,          // 3%  - registration velocity and attendance
  timeRelevance: 0.02,       // 2%  - happening soon (next 7 - 21 days)
};

const PENALTIES = {
  alreadyRegistered: 60,     // Heavy penalty in general recommendations
  cancelledEvent: 15,        // Soft penalty if previously cancelled
  dismissedEvent: 35,        // Strong penalty if explicitly dismissed ("Not for me")
  negativeCategoryFeedback: 12, // Penalty if user gave negative feedback to category
  distancePenalty: 15,       // Penalty if offline event is >100km from user
};

// Distance limits (in km)
const DISTANCE_THRESHOLDS = {
  LOCAL_KM: 30,
  REGIONAL_KM: 75,
  FAR_KM: 150,
};

// Diversity share: max percentage of recommendations from the same category
const MAX_CATEGORY_SHARE = 0.4;

// Time decay constant: lambda in exp(-lambda * days)
// Half-life ~ 30 days
const TIME_DECAY_LAMBDA = Math.log(2) / 30;

// Exploration topics map: adjacent fields to introduce serendipity
const EXPLORATION_MAP = {
  technology: ['business', 'arts-culture', 'design'],
  coding: ['cloud-devops', 'cybersecurity', 'data-science'],
  'artificial intelligence': ['robotics', 'cloud-devops', 'ethics-law'],
  business: ['technology', 'startups', 'leadership'],
  design: ['web-development', 'marketing', 'arts-culture'],
  music: ['cultural', 'community', 'performing-arts'],
  sports: ['wellness', 'fitness', 'esports'],
};

module.exports = {
  ALGORITHM_VERSION,
  DEFAULT_WEIGHTS,
  PENALTIES,
  DISTANCE_THRESHOLDS,
  MAX_CATEGORY_SHARE,
  TIME_DECAY_LAMBDA,
  EXPLORATION_MAP,
};
