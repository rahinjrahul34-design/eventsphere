/* eslint-disable no-console, no-await-in-loop */
const mongoose = require('mongoose');
const { ticketCode, slugify } = require('../utils/codes');
const User = require('../models/User');
const Category = require('../models/Category');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Speaker = require('../models/Speaker');
const Session = require('../models/Session');
const Volunteer = require('../models/Volunteer');
const Sponsor = require('../models/Sponsor');
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Waitlist = require('../models/Waitlist');
const Report = require('../models/Report');
const RecommendationInteraction = require('../models/RecommendationInteraction');
const PredictionOutcome = require('../models/PredictionOutcome');
const EventPrediction = require('../models/EventPrediction');
const EventPredictionSnapshot = require('../models/EventPredictionSnapshot');
const EventPulseAlert = require('../models/EventPulseAlert');
const EventRiskAssessment = require('../models/EventRiskAssessment');
const EventRiskAlert = require('../models/EventRiskAlert');
const OrganizerTrustProfile = require('../models/OrganizerTrustProfile');
const OrganizerTrustSnapshot = require('../models/OrganizerTrustSnapshot');
const RiskAssessmentHistory = require('../models/RiskAssessmentHistory');
const SeatHold = require('../models/SeatHold');
const SmartQueueAudit = require('../models/SmartQueueAudit');
const { PointActivity, UserBadge } = require('../models/Gamification');
const { avatar, logo } = require('./seed');

const PREMIUM_EXPANSION_CONFIG = {
  users: Number(process.env.PREMIUM_USERS || 420),
  events: Number(process.env.PREMIUM_EVENTS || 64),
  registrations: Number(process.env.PREMIUM_REGISTRATIONS || 3200),
  waitlists: Number(process.env.PREMIUM_WAITLISTS || 520),
  recommendationInteractions: Number(process.env.PREMIUM_RECOMMENDATIONS || 2800),
  pointActivities: Number(process.env.PREMIUM_POINTS || 2200),
  reports: Number(process.env.PREMIUM_REPORTS || 160),
};

const PREFIX = 'premiumx';
const PASSWORD = 'Event@123';
const r = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const pick = (arr, i) => arr[Math.abs(i) % arr.length];
const unique = (arr) => [...new Set(arr.filter(Boolean))];
const day = (n, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d;
};
const addMin = (d, m) => new Date(d.getTime() + m * 60000);

const CITIES = {
  Mumbai: [72.8777, 19.076],
  Pune: [73.8567, 18.5204],
  Nashik: [73.7898, 19.9975],
  Bengaluru: [77.5946, 12.9716],
  Hyderabad: [78.4867, 17.385],
  Delhi: [77.209, 28.6139],
  Chennai: [80.2707, 13.0827],
  Ahmedabad: [72.5714, 23.0225],
  Jaipur: [75.7873, 26.9124],
  Singapore: [103.8198, 1.3521],
  London: [-0.1276, 51.5072],
  Dubai: [55.2708, 25.2048],
  'San Francisco': [-122.4194, 37.7749],
};

const CATEGORIES = [
  'AI & Machine Learning', 'Generative AI', 'Software Engineering', 'Web Development', 'Cyber Security',
  'Cloud Computing', 'Data Science', 'DevOps', 'Blockchain', 'Robotics',
  'Startup & Entrepreneurship', 'Hackathons', 'Career & Placement', 'UI/UX', 'Product Management',
  'Leadership', 'Finance & Business', 'Marketing', 'Gaming', 'College/Campus Events',
];
const IMAGE_BY_CATEGORY = {
  'AI & Machine Learning': '/images/events/premium-ai-summit.jpg',
  'Generative AI': '/images/events/premium-ai-summit.jpg',
  'Cyber Security': '/images/events/cyber-security-bootcamp.jpg',
  'Cloud Computing': '/images/events/cloud-devops-bootcamp.jpg',
  DevOps: '/images/events/cloud-devops-bootcamp.jpg',
  Robotics: '/images/events/premium-robotics-lab.jpg',
  Hackathons: '/images/events/technova-hackathon.jpg',
  Gaming: '/images/events/esports-arena-2026.jpg',
  'UI/UX': '/images/events/design-thinking-sprint.jpg',
  'Startup & Entrepreneurship': '/images/events/premium-founder-forum.jpg',
  'Finance & Business': '/images/events/fintech-founders-roundtable.jpg',
  'College/Campus Events': '/images/events/campus-startup-expo.jpg',
};
const FIRST = ['Aarav', 'Aanya', 'Vivaan', 'Diya', 'Reyansh', 'Ira', 'Kabir', 'Anika', 'Ishaan', 'Saanvi', 'Arjun', 'Meera', 'Rohan', 'Tara', 'Dev', 'Kavya', 'Nikhil', 'Riya', 'Farhan', 'Sneha', 'Omkar', 'Gauri', 'Pranav', 'Simran'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Rao', 'Mehta', 'Gupta', 'Joshi', 'Kulkarni', 'Bose', 'Iyer', 'Singh', 'Khanna', 'Sheikh', 'Pandit', 'Kaur', 'Deshpande'];
const ORGS = ['Microsoft', 'Google', 'Amazon', 'IBM', 'Deloitte', 'Accenture', 'Infosys', 'TCS', 'Wipro', 'Capgemini', 'NVIDIA', 'Adobe', 'Salesforce', 'NovaTech Labs', 'CloudForge', 'DataNova', 'SecureStack', 'DevSphere', 'AI Nexus', 'TechOrbit'];
const SKILLS = ['React', 'Node.js', 'MongoDB', 'Python', 'TensorFlow', 'AWS', 'Docker', 'Kubernetes', 'Figma', 'Security', 'Data Analysis', 'Public Speaking'];

async function clearOldExpansion() {
  const events = await Event.find({ slug: new RegExp(`^${PREFIX}-`) }).select('_id organizer');
  const eventIds = events.map((e) => e._id);
  const users = await User.find({ email: /@premium\.eventsphere\.demo$/ }).select('_id');
  const userIds = users.map((u) => u._id);
  const regs = await Registration.find({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] }).select('_id');
  const regIds = regs.map((doc) => doc._id);
  const waits = await Waitlist.find({ event: { $in: eventIds } }).select('_id');
  const waitIds = waits.map((doc) => doc._id);
  await Promise.all([
    Ticket.deleteMany({ $or: [{ event: { $in: eventIds } }, { registration: { $in: regIds } }, { user: { $in: userIds } }] }),
    Registration.deleteMany({ _id: { $in: regIds } }),
    Waitlist.deleteMany({ _id: { $in: waitIds } }),
    SeatHold.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { waitlistEntryId: { $in: waitIds } }, { userId: { $in: userIds } }] }),
    SmartQueueAudit.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { waitlistEntryId: { $in: waitIds } }, { userId: { $in: userIds } }] }),
    Session.deleteMany({ event: { $in: eventIds } }),
    Speaker.deleteMany({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] }),
    Sponsor.deleteMany({ event: { $in: eventIds } }),
    Volunteer.deleteMany({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] }),
    Poll.deleteMany({ event: { $in: eventIds } }),
    Question.deleteMany({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] }),
    Report.deleteMany({ $or: [{ target: { $in: eventIds } }, { reporter: { $in: userIds } }] }),
    RecommendationInteraction.deleteMany({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] }),
    EventPrediction.deleteMany({ eventId: { $in: eventIds } }),
    EventPredictionSnapshot.deleteMany({ eventId: { $in: eventIds } }),
    PredictionOutcome.deleteMany({ eventId: { $in: eventIds } }),
    EventPulseAlert.deleteMany({ eventId: { $in: eventIds } }),
    EventRiskAssessment.deleteMany({ eventId: { $in: eventIds } }),
    EventRiskAlert.deleteMany({ eventId: { $in: eventIds } }),
    RiskAssessmentHistory.deleteMany({ eventId: { $in: eventIds } }),
    PointActivity.deleteMany({ $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }, { 'meta.source': 'premium-expansion' }] }),
    UserBadge.deleteMany({ user: { $in: userIds } }),
    OrganizerTrustProfile.deleteMany({ organizer: { $in: userIds } }),
    OrganizerTrustSnapshot.deleteMany({ organizer: { $in: userIds } }),
    Event.deleteMany({ _id: { $in: eventIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
}

async function categories() {
  const out = {};
  for (const name of CATEGORIES) {
    out[name] = await Category.findOneAndUpdate(
      { slug: slugify(name) },
      { $set: { name, slug: slugify(name), icon: 'Sparkles', color: '#2563eb', description: `${name} demo category`, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return out;
}

async function users() {
  const roleFor = (i) => (i < 1 ? 'admin' : i < 29 ? 'organizer' : i < 89 ? 'speaker' : i < 169 ? 'volunteer' : 'attendee');
  const docs = [];
  for (let i = 0; i < PREMIUM_EXPANSION_CONFIG.users; i += 1) {
    const role = roleFor(i);
    const name = `${pick(FIRST, i)} ${pick(LAST, i * 7)}`;
    docs.push({
      name,
      email: `${PREFIX}.${role}.${i}@premium.eventsphere.demo`,
      password: PASSWORD,
      role,
      authProvider: 'local',
      isActive: true,
      onboardingCompleted: true,
      organizerStatus: role === 'organizer' ? (i % 8 ? 'approved' : 'pending') : 'none',
      title: role === 'speaker' ? pick(['Research Lead', 'Principal Engineer', 'Founder', 'Design Director'], i) : pick(['Software Engineer', 'Student Developer', 'Product Manager', 'UX Designer', 'Cloud Engineer'], i),
      company: pick(ORGS, i),
      location: pick(Object.keys(CITIES), i),
      avatar: avatar(`${PREFIX}-${i}`),
      bio: `${name} is a fictional premium EventSphere demo ${role}.`,
      interests: unique([pick(CATEGORIES, i), pick(CATEGORIES, i + 5), pick(CATEGORIES, i + 11)]),
      skills: unique([pick(SKILLS, i), pick(SKILLS, i + 3), pick(SKILLS, i + 8)]),
      networkingGoal: pick(['collaboration', 'job', 'internship', 'mentorship', 'friends'], i),
    });
  }
  const made = await User.create(docs);
  return {
    all: made,
    admin: made.find((u) => u.role === 'admin'),
    organizers: made.filter((u) => u.role === 'organizer'),
    speakers: made.filter((u) => u.role === 'speaker'),
    volunteers: made.filter((u) => u.role === 'volunteer'),
    attendees: made.filter((u) => u.role === 'attendee'),
  };
}

async function speakers(userGroups) {
  const docs = [];
  for (let i = 0; i < 150; i += 1) {
    const user = userGroups.speakers[i % userGroups.speakers.length];
    docs.push({
      user: i < userGroups.speakers.length ? user._id : undefined,
      name: i < userGroups.speakers.length ? user.name : `${pick(FIRST, i + 300)} ${pick(LAST, i)}`,
      title: pick(['AI Research Lead', 'Cloud Architect', 'Security Principal', 'Founder', 'Product Coach', 'Design Strategist'], i),
      company: pick(ORGS, i + 4),
      bio: `Fictional demo speaker focused on ${pick(CATEGORIES, i)}.`,
      photo: avatar(`${PREFIX}-speaker-${i}`),
      skills: unique([pick(SKILLS, i), pick(SKILLS, i + 2), pick(CATEGORIES, i)]),
      social: { linkedin: 'https://linkedin.com', website: `https://speakers.eventsphere.demo/${i}` },
      featured: i % 7 === 0,
    });
  }
  return Speaker.insertMany(docs);
}

async function events(catMap, userGroups) {
  const out = [];
  const statuses = ['completed', 'completed', 'published', 'published', 'published', 'live', 'draft', 'cancelled'];
  for (let i = 0; i < PREMIUM_EXPANSION_CONFIG.events; i += 1) {
    const categoryName = pick(CATEGORIES, i);
    const status = pick(statuses, i);
    const city = pick(Object.keys(CITIES), i * 3);
    const title = `${categoryName} ${pick(['Summit', 'Forum', 'Lab', 'Bootcamp', 'Connect', 'Expo', 'Masterclass'], i)} ${2026 + (i % 2)}`;
    const startOffset = status === 'completed' ? -120 + i * 2 : status === 'live' ? 0 : status === 'draft' ? 45 + i : status === 'cancelled' ? 22 + i : 7 + i * 2;
    const startDate = day(startOffset, 9 + (i % 4));
    const capacity = [80, 120, 180, 240, 320, 420, 520][i % 7];
    const price = [0, 299, 499, 999, 1499][i % 5];
    const eventType = pick(['offline', 'hybrid', 'online'], i);
    const image = IMAGE_BY_CATEGORY[categoryName] || '/images/events/nashik-developer-meetup.jpg';
    out.push(await Event.create({
      title,
      slug: `${PREFIX}-${slugify(title)}-${i}`,
      shortDescription: `Premium fictional demo event for ${categoryName.toLowerCase()} in ${city}.`,
      description: `${title} connects organizers, speakers, sessions, sponsors, registrations, SmartQueue and AI operations data.`,
      coverImage: image,
      images: [image],
      category: catMap[categoryName]._id,
      categorySlug: catMap[categoryName].slug,
      tags: unique([categoryName, city, 'premium demo']),
      eventType,
      startDate,
      endDate: addMin(startDate, 8 * 60),
      registrationDeadline: day(startOffset - 2, 18),
      venue: { name: eventType === 'online' ? 'EventSphere Live Studio' : `${city} Convention Hub`, address: eventType === 'online' ? 'Online' : `${(i % 21) + 1} Innovation Road`, city, onlineUrl: eventType !== 'offline' ? 'https://meet.eventsphere.demo/live' : '', coordinates: { type: 'Point', coordinates: CITIES[city] } },
      capacity,
      price,
      ticketTypes: [{ name: 'General', price, quantity: capacity, soldCount: 0 }, { name: 'Student', price: Math.max(0, price - 200), quantity: Math.round(capacity * 0.35), soldCount: 0 }, { name: 'Premium', price: price + 900, quantity: Math.round(capacity * 0.2), soldCount: 0 }],
      customRegistrationFields: [{ label: 'Primary goal', type: 'select', options: ['Learning', 'Networking', 'Hiring', 'Showcase'], required: true }],
      faq: [{ q: 'Is this a real public event?', a: 'No. This is a fictional premium EventSphere demo record.' }],
      organizer: pick(userGroups.organizers, i)._id,
      coOrganizers: [pick(userGroups.organizers, i + 3)._id, pick(userGroups.organizers, i + 7)._id],
      status,
      approvalStatus: status === 'draft' ? 'pending' : status === 'cancelled' ? 'rejected' : 'approved',
      visibility: status === 'draft' ? 'private' : 'public',
      featured: i % 5 === 0,
      views: 500 + Math.floor(r(i) * 9500),
      settings: { allowWaitlist: true, showAttendeeList: true, requireRegistrationApproval: false, certificatesIssued: status === 'completed', smartQueue: { enabled: true, autoPromote: true, holdDurationMinutes: 20, sendReminders: true, ticketTypeSpecific: true, priorityStrategy: i % 2 ? 'ticket_tier' : 'fifo' } },
      safetyConfig: { emergencyContact: { name: 'Demo Safety Desk', phone: '+91-90000-00000', role: 'Operations Lead' }, firstAidStation: { location: 'Main foyer', details: 'Demo first-aid station' }, entryGates: 2 + (i % 4), checkInDesks: 2 + (i % 5), staffCount: 8 + (i % 20), parkingCapacity: capacity, accessibilityInfo: { hasRampAccess: true, hasWheelchairSeating: i % 2 === 0, accessibilityContact: 'access@eventsphere.demo' }, evacuationInstructions: 'Follow venue marshal instructions and posted route maps.' },
      riskFlags: i % 13 === 0 ? ['capacity_pressure', 'volunteer_gap'] : [],
      popularityScore: 60 + (i % 40),
    }));
  }
  return out;
}

async function program(eventList, speakerList, userGroups) {
  const sessions = [];
  const volunteers = [];
  const sponsors = [];
  for (let i = 0; i < eventList.length; i += 1) {
    const event = eventList[i];
    for (let s = 0; s < 7; s += 1) sessions.push({ event: event._id, title: pick(['Opening Keynote', 'Hands-on Lab', 'Expert Panel', 'Case Study Talk', 'Career Roundtable', 'Networking', 'Closing Ceremony'], s), type: pick(['keynote', 'workshop', 'panel', 'talk', 'networking', 'ceremony'], s), speaker: pick(speakerList, i * 7 + s)._id, startTime: addMin(event.startDate, s * 75), endTime: addMin(event.startDate, s * 75 + 55), room: pick(['Main Hall', 'Studio A', 'Lab 2', 'Auditorium'], s), order: s + 1, engagementScore: 55 + ((i + s) % 42) });
    for (let v = 0; v < 3; v += 1) {
      const u = pick(userGroups.volunteers, i * 3 + v);
      volunteers.push({ event: event._id, user: u._id, name: u.name, email: u.email, role: pick(['Registration Desk', 'Technical Support', 'Hospitality', 'Security', 'Photography', 'Stage Management'], v), task: `Support ${event.title}`, zone: pick(['Main Entrance', 'Stage', 'Help Desk'], v), startTime: event.startDate, endTime: event.endDate, status: pick(['assigned', 'accepted', 'completed', 'reported'], i + v) });
    }
    for (let s = 0; s < (i % 2 ? 1 : 2); s += 1) {
      const name = pick(['NovaTech Labs', 'CloudForge', 'DataNova', 'SecureStack', 'DevSphere', 'AI Nexus', 'TechOrbit'], i + s);
      sponsors.push({ event: event._id, name, logo: logo(name), tier: pick(['platinum', 'gold', 'silver', 'bronze'], i + s), amount: [25000, 50000, 100000, 175000][(i + s) % 4], benefits: 'Logo placement, booth presence and demo-stage mention.', website: `https://${slugify(name)}.demo` });
    }
  }
  const [createdSessions] = await Promise.all([Session.insertMany(sessions), Volunteer.insertMany(volunteers), Sponsor.insertMany(sponsors)]);
  return createdSessions;
}

async function registrations(eventList, userGroups) {
  const regs = [];
  const tickets = [];
  const used = new Set();
  let total = 0;
  for (let i = 0; i < eventList.length && total < PREMIUM_EXPANSION_CONFIG.registrations; i += 1) {
    const event = eventList[i];
    const target = Math.min(event.capacity, Math.max(12, Math.round(event.capacity * (i % 9 === 0 ? 0.92 : i % 5 === 0 ? 0.72 : 0.58))));
    let confirmed = 0;
    let checked = 0;
    for (let j = 0; j < target && total < PREMIUM_EXPANSION_CONFIG.registrations; j += 1) {
      const user = pick(userGroups.attendees, i * 37 + j);
      const key = `${event._id}:${user._id}`;
      if (used.has(key)) continue;
      used.add(key);
      const tt = pick(event.ticketTypes, j);
      const isChecked = event.status === 'completed' ? j % 5 !== 0 : event.status === 'live' ? j % 3 === 0 : false;
      const status = j % 31 === 0 ? 'cancelled' : j % 47 === 0 ? 'pending' : isChecked ? 'checked_in' : 'confirmed';
      const reg = { _id: new mongoose.Types.ObjectId(), event: event._id, user: user._id, ticketType: { name: tt.name, price: tt.price }, status, amountPaid: ['confirmed', 'checked_in'].includes(status) ? tt.price : 0, source: pick(['direct', 'recommendation', 'social', 'organizer_invite'], j), registeredAt: day(-70 + ((i + j) % 80), 12), checkedInAt: isChecked ? addMin(event.startDate, 20 + (j % 180)) : undefined, checkInMethod: isChecked ? pick(['qr', 'manual'], j) : '', checkedInBy: isChecked ? event.organizer : undefined, responses: [{ field: 'goal', label: 'Primary goal', value: pick(['Learning', 'Networking', 'Hiring', 'Showcase'], j) }], pointsAwarded: isChecked };
      regs.push(reg);
      if (['confirmed', 'checked_in'].includes(status)) {
        confirmed += 1;
        if (isChecked) checked += 1;
        tickets.push({ code: ticketCode(), event: event._id, registration: reg._id, user: user._id, ticketType: tt.name, attendeeName: user.name, status: isChecked ? 'used' : 'valid', issuedAt: reg.registeredAt, checkedInAt: isChecked ? reg.checkedInAt : undefined, checkedInBy: isChecked ? event.organizer : undefined });
      }
      total += 1;
    }
    event.registrationCount = confirmed;
    event.checkedInCount = checked;
    await event.save();
  }
  if (regs.length) await Registration.insertMany(regs);
  if (tickets.length) await Ticket.insertMany(tickets);
  return { regs, tickets };
}

async function waitlists(eventList, userGroups) {
  const waits = [];
  const regs = [];
  for (const event of eventList.filter((e, i) => i % 4 === 0 || e.registrationCount > e.capacity * 0.8)) {
    const existingUsers = new Set((await Registration.find({ event: event._id }).select('user')).map((doc) => String(doc.user)));
    for (let i = 0; i < 28 && waits.length < PREMIUM_EXPANSION_CONFIG.waitlists; i += 1) {
      const user = pick(userGroups.attendees, waits.length * 11 + i + 19);
      if (existingUsers.has(String(user._id))) continue;
      existingUsers.add(String(user._id));
      const reg = { _id: new mongoose.Types.ObjectId(), event: event._id, user: user._id, ticketType: { name: 'General', price: event.price }, status: 'waitlisted', waitlistPosition: i + 1, source: 'smartqueue' };
      regs.push(reg);
      waits.push({ event: event._id, user: user._id, registration: reg._id, position: i + 1, status: pick(['waiting', 'eligible', 'notified', 'skipped'], waits.length), ticketType: { name: 'General', price: event.price }, skipReason: waits.length % 17 === 0 ? 'Demo priority cooldown' : '' });
    }
    event.waitlistCount = waits.filter((w) => String(w.event) === String(event._id)).length;
    await event.save();
  }
  if (regs.length) await Registration.insertMany(regs, { ordered: false });
  const createdWaits = waits.length ? await Waitlist.insertMany(waits, { ordered: false }) : [];
  return createdWaits;
}

async function queue(eventList, waits) {
  const audits = [];
  const holds = [];
  for (let i = 0; i < Math.min(220, waits.length); i += 1) {
    const wait = waits[i];
    const status = pick(['active', 'accepted', 'expired', 'declined', 'cancelled'], i);
    const hold = await SeatHold.create({ eventId: wait.event, userId: wait.user, waitlistEntryId: wait._id, registrationId: wait.registration, ticketType: wait.ticketType, status, holdExpiresAt: addMin(new Date(), status === 'active' ? 25 : -25), holdDurationMinutes: 20, acceptedAt: status === 'accepted' ? addMin(new Date(), -15) : null, declinedAt: status === 'declined' ? addMin(new Date(), -12) : null, expiredAt: status === 'expired' ? addMin(new Date(), -10) : null, idempotencyKey: `${PREFIX}-hold-${i}` });
    holds.push(hold);
    wait.status = status === 'active' ? 'hold_active' : status === 'accepted' ? 'promoted' : status === 'declined' ? 'declined' : status === 'expired' ? 'expired' : wait.status;
    wait.activeHold = status === 'active' ? hold._id : undefined;
    await wait.save();
    ['WAITLIST_JOINED', 'ELIGIBILITY_CHECKED', 'SEAT_HELD', 'NOTIFICATION_SENT', pick(['REMINDER_SENT', 'HOLD_ACCEPTED', 'HOLD_EXPIRED', 'HOLD_DECLINED', 'SEAT_RELEASED'], i)].forEach((action) => audits.push({ eventId: wait.event, userId: wait.user, holdId: hold._id, waitlistEntryId: wait._id, action, details: { position: wait.position, demo: true }, actor: 'system' }));
  }
  await SmartQueueAudit.insertMany(audits);
  for (const event of eventList) {
    event.activeHoldsCount = holds.filter((h) => String(h.eventId) === String(event._id) && h.status === 'active').length;
    await event.save();
  }
  return { holds, audits };
}

async function engagement(eventList, sessionList, userGroups) {
  const polls = [];
  const questions = [];
  for (let i = 0; i < eventList.length; i += 1) {
    const event = eventList[i];
    for (let p = 0; p < 3; p += 1) {
      const voters = userGroups.attendees.slice((i * 7 + p * 11) % 180, ((i * 7 + p * 11) % 180) + 18);
      polls.push({ event: event._id, createdBy: event.organizer, question: pick(['What technology are you most interested in?', 'Which track should return next?', 'How would you rate the event energy?'], p), options: ['AI', 'Cyber Security', 'Cloud', 'Web Development', 'Data Science'].map((text, k) => ({ text, voters: voters.filter((_, n) => n % 5 === k).map((u) => u._id) })), multiple: p === 1, closed: event.status === 'completed' });
    }
    const eventSessions = sessionList.filter((s) => String(s.event) === String(event._id));
    for (let q = 0; q < 8; q += 1) {
      const user = pick(userGroups.attendees, i * 17 + q);
      questions.push({ event: event._id, user: user._id, userName: user.name, session: pick(eventSessions, q)?._id, text: pick(['Can you share the slides after the session?', 'What beginner resources do you recommend?', 'How should teams prepare for the workshop?', 'Will recordings be available?', 'Which companies are hiring for these skills?'], q), upvotes: userGroups.attendees.slice(q, q + 4 + (q % 5)).map((u) => u._id), answered: q % 3 !== 0, answer: q % 3 !== 0 ? 'The demo host team will share resources in the event follow-up.' : '', answeredByName: q % 3 !== 0 ? 'EventSphere Host Team' : '' });
    }
  }
  await Poll.insertMany(polls);
  await Question.insertMany(questions);
  return { polls, questions };
}

async function aiOps(eventList) {
  const predictions = [];
  const snapshots = [];
  const outcomes = [];
  const risks = [];
  const history = [];
  const pulseAlerts = [];
  const riskAlerts = [];
  for (let i = 0; i < eventList.length; i += 1) {
    const e = eventList[i];
    const regs = e.registrationCount || 0;
    const attendance = e.checkedInCount || Math.round(regs * 0.78);
    const predicted = Math.min(e.capacity, Math.max(regs + 5, Math.round(regs * (1.05 + r(i + 3) * 0.25))));
    const engagementScore = 52 + (i % 45);
    const ratio = regs / Math.max(e.capacity, 1);
    const risk = ratio > 0.95 ? 'critical' : ratio > 0.82 ? 'high' : i % 7 === 0 ? 'medium' : 'low';
    predictions.push({ eventId: e._id, forecast: { predictedRegistrations: predicted, lowerBound: Math.max(0, predicted - 22), upperBound: Math.min(e.capacity, predicted + 35), velocity24h: 4 + (i % 28), growthRate: 0.1, momentumState: pick(['accelerating', 'growing', 'stable', 'slowing'], i) }, attendance: { expectedAttendees: attendance, expectedNoShows: Math.max(0, predicted - attendance), attendanceRate: Math.round((attendance / Math.max(predicted, 1)) * 100), noShowRate: Math.round(((predicted - attendance) / Math.max(predicted, 1)) * 100) }, engagement: { score: engagementScore, level: engagementScore > 85 ? 'very_high' : engagementScore > 70 ? 'high' : 'medium', trend: pick(['rising', 'stable', 'declining'], i), breakdown: { participation: engagementScore, interaction: engagementScore - 5, liveActivity: engagementScore - 4, feedback: engagementScore - 8, networking: engagementScore - 3 } }, health: { score: Math.min(98, engagementScore + 10), status: risk === 'critical' ? 'at_risk' : risk === 'high' ? 'attention' : 'healthy', breakdown: { velocity: 70, capacity: Math.round(ratio * 100), attendance: 75, engagement: engagementScore, sentiment: 84 } }, confidence: { score: 82, level: 'high', reasons: ['Historical demo velocity', 'Recommendation engagement'] }, drivers: [{ factor: 'Registration velocity', impact: 'Recent signups shape the forecast', direction: 'positive', magnitude: 'medium' }], recommendations: [{ id: `${PREFIX}-rec-${i}`, priority: ratio > 0.85 ? 'high' : 'medium', title: 'Tune attendee communications', action: 'Publish check-in guidance.', trigger: 'eventpulse' }], aiSummary: `Premium EventPulse forecast for ${e.title}.`, modelVersion: 'eventpulse-v2.1-premium', engine: 'hybrid-deterministic', featureSnapshot: { premiumSeed: true, registrations: regs, capacity: e.capacity }, expiresAt: day(7) });
    for (let d = 0; d < 4; d += 1) snapshots.push({ eventId: e._id, dayOffset: -d, predictedRegistrations: Math.max(0, predicted - d * 12), actualRegistrations: Math.max(0, regs - d * 8), expectedAttendance: Math.max(0, attendance - d * 9), actualAttendance: d === 0 ? e.checkedInCount : 0, engagementScore: Math.max(0, engagementScore - d * 3), trigger: pick(['initial', 'daily', 'velocity_shift', 'checkin_milestone'], d), snapshotTime: day(-d), modelVersion: 'eventpulse-v2.1-premium' });
    if (e.status === 'completed') outcomes.push({ eventId: e._id, predicted: { registrations: predicted, attendance, noShows: Math.max(0, predicted - attendance), engagement: engagementScore }, actual: { registrations: regs, attendance: e.checkedInCount, noShows: Math.max(0, regs - e.checkedInCount), engagement: Math.max(40, engagementScore - 3) }, errors: { registrationAE: Math.abs(predicted - regs), attendanceAE: Math.abs(attendance - e.checkedInCount), engagementAE: 3 }, modelVersion: 'eventpulse-v2.1-premium' });
    risks.push({ eventId: e._id, safetyScore: risk === 'critical' ? 54 : risk === 'high' ? 68 : risk === 'medium' ? 81 : 93, readinessScore: risk === 'critical' ? 61 : risk === 'high' ? 74 : 88, overallRiskLevel: risk, summary: `Demo EventShield assessment for ${e.title}.`, engine: 'hybrid-deterministic', categories: [{ id: 'capacity', name: 'Capacity Pressure', score: Math.max(35, 100 - Math.round(ratio * 45)), riskLevel: risk, recommendations: ['Keep overflow and QR lanes ready'], evidence: [`${regs}/${e.capacity} registrations`], probability: ratio > 0.8 ? 'high' : 'low', impact: ratio > 0.8 ? 'high' : 'medium', priority: risk }], topRisks: [{ title: 'Peak arrival congestion', category: 'capacity', severity: risk, recommendation: 'Open check-in desks early.' }], checklist: [{ id: `${PREFIX}-check-${i}`, title: 'Confirm QR lanes', category: 'Operations', priority: 'high', status: i % 3 === 0 ? 'pending' : 'completed', completedBy: i % 3 === 0 ? null : e.organizer, completedAt: i % 3 === 0 ? null : new Date() }], matrix: [{ risk: 'Queue spillover', probability: ratio > 0.8 ? 'high' : 'medium', impact: 'medium', priority: risk === 'low' ? 'low' : risk, action: 'Assign extra volunteer marshal.' }], metricsSnapshot: { registrations: regs, capacity: e.capacity, checkedIn: e.checkedInCount }, version: 2 });
    for (let h = 0; h < 3; h += 1) history.push({ eventId: e._id, safetyScore: 72 + h * 4, readinessScore: 70 + h * 5, overallRiskLevel: risk, trigger: pick(['initial', 'registration_threshold', 'auto_recalc'], h), delta: h * 3, improvements: ['Added staffing plan', 'Updated venue checklist'], topRisksCount: 1 + (i % 3), analyzedAt: day(-h * 2) });
    pulseAlerts.push({ eventId: e._id, type: ratio > 0.8 ? 'CAPACITY_PRESSURE' : 'LOW_ENGAGEMENT_PACE', severity: risk === 'critical' ? 'critical' : risk === 'high' ? 'high' : 'medium', message: `Premium EventPulse alert for ${e.title}.`, metricValue: regs, threshold: Math.round(e.capacity * 0.8), status: i % 4 === 0 ? 'resolved' : 'active', actionRecommended: 'Review campaign and check-in operations.' });
    riskAlerts.push({ eventId: e._id, type: 'DEMO_OPERATIONAL_REVIEW', severity: risk, message: `EventShield demo alert for ${e.title}.`, metricValue: { registrations: regs }, threshold: { capacity: e.capacity }, status: i % 5 === 0 ? 'acknowledged' : 'active', actionRequired: 'Assign an owner for the final operational review.', resolvedBy: i % 5 === 0 ? e.organizer : null, resolvedAt: i % 5 === 0 ? new Date() : null });
  }
  await Promise.all([EventPrediction.insertMany(predictions), EventPredictionSnapshot.insertMany(snapshots), EventRiskAssessment.insertMany(risks), RiskAssessmentHistory.insertMany(history), EventPulseAlert.insertMany(pulseAlerts), EventRiskAlert.insertMany(riskAlerts)]);
  if (outcomes.length) await PredictionOutcome.insertMany(outcomes);
  return { predictions, snapshots, outcomes, risks, history };
}

async function trust(userGroups, eventList) {
  const profiles = [];
  const snapshots = [];
  for (let i = 0; i < userGroups.organizers.length; i += 1) {
    const organizer = userGroups.organizers[i];
    const owned = eventList.filter((e) => String(e.organizer) === String(organizer._id));
    const score = i % 8 === 0 ? 48 : i % 5 === 0 ? 68 : i % 3 === 0 ? 84 : 93;
    const level = score >= 90 ? 'excellent' : score >= 80 ? 'very_good' : score >= 65 ? 'good' : 'building_history';
    const metrics = { totalEvents: owned.length, completedEvents: owned.filter((e) => e.status === 'completed').length, cancelledEvents: owned.filter((e) => e.status === 'cancelled').length, completionRate: 88, cancellationRate: 4, attendeesServed: owned.reduce((s, e) => s + (e.registrationCount || 0), 0), totalRegistrations: owned.reduce((s, e) => s + (e.registrationCount || 0), 0), attendanceRate: 78, totalFeedbackCount: 30 + i * 4, averageRating: 4.2, satisfactionPercentage: 86, bayesianRating: 4.1, totalReports: i % 6, confirmedViolations: 0, dismissedReports: i % 5, successfulEvents: owned.length };
    const components = { completion: 88, cancellation: 94, attendance: 78, satisfaction: 86, compliance: 94, verification: organizer.organizerStatus === 'approved' ? 90 : 35, experience: Math.min(98, owned.length * 20) };
    profiles.push({ organizer: organizer._id, trustScore: score, trustLevel: level, confidenceLevel: owned.length ? 'high' : 'limited', scoreVersion: 'TRUST_V2.1-PREMIUM', verified: organizer.organizerStatus === 'approved', metrics, components, weights: { completion: 0.2, attendance: 0.16, satisfaction: 0.2, compliance: 0.18, verification: 0.12, experience: 0.14 }, badges: score > 80 ? ['verified-host', 'community-builder'] : ['new-organizer'], factors: [{ factor: 'completion_rate', label: 'Completion rate', value: metrics.completionRate, impact: 'positive', weight: 0.2 }], aiInsights: { summary: `${organizer.name} is a fictional demo organizer with ${owned.length} EventSphere events.`, strengths: ['Clear event setup'], recommendations: [{ title: 'Publish post-event reports', description: 'Share attendance outcomes.', impact: 'medium' }] }, isStale: false });
    for (let s = 0; s < 3; s += 1) snapshots.push({ organizer: organizer._id, score: Math.max(0, score - s * 3), trustLevel: level, confidenceLevel: owned.length ? 'high' : 'limited', components, metrics, changeReason: 'Premium demo trust timeline', scoreDelta: s === 0 ? 3 : 1, trigger: pick(['SCHEDULED_RECALCULATION', 'EVENT_COMPLETED', 'FEEDBACK_SUBMITTED'], s), scoreVersion: 'TRUST_V2.1-PREMIUM', calculatedAt: day(-s * 14) });
  }
  await OrganizerTrustProfile.insertMany(profiles);
  await OrganizerTrustSnapshot.insertMany(snapshots);
  return { profiles, snapshots };
}

async function recsPointsReports(eventList, userGroups) {
  const interactions = [];
  for (let i = 0; i < PREMIUM_EXPANSION_CONFIG.recommendationInteractions; i += 1) interactions.push({ user: pick(userGroups.attendees, i)._id, event: pick(eventList, i * 7)._id, interactionType: pick(['impression', 'view', 'click', 'save', 'feedback', 'dismiss'], i), feedbackType: i % 13 === 0 ? 'dislike' : i % 5 === 0 ? 'like' : 'none', feedbackReason: i % 5 === 0 ? 'Relevant to my interests' : '', recommendationSource: pick(['PERSONALIZED', 'TRENDING', 'NEARBY', 'COLLABORATIVE', 'SIMILAR_EVENTS'], i), algorithmVersion: 'recommendation-v2.1-premium', createdAt: day(-1 * (i % 80)) });
  await RecommendationInteraction.insertMany(interactions);
  const points = [];
  for (let i = 0; i < PREMIUM_EXPANSION_CONFIG.pointActivities; i += 1) points.push({ user: pick(userGroups.attendees, i)._id, event: pick(eventList, i * 5)._id, points: pick([5, 10, 15, 20, 30, 50], i), reason: pick(['Event registration', 'Event check-in', 'Poll participation', 'Question submission', 'Feedback submission', 'Networking', 'Volunteer activity'], i), meta: { source: 'premium-expansion' } });
  await PointActivity.insertMany(points);
  const badgeCodes = ['FIRST_EVENT', 'EARLY_ADOPTER', 'EVENT_EXPLORER', 'COMMUNITY_BUILDER', 'NETWORKING_PRO', 'KNOWLEDGE_SEEKER', 'HACKATHON_HERO', 'CONSISTENT_ATTENDEE'];
  const badges = userGroups.attendees.slice(0, 260).map((u, i) => ({ user: u._id, code: badgeCodes[i % badgeCodes.length], name: badgeCodes[i % badgeCodes.length].replace(/_/g, ' '), icon: 'Award', description: 'Premium demo achievement badge.' }));
  await UserBadge.insertMany(badges, { ordered: false }).catch(() => {});
  const reports = [];
  for (let i = 0; i < PREMIUM_EXPANSION_CONFIG.reports; i += 1) reports.push({ reporter: pick(userGroups.attendees, i)._id, targetType: i % 7 === 0 ? 'user' : 'event', target: i % 7 === 0 ? pick(userGroups.all, i + 10)._id : pick(eventList, i)._id, reason: pick(['fake_event', 'inappropriate', 'spam', 'fraud', 'incorrect_info', 'other'], i), details: `Premium demo moderation case ${i + 1}.`, status: pick(['open', 'reviewing', 'resolved', 'dismissed'], i), resolvedBy: i % 3 === 0 ? userGroups.admin._id : undefined });
  await Report.insertMany(reports);
  return { interactions, points, badges, reports };
}

async function counts() {
  const models = { users: User, events: Event, registrations: Registration, tickets: Ticket, sessions: Session, speakers: Speaker, sponsors: Sponsor, volunteers: Volunteer, polls: Poll, questions: Question, waitlists: Waitlist, seatHolds: SeatHold, smartQueueAudits: SmartQueueAudit, recommendationInteractions: RecommendationInteraction, pointActivities: PointActivity, userBadges: UserBadge, reports: Report, predictions: EventPrediction, predictionOutcomes: PredictionOutcome, riskAssessments: EventRiskAssessment, riskHistory: RiskAssessmentHistory, trustProfiles: OrganizerTrustProfile };
  const out = {};
  for (const [name, Model] of Object.entries(models)) out[name] = await Model.countDocuments();
  return out;
}

async function expandPremiumDataset({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  await clearOldExpansion();
  const catMap = await categories();
  const userGroups = await users();
  const speakerList = await speakers(userGroups);
  const eventList = await events(catMap, userGroups);
  const sessionList = await program(eventList, speakerList, userGroups);
  const regData = await registrations(eventList, userGroups);
  const waits = await waitlists(eventList, userGroups);
  const queueData = await queue(eventList, waits);
  const engagementData = await engagement(eventList, sessionList, userGroups);
  const aiData = await aiOps(eventList);
  const trustData = await trust(userGroups, eventList);
  const misc = await recsPointsReports(eventList, userGroups);
  const finalCounts = await counts();
  const created = {
    users: userGroups.all.length,
    events: eventList.length,
    registrations: regData.regs.length + waits.length,
    tickets: regData.tickets.length,
    sessions: sessionList.length,
    speakers: speakerList.length,
    sponsors: await Sponsor.countDocuments({ event: { $in: eventList.map((e) => e._id) } }),
    volunteers: await Volunteer.countDocuments({ event: { $in: eventList.map((e) => e._id) } }),
    polls: engagementData.polls.length,
    questions: engagementData.questions.length,
    waitlists: waits.length,
    seatHolds: queueData.holds.length,
    smartQueueAudits: queueData.audits.length,
    recommendationInteractions: misc.interactions.length,
    pointActivities: misc.points.length,
    userBadges: misc.badges.length,
    predictions: aiData.predictions.length,
    predictionOutcomes: aiData.outcomes.length,
    riskAssessments: aiData.risks.length,
    riskHistory: aiData.history.length,
    trustProfiles: trustData.profiles.length,
    reports: misc.reports.length,
  };
  log(`✓ Premium expansion complete: ${created.users} users · ${created.events} events · ${created.registrations} registrations · ${created.tickets} tickets`);
  return { created, counts: finalCounts };
}

module.exports = { expandPremiumDataset, PREMIUM_EXPANSION_CONFIG };
