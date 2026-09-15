/* eslint-disable no-console */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { ticketCode, certificateId } = require('../utils/codes');

const User = require('../models/User');
const Category = require('../models/Category');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Speaker = require('../models/Speaker');
const Session = require('../models/Session');
const Volunteer = require('../models/Volunteer');
const Sponsor = require('../models/Sponsor');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const Certificate = require('../models/Certificate');
const Feedback = require('../models/Feedback');
const Waitlist = require('../models/Waitlist');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Favorite = require('../models/Favorite');
const PredictionOutcome = require('../models/PredictionOutcome');
const RecommendationInteraction = require('../models/RecommendationInteraction');
const RiskAssessmentHistory = require('../models/RiskAssessmentHistory');
const SeatHold = require('../models/SeatHold');
const SmartQueueAudit = require('../models/SmartQueueAudit');
const EventPrediction = require('../models/EventPrediction');
const EventPredictionSnapshot = require('../models/EventPredictionSnapshot');
const EventRiskAssessment = require('../models/EventRiskAssessment');
const EventRiskAlert = require('../models/EventRiskAlert');
const { PointActivity, UserBadge } = require('../models/Gamification');

const PASSWORD = 'Event@123';
const DEMO_ACCOUNTS = [
  { email: 'admin@eventsphere.demo', name: 'Aanya Administrator', role: 'admin', title: 'Platform Administrator', company: 'EventSphere', location: 'Mumbai' },
  { email: 'organizer@eventsphere.demo', name: 'Raj Malhotra', role: 'organizer', organizerStatus: 'approved', title: 'Founder & Event Director', company: 'Sphere Events', location: 'Nashik' },
  { email: 'attendee@eventsphere.demo', name: 'Aarav Verma', role: 'attendee', title: 'Final-year CS Student', company: 'KKWIEER Nashik', location: 'Nashik' },
  { email: 'volunteer@eventsphere.demo', name: 'Priya Deshmukh', role: 'volunteer', title: 'Operations Volunteer', company: 'Sphere Events', location: 'Nashik' },
  { email: 'speaker@eventsphere.demo', name: 'Dr. Meera Iyer', role: 'speaker', title: 'AI Research Lead', company: 'IIT Bombay', location: 'Mumbai' },
];

async function ensureDemoAccounts() {
  for (const account of DEMO_ACCOUNTS) {
    let user = await User.findOne({ email: account.email }).select('+password');
    if (!user) {
      user = new User({ ...account, password: PASSWORD, authProvider: 'local', isActive: true, onboardingCompleted: true });
    } else {
      user.password = PASSWORD;
      user.authProvider = 'local';
      user.isActive = true;
      user.role = account.role;
      if (account.organizerStatus) user.organizerStatus = account.organizerStatus;
    }
    await user.save();
  }
}

// Self-hosted, always-available cover images (served from client/public/images/events).
// Mapping from the previously hot-linked Unsplash IDs to bundled local assets so that
// covers never render blank — no external CDN / network dependency.
const LOCAL_COVERS = {
  'photo-1591453089816-0fbb971b454c': 'ai-innovation-summit',
  'photo-1504384308090-c894fdcc538d': 'technova-hackathon',
  'photo-1556761175-b413da4baf72': 'campus-startup-expo',
  'photo-1550751827-4bd374c3f58b': 'cyber-security-bootcamp',
  'photo-1493676304819-0d7a8d026dcf': 'annual-cultural-fest',
  'photo-1528605248644-14dd04022da1': 'nashik-developer-meetup',
  'photo-1542744173-8e7e53415bb0': 'corporate-leadership-summit',
  'photo-1461896836934-ffe607ba8211': 'sports-championship',
  'photo-1451187580459-43490279c0fa': 'cloud-devops-bootcamp',
  'photo-1561070791-36c11767b26a': 'design-thinking-sprint',
  'photo-1501386761578-eac5c94b800a': 'indie-music-night',
  'photo-1517245386807-bb43f82c33c4': 'research-scholars-symposium',
  'photo-1556761175-5973dc0f32e7': 'fintech-founders-roundtable',
  'photo-1633356122544-f134324a6cee': 'mern-stack-masterclass',
  'photo-1542751371-adc38448a05e': 'esports-arena-2026',
  'photo-1560179707-f14e90ef3623': 'ai-innovation-summit',
  'photo-1486406146926-c627a92ad1ab': 'campus-startup-expo',
};

const img = (id) => {
  const local = LOCAL_COVERS[id];
  if (local) return `/images/events/${local}.jpg`;
  // Any unmapped id falls back to a bundled cover so an image can never be blank.
  return '/images/events/ai-innovation-summit.jpg';
};

// Bundled illustrated avatars / sponsor logos (see scripts/generate-placeholder-assets.js).
// These replace the external api.dicebear.com and i.pravatar.cc URLs, which failed to
// load on restricted networks and left avatars and sponsor logos rendering blank.
const AVATAR_VARIANTS = 16;
const LOGO_VARIANTS = 12;

// Stable string hash so a given name always maps to the same asset.
const hash = (value) => {
  let h = 7;
  for (const ch of String(value)) h = (h * 31 + ch.codePointAt(0)) % 1000003;
  return h;
};
const pad = (n) => String(n).padStart(2, '0');

const avatar = (seed) => {
  const idx =
    typeof seed === 'number' && Number.isFinite(seed)
      ? Math.abs(Math.trunc(seed) - 1) % AVATAR_VARIANTS
      : hash(seed) % AVATAR_VARIANTS;
  return `/images/avatars/avatar-${pad(idx + 1)}.svg`;
};

// Deterministic sponsor "logo" from the bundled brand marks.
const logo = (name) => `/images/sponsors/logo-${pad((hash(name) % LOGO_VARIANTS) + 1)}.svg`;
const premium = (name) => `/premium-events/${name}.jpg`;
const PREMIUM_IMAGES = {
  aiSummit: premium('premium-ai-summit'),
  womenTech: premium('premium-women-tech'),
  roboticsLab: premium('premium-robotics-lab'),
  creativeFestival: premium('premium-creative-festival'),
  founderForum: premium('premium-founder-forum'),
};

const COORDS = {
  Nashik: [73.7898, 19.9975],
  Pune: [73.8567, 18.5204],
  Mumbai: [72.8777, 19.076],
  Bengaluru: [77.5946, 12.9716],
  Delhi: [77.209, 28.6139],
  Hyderabad: [78.4867, 17.385],
};

const day = (n, h = 9, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
};
const at = (base, dayOffset, h, min = 0, durMin = 60) => {
  const s = new Date(base);
  s.setDate(s.getDate() + dayOffset);
  s.setHours(h, min, 0, 0);
  const e = new Date(s.getTime() + durMin * 60000);
  return [s, e];
};

const POS = ['great', 'amazing', 'excellent', 'loved', 'awesome', 'fantastic', 'wonderful', 'inspiring', 'helpful', 'best'];
const NEG = ['bad', 'poor', 'disappointed', 'late', 'chaos', 'awful'];
function sentiment(rating, comment = '') {
  const c = comment.toLowerCase();
  const score = POS.reduce((a, w) => a + (c.includes(w) ? 1 : 0), 0) - NEG.reduce((a, w) => a + (c.includes(w) ? 1 : 0), 0);
  if (rating >= 4 && score >= 0) return 'positive';
  if (rating <= 2 || score < 0) return 'negative';
  return 'neutral';
}

const NAMES = [
  'Vivaan Kapoor', 'Aditya Shah', 'Sai Reddy', 'Arjun Nair', 'Karthik Rao', 'Rohan Mehta',
  'Ishan Gupta', 'Dev Patel', 'Yash Joshi', 'Diya Sharma', 'Saanvi Kulkarni', 'Ishita Bose',
  'Kavya Reddy', 'Riya Patel', 'Tara Menon', 'Anika Rao', 'Sneha Desai', 'Farhan Ali',
  'Kabir Singh', 'Manav Gupta', 'Nikhil Verma', 'Omkar Shinde', 'Pranav Joshi', 'Rahul Khanna',
  'Sameer Sheikh', 'Tanmay Bhat', 'Varun Gokhale', 'Harsh Agarwal', 'Gauri Pandit', 'Simran Kaur',
];
const INTEREST_POOL = ['AI/ML', 'Web Development', 'Cyber Security', 'Business', 'Startups', 'Sports', 'Cultural', 'Music', 'Networking', 'Cloud', 'Design', 'Data Science'];
const SKILL_POOL = ['React', 'Node.js', 'MERN', 'Python', 'TensorFlow', 'Docker', 'Kubernetes', 'Figma', 'Flutter', 'SQL', 'AWS', 'Java', 'Go', 'Next.js'];
const GOALS = ['collaboration', 'internship', 'job', 'co-founder', 'mentorship', 'friends'];
const CITIES = ['Nashik', 'Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Delhi'];

const pick = (arr, i) => arr[i % arr.length];
const rand = (seed) => {
  const x = Math.sin(seed * 99.13) * 10000;
  return x - Math.floor(x);
};

async function runSeed({ force = false, silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const existing = await User.countDocuments();
  if (existing > 0 && !force) {
    await ensureDemoAccounts();
    log('↷ Seed skipped (data already present). Use npm run seed to reset.');
    return;
  }

  log('🌱 Seeding EventSphere demo database…');
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), Event.deleteMany({}), Registration.deleteMany({}),
    Ticket.deleteMany({}), Payment.deleteMany({}), Speaker.deleteMany({}), Session.deleteMany({}),
    Volunteer.deleteMany({}), Sponsor.deleteMany({}), Notification.deleteMany({}), Message.deleteMany({}),
    Connection.deleteMany({}), Certificate.deleteMany({}), Feedback.deleteMany({}), Waitlist.deleteMany({}),
    Report.deleteMany({}), AuditLog.deleteMany({}), Announcement.deleteMany({}), Poll.deleteMany({}),
    Question.deleteMany({}), Favorite.deleteMany({}), PointActivity.deleteMany({}), UserBadge.deleteMany({}),
    PredictionOutcome.deleteMany({}), RecommendationInteraction.deleteMany({}), RiskAssessmentHistory.deleteMany({}),
    SeatHold.deleteMany({}), SmartQueueAudit.deleteMany({}), EventPrediction.deleteMany({}),
    EventPredictionSnapshot.deleteMany({}), EventRiskAssessment.deleteMany({}), EventRiskAlert.deleteMany({}),
  ]);

  // ─────────────── Categories ───────────────
  const categoryData = [
    ['Hackathon', 'Code2', '#7c3aed', 'Build, break and ship in a race against time'],
    ['Workshop', 'Wrench', '#0891b2', 'Hands-on, instructor-led deep dives'],
    ['Conference', 'Mic2', '#4f46e5', 'Multi-track talks, keynotes and expos'],
    ['Cultural', 'Palmtree', '#db2777', 'Music, dance, art and celebration'],
    ['Sports', 'Trophy', '#16a34a', 'Tournaments and athletic championships'],
    ['Networking', 'Users', '#d97706', 'Meet peers, mentors and founders'],
    ['Seminar', 'Presentation', '#0d9488', 'Research talks and knowledge sessions'],
    ['Corporate', 'Briefcase', '#334155', 'Leadership, L&D and company events'],
    ['Meetup', 'Coffee', '#ea580c', 'Casual community gatherings'],
    ['Tech Talk', 'Cpu', '#2563eb', 'Focused technology sessions'],
  ];
  const catMap = {};
  for (const [name, icon, color, description] of categoryData) {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    const c = await Category.create({ name, slug, icon, color, description });
    catMap[slug] = c;
  }

  // ─────────────── Users ───────────────
  // Plain password — the User model pre-save hook performs the bcrypt hashing.
  const mkUser = (over) => ({ password: PASSWORD, isActive: true, points: 0, ...over });

  const admin = await User.create(mkUser({
    name: 'Aanya Administrator', email: 'admin@eventsphere.demo', role: 'admin',
    title: 'Platform Administrator', company: 'EventSphere', location: 'Mumbai',
    bio: 'Keeps EventSphere safe, fair and running smoothly.', avatar: avatar(47),
    interests: ['Business'], skills: ['Operations'], onboardingCompleted: true,
  }));
  const organizer = await User.create(mkUser({
    name: 'Raj Malhotra', email: 'organizer@eventsphere.demo', role: 'organizer',
    organizerStatus: 'approved', title: 'Founder & Event Director', company: 'Sphere Events',
    location: 'Nashik', website: 'https://sphereevents.demo',
    bio: '10+ years organizing tech conferences, hackathons and college fests across Maharashtra.',
    avatar: avatar(12), interests: ['Startups', 'Business', 'Networking'], skills: ['Event Ops', 'Sponsorship'],
    onboardingCompleted: true,
    social: { linkedin: 'https://linkedin.com', twitter: 'https://x.com' },
  }));
  const attendee = await User.create(mkUser({
    name: 'Aarav Verma', email: 'attendee@eventsphere.demo', role: 'attendee',
    title: 'Final-year CS Student', company: 'KKWIEER Nashik', location: 'Nashik',
    bio: 'MERN developer in the making. I build side-projects, chase hackathons and love meeting builders.',
    avatar: avatar(11), interests: ['AI/ML', 'Web Development', 'Startups', 'Cyber Security'],
    skills: ['React', 'Node.js', 'MERN', 'Python'], networkingGoal: 'collaboration',
    onboardingCompleted: true,
    social: { github: 'https://github.com', linkedin: 'https://linkedin.com' },
  }));
  const volunteer = await User.create(mkUser({
    name: 'Priya Deshmukh', email: 'volunteer@eventsphere.demo', role: 'volunteer',
    title: 'Operations Volunteer', company: 'Sphere Events', location: 'Nashik',
    bio: 'Third-year EE student volunteering at tech events around campus.', avatar: avatar(45),
    interests: ['Web Development', 'Music'], skills: ['Communication', 'First Aid'], onboardingCompleted: true,
  }));
  const speakerUser = await User.create(mkUser({
    name: 'Dr. Meera Iyer', email: 'speaker@eventsphere.demo', role: 'speaker',
    title: 'AI Research Lead', company: 'IIT Bombay', location: 'Mumbai',
    bio: 'Researcher in applied ML and generative AI. Keynote speaker and open-source contributor.',
    avatar: avatar(44), interests: ['AI/ML', 'Data Science'], skills: ['TensorFlow', 'Python', 'Research'],
    onboardingCompleted: true,
  }));
  const organizer2 = await User.create(mkUser({
    name: 'Neha Patil', email: 'neha@campuscore.demo', role: 'organizer', organizerStatus: 'approved',
    title: 'Founder', company: 'CampusCore', location: 'Pune', avatar: avatar(49),
    bio: 'Building communities and esports culture across Maharashtra colleges.',
    interests: ['Sports', 'Startups', 'Gaming'], onboardingCompleted: true,
  }));
  const pendingOrganizer = await User.create(mkUser({
    name: 'Rohit Jain', email: 'rohit.jain@eventsphere.demo', role: 'organizer', organizerStatus: 'pending',
    title: 'Student Club President', company: 'CSI Student Chapter', location: 'Nashik', avatar: avatar(15),
    organizerApplication: { organization: 'CSI Student Chapter', reason: 'We want to run our annual technical fest on EventSphere.', appliedAt: new Date() },
    interests: ['Web Development'], onboardingCompleted: true,
  }));

  const firsts = NAMES.map((n) => n.split(' ')[0]);
  const lasts = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Rao', 'Mehta', 'Gupta', 'Joshi', 'Kulkarni', 'Bose', 'Iyer', 'Singh', 'Khanna', 'Sheikh', 'Pandit', 'Kaur', 'Deshpande', 'Menon', 'Agarwal'];
  const attendees = [];
  const TOTAL_GENERATED = 120;
  for (let i = 0; i < TOTAL_GENERATED; i += 1) {
    const interests = [];
    for (let k = 0; k < 3; k += 1) if (rand(i * 7 + k) > 0.35) interests.push(INTEREST_POOL[(i + k) % INTEREST_POOL.length]);
    const skills = [];
    for (let k = 0; k < 2; k += 1) if (rand(i * 3 + k + 20) > 0.4) skills.push(SKILL_POOL[(i * 2 + k) % SKILL_POOL.length]);
    const name = `${firsts[i % firsts.length]} ${lasts[(i * 7) % lasts.length]}`;
    // eslint-disable-next-line no-await-in-loop
    attendees.push(await User.create(mkUser({
      name,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}.${i}@eventsphere.demo`,
      role: 'attendee',
      title: pick(['Student', 'Developer', 'Designer', 'Founder', 'Data Analyst', 'Product Manager'], i),
      company: pick(['KKWIEER', 'VIT Pune', 'TCS', 'Infosys', 'Freelance', 'IIT Bombay', 'StartupHQ', 'COEP'], i),
      location: CITIES[i % CITIES.length],
      avatar: avatar(((i * 3 + 5) % 70) + 1),
      interests: [...new Set(interests)],
      skills,
      networkingGoal: GOALS[i % GOALS.length],
      onboardingCompleted: true,
    })));
  }
  const pool = [attendee, ...attendees];

  // ─────────────── Speakers ───────────────
  const speakerData = [
    { name: 'Dr. Meera Iyer', user: speakerUser._id, title: 'AI Research Lead', company: 'IIT Bombay', photo: avatar(44), skills: ['Generative AI', 'LLMs', 'Research'], featured: true, bio: 'Leads applied ML research, has 40+ publications and mentors dozens of student AI projects.' },
    { name: 'Rajesh Krishnan', title: 'Chief Technology Officer', company: 'CloudNova', photo: avatar(13), skills: ['Cloud', 'Distributed Systems'], bio: 'Scaled platforms to 50M users; speaks on cloud architecture and reliability.' },
    { name: 'Sneha Kulkarni', title: 'Principal Security Engineer', company: 'ThreatGuard', photo: avatar(48), skills: ['Pen Testing', 'Network Security'], bio: 'Bug bounty hunter turned security leader protecting Indian fintechs.' },
    { name: 'Marcus D’Souza', title: 'Venture Partner', company: 'FirstSpark Ventures', photo: avatar(14), skills: ['Fundraising', 'Product Strategy'], bio: 'Early-stage investor in 30+ campus startups across India.' },
    { name: 'Ananya Roy', title: 'Design Director', company: 'PixelForge', photo: avatar(41), skills: ['UX Research', 'Design Systems'], bio: 'Design leader crafting calm, accessible products used by millions.' },
    { name: 'Vikram Singh', title: 'Developer Advocate', company: 'DevForge', photo: avatar(16), skills: ['React', 'DevRel', 'TypeScript'], bio: 'You have watched his reels on shipping faster with modern JS.' },
    { name: 'Fatima Sheikh', title: 'Head of Product', company: 'FinEdge', photo: avatar(40), skills: ['Product', 'Fintech'], bio: 'Builds payments products for the next 100 million Indians.' },
    { name: 'Arjun Pillai', title: 'Open Source Maintainer', company: 'Stackly', photo: avatar(17), skills: ['Go', 'Kubernetes', 'OSS'], bio: 'Maintains infrastructure tools with 20k+ GitHub stars.' },
  ];
  const speakers = [];
  for (const s of speakerData) {
    // eslint-disable-next-line no-await-in-loop
    speakers.push(await Speaker.create(s));
  }

  // ─────────────── Events ───────────────
  const venue = (name, address, city, online = false, url = '') => ({
    name, address, city,
    onlineUrl: url || (online ? 'https://meet.eventsphere.demo/live' : ''),
    coordinates: { type: 'Point', coordinates: COORDS[city] || COORDS.Nashik },
  });

  const events = {};
  const mkEvent = async (e) => {
    const ev = await Event.create({
      shortDescription: '',
      description: '',
      tags: [],
      ticketTypes: [],
      faq: [],
      customRegistrationFields: [],
      settings: { allowWaitlist: true, showAttendeeList: true, requireRegistrationApproval: false, certificatesIssued: false },
      ...e,
    });
    events[ev.slug] = ev;
    return ev;
  };

  await mkEvent({
    title: 'AI Innovation Summit 2026', slug: 'ai-innovation-summit',
    shortDescription: '2-day summit on generative AI with keynotes, workshops, demos and networking.',
    description: 'The AI Innovation Summit brings together 250+ students, researchers and builders for two power-packed days of generative AI. Day 1 covers foundation models, agents and responsible AI; Day 2 is a hands-on build day with mentor support from industry teams.\n\nEvery attendee gets a QR pass, live event feed, gamification rewards and a verifiable digital certificate.',
    coverImage: PREMIUM_IMAGES.aiSummit,
    images: [PREMIUM_IMAGES.aiSummit, PREMIUM_IMAGES.womenTech, PREMIUM_IMAGES.roboticsLab],
    category: catMap.conference._id, categorySlug: 'conference',
    tags: ['AI/ML', 'Generative AI', 'Data Science', 'Networking', 'Startups'],
    eventType: 'offline', startDate: day(3, 9), endDate: day(4, 17), timezone: 'Asia/Kolkata',
    registrationDeadline: day(2, 23),
    venue: venue('Main Auditorium, KKWIEER', 'Nashik-Pune Road, Nashik', 'Nashik'),
    capacity: 250, price: 0,
    ticketTypes: [
      { name: 'General Pass', description: 'Full 2-day access, free', price: 0, quantity: 200, soldCount: 0 },
      { name: 'Pro Pass', description: 'Swag kit, lunch both days, workshop seat', price: 399, quantity: 50, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'College & Year', type: 'text', required: true, placeholder: 'e.g. KKWIEER, Third Year' },
      { label: 'AI Experience', type: 'radio', required: true, options: ['Beginner', 'Intermediate', 'Advanced'] },
      { label: 'Topics of interest', type: 'checkbox', required: false, options: ['LLMs', 'Computer Vision', 'Agents', 'MLOps', 'Ethics'] },
      { label: 'Dietary preference', type: 'select', required: false, options: ['Veg', 'Non-veg', 'Vegan'] },
    ],
    faq: [
      { q: 'Who should attend?', a: 'Any student or professional curious about applied AI — beginners welcome.' },
      { q: 'Will I get a certificate?', a: 'Yes, checked-in attendees receive a verifiable digital certificate within 48 hours.' },
      { q: 'Are laptops needed?', a: 'Required for Day 2 workshops; bring charger and a Google/GitHub account.' },
      { q: 'Is food included?', a: 'Pro Pass includes lunch; all attendees get tea/coffee and snacks.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'TechNova Hackathon', slug: 'technova-hackathon',
    shortDescription: '36-hour national-level hackathon. Build, pitch and win ₹2L+ in prizes.',
    description: 'TechNova is a 36-hour hackathon for student teams across India. Pick a problem statement across AI, fintech, sustainability or developer tools, build a working prototype, and present it to judges from top startups and product companies.\n\nIncludes API credits, mentor office hours, midnight snacks, swag and ₹2,00,000+ in cash prizes.',
    coverImage: PREMIUM_IMAGES.roboticsLab,
    images: [PREMIUM_IMAGES.roboticsLab, PREMIUM_IMAGES.aiSummit, img('photo-1504384308090-c894fdcc538d')],
    category: catMap.hackathon._id, categorySlug: 'hackathon',
    tags: ['Hackathon', 'AI/ML', 'Web Development', 'Startups', 'Competition'],
    eventType: 'offline', startDate: day(12, 18), endDate: day(14, 12),
    venue: venue('Innovation Labs, COEP', 'Shivajinagar, Pune', 'Pune'),
    capacity: 500, price: 0,
    ticketTypes: [
      { name: 'Student Hacker', description: 'Free entry for teams of 2–4', price: 0, quantity: 400, soldCount: 0 },
      { name: 'Pro Hacker Pass', description: 'Swag, meals all 3 days, API credits', price: 199, quantity: 100, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Team Name', type: 'text', required: false, placeholder: 'Solo participants welcome' },
      { label: 'Experience Level', type: 'radio', required: true, options: ['Beginner', 'Intermediate', 'Advanced'] },
      { label: 'Technologies', type: 'checkbox', required: false, options: ['MERN', 'Python', 'AI/ML', 'Mobile', 'Blockchain'] },
    ],
    faq: [
      { q: 'Can I participate solo?', a: 'Yes — we help solo participants form teams before the sprint.' },
      { q: 'Is it overnight?', a: 'Yes, the venue stays open with security, dinner and breakfast provided.' },
      { q: 'Who owns the IP?', a: 'Your team owns everything you build.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'Campus Startup Expo', slug: 'campus-startup-expo',
    shortDescription: '60 student startups, 20 investors, one expo floor. Demo day meets networking.',
    description: 'The Campus Startup Expo is Maharashtra’s largest student-founder showcase: 60 early-stage teams, investor 1:1 slots, founder panels, and a hiring corner for internships. Free for students; teams pitch for the Best Campus Startup award.',
    coverImage: PREMIUM_IMAGES.founderForum,
    images: [PREMIUM_IMAGES.founderForum, PREMIUM_IMAGES.womenTech, img('photo-1556761175-b413da4baf72')],
    category: catMap.networking._id, categorySlug: 'networking',
    tags: ['Startups', 'Business', 'Networking', 'Internship'],
    eventType: 'offline', startDate: day(6, 10), endDate: day(6, 18),
    venue: venue('Bombay Exhibition Centre, Hall 2', 'Goregaon, Mumbai', 'Mumbai'),
    capacity: 300, price: 0,
    ticketTypes: [{ name: 'Student Visitor', description: 'Expo + panels access', price: 0, quantity: 300, soldCount: 0 }],
    customRegistrationFields: [{ label: 'College', type: 'text', required: true }, { label: 'Are you pitching?', type: 'radio', required: false, options: ['Yes', 'No, just exploring'] }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'Cyber Security Bootcamp', slug: 'cyber-security-bootcamp',
    shortDescription: 'Sold out! Hands-on ethical hacking and CTF training with ThreatGuard engineers.',
    description: 'An intensive one-day bootcamp covering web app security, network attacks, and a capture-the-flag contest. Seats are intentionally limited to 40 for a hands-on lab experience. Join the waitlist to grab released seats automatically.',
    coverImage: img('photo-1550751827-4bd374c3f58b'),
    category: catMap.workshop._id, categorySlug: 'workshop',
    tags: ['Cyber Security', 'Ethical Hacking', 'CTF', 'Networking'],
    eventType: 'offline', startDate: day(4, 9, 30), endDate: day(4, 17),
    venue: venue('Computer Center, KKWIEER', 'Nashik-Pune Road, Nashik', 'Nashik'),
    capacity: 40, price: 299,
    ticketTypes: [{ name: 'Lab Seat', description: 'Laptop required; lab access included', price: 299, quantity: 40, soldCount: 0 }],
    customRegistrationFields: [
      { label: 'Laptop OS', type: 'select', required: true, options: ['Windows', 'macOS', 'Linux'] },
      { label: 'Kali Linux installed?', type: 'radio', required: true, options: ['Yes', 'No', 'Need help'] },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Rhythm & Hues — Annual Cultural Fest', slug: 'annual-cultural-fest',
    shortDescription: 'Three nights of music, dance, drama and art. 800+ students, one unforgettable fest.',
    description: 'The annual cultural fest features battle of the bands, dance championships, stand-up, an art walk and a headline DJ night. All participants receive digital certificates and the winning teams take home trophies and cash prizes.',
    coverImage: PREMIUM_IMAGES.creativeFestival,
    images: [PREMIUM_IMAGES.creativeFestival, img('photo-1493676304819-0d7a8d026dcf'), img('photo-1501386761578-eac5c94b800a')],
    category: catMap.cultural._id, categorySlug: 'cultural',
    tags: ['Cultural', 'Music', 'Dance', 'Arts', 'Networking'],
    eventType: 'offline', startDate: day(-60, 17), endDate: day(-58, 22),
    venue: venue('Open Air Theatre, KKWIEER', 'Nashik', 'Nashik'),
    capacity: 200, price: 0,
    ticketTypes: [{ name: 'Festival Pass', description: 'All 3 days', price: 0, quantity: 800, soldCount: 0 }],
    organizer: organizer._id, status: 'completed', approvalStatus: 'approved', featured: false,
  });

  await mkEvent({
    title: 'Nashik Developer Meetup (Live Now)', slug: 'nashik-developer-meetup',
    shortDescription: 'Happening now: lightning talks, live Q&A, polls and an AMA with local developers.',
    description: 'Our monthly Nashik Developer Meetup is LIVE! Follow the live feed for schedule updates, participate in polls, ask questions during Q&A and climb the event leaderboard.',
    coverImage: img('photo-1528605248644-14dd04022da1'),
    category: catMap.meetup._id, categorySlug: 'meetup',
    tags: ['Web Development', 'Networking', 'Tech Talk', 'Community'],
    eventType: 'hybrid', startDate: day(0, new Date().getHours() - 1), endDate: day(0, new Date().getHours() + 4),
    venue: venue('The Hive Co-working', 'College Road, Nashik', 'Nashik', true, 'https://meet.eventsphere.demo/dev-meetup'),
    capacity: 120, price: 0,
    ticketTypes: [{ name: 'Community Pass', description: 'Free entry', price: 0, quantity: 120, soldCount: 0 }],
    organizer: organizer._id, status: 'live', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'Corporate Leadership Summit', slug: 'corporate-leadership-summit',
    shortDescription: 'Executive leadership program for high-potential managers (completed edition).',
    description: 'A sold-out leadership development summit covering decision frameworks, difficult conversations and leading through change. Included 360-degree assessments and executive coaching circles.',
    coverImage: PREMIUM_IMAGES.womenTech,
    images: [PREMIUM_IMAGES.womenTech, PREMIUM_IMAGES.founderForum, img('photo-1542744173-8e7e53415bb0')],
    category: catMap.corporate._id, categorySlug: 'corporate',
    tags: ['Business', 'Leadership', 'Corporate', 'Networking'],
    eventType: 'offline', startDate: day(-30, 9), endDate: day(-30, 17),
    venue: venue('Taj Lakeside Convention Hall', 'Hyderabad', 'Hyderabad'),
    capacity: 150, price: 1999,
    ticketTypes: [{ name: 'Executive Pass', description: 'Includes assessment, lunch & workbook', price: 1999, quantity: 150, soldCount: 0 }],
    organizer: organizer._id, status: 'completed', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Inter-Collegiate Sports Championship', slug: 'sports-championship',
    shortDescription: 'Cricket, football, athletics and esports across 3 days. 400 athletes.',
    description: 'The inter-collegiate championship brings 400 athletes across cricket, football, athletics and table tennis, with an esports exhibition track. Register individually or as a team captain.',
    coverImage: img('photo-1461896836934-ffe607ba8211'),
    category: catMap.sports._id, categorySlug: 'sports',
    tags: ['Sports', 'Fitness', 'Networking', 'Esports'],
    eventType: 'offline', startDate: day(15, 7), endDate: day(17, 20),
    venue: venue('University Sports Complex', 'Gangapur Road, Nashik', 'Nashik'),
    capacity: 400, price: 0,
    ticketTypes: [{ name: 'Athlete Pass', price: 0, quantity: 400, soldCount: 0 }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Cloud & DevOps Bootcamp', slug: 'cloud-devops-bootcamp',
    shortDescription: 'Docker, Kubernetes and CI/CD from zero to deployed pipeline.',
    description: 'A one-day hands-on bootcamp: containerize an app, deploy to Kubernetes, wire GitHub Actions, and monitor with Grafana. Bring a laptop; cloud credits provided.',
    coverImage: img('photo-1451187580459-43490279c0fa'),
    category: catMap.workshop._id, categorySlug: 'workshop',
    tags: ['Cloud', 'DevOps', 'Docker', 'Kubernetes', 'AWS'],
    eventType: 'offline', startDate: day(8, 9), endDate: day(8, 17, 30),
    venue: venue('Seminar Hall 3, VIT Pune', 'Pune', 'Pune'),
    capacity: 60, price: 599,
    ticketTypes: [{ name: 'Bootcamp Seat', price: 599, quantity: 60, soldCount: 0, description: 'Cloud credits + lunch included' }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Design Thinking Sprint', slug: 'design-thinking-sprint',
    shortDescription: 'A weekend sprint from user interview to clickable prototype.',
    description: 'Learn design thinking by doing: interview real users, map journeys, sketch, prototype in Figma and present. Perfect for developers who want to design better products.',
    coverImage: img('photo-1561070791-36c11767b26a'),
    category: catMap.workshop._id, categorySlug: 'workshop',
    tags: ['Design', 'UI/UX', 'Product', 'Startups'],
    eventType: 'offline', startDate: day(20, 10), endDate: day(21, 16),
    venue: venue('PixelForge Studio', 'Indiranagar, Bengaluru', 'Bengaluru'),
    capacity: 80, price: 0,
    ticketTypes: [{ name: 'Sprint Pass', price: 0, quantity: 80, soldCount: 0 }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Indie Music Night', slug: 'indie-music-night',
    shortDescription: 'Five indie acts, one rooftop, zero autoplay. Live music under the stars.',
    description: 'A curated evening of independent music featuring five acts from the Nashik-Pune circuit, food trucks and an open mic warm-up. Limited rooftop capacity — grab your pass.',
    coverImage: img('photo-1501386761578-eac5c94b800a'),
    category: catMap.cultural._id, categorySlug: 'cultural',
    tags: ['Music', 'Cultural', 'Networking', 'Fun'],
    eventType: 'offline', startDate: day(9, 18), endDate: day(9, 22, 30),
    venue: venue('Skydeck Rooftop', 'College Road, Nashik', 'Nashik'),
    capacity: 350, price: 249,
    ticketTypes: [
      { name: 'Early Bird', price: 249, quantity: 150, soldCount: 0 },
      { name: 'At the Gate', price: 349, quantity: 200, soldCount: 0 },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Research Scholars Symposium', slug: 'research-scholars-symposium',
    shortDescription: 'Paper presentations and keynotes for emerging researchers.',
    description: 'A symposium for postgraduate and final-year research scholars, featuring paper presentations, a poster session and keynotes from leading labs.',
    coverImage: img('photo-1517245386807-bb43f82c33c4'),
    category: catMap.seminar._id, categorySlug: 'seminar',
    tags: ['Research', 'Data Science', 'AI/ML', 'Academia'],
    eventType: 'hybrid', startDate: day(25, 9), endDate: day(25, 17),
    venue: venue('IISc Auditorium', 'Bengaluru', 'Bengaluru', true, 'https://meet.eventsphere.demo/symposium'),
    capacity: 100, price: 0,
    ticketTypes: [{ name: 'Delegate Pass', price: 0, quantity: 100, soldCount: 0 }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'Fintech Founders Roundtable', slug: 'fintech-founders-roundtable',
    shortDescription: 'An invite-only evening with fintech founders and operators.',
    description: 'A curated roundtable dinner for 40 fintech founders and operators: candid conversations on regulation, distribution and fundraising, under Chatham House Rules.',
    coverImage: PREMIUM_IMAGES.founderForum,
    images: [PREMIUM_IMAGES.founderForum, PREMIUM_IMAGES.womenTech, img('photo-1556761175-5973dc0f32e7')],
    category: catMap.networking._id, categorySlug: 'networking',
    tags: ['Startups', 'Business', 'Fintech', 'Networking'],
    eventType: 'offline', startDate: day(5, 18), endDate: day(5, 21),
    venue: venue('The Quorum Club', 'Bandra Kurla Complex, Mumbai', 'Mumbai'),
    capacity: 40, price: 0,
    ticketTypes: [{ name: 'Invited Guest', price: 0, quantity: 40, soldCount: 0 }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'MERN Stack Masterclass (Online)', slug: 'mern-stack-masterclass',
    shortDescription: 'Go from React basics to deploying a full-stack MERN app in 3 hours.',
    description: 'A fast-moving online masterclass: React + Tailwind front end, Express + MongoDB API, authentication, deployment and the patterns professionals actually use. Stream link is shared 1 hour before start.',
    coverImage: img('photo-1633356122544-f134324a6cee'),
    category: catMap['tech-talk']._id, categorySlug: 'tech-talk',
    tags: ['Web Development', 'MERN', 'React', 'Node.js'],
    eventType: 'online', startDate: day(14, 19), endDate: day(14, 22),
    venue: { name: 'Online (Zoom)', address: '', city: '', onlineUrl: 'https://meet.eventsphere.demo/mern', coordinates: undefined },
    capacity: 500, price: 0,
    ticketTypes: [{ name: 'Online Seat', price: 0, quantity: 500, soldCount: 0 }],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved',
  });

  await mkEvent({
    title: 'E-Sports Arena 2026', slug: 'esports-arena-2026',
    shortDescription: 'BGMI, Valorant and FIFA campus tournament with ₹1L prize pool — awaiting approval.',
    description: 'CampusCore presents E-Sports Arena, a two-day inter-collegiate esports tournament with casters, live finals on the big screen and ₹1,00,000 in prizes. College ID required.',
    coverImage: img('photo-1542751371-adc38448a05e'),
    category: catMap.sports._id, categorySlug: 'sports',
    tags: ['Sports', 'Esports', 'Gaming', 'Networking'],
    eventType: 'offline', startDate: day(30, 10), endDate: day(31, 20),
    venue: venue('Campus Arena', 'FC Road, Pune', 'Pune'),
    capacity: 200, price: 149,
    ticketTypes: [{ name: 'Player Pass', price: 149, quantity: 120, soldCount: 0 }, { name: 'Spectator Pass', price: 99, quantity: 80, soldCount: 0 }],
    riskFlags: ['External game publisher branding — IP review suggested', 'Gaming venue requires power & network capacity check'],
    organizer: organizer2._id, status: 'published', approvalStatus: 'pending', featured: false,
  });

  await mkEvent({
    title: 'AI in Healthcare Summit', slug: 'ai-healthcare-summit',
    shortDescription: 'How AI is reshaping diagnostics, drug discovery and patient care — with live demos.',
    description: 'A one-day summit for med-tech founders, clinicians and ML engineers exploring applied AI in healthcare: medical imaging, clinical decision support, drug discovery and responsible deployment. Features a live demo of an AI triage assistant and a clinician-in-the-loop panel.\n\nAttendees receive a verifiable certificate and access to the demo repositories.',
    coverImage: '/images/events/ai-healthcare-summit.jpg',
    category: catMap.conference._id, categorySlug: 'conference',
    tags: ['AI/ML', 'Healthcare', 'Data Science', 'Startups', 'MedTech'],
    eventType: 'hybrid', startDate: day(18, 9), endDate: day(18, 18), timezone: 'Asia/Kolkata',
    registrationDeadline: day(17, 23),
    venue: venue('Narayana Health Convention Centre', 'Hosur Road, Bengaluru', 'Bengaluru', true, 'https://meet.eventsphere.demo/ai-health'),
    capacity: 180, price: 0,
    ticketTypes: [
      { name: 'Clinician Pass', description: 'Full day + CME points', price: 0, quantity: 120, soldCount: 0 },
      { name: 'Pro Pass', description: 'Workshop + datasets + lunch', price: 499, quantity: 60, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Role', type: 'select', required: true, options: ['Clinician', 'Engineer', 'Researcher', 'Founder', 'Student'] },
      { label: 'Experience with ML', type: 'radio', required: true, options: ['None', 'Beginner', 'Intermediate', 'Advanced'] },
    ],
    faq: [
      { q: 'Do I need medical domain knowledge?', a: 'No — sessions span both clinical and technical tracks with beginner-friendly intros.' },
      { q: 'Is this CME accredited?', a: 'The Clinician Pass includes continuing medical education credits.' },
      { q: 'Will datasets be shared?', a: 'Curated public datasets and demo notebooks are shared with Pro Pass holders.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'Women in Tech Conference 2026', slug: 'women-in-tech-conference',
    shortDescription: 'Celebrating and accelerating women in engineering, product and leadership.',
    description: 'A flagship conference spotlighting women technologists: keynotes from senior leaders, technical deep dives, a mentorship lounge and a hiring fair with 30+ companies. Open to everyone who supports building inclusive teams.\n\nIncludes scholarships for 100 women students.',
    coverImage: '/images/events/women-in-tech-conference.jpg',
    category: catMap.conference._id, categorySlug: 'conference',
    tags: ['Women in Tech', 'Diversity', 'Leadership', 'Networking', 'Careers'],
    eventType: 'offline', startDate: day(22, 9, 30), endDate: day(23, 17), timezone: 'Asia/Kolkata',
    venue: venue('NCPA, Nariman Point', 'Mumbai', 'Mumbai'),
    capacity: 350, price: 0,
    ticketTypes: [
      { name: 'Student Scholarship', description: 'Free for women students', price: 0, quantity: 100, soldCount: 0 },
      { name: 'Standard Pass', description: 'All keynotes + expo', price: 0, quantity: 200, soldCount: 0 },
      { name: 'Pro Pass', description: 'Mentorship lounge + workshops', price: 299, quantity: 50, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Career stage', type: 'select', required: true, options: ['Student', 'Early career', 'Mid career', 'Senior', 'Executive'] },
      { label: 'Seeking mentorship?', type: 'radio', required: false, options: ['Yes', 'No'] },
    ],
    faq: [
      { q: 'Is this only for women?', a: 'No — everyone is welcome. The content and mentorship prioritize women technologists.' },
      { q: 'How do I apply for a scholarship?', a: 'Choose the Student Scholarship pass and complete the short form at registration.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: true,
  });

  await mkEvent({
    title: 'Startup Demo Day', slug: 'startup-demo-day',
    shortDescription: 'Twelve early-stage teams. Five minutes each. One room full of investors.',
    description: 'Startup Demo Day is the culmination of a 10-week accelerator batch. Twelve teams pitch live to a room of angels, VCs and corporate innovation heads, followed by curated 1:1 founder–investor meetings and an after-party.\n\nInvestors register for the investor pass; founders apply with their deck.',
    coverImage: '/images/events/startup-demo-day.jpg',
    category: catMap.networking._id, categorySlug: 'networking',
    tags: ['Startups', 'Pitch', 'Investors', 'Networking', 'Venture'],
    eventType: 'offline', startDate: day(11, 16), endDate: day(11, 21),
    venue: venue('Rise Mumbai, Lower Parel', 'Mumbai', 'Mumbai'),
    capacity: 220, price: 0,
    ticketTypes: [
      { name: 'Founder Pass', description: 'Apply with your pitch deck', price: 0, quantity: 40, soldCount: 0 },
      { name: 'Investor Pass', description: 'Verified investors & funds', price: 0, quantity: 60, soldCount: 0 },
      { name: 'General Attendee', description: 'Watch the pitches + after-party', price: 199, quantity: 120, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Company / fund', type: 'text', required: false },
      { label: 'Deck link', type: 'text', required: false, placeholder: 'Founders only' },
    ],
    faq: [
      { q: 'How do I pitch?', a: 'Apply with the Founder Pass and share your deck — the top 12 are selected.' },
      { q: 'Are recordings shared?', a: 'Pitch recordings are shared with registered investors only.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: false,
  });

  await mkEvent({
    title: 'Robotics & IoT Workshop', slug: 'robotics-workshop',
    shortDescription: 'Build a line-following robot and a smart-home sensor kit from scratch.',
    description: 'A hands-on two-day workshop where teams assemble and program a line-following robot and an IoT weather station using ESP32 and Arduino. Covers sensors, actuators, motor control, embedded C and cloud dashboards. Kits are included in the ticket price.',
    coverImage: '/images/events/robotics-workshop.jpg',
    category: catMap.workshop._id, categorySlug: 'workshop',
    tags: ['Robotics', 'IoT', 'Embedded', 'Arduino', 'Hardware'],
    eventType: 'offline', startDate: day(26, 9), endDate: day(27, 17),
    venue: venue('Innovation Tinker Lab, KKWIEER', 'Nashik-Pune Road, Nashik', 'Nashik'),
    capacity: 60, price: 799,
    ticketTypes: [
      { name: 'Standard Kit', description: 'Arduino kit + all components', price: 799, quantity: 40, soldCount: 0 },
      { name: 'Pro Kit', description: 'ESP32 + IoT add-ons + cloud credits', price: 1299, quantity: 20, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Programming experience', type: 'radio', required: true, options: ['None', 'Python', 'C/C++', 'Both'] },
      { label: 'Team size', type: 'select', required: false, options: ['Solo', 'Pair', 'Trio'] },
    ],
    faq: [
      { q: 'Do I need my own laptop?', a: 'Yes, with the Arduino IDE preinstalled — setup guides are emailed after registration.' },
      { q: 'Can I keep the kit?', a: 'Yes, the hardware kit is yours to take home.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: false,
  });

  await mkEvent({
    title: 'Comedy Open Mic Night', slug: 'comedy-open-mic-night',
    shortDescription: 'Twelve new comics. Five minutes each. Laughs guaranteed.',
    description: 'A monthly open-mic comedy night spotlighting up-and-coming comics from across the city. Twelve acts get five minutes each, judged by the audience for the People’s Choice slot. Come early — the house packs out fast.',
    coverImage: '/images/events/comedy-open-mic-night.jpg',
    category: catMap.cultural._id, categorySlug: 'cultural',
    tags: ['Comedy', 'Stand-up', 'Cultural', 'Fun', 'Nightlife'],
    eventType: 'offline', startDate: day(7, 19), endDate: day(7, 22),
    venue: venue('The Comedy Cellar', 'Koregaon Park, Pune', 'Pune'),
    capacity: 120, price: 299,
    ticketTypes: [
      { name: 'Early Bird', price: 249, quantity: 60, soldCount: 0 },
      { name: 'Regular', price: 299, quantity: 60, soldCount: 0 },
    ],
    customRegistrationFields: [
      { label: 'Performing?', type: 'radio', required: false, options: ['Yes, sign me up', 'No, just watching'] },
    ],
    faq: [
      { q: 'Is there a minimum age?', a: '16+, and the set list is kept light — expect occasional adult humour.' },
      { q: 'How do I perform?', a: 'Select “Yes, sign me up” at registration and arrive 30 minutes early.' },
    ],
    organizer: organizer._id, status: 'published', approvalStatus: 'approved', featured: false,
  });

  // ─────────────── Sessions ───────────────
  async function addSessions(slug, rows) {
    const ev = events[slug];
    for (const [d, h, min, dur, title, type, room, spk] of rows) {
      const [startTime, endTime] = at(ev.startDate, d - 1, h, min, dur);
      // eslint-disable-next-line no-await-in-loop
      await Session.create({
        event: ev._id, title, type, room, startTime, endTime,
        speaker: spk != null ? speakers[spk]._id : undefined,
        day: d, order: h * 60 + min,
        engagementScore: 30 + Math.floor(rand(title.length + d) * 65),
      });
    }
  }

  await addSessions('ai-innovation-summit', [
    [1, 9, 0, 45, 'Registration & Networking Breakfast', 'networking', 'Foyer'],
    [1, 10, 0, 60, 'Opening Keynote — The Year of AI Agents', 'keynote', 'Main Auditorium', 0],
    [1, 11, 15, 45, 'Building Production LLM Apps', 'talk', 'Main Auditorium', 4],
    [1, 12, 15, 60, 'Lunch & Sponsor Expo', 'break', 'Dining Hall'],
    [1, 13, 30, 90, 'Workshop: Prompt Engineering Lab', 'workshop', 'Lab 1'],
    [1, 15, 15, 45, 'Responsible AI at Scale', 'talk', 'Main Auditorium', 1],
    [1, 16, 30, 60, 'Panel: From Research to Startup', 'panel', 'Main Auditorium', 3],
    [2, 9, 30, 90, 'Workshop: Build an AI App End-to-End', 'workshop', 'Lab 1', 0],
    [2, 11, 30, 45, 'AI in Indian Languages', 'talk', 'Main Auditorium', 6],
    [2, 14, 0, 60, 'Project Demos & Awards', 'ceremony', 'Main Auditorium', 3],
  ]);
  await addSessions('technova-hackathon', [
    [1, 18, 0, 60, 'Check-in & Dinner', 'ceremony', 'Lobby'],
    [1, 19, 0, 45, 'Opening & Problem Statements', 'keynote', 'Main Hall', 3],
    [1, 20, 0, 60, 'Tech & API Showcase', 'talk', 'Main Hall', 4],
    [1, 21, 30, 600, 'Hacking Sprint Round 1 (overnight)', 'workshop', 'Innovation Labs'],
    [2, 14, 0, 90, 'Mentor Office Hours', 'networking', 'Breakout Rooms', 1],
    [3, 9, 0, 180, 'Final Sprint & Submissions', 'workshop', 'Innovation Labs'],
    [3, 12, 0, 120, 'Project Demos to Judges', 'panel', 'Main Hall', 3],
    [3, 16, 0, 45, 'Awards & Closing', 'ceremony', 'Main Hall'],
  ]);
  await addSessions('cyber-security-bootcamp', [
    [1, 9, 30, 60, 'Web App Security Fundamentals', 'talk', 'Lab', 2],
    [1, 11, 0, 120, 'Hands-on: OWASP Top 10', 'workshop', 'Lab'],
    [1, 14, 0, 120, 'CTF Challenge', 'activity', 'Lab', 2],
    [1, 16, 30, 30, 'Awards & Wrap-up', 'ceremony', 'Lab'],
  ]);
  await addSessions('annual-cultural-fest', [
    [1, 17, 0, 120, 'Battle of the Bands', 'activity', 'Open Air Theatre'],
    [1, 19, 30, 90, 'Stand-up Night', 'activity', 'OAT Stage'],
    [2, 18, 0, 150, 'Dance Championship', 'activity', 'Main Stage'],
    [3, 19, 0, 180, 'Headline DJ Night', 'ceremony', 'Main Stage'],
  ]);
  const live = events['nashik-developer-meetup'];
  {
    const now = new Date();
    const mk = (offsetH, dur, title, type, room, spk) => {
      const s = new Date(now.getTime() + offsetH * 3600000);
      const e = new Date(s.getTime() + dur * 60000);
      return new Session({ event: live._id, title, type, room, startTime: s, endTime: e, speaker: spk != null ? speakers[spk]._id : undefined, day: 1, engagementScore: 60 + Math.floor(rand(title.length) * 40) });
    };
    const sessions = [
      mk(-1.2, 0.5, 'Check-in & Chai', 'networking', 'Foyer'),
      mk(-0.6, 0.7, 'Lightning Talks Round 1', 'talk', 'Main Hall', 5),
      mk(-0.15, 0.8, 'Live Q&A: Modern React Patterns', 'talk', 'Main Hall', 5),
      mk(1.0, 0.5, 'Tea Break & Networking', 'break', 'Foyer'),
      mk(1.6, 0.8, 'Workshop: Ship Faster with Tooling', 'workshop', 'Room 204', 7),
      mk(2.6, 0.6, 'AMA & Giveaways', 'panel', 'Main Hall', 4),
    ];
    for (const s of sessions) {
      // eslint-disable-next-line no-await-in-loop
      await s.save();
    }
  }
  await addSessions('corporate-leadership-summit', [
    [1, 9, 0, 60, 'Leadership in Uncertainty', 'keynote', 'Grand Ballroom', 6],
    [1, 10, 30, 90, 'Decision Frameworks Workshop', 'workshop', 'Breakout A'],
    [1, 13, 30, 60, 'Difficult Conversations', 'talk', 'Grand Ballroom'],
    [1, 15, 30, 90, 'Executive Coaching Circles', 'panel', 'Breakout Rooms'],
    [1, 16, 45, 15, 'Closing & Certificates', 'ceremony', 'Grand Ballroom'],
  ]);
  // Additional sessions for events that previously shipped without a schedule.
  await addSessions('campus-startup-expo', [
    [1, 10, 0, 60, 'Doors Open & Expo Floor', 'networking', 'Hall 2'],
    [1, 11, 0, 45, 'Fireside: Fundraising in 2026', 'panel', 'Main Stage', 3],
    [1, 12, 30, 60, 'Founder Pitches (Round 1)', 'panel', 'Main Stage'],
    [1, 14, 0, 90, 'Investor 1:1 & Hiring Corner', 'networking', 'Meeting Rooms'],
    [1, 16, 0, 45, 'Best Campus Startup Award', 'ceremony', 'Main Stage', 3],
  ]);
  await addSessions('cloud-devops-bootcamp', [
    [1, 9, 0, 60, 'Containers & Docker Fundamentals', 'workshop', 'Seminar Hall 3', 1],
    [1, 10, 15, 90, 'Deploying to Kubernetes', 'workshop', 'Seminar Hall 3', 7],
    [1, 13, 0, 60, 'CI/CD with GitHub Actions', 'workshop', 'Seminar Hall 3'],
    [1, 15, 0, 60, 'Monitoring & Observability', 'talk', 'Seminar Hall 3', 1],
    [1, 16, 30, 45, 'Live Q&A & Cloud Credits', 'panel', 'Seminar Hall 3'],
  ]);
  await addSessions('design-thinking-sprint', [
    [1, 10, 0, 60, 'Empathy: User Interviews', 'workshop', 'Studio A', 4],
    [1, 11, 15, 60, 'Define: Journey Mapping', 'workshop', 'Studio A', 4],
    [1, 13, 0, 90, 'Ideate & Sketch', 'workshop', 'Studio A'],
    [2, 10, 0, 120, 'Prototype in Figma', 'workshop', 'Studio B'],
    [2, 14, 0, 60, 'Presentations & Feedback', 'panel', 'Studio A', 4],
  ]);
  await addSessions('research-scholars-symposium', [
    [1, 9, 0, 45, 'Welcome & Keynote', 'keynote', 'IISc Auditorium', 0],
    [1, 10, 0, 90, 'Paper Presentations (Track A)', 'talk', 'Auditorium'],
    [1, 11, 30, 60, 'Poster Session', 'networking', 'Lobby'],
    [1, 14, 0, 90, 'Paper Presentations (Track B)', 'talk', 'Auditorium'],
    [1, 16, 0, 45, 'Closing & Best Paper Award', 'ceremony', 'Auditorium', 0],
  ]);
  await addSessions('mern-stack-masterclass', [
    [1, 19, 0, 45, 'React + Tailwind in 45 Minutes', 'talk', 'Online', 5],
    [1, 20, 0, 60, 'Express + MongoDB API', 'workshop', 'Online', 5],
    [1, 21, 15, 45, 'Auth, Deployment & Patterns', 'talk', 'Online', 5],
    [1, 22, 15, 30, 'Live Q&A', 'panel', 'Online', 5],
  ]);
  await addSessions('esports-arena-2026', [
    [1, 10, 0, 60, 'Check-in & Player Briefing', 'ceremony', 'Campus Arena'],
    [1, 11, 0, 180, 'Group Stage: BGMI & Valorant', 'activity', 'Arena Floor'],
    [2, 11, 0, 180, 'Brackets & Quarterfinals', 'activity', 'Arena Floor'],
    [2, 16, 0, 90, 'Grand Finals on the Big Screen', 'ceremony', 'Main Stage'],
    [2, 18, 30, 30, 'Prize Distribution', 'ceremony', 'Main Stage'],
  ]);
  await addSessions('ai-healthcare-summit', [
    [1, 9, 0, 45, 'Registration & Breakfast', 'networking', 'Foyer'],
    [1, 9, 45, 60, 'Keynote: AI at the Bedside', 'keynote', 'Main Hall', 0],
    [1, 11, 0, 60, 'Medical Imaging & Diagnostics', 'talk', 'Main Hall', 0],
    [1, 12, 15, 60, 'Lunch & Demo Booths', 'break', 'Dining Hall'],
    [1, 13, 30, 90, 'Workshop: Build an AI Triage Assistant', 'workshop', 'Lab 2', 0],
    [1, 15, 15, 45, 'Regulation & Responsible AI', 'talk', 'Main Hall', 6],
    [1, 16, 30, 60, 'Panel: Clinician-in-the-Loop', 'panel', 'Main Hall', 0],
  ]);
  await addSessions('women-in-tech-conference', [
    [1, 9, 30, 45, 'Registration & Networking', 'networking', 'Foyer'],
    [1, 10, 15, 60, 'Keynote: Leading Through Change', 'keynote', 'Main Auditorium', 4],
    [1, 11, 30, 60, 'Technical Deep Dive: Building Inclusive Products', 'talk', 'Main Auditorium', 4],
    [1, 12, 45, 60, 'Lunch & Hiring Fair', 'break', 'Expo Hall'],
    [1, 14, 0, 90, 'Mentorship Lounge (Rotating Sessions)', 'workshop', 'Breakout Rooms'],
    [1, 15, 45, 60, 'Panel: Sponsorship vs Mentorship', 'panel', 'Main Auditorium', 6],
    [2, 10, 0, 120, 'Hands-on: Technical Workshops', 'workshop', 'Breakout Rooms'],
    [2, 14, 0, 60, 'Closing & Scholarships Ceremony', 'ceremony', 'Main Auditorium'],
  ]);
  await addSessions('startup-demo-day', [
    [1, 16, 0, 30, 'Doors Open & Networking', 'networking', 'Main Hall'],
    [1, 16, 30, 60, 'Batch Highlights & Welcome', 'ceremony', 'Main Hall', 3],
    [1, 17, 30, 90, 'Founder Pitches (1–12)', 'panel', 'Main Hall'],
    [1, 19, 15, 45, 'Investor Q&A', 'panel', 'Main Hall', 3],
    [1, 20, 0, 60, 'After-party & 1:1 Meetings', 'networking', 'Rooftop Lounge'],
  ]);
  await addSessions('robotics-workshop', [
    [1, 9, 0, 60, 'Intro to Embedded Systems', 'talk', 'Tinker Lab', 7],
    [1, 10, 15, 90, 'Assemble: Line-following Robot', 'workshop', 'Tinker Lab', 7],
    [1, 13, 0, 60, 'Sensors & Motor Control', 'workshop', 'Tinker Lab', 1],
    [2, 9, 0, 90, 'IoT Weather Station (ESP32)', 'workshop', 'Tinker Lab', 1],
    [2, 13, 0, 60, 'Cloud Dashboard & Pitches', 'workshop', 'Tinker Lab', 7],
    [2, 15, 0, 45, 'Demo Day & Awards', 'ceremony', 'Tinker Lab'],
  ]);
  await addSessions('comedy-open-mic-night', [
    [1, 19, 0, 30, 'Doors Open & Warm-up', 'activity', 'Main Room'],
    [1, 19, 30, 75, 'Open Mic Set 1 (Acts 1–6)', 'activity', 'Main Room'],
    [1, 20, 45, 30, 'Intermission', 'break', 'Main Room'],
    [1, 21, 15, 75, 'Open Mic Set 2 (Acts 7–12)', 'activity', 'Main Room'],
    [1, 22, 30, 15, 'People’s Choice Award', 'ceremony', 'Main Room'],
  ]);

  // ─────────────── Sponsors ───────────────
  const sponsorSets = {
    'ai-innovation-summit': [
      { name: 'DevForge', tier: 'platinum', amount: 100000, benefits: 'Backdrop logo, 15-min keynote, booth, 20 passes', logo: logo('DevForge'), website: 'https://devforge.demo', contactName: 'Karan Mehta', contactEmail: 'sponsors@devforge.demo' },
      { name: 'CloudNova', tier: 'gold', amount: 50000, benefits: 'Booth, banner logo, 10 passes', logo: logo('CloudNova'), contactName: 'Ritu Sen', contactEmail: 'events@cloudnova.demo' },
      { name: 'FinEdge', tier: 'silver', amount: 25000, benefits: 'Website logo, 5 passes', logo: logo('FinEdge') },
      { name: 'Stackly', tier: 'bronze', amount: 10000, benefits: 'Social shout-out, 2 passes', logo: logo('Stackly') },
    ],
    'technova-hackathon': [
      { name: 'DevForge', tier: 'platinum', amount: 100000, benefits: 'Track naming, API credits, judging slot', logo: logo('DevForge') },
      { name: 'PixelForge', tier: 'gold', amount: 50000, benefits: 'Design track sponsor', logo: logo('PixelForge') },
    ],
    'campus-startup-expo': [
      { name: 'FirstSpark Ventures', tier: 'platinum', amount: 100000, benefits: 'Investor lounge, jury seat', logo: logo('FirstSpark Ventures') },
      { name: 'FinEdge', tier: 'gold', amount: 50000, benefits: 'Fintech corner', logo: logo('FinEdge') },
    ],
    'ai-healthcare-summit': [
      { name: 'CloudNova', tier: 'platinum', amount: 80000, benefits: 'Keynote slot, demo booth, 15 passes', logo: logo('CloudNova'), website: 'https://cloudnova.demo', contactName: 'Ritu Sen', contactEmail: 'events@cloudnova.demo' },
      { name: 'FinEdge', tier: 'gold', amount: 40000, benefits: 'Health-finance corner, 10 passes', logo: logo('FinEdge') },
    ],
    'women-in-tech-conference': [
      { name: 'DevForge', tier: 'platinum', amount: 100000, benefits: 'Hiring fair booth, keynote intro, 25 passes', logo: logo('DevForge'), website: 'https://devforge.demo' },
      { name: 'PixelForge', tier: 'gold', amount: 50000, benefits: 'Design workshop track sponsor', logo: logo('PixelForge') },
    ],
    'startup-demo-day': [
      { name: 'FirstSpark Ventures', tier: 'platinum', amount: 100000, benefits: 'Investor pass sponsor, jury seat', logo: logo('FirstSpark Ventures') },
      { name: 'Stackly', tier: 'silver', amount: 25000, benefits: 'Cloud credits for the batch', logo: logo('Stackly') },
    ],
    'robotics-workshop': [
      { name: 'CloudNova', tier: 'gold', amount: 50000, benefits: 'IoT cloud credits for all kits', logo: logo('CloudNova') },
      { name: 'Stackly', tier: 'silver', amount: 20000, benefits: 'Component kits sponsor', logo: logo('Stackly') },
    ],
  };
  for (const [slug, list] of Object.entries(sponsorSets)) {
    for (const s of list) {
      // eslint-disable-next-line no-await-in-loop
      await Sponsor.create({ ...s, event: events[slug]._id });
    }
  }

  // ─────────────── Volunteers ───────────────
  async function addVolunteers(slug, list) {
    const ev = events[slug];
    for (const v of list) {
      // eslint-disable-next-line no-await-in-loop
      await Volunteer.create({ event: ev._id, ...v });
    }
  }
  await addVolunteers('ai-innovation-summit', [
    { user: volunteer._id, name: 'Priya Deshmukh', email: volunteer.email, role: 'Technical Support', task: 'Projectors, mics, Wi-Fi on Day 1', zone: 'Main Auditorium', startTime: day(3, 8), endTime: day(3, 18), status: 'accepted' },
    { name: 'Amit Wagh', email: 'amit.w@student.demo', role: 'Registration Desk', task: 'QR check-in and wristbands', zone: 'Main Entrance', startTime: day(3, 8), endTime: day(4, 12) },
    { name: 'Sneha Patil', email: 'sneha.p@student.demo', role: 'Hospitality', task: 'Speaker hospitality & water stations', zone: 'Green Room', startTime: day(3, 8), endTime: day(4, 18) },
    { name: 'Vikas More', email: 'vikas.m@student.demo', role: 'Security', task: 'Crowd flow and emergency response', zone: 'Gates', startTime: day(3, 8), endTime: day(4, 18) },
    { name: 'Rhea D’Souza', email: 'rhea.d@student.demo', role: 'Photography', task: 'Coverage reels for socials', zone: 'Floating', startTime: day(3, 9), endTime: day(4, 16) },
    { name: 'Karan Thakur', email: 'karan.t@student.demo', role: 'Stage Management', task: 'Speaker timers and cue management', zone: 'Stage', startTime: day(3, 9), endTime: day(4, 15) },
  ]);
  await addVolunteers('nashik-developer-meetup', [
    { user: volunteer._id, name: 'Priya Deshmukh', email: volunteer.email, role: 'Technical Support', task: 'Livestream + projector', zone: 'Main Hall', startTime: day(0, 8), endTime: day(0, 14), status: 'accepted' },
    { name: 'Amit Wagh', email: 'amit.w@student.demo', role: 'Registration Desk', task: 'Walk-in QR check-in', zone: 'Entrance', startTime: day(0, 8), endTime: day(0, 12) },
  ]);
  await addVolunteers('technova-hackathon', [
    { name: 'Nikhil Joshi', email: 'nik.j@student.demo', role: 'Technical Support', task: 'Network and power strips', zone: 'Innovation Labs', startTime: day(12, 17), endTime: day(14, 14) },
    { name: 'Meera Sen', email: 'meera.s@student.demo', role: 'Hospitality', task: 'Midnight snacks and coffee', zone: 'Pantry', startTime: day(12, 18), endTime: day(14, 10) },
    { name: 'Ravi Shinde', email: 'ravi.s@student.demo', role: 'Security', task: 'Overnight security rounds', zone: 'Floors', startTime: day(12, 20), endTime: day(14, 8) },
  ]);

  // ─────────────── Registrations, tickets, payments ───────────────
  const ticketTypesFor = (ev) => ev.ticketTypes.length ? ev.ticketTypes : [{ name: 'General', price: ev.price, quantity: ev.capacity }];

  async function addRegistrations(slug, opts) {
    const ev = events[slug];
    const types = ticketTypesFor(ev);
    const { target, checkedInRate = 0, cancelRate = 0, waitlist = 0, startIdx = 0, paidRate = 0.3 } = opts;
    let made = 0;
    let idx = startIdx;
    let checkedIn = 0;
    const chosenUsers = [];

    while (made < target && idx < pool.length) {
      const u = pool[idx];
      idx += 1;
      // Demo attendee is handled via addDirect so the live "register → QR → check-in" demo always works.
      if (u._id.toString() === attendee._id.toString()) continue;
      const rnd = rand(idx + ev._id.toString().length);
      const isPaid = types.some((t) => t.price > 0) && rnd < paidRate;
      let type = types[0];
      if (types.length > 1) type = rnd > 0.75 ? types[types.length - 1] : types[0];
      const price = isPaid ? type.price : types.some((t) => t.price === 0) ? 0 : type.price;
      const chosen = isPaid ? type : types.find((t) => t.price === 0) || type;
      const cancelled = rand(idx * 2 + 3) < cancelRate;
      const registeredAt = new Date(ev.startDate.getTime() - Math.floor(rand(idx + 9) * 30 + 1) * 86400000);
      // eslint-disable-next-line no-await-in-loop
      const reg = await Registration.create({
        event: ev._id, user: u._id,
        ticketType: { name: chosen.name, price },
        amountPaid: cancelled ? 0 : price,
        status: cancelled ? 'cancelled' : 'confirmed',
        source: pick(['direct', 'recommendation', 'search', 'shared'], idx),
        registeredAt,
        createdAt: registeredAt,
        updatedAt: registeredAt,
        responses: ev.customRegistrationFields.length
          ? ev.customRegistrationFields.map((f, fi) => ({ field: f.label, label: f.label, value: f.options ? pick(f.options, idx + fi) : `${f.label} response` }))
          : [],
      });
      if (!cancelled) {
        chosenUsers.push({ u, reg, type: chosen });
        made += 1;
        if (price > 0) {
          // eslint-disable-next-line no-await-in-loop
          await Payment.create({
            event: ev._id, registration: reg._id, user: u._id, amount: price, provider: 'demo',
            orderId: `order_seed_${reg._id.toString().slice(-8)}`, paymentId: `pay_seed_${reg._id.toString().slice(-10)}`,
            status: 'captured', ticketType: chosen.name,
          });
        }
        // eslint-disable-next-line no-await-in-loop
        await Ticket.create({
          code: ticketCode(), event: ev._id, registration: reg._id, user: u._id,
          ticketType: chosen.name, attendeeName: u.name,
        });
      }
    }

    // Check-ins for live/completed events
    if (ev.startDate < new Date()) {
      checkedIn = Math.floor(chosenUsers.length * checkedInRate);
      for (let k = 0; k < checkedIn; k += 1) {
        const { u, reg } = chosenUsers[k];
        reg.status = 'checked_in';
        reg.checkedInAt = new Date(ev.startDate.getTime() + 30 * 60000);
        reg.checkInMethod = rand(k + 2) > 0.5 ? 'qr' : 'manual';
        // eslint-disable-next-line no-await-in-loop
        await reg.save();
        // eslint-disable-next-line no-await-in-loop
        await Ticket.updateOne({ registration: reg._id, user: u._id }, { status: 'used', checkedInAt: reg.checkedInAt });
      }
    }

    // Waitlist
    for (let w = 0; w < waitlist; w += 1) {
      const u = pool[(idx + w) % pool.length];
      // eslint-disable-next-line no-await-in-loop
      const existing = await Registration.findOne({ event: ev._id, user: u._id });
      if (existing) continue;
      // eslint-disable-next-line no-await-in-loop
      const reg = await Registration.create({
        event: ev._id, user: u._id, ticketType: { name: types[0].name, price: types[0].price },
        status: 'waitlisted',
      });
      // eslint-disable-next-line no-await-in-loop
      await Waitlist.create({ event: ev._id, user: u._id, registration: reg._id, position: w + 1 });
    }

    // Recompute counters
    const [confirmed, checked, waiting] = await Promise.all([
      Registration.countDocuments({ event: ev._id, status: { $in: ['confirmed', 'checked_in'] } }),
      Registration.countDocuments({ event: ev._id, status: 'checked_in' }),
      Waitlist.countDocuments({ event: ev._id, status: { $in: ['waiting', 'notified'] } }),
    ]);
    ev.registrationCount = confirmed;
    ev.checkedInCount = checked;
    ev.waitlistCount = waiting;
    ev.popularityScore = confirmed;
    // ticket sold counts
    ev.ticketTypes.forEach((t) => { t.soldCount = Math.floor(confirmed * (t.name === types[types.length - 1].name ? 0.25 : 0.75)); });
    // eslint-disable-next-line no-await-in-loop
    await ev.save();
    return { confirmed, checkedIn: checked };
  }

  // Demo attendee's pre-existing registrations
  async function addDirect(slug, { status, paid = false, typeName }) {
    const ev = events[slug];
    const types = ticketTypesFor(ev);
    const chosen = types.find((t) => t.name === typeName) || types[0];
    const reg = await Registration.create({
      event: ev._id, user: attendee._id,
      ticketType: { name: chosen.name, price: paid ? chosen.price : 0 },
      amountPaid: paid ? chosen.price : 0, status,
      source: 'direct',
      registeredAt: new Date(ev.startDate.getTime() - 5 * 86400000),
    });
    if (status !== 'waitlisted' && status !== 'cancelled') {
      await Ticket.create({ code: ticketCode(), event: ev._id, registration: reg._id, user: attendee._id, ticketType: chosen.name, attendeeName: attendee.name, ...(status === 'checked_in' ? { status: 'used', checkedInAt: ev.startDate } : {}) });
      if (paid) await Payment.create({ event: ev._id, registration: reg._id, user: attendee._id, amount: chosen.price, provider: 'demo', orderId: `order_demo_${reg._id.toString().slice(-8)}`, paymentId: `pay_demo_${reg._id.toString().slice(-10)}`, status: 'captured', ticketType: chosen.name });
    }
    return reg;
  }

  await addRegistrations('ai-innovation-summit', { target: 84, waitlist: 0, startIdx: 0, paidRate: 0.22 });
  await addRegistrations('technova-hackathon', { target: 96, startIdx: 0, paidRate: 0.18 });
  await addDirect('technova-hackathon', { status: 'confirmed' });
  await addRegistrations('campus-startup-expo', { target: 72, startIdx: 3, paidRate: 0 });
  await addRegistrations('cyber-security-bootcamp', { target: 40, waitlist: 6, startIdx: 0, paidRate: 1 });
  await addRegistrations('annual-cultural-fest', { target: 118, checkedInRate: 0.92, startIdx: 0, paidRate: 0, cancelRate: 0.02 });
  await addDirect('annual-cultural-fest', { status: 'checked_in' });
  await addRegistrations('nashik-developer-meetup', { target: 97, checkedInRate: 0.62, startIdx: 2, paidRate: 0 });
  await addDirect('nashik-developer-meetup', { status: 'checked_in' });
  await addRegistrations('corporate-leadership-summit', { target: 112, checkedInRate: 0.88, startIdx: 0, paidRate: 1 });
  await addRegistrations('sports-championship', { target: 88, startIdx: 4 });
  await addRegistrations('cloud-devops-bootcamp', { target: 41, startIdx: 1, paidRate: 0.9 });
  await addRegistrations('design-thinking-sprint', { target: 52, startIdx: 5 });
  await addRegistrations('indie-music-night', { target: 92, startIdx: 2, paidRate: 0.6 });
  await addRegistrations('research-scholars-symposium', { target: 64, startIdx: 6 });
  await addRegistrations('fintech-founders-roundtable', { target: 31, startIdx: 7 });
  await addRegistrations('mern-stack-masterclass', { target: 108, startIdx: 0 });
  await addRegistrations('ai-healthcare-summit', { target: 66, startIdx: 8, paidRate: 0.3 });
  await addRegistrations('women-in-tech-conference', { target: 92, startIdx: 3, paidRate: 0.12 });
  await addRegistrations('startup-demo-day', { target: 74, startIdx: 5, paidRate: 0.4 });
  await addRegistrations('robotics-workshop', { target: 44, startIdx: 2, paidRate: 1 });
  await addRegistrations('comedy-open-mic-night', { target: 61, startIdx: 4, paidRate: 0.9 });

  // ─────────────── Feedback + certificates for completed events ───────────────
  const FB_COMMENTS = {
    positive: [
      'Absolutely loved the energy and the speakers were world-class. Great organizing team!',
      'Best college event I have attended. The QR check-in took ten seconds, amazing.',
      'Fantastic workshops — I shipped my first ML model. Worth every minute.',
      'Great networking, met my internship co-founder here!',
      'Inspiring talks and everything ran on time. Highly recommend.',
      'The live polls and Q&A made the sessions so much more engaging.',
    ],
    neutral: ['Good event overall, lunch could have been better.', 'Decent sessions, some talks overran.', 'Value for money, wished there were more seats.'],
    negative: ['Registration desk was slow and lunch was late.', 'The audio in Hall B was poor and disappointing.'],
  };
  async function addFeedbackAndCerts(slug, { fbCount, certRate = 1, demoCert = false }) {
    const ev = events[slug];
    const regs = await Registration.find({ event: ev._id, status: 'checked_in' }).populate('user', 'name');
    for (let k = 0; k < Math.min(fbCount, regs.length); k += 1) {
      const reg = regs[k];
      const r = rand(k + ev.title.length);
      const rating = r > 0.12 ? (r > 0.55 ? 5 : 4) : r > 0.06 ? 3 : 2;
      const pool2 = rating >= 4 ? FB_COMMENTS.positive : rating === 3 ? FB_COMMENTS.neutral : FB_COMMENTS.negative;
      const comment = rand(k * 3 + 1) > 0.3 ? pool2[k % pool2.length] : '';
      // eslint-disable-next-line no-await-in-loop
      await Feedback.create({
        event: ev._id, user: reg.user._id, registration: reg._id, rating,
        contentRating: Math.max(1, Math.min(5, rating + (rand(k) > 0.5 ? 0 : -1))),
        organizationRating: Math.max(1, Math.min(5, rating)),
        venueRating: Math.max(1, Math.min(5, rating + (rand(k + 2) > 0.7 ? -1 : 0))),
        comment, wouldRecommend: rating >= 4, sentiment: sentiment(rating, comment),
      });
    }
    const certsFor = regs.slice(0, Math.floor(regs.length * certRate));
    if (demoCert && !certsFor.some((r) => r.user._id.toString() === attendee._id.toString())) {
      const aReg = await Registration.findOne({ event: ev._id, user: attendee._id }).populate('user', 'name');
      if (aReg) certsFor.push(aReg);
    }
    ev.settings.certificatesIssued = true;
    await ev.save();
    for (const reg of certsFor) {
      // eslint-disable-next-line no-await-in-loop
      await Certificate.create({
        certificateId: certificateId(), event: ev._id, user: reg.user._id, registration: reg._id,
        issuedBy: organizer._id, recipientName: reg.user.name, eventTitle: ev.title,
        organizerName: 'Sphere Events', type: 'participation', eventDate: ev.startDate,
        issuedAt: new Date(ev.endDate.getTime() + 2 * 86400000),
      });
    }
  }
  await addFeedbackAndCerts('annual-cultural-fest', { fbCount: 46, certRate: 0.85, demoCert: true });
  await addFeedbackAndCerts('corporate-leadership-summit', { fbCount: 28, certRate: 0.9 });
  await addFeedbackAndCerts('nashik-developer-meetup', { fbCount: 8, certRate: 0 });

  // ─────────────── Live event content ───────────────
  const liveEv = events['nashik-developer-meetup'];
  await Announcement.create([
    { event: liveEv._id, author: organizer._id, authorName: organizer.name, title: 'Welcome to the Nashik Developer Meetup! 🎉', body: 'Check the schedule tab, drop questions in Q&A and vote in the first poll. Tea is in the foyer!', severity: 'info', pinned: true },
    { event: liveEv._id, author: organizer._id, authorName: organizer.name, title: 'Workshop Hall A moved to Room 204', body: 'Heads up: the “Ship Faster with Tooling” workshop is moving from Hall A to Room 204 (first floor, turn right). Volunteers in blue tees will guide you.', severity: 'warning', pinned: true },
  ]);

  const poll1 = await Poll.create({
    event: liveEv._id, createdBy: organizer._id,
    question: 'Which talk are you most excited about today?',
    options: [
      { text: 'Modern React Patterns', voters: attendees.slice(0, 14).map((u) => u._id) },
      { text: 'Ship Faster with Tooling', voters: attendees.slice(14, 22).map((u) => u._id) },
      { text: 'The AMA session', voters: attendees.slice(22, 27).map((u) => u._id) },
    ],
  });
  await Poll.create({
    event: liveEv._id, createdBy: organizer._id,
    question: 'What should our next meetup topic be?',
    options: [{ text: 'AI agents in production', voters: [] }, { text: 'Rust for web devs', voters: [] }, { text: 'Design systems', voters: [] }],
  });
  await Question.create([
    { event: liveEv._id, user: attendees[0]._id, userName: attendees[0].name, text: 'How do you handle server state vs client state in large React apps?', upvotes: [attendees[1]._id, attendees[2]._id, attendees[3]._id], answered: true, answer: 'Use TanStack Query for all server state and keep UI state local or in Zustand — the talk covers exactly this!', answeredByName: 'Vikram Singh' },
    { event: liveEv._id, user: attendees[4]._id, userName: attendees[4].name, text: 'Will the slides be shared after the event?', upvotes: [attendees[5]._id, attendees[6]._id], answered: true, answer: 'Yes, you will receive them by email tomorrow with your certificate.', answeredByName: organizer.name },
    { event: liveEv._id, user: attendees[7]._id, userName: 'Anonymous', text: 'Any internship openings for third-year students?', upvotes: [attendees[8]._id, attendees[9]._id, attendees[10]._id, attendees[11]._id] },
  ]);
  const chatLines = [
    'Hello everyone! 👋', 'The chai is excellent today', 'Will this be recorded?', 'Loving the React patterns talk',
    'Room 204 it is, thanks!', 'Anyone here from COEP?', 'That useReducer tip was gold', 'How do we join the AMA?',
    'Follow the Q&A tab, vote questions up!', 'Great crowd today 🔥', 'Where do we collect swag?', 'At the foyer desk after the AMA',
  ];
  for (let i = 0; i < chatLines.length; i += 1) {
    const u = attendees[i % attendees.length];
    // eslint-disable-next-line no-await-in-loop
    await Message.create({ kind: 'event', event: liveEv._id, sender: u._id, senderName: u.name, text: chatLines[i], createdAt: new Date(Date.now() - (chatLines.length - i) * 4 * 60000) });
  }

  // ─────────────── Connections (demo attendee) ───────────────
  async function connect(a, b, status) {
    await Connection.create({
      requester: a, recipient: b, status, matchedScore: 70 + Math.floor(rand(a.toString().length + b.toString().length) * 29),
      matchedReason: 'Shared interests in AI/ML and Web Development',
      respondedAt: status === 'accepted' ? new Date() : undefined,
    });
  }
  await connect(attendees[2]._id, attendee._id, 'accepted');
  await connect(attendees[9]._id, attendee._id, 'accepted');
  await connect(attendees[15]._id, attendee._id, 'pending');
  await connect(attendee._id, attendees[20]._id, 'accepted');
  await connect(attendees[0]._id, attendees[1]._id, 'accepted');
  await connect(attendees[5]._id, attendees[8]._id, 'pending');
  await Message.create({ kind: 'dm', sender: attendees[2]._id, senderName: attendees[2].name, recipient: attendee._id, text: 'Hey Aarav! Saw you are into MERN — want to team up for TechNova?', createdAt: new Date(Date.now() - 86400000) });
  await Message.create({ kind: 'dm', sender: attendee._id, senderName: attendee.name, recipient: attendees[2]._id, text: 'Absolutely, let’s plan this evening!', createdAt: new Date(Date.now() - 86000000) });

  // ─────────────── Favorites (demo attendee) ───────────────
  await Favorite.create({ user: attendee._id, event: events['cyber-security-bootcamp']._id });
  await Favorite.create({ user: attendee._id, event: events['design-thinking-sprint']._id });
  await Favorite.create({ user: attendee._id, event: events['campus-startup-expo']._id });

  // ─────────────── Notifications (demo attendee) ───────────────
  const n = async (...args) => Notification.create(...args);
  await n([
    { user: attendee._id, type: 'registration', title: 'Registered: TechNova Hackathon', message: 'Your team pass is confirmed — grab your QR ticket.', link: '/my-tickets', read: false },
    { user: attendee._id, type: 'certificate', title: 'Certificate ready: Rhythm & Hues — Annual Cultural Fest', message: 'Your verifiable digital certificate has been issued.', link: '/my-certificates', read: false },
    { user: attendee._id, type: 'announcement', title: 'Nashik Developer Meetup: Workshop Hall A moved to Room 204', message: 'Volunteers in blue tees will guide you.', link: `/events/nashik-developer-meetup/live`, read: false },
    { user: attendee._id, type: 'connection', title: `${attendees[15].name} wants to connect`, message: 'Accept to start networking and chat.', link: '/network', read: false },
    { user: attendee._id, type: 'reminder', title: 'TechNova Hackathon starts in 12 days', message: 'Add it to your calendar and complete your team details.', link: '/calendar', read: true },
    { user: attendee._id, type: 'system', title: 'Welcome to EventSphere! 🎉', message: 'Discover events, build connections and earn badges.', link: '/events', read: true },
  ]);
  await n([
    { user: organizer._id, type: 'system', title: 'E-Sports Arena 2026 submitted for approval', message: 'CampusCore submitted a new event for review.', link: '/admin/events', read: false },
    { user: admin._id, type: 'system', title: 'New organizer application: Rohit Jain', message: 'CSI Student Chapter is awaiting review.', link: '/admin/users', read: false },
  ]);

  // ─────────────── Reports & audit ───────────────
  // Advanced analytics, recommendations, safety and queue telemetry
  async function seedPredictionAnalytics(slug, i) {
    const ev = events[slug];
    const registrations = ev.registrationCount || await Registration.countDocuments({ event: ev._id, status: { $in: ['confirmed', 'checked_in'] } });
    const checkedIn = ev.checkedInCount || await Registration.countDocuments({ event: ev._id, status: 'checked_in' });
    const predicted = Math.min(ev.capacity, Math.max(registrations + 8 + i * 3, Math.round(ev.capacity * (0.55 + (i % 4) * 0.08))));
    const expectedAttendance = Math.round(predicted * (0.72 + (i % 3) * 0.05));
    const engagementScore = Math.min(96, 62 + i * 4);
    const noShows = Math.max(0, registrations - checkedIn);
    await EventPrediction.create({
      eventId: ev._id,
      forecast: {
        predictedRegistrations: predicted,
        lowerBound: Math.max(0, predicted - 18),
        upperBound: Math.min(ev.capacity, predicted + 26),
        velocity24h: 6 + i * 2,
        growthRate: Number((0.08 + i * 0.012).toFixed(3)),
        momentumState: pick(['accelerating', 'growing', 'stable', 'slowing'], i),
      },
      attendance: {
        expectedAttendees: expectedAttendance,
        expectedNoShows: Math.max(0, predicted - expectedAttendance),
        attendanceRate: Math.round((expectedAttendance / Math.max(predicted, 1)) * 100),
        noShowRate: Math.round(((predicted - expectedAttendance) / Math.max(predicted, 1)) * 100),
        lowerBound: Math.max(0, expectedAttendance - 15),
        upperBound: Math.min(ev.capacity, expectedAttendance + 20),
      },
      engagement: {
        score: engagementScore,
        level: engagementScore > 84 ? 'very_high' : engagementScore > 70 ? 'high' : 'medium',
        trend: i % 3 === 0 ? 'rising' : 'stable',
        breakdown: { participation: 70 + i, interaction: 58 + i * 2, liveActivity: 48 + i * 3, feedback: 64 + i, networking: 55 + i * 2 },
      },
      health: {
        score: Math.min(98, 68 + i * 4),
        status: i > 4 ? 'healthy' : 'good',
        breakdown: { velocity: 70 + i, capacity: Math.round((registrations / ev.capacity) * 100), attendance: 74 + i, engagement: engagementScore, sentiment: 78 + i },
      },
      confidence: { score: 78 + i, level: i > 4 ? 'high' : 'medium', reasons: ['Strong historical registrations', 'Healthy recommendation click-through', 'Capacity risk is monitored'] },
      drivers: [
        { factor: 'Recommendation saves', impact: 'High save rate is lifting intent', direction: 'positive', magnitude: 'high' },
        { factor: 'Registration velocity', impact: 'Last 24h signups are above baseline', direction: 'positive', magnitude: 'medium' },
      ],
      recommendations: [
        { id: `boost-${slug}`, priority: 'high', title: 'Promote premium pass inventory', action: 'Feature premium benefits on the event detail page.', rationale: 'Paid conversion is trailing free registrations.', trigger: 'ticket_mix' },
        { id: `ops-${slug}`, priority: 'medium', title: 'Confirm check-in staffing', action: 'Keep one backup desk ready for peak arrival.', rationale: 'Forecasted arrival surge crosses the smooth check-in threshold.', trigger: 'arrival_forecast' },
      ],
      aiSummary: `${ev.title} is forecast to reach ${predicted} registrations with ${expectedAttendance} expected attendees.`,
      featureSnapshot: { registrations, checkedIn, waitlist: ev.waitlistCount, views: ev.views, capacity: ev.capacity },
      expiresAt: new Date(Date.now() + 12 * 60 * 60000),
    });
    await EventPredictionSnapshot.create([
      { eventId: ev._id, dayOffset: -7, predictedRegistrations: Math.max(5, predicted - 38), actualRegistrations: Math.max(0, registrations - 34), expectedAttendance: Math.max(5, expectedAttendance - 28), actualAttendance: Math.max(0, checkedIn - 24), engagementScore: engagementScore - 8, trigger: 'daily', snapshotTime: new Date(Date.now() - 7 * 86400000) },
      { eventId: ev._id, dayOffset: -3, predictedRegistrations: Math.max(8, predicted - 17), actualRegistrations: Math.max(0, registrations - 14), expectedAttendance: Math.max(6, expectedAttendance - 12), actualAttendance: Math.max(0, checkedIn - 10), engagementScore: engagementScore - 3, trigger: 'velocity_shift', snapshotTime: new Date(Date.now() - 3 * 86400000) },
      { eventId: ev._id, dayOffset: 0, predictedRegistrations: predicted, actualRegistrations: registrations, expectedAttendance, actualAttendance: checkedIn, engagementScore, trigger: ev.status === 'live' ? 'checkin_milestone' : 'manual' },
    ]);
    if (ev.status === 'completed') {
      const actualEngagement = Math.min(100, engagementScore + (i % 2 === 0 ? 3 : -4));
      await PredictionOutcome.create({
        eventId: ev._id,
        predicted: { registrations: predicted, attendance: expectedAttendance, noShows: Math.max(0, predicted - expectedAttendance), engagement: engagementScore },
        actual: { registrations, attendance: checkedIn, noShows, engagement: actualEngagement },
        errors: {
          registrationAE: Math.abs(predicted - registrations),
          registrationPE: Math.round((Math.abs(predicted - registrations) / Math.max(registrations, 1)) * 100),
          attendanceAE: Math.abs(expectedAttendance - checkedIn),
          attendancePE: Math.round((Math.abs(expectedAttendance - checkedIn) / Math.max(checkedIn, 1)) * 100),
          engagementAE: Math.abs(engagementScore - actualEngagement),
          engagementPE: Math.round((Math.abs(engagementScore - actualEngagement) / Math.max(actualEngagement, 1)) * 100),
        },
        evaluatedAt: new Date(ev.endDate.getTime() + 86400000),
      });
    }
  }

  async function seedSafetyAnalytics(slug, i) {
    const ev = events[slug];
    const safetyScore = Math.min(96, 72 + i * 3);
    const readinessScore = Math.min(98, 68 + i * 4);
    const level = safetyScore < 75 ? 'medium' : 'low';
    await EventRiskAssessment.create({
      eventId: ev._id,
      safetyScore,
      readinessScore,
      overallRiskLevel: level,
      summary: `${ev.title} has ${level} operational risk with staffing, entry flow and accessibility tracked.`,
      categories: [
        { id: 'crowd', name: 'Crowd Flow', score: safetyScore - 3, riskLevel: level, issues: i % 2 ? ['Peak arrival window may compress queues'] : [], recommendations: ['Open backup entry lane 30 minutes before keynote'], evidence: [`${ev.registrationCount} confirmed registrations`], probability: 'medium', impact: 'medium', priority: 'medium' },
        { id: 'venue', name: 'Venue Readiness', score: readinessScore, riskLevel: 'low', recommendations: ['Reconfirm signage and accessibility desk'], evidence: [ev.venue.name], probability: 'low', impact: 'medium', priority: 'low' },
      ],
      topRisks: [
        { title: 'Peak entry congestion', category: 'Crowd Flow', severity: level, reason: 'High first-hour arrivals expected', evidence: `${ev.registrationCount}/${ev.capacity} capacity booked`, recommendation: 'Stage volunteers near QR scan desks.' },
      ],
      checklist: [
        { id: `check-${slug}-1`, title: 'Verify emergency contact board', category: 'Safety', priority: 'high', status: i % 2 ? 'pending' : 'completed', completedAt: i % 2 ? null : new Date(), completedBy: i % 2 ? null : organizer._id },
        { id: `check-${slug}-2`, title: 'Confirm check-in desk signage', category: 'Operations', priority: 'medium', status: 'completed', completedAt: new Date(), completedBy: organizer._id },
      ],
      matrix: [
        { risk: 'Queue spillover', probability: 'medium', impact: 'medium', priority: 'medium', action: 'Keep overflow lane and volunteer marshal ready.' },
      ],
      metricsSnapshot: { capacity: ev.capacity, registrations: ev.registrationCount, waitlist: ev.waitlistCount, staffTarget: Math.ceil(ev.capacity / 50) },
    });
    await RiskAssessmentHistory.create([
      { eventId: ev._id, safetyScore: safetyScore - 8, readinessScore: readinessScore - 10, overallRiskLevel: 'medium', trigger: 'initial', delta: 0, improvements: ['Created safety checklist'], topRisksCount: 3, analyzedAt: new Date(Date.now() - 5 * 86400000) },
      { eventId: ev._id, safetyScore: safetyScore - 2, readinessScore: readinessScore - 3, overallRiskLevel: level, trigger: 'registration_threshold', delta: 6, improvements: ['Added two check-in desks', 'Updated evacuation instructions'], topRisksCount: 2, analyzedAt: new Date(Date.now() - 2 * 86400000) },
      { eventId: ev._id, safetyScore, readinessScore, overallRiskLevel: level, trigger: 'auto_recalc', delta: 4, improvements: ['Assigned backup volunteer lead'], topRisksCount: 1 },
    ]);
    await EventRiskAlert.create({
      eventId: ev._id,
      type: 'capacity_pressure',
      severity: level,
      message: `${ev.title} is approaching the next capacity planning threshold.`,
      metricValue: ev.registrationCount,
      threshold: Math.round(ev.capacity * 0.8),
      status: i % 2 ? 'acknowledged' : 'active',
      actionRequired: 'Review gate staffing and late-arrival signage.',
      resolvedBy: i % 2 ? organizer._id : null,
      resolvedAt: i % 2 ? new Date() : null,
    });
  }

  const analyticsSlugs = ['ai-innovation-summit', 'technova-hackathon', 'campus-startup-expo', 'annual-cultural-fest', 'nashik-developer-meetup', 'corporate-leadership-summit', 'fintech-founders-roundtable'];
  for (let i = 0; i < analyticsSlugs.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await seedPredictionAnalytics(analyticsSlugs[i], i);
    // eslint-disable-next-line no-await-in-loop
    await seedSafetyAnalytics(analyticsSlugs[i], i);
  }

  const recInteractions = [];
  const recEvents = analyticsSlugs.map((slug) => events[slug]);
  for (let i = 0; i < 90; i += 1) {
    const u = pool[i % pool.length];
    const ev = recEvents[(i * 3) % recEvents.length];
    recInteractions.push({
      user: u._id,
      event: ev._id,
      interactionType: pick(['impression', 'view', 'click', 'save', 'feedback', 'dismiss'], i),
      feedbackType: i % 11 === 0 ? 'dislike' : i % 5 === 0 ? 'like' : 'none',
      feedbackReason: i % 11 === 0 ? 'Timing conflict' : i % 5 === 0 ? 'Highly relevant to my interests' : '',
      recommendationSource: pick(['PERSONALIZED', 'TRENDING', 'SIMILAR_EVENTS', 'NETWORK_BASED'], i),
      algorithmVersion: `recommendation-v2.${i % 4}`,
      createdAt: new Date(Date.now() - (i % 30) * 86400000),
    });
  }
  await RecommendationInteraction.insertMany(recInteractions);

  const cyberWaitlist = await Waitlist.find({ event: events['cyber-security-bootcamp']._id }).sort({ position: 1 }).limit(4);
  for (let i = 0; i < cyberWaitlist.length; i += 1) {
    const entry = cyberWaitlist[i];
    const holdStatus = pick(['active', 'accepted', 'expired', 'declined'], i);
    // eslint-disable-next-line no-await-in-loop
    const hold = await SeatHold.create({
      eventId: entry.event,
      userId: entry.user,
      waitlistEntryId: entry._id,
      registrationId: entry.registration,
      ticketType: { name: 'Lab Seat', price: 299 },
      status: holdStatus,
      holdExpiresAt: new Date(Date.now() + (i === 0 ? 30 : -30 - i * 10) * 60000),
      holdDurationMinutes: 30,
      reminderSentAt: i === 0 ? new Date(Date.now() - 5 * 60000) : null,
      acceptedAt: holdStatus === 'accepted' ? new Date(Date.now() - 25 * 60000) : null,
      declinedAt: holdStatus === 'declined' ? new Date(Date.now() - 20 * 60000) : null,
      expiredAt: holdStatus === 'expired' ? new Date(Date.now() - 15 * 60000) : null,
      idempotencyKey: `seed-cyber-hold-${i + 1}`,
    });
    entry.status = holdStatus === 'active' ? 'hold_active' : holdStatus === 'accepted' ? 'promoted' : holdStatus;
    entry.activeHold = holdStatus === 'active' ? hold._id : undefined;
    entry.ticketType = { name: 'Lab Seat', price: 299 };
    entry.notifiedAt = hold.notifiedAt;
    entry.promotedAt = holdStatus === 'accepted' ? hold.acceptedAt : undefined;
    entry.declinedAt = holdStatus === 'declined' ? hold.declinedAt : undefined;
    // eslint-disable-next-line no-await-in-loop
    await entry.save();
    // eslint-disable-next-line no-await-in-loop
    await SmartQueueAudit.create([
      { eventId: entry.event, userId: entry.user, waitlistEntryId: entry._id, action: 'ELIGIBILITY_CHECKED', details: { position: entry.position, strategy: 'fifo' } },
      { eventId: entry.event, userId: entry.user, waitlistEntryId: entry._id, holdId: hold._id, action: 'SEAT_HELD', details: { ticketType: 'Lab Seat', holdDurationMinutes: 30 } },
      { eventId: entry.event, userId: entry.user, waitlistEntryId: entry._id, holdId: hold._id, action: 'NOTIFICATION_SENT', details: { channel: 'in_app' } },
      { eventId: entry.event, userId: entry.user, waitlistEntryId: entry._id, holdId: hold._id, action: holdStatus === 'accepted' ? 'HOLD_ACCEPTED' : holdStatus === 'expired' ? 'HOLD_EXPIRED' : holdStatus === 'declined' ? 'HOLD_DECLINED' : 'REMINDER_SENT', details: { status: holdStatus } },
    ]);
  }

  await Report.create({
    reporter: attendees[12]._id, targetType: 'event', target: events['indie-music-night']._id,
    reason: 'incorrect_info', details: 'The gate price shown at registration differs from the venue poster (₹399 vs ₹349).', status: 'open',
  });
  await Report.create({
    reporter: attendees[3]._id, targetType: 'event', target: events['fintech-founders-roundtable']._id,
    reason: 'spam', details: 'Looks like a private dinner advertised as open to all.', status: 'reviewing',
  });
  await AuditLog.create([
    { actor: admin._id, actorName: admin.name, action: 'organizer.approved', targetType: 'user', targetId: organizer._id, meta: { email: organizer.email }, ip: '127.0.0.1' },
    { actor: admin._id, actorName: admin.name, action: 'event.approved', targetType: 'event', targetId: events['ai-innovation-summit']._id, meta: { title: 'AI Innovation Summit 2026' }, ip: '127.0.0.1' },
    { actor: admin._id, actorName: admin.name, action: 'event.approved', targetType: 'event', targetId: events['technova-hackathon']._id, meta: { title: 'TechNova Hackathon' }, ip: '127.0.0.1' },
  ]);

  // ─────────────── Gamification ledger ───────────────
  const allUsers = await User.find({ role: 'attendee' });
  for (const u of allUsers) {
    // eslint-disable-next-line no-await-in-loop
    const regs = await Registration.find({ user: u._id });
    const confirmedCount = regs.filter((r) => ['confirmed', 'checked_in'].includes(r.status)).length;
    const checkedCount = regs.filter((r) => r.status === 'checked_in').length;
    if (confirmedCount) {
      // eslint-disable-next-line no-await-in-loop
      await PointActivity.create({ user: u._id, points: confirmedCount * 10, reason: 'Event registrations', meta: { count: confirmedCount } });
    }
    if (checkedCount) {
      // eslint-disable-next-line no-await-in-loop
      await PointActivity.create({ user: u._id, points: checkedCount * 50, reason: 'Event check-ins', meta: { count: checkedCount } });
    }
    const acceptedConnections = await Connection.countDocuments({
      $or: [{ requester: u._id }, { recipient: u._id }], status: 'accepted',
    });
    if (acceptedConnections) {
      // eslint-disable-next-line no-await-in-loop
      await PointActivity.create({ user: u._id, points: acceptedConnections * 15, reason: 'Networking connections' });
    }
    if (u._id.toString() === attendee._id.toString()) {
      poll1.options[0].voters.push(attendee._id);
      // eslint-disable-next-line no-await-in-loop
      await PointActivity.create({ user: u._id, event: liveEv._id, points: 10, reason: 'Answered a live poll' });
    } else if (rand(u._id.toString().length) > 0.5) {
      // eslint-disable-next-line no-await-in-loop
      await PointActivity.create({ user: u._id, points: 10, reason: 'Answered a live poll' });
    }
    const total = await PointActivity.aggregate([{ $match: { user: u._id } }, { $group: { _id: null, p: { $sum: '$points' } } }]);
    u.points = total[0]?.p || 0;
    // eslint-disable-next-line no-await-in-loop
    await u.save();
  }
  await poll1.save();

  // Badges: evaluate rules for everyone
  const gamification = require('../services/gamificationService');
  const allForBadges = await User.find({});
  for (const u of allForBadges) {
    // eslint-disable-next-line no-await-in-loop
    await gamification.evaluateBadges(u._id);
  }

  log('✓ Seed complete:');
  log(`  ${await User.countDocuments()} users · ${await Event.countDocuments()} events · ${await Registration.countDocuments()} registrations · ${await Ticket.countDocuments()} tickets`);
  log(`  ${await Certificate.countDocuments()} certificates · ${await Session.countDocuments()} sessions · ${await Speaker.countDocuments()} speakers`);
}

// Standalone execution
if (require.main === module) {
  (async () => {
    await connectDB();
    await runSeed({ force: process.argv.includes('--force'), silent: false });
    await disconnectDB();
    process.exit(0);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runSeed, img, avatar, logo, LOCAL_COVERS };
