/**
 * Semantic Concept & Similarity Service
 * Provides semantic understanding and domain alignment between user profiles and events.
 * Identifies high-relevance matches even when exact words differ.
 */

const CONCEPT_CLUSTERS = {
  ai_ml: {
    label: 'Artificial Intelligence & Machine Learning',
    terms: [
      'ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural networks',
      'neural', 'llm', 'llms', 'prompt engineering', 'generative ai', 'genai', 'pytorch',
      'tensorflow', 'nlp', 'natural language', 'computer vision', 'hugging face',
      'autonomous agents', 'agents', 'langchain', 'reinforcement learning', 'data science',
    ],
  },
  web_dev: {
    label: 'Web Architecture & Modern Frontend',
    terms: [
      'web', 'web development', 'react', 'next.js', 'vue', 'angular', 'javascript',
      'typescript', 'frontend', 'backend', 'node', 'node.js', 'express', 'api',
      'full stack', 'mern', 'html', 'css', 'tailwind', 'graphql', 'rest',
    ],
  },
  cloud_devops: {
    label: 'Cloud Infrastructure & DevOps',
    terms: [
      'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'ci/cd',
      'microservices', 'terraform', 'serverless', 'linux', 'containers', 'site reliability',
      'cloud computing', 'distributed systems',
    ],
  },
  cybersecurity: {
    label: 'Cybersecurity & Threat Detection',
    terms: [
      'cybersecurity', 'cyber security', 'ethical hacking', 'threat detection',
      'cryptography', 'network security', 'zero trust', 'pen testing', 'penetration testing',
      'malware', 'vulnerability', 'infosec', 'firewall', 'security',
    ],
  },
  data_engineering: {
    label: 'Data Science & Big Data Systems',
    terms: [
      'data', 'data science', 'analytics', 'sql', 'postgresql', 'mongodb', 'big data',
      'pandas', 'data engineering', 'power bi', 'tableau', 'business intelligence',
      'spark', 'kafka', 'etl', 'data warehouse',
    ],
  },
  business_startups: {
    label: 'Startups, Venture & Business Growth',
    terms: [
      'startup', 'startups', 'entrepreneur', 'entrepreneurship', 'venture capital',
      'pitching', 'angel investors', 'business', 'product management', 'marketing',
      'leadership', 'fintech', 'growth', 'fundraising', 'incubator',
    ],
  },
  design_ux: {
    label: 'Product Design & UI/UX',
    terms: [
      'ui', 'ux', 'ui/ux', 'design', 'figma', 'user experience', 'user interface',
      'product design', 'typography', 'prototyping', 'wireframing', 'design systems',
    ],
  },
  mobile_dev: {
    label: 'Mobile Application Engineering',
    terms: [
      'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin', 'mobile apps',
      'cross-platform',
    ],
  },
};

/**
 * Normalizes an array of strings into a set of lower-case tokens and phrases.
 */
function extractTokens(arr = []) {
  const tokens = new Set();
  arr.forEach((item) => {
    if (!item) return;
    const str = String(item).toLowerCase().trim();
    tokens.add(str);
    str.split(/[\s,/-]+/).forEach((sub) => {
      if (sub.length > 2) tokens.add(sub);
    });
  });
  return tokens;
}

/**
 * Calculates semantic similarity score between user preferences and event characteristics.
 * Returns score (0.0 to 1.0) and matched concept clusters.
 */
function computeSemanticSimilarity(userProfile, eventData) {
  const userTokens = extractTokens([
    ...(userProfile.interests || []),
    ...(userProfile.skills || []),
  ]);

  const eventTokens = extractTokens([
    eventData.title || '',
    eventData.categorySlug || eventData.category || '',
    ...(eventData.tags || []),
    ...(eventData.skills || []),
    eventData.shortDescription || '',
  ]);

  const matchedClusters = [];
  let userClusterHits = 0;
  let sharedClusterHits = 0;

  for (const [clusterKey, cluster] of Object.entries(CONCEPT_CLUSTERS)) {
    const userMatches = cluster.terms.filter((term) => userTokens.has(term));
    const eventMatches = cluster.terms.filter((term) => eventTokens.has(term));

    if (userMatches.length > 0) {
      userClusterHits += 1;
      if (eventMatches.length > 0) {
        sharedClusterHits += 1;
        matchedClusters.push({
          key: clusterKey,
          label: cluster.label,
          userEvidence: userMatches.slice(0, 3),
          eventEvidence: eventMatches.slice(0, 3),
        });
      }
    }
  }

  if (userClusterHits === 0) {
    // If user has no specific cluster terms, check general term overlap
    let directOverlap = 0;
    userTokens.forEach((t) => {
      if (eventTokens.has(t)) directOverlap += 1;
    });
    return {
      score: Math.min(1.0, directOverlap * 0.25),
      matchedClusters: [],
      clusterCount: 0,
    };
  }

  // Score ratio based on shared concept clusters
  const score = Math.min(1.0, (sharedClusterHits / Math.max(1, userClusterHits)) * 0.8 + (matchedClusters.length > 0 ? 0.2 : 0));

  return {
    score: Math.round(score * 100) / 100,
    matchedClusters,
    clusterCount: matchedClusters.length,
  };
}

module.exports = {
  computeSemanticSimilarity,
  CONCEPT_CLUSTERS,
};
