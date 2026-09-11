// Gamification badge catalogue + rule evaluation.
const BADGES = [
  { code: 'EARLY_BIRD', name: 'Early Bird', icon: 'Bird', description: 'Registered for an event 7+ days before it starts', points: 0 },
  { code: 'EXPLORER', name: 'Explorer', icon: 'Compass', description: 'Registered for 3 different events', points: 0 },
  { code: 'CHECKED_IN', name: 'First Check-in', icon: 'CheckCircle2', description: 'Checked in to your first event', points: 0 },
  { code: 'TOP_NETWORKER', name: 'Top Networker', icon: 'Users', description: 'Made 3+ connections', points: 0 },
  { code: 'HACKATHON_HERO', name: 'Hackathon Hero', icon: 'Code2', description: 'Joined a hackathon event', points: 0 },
  { code: 'EVENT_CHAMPION', name: 'Event Champion', icon: 'Trophy', description: 'Earned 300+ points', points: 300 },
  { code: 'SOCIAL_BUTTERFLY', name: 'Social Butterfly', icon: 'MessageCircle', description: 'Sent 10+ live chat messages', points: 0 },
  { code: 'CERTIFIED', name: 'Certified Star', icon: 'Award', description: 'Earned your first certificate', points: 0 },
];

const POINTS = {
  REGISTRATION: 10,
  CHECK_IN: 50,
  SESSION_ATTEND: 20,
  POLL_ANSWER: 10,
  CHALLENGE: 100,
  CONNECTION: 15,
  CHAT: 2,
};

module.exports = { BADGES, POINTS };
