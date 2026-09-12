const SEO_VERSION = 'SEO_V1';

const WEIGHTS = {
  titleOptimization: 0.15,
  descriptionQuality: 0.20,
  keywordRelevance: 0.15,
  searchIntentMatch: 0.10,
  readability: 0.10,
  metadataQuality: 0.10,
  contentCompleteness: 0.10,
  localRelevance: 0.05,
  socialReadiness: 0.05,
};

const TITLE_RULES = {
  minLength: 25,
  idealMin: 40,
  idealMax: 70,
  maxLength: 100,
};

const DESC_RULES = {
  minLength: 150,
  idealMin: 300,
  idealMax: 1500,
};

const META_TITLE_RULES = {
  idealMin: 45,
  idealMax: 65,
};

const META_DESC_RULES = {
  idealMin: 120,
  idealMax: 160,
};

const KEYWORD_RULES = {
  maxDensity: 0.035, // 3.5% triggers keyword stuffing alert
  optimalDensityMin: 0.008, // 0.8%
  optimalDensityMax: 0.025, // 2.5%
};

const POWER_WORDS = [
  'workshop', 'masterclass', 'bootcamp', 'summit', 'conference',
  'hands-on', 'guide', 'learn', 'build', 'live', 'hackathon',
  'interactive', 'training', 'mastery', 'intensive', 'practical',
  'certified', 'networking', 'expert', 'deep dive', 'showcase',
];

const GENERIC_PHRASES = [
  'amazing event', 'great event', 'great opportunity', 'learn many things',
  'don\'t miss out', 'fun and exciting', 'good event', 'something for everyone',
  'come and enjoy', 'best event ever', 'nice event', 'an event where you will learn',
];

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'with', 'won\'t', 'would', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'join', 'us', 'event', 'events',
]);

const INTENT_MARKERS = {
  informational: [
    'learn', 'what is', 'understand', 'overview', 'topics', 'concepts', 'introduction',
    'fundamentals', 'principles', 'guide', 'insights', 'architecture', 'best practices',
  ],
  transactional: [
    'register', 'ticket', 'pass', 'rsvp', 'reserve', 'seats', 'early-bird',
    'pricing', 'admission', 'deadline', 'book now', 'apply', 'entry',
  ],
  educational: [
    'workshop', 'hands-on', 'tutorial', 'students', 'curriculum', 'syllabus',
    'mentors', 'projects', 'build', 'practical', 'certificate', 'exercises', 'code',
  ],
  local: [
    'campus', 'auditorium', 'hall', 'venue', 'in-person', 'city', 'location',
    'directions', 'center', 'room', 'ground', 'offline',
  ],
};

module.exports = {
  SEO_VERSION,
  WEIGHTS,
  TITLE_RULES,
  DESC_RULES,
  META_TITLE_RULES,
  META_DESC_RULES,
  KEYWORD_RULES,
  POWER_WORDS,
  GENERIC_PHRASES,
  STOP_WORDS,
  INTENT_MARKERS,
};
