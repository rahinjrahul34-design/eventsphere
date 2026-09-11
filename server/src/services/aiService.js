const config = require('../config');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const Registration = require('../models/Registration');
const { eventAnalytics } = require('./analyticsService');

/**
 * AI Event Copilot.
 * Uses Google Gemini when GEMINI_API_KEY is configured; otherwise runs a
 * rich local DEMO model that produces structured, usable plans.
 * All responses conform to the same JSON shapes, so the client is provider-agnostic.
 */

const TOPICS = [
  { keys: ['ai', 'artificial intelligence', 'ml', 'machine learning'], label: 'AI/ML', tags: ['Artificial Intelligence', 'Machine Learning', 'Data Science'] },
  { keys: ['hackathon', 'hacking'], label: 'Hackathon', tags: ['Hackathon', 'Building', 'Competition'] },
  { keys: ['cyber', 'security'], label: 'Cyber Security', tags: ['Cyber Security', 'Networking', 'Ethical Hacking'] },
  { keys: ['web', 'full stack', 'mern', 'javascript'], label: 'Web Development', tags: ['Web Development', 'MERN', 'JavaScript'] },
  { keys: ['startup', 'entrepreneur', 'business'], label: 'Startups & Business', tags: ['Startups', 'Entrepreneurship', 'Business'] },
  { keys: ['cultural', 'fest', 'music', 'dance'], label: 'Cultural', tags: ['Cultural', 'Music', 'Arts'] },
  { keys: ['sports', 'championship', 'tournament'], label: 'Sports', tags: ['Sports', 'Tournament', 'Fitness'] },
  { keys: ['design', 'ui', 'ux'], label: 'Design', tags: ['Design', 'UI/UX', 'Creativity'] },
  { keys: ['cloud', 'devops'], label: 'Cloud & DevOps', tags: ['Cloud', 'DevOps', 'AWS'] },
  { keys: ['data', 'analytics'], label: 'Data & Analytics', tags: ['Data Analytics', 'SQL', 'Big Data'] },
];

function parseBrief(brief = '') {
  const text = brief.toLowerCase();
  const days = (text.match(/(\d+)\s*-?\s*day/) || [])[1] || 1;
  const sizeMatch = text.match(/(\d{2,5})\s*(students|people|attendees|delegates|participants|guests)?/);
  const audience = sizeMatch ? parseInt(sizeMatch[1], 10) : 200;
  const topics = TOPICS.filter((t) => t.keys.some((k) => text.includes(k)));
  const isHackathon = /hackathon/.test(text);
  const isCollege = /college|campus|university|student/.test(text);
  const isCorporate = /company|corporate|enterprise|employee/.test(text);
  const cityMatch = text.match(/(?:in|at)\s+([a-z][a-z\s.]+?)(?:[,.]|$)/);
  return {
    raw: brief,
    days: parseInt(days, 10),
    audience,
    topics: topics.length ? topics : [{ label: 'Technology', tags: ['Technology', 'Innovation'] }],
    isHackathon,
    isCollege,
    isCorporate,
    city: cityMatch ? cityMatch[1].trim() : '',
  };
}

function demoPlan(brief) {
  const ctx = parseBrief(brief);
  const primary = ctx.topics[0];
  const name = ctx.isHackathon ? 'Hackathon' : `${primary.label.replace(/[/&].*/, '').trim()} Summit`;
  const title = ctx.isHackathon
    ? `${primary.label === 'Technology' ? 'TechNova' : primary.label.split(/[/&]/)[0].trim()} Sparks Hackathon`
    : `${primary.label.split(/[/&]/)[0].trim()} Innovation Summit`;
  const tagList = [...new Set(ctx.topics.flatMap((t) => t.tags))].slice(0, 7);

  const capacity = Math.ceil(ctx.audience / 10) * 10;
  const ticketTypes = ctx.isCollege
    ? [
        { name: 'Student Pass', price: 0, quantity: Math.round(capacity * 0.8), description: 'Free entry for registered students' },
        { name: 'Pro Hacker Pass', price: 199, quantity: Math.round(capacity * 0.2), description: 'Swag kit, meals & API credits' },
      ]
    : [
        { name: 'Early Bird', price: 499, quantity: Math.round(capacity * 0.3), description: 'Limited early-bird pricing' },
        { name: 'Standard Pass', price: 799, quantity: capacity, description: 'Full 2-day access' },
        { name: 'VIP Pass', price: 1499, quantity: 50, description: 'Front seats, networking dinner, certificate' },
      ];

  // Schedule builder
  const schedule = [];
  if (ctx.isHackathon) {
    schedule.push(
      { day: 1, time: '09:00', duration: 60, title: 'Registration & Breakfast', type: 'ceremony', room: 'Main Lobby' },
      { day: 1, time: '10:00', duration: 45, title: 'Opening Ceremony & Problem Statements', type: 'keynote', room: 'Main Auditorium' },
      { day: 1, time: '11:00', duration: 60, title: `${primary.label} Tech Talk & API Showcase`, type: 'talk', room: 'Main Auditorium' },
      { day: 1, time: '12:00', duration: 30, title: 'Team Formation & Mentor Matching', type: 'networking', room: 'Atrium' },
      { day: 1, time: '13:00', duration: 45, title: 'Lunch Break', type: 'break', room: 'Dining Hall' },
      { day: 1, time: '14:00', duration: 240, title: 'Hacking Sprint — Round 1', type: 'workshop', room: 'Innovation Labs' },
      { day: 1, time: '18:00', duration: 45, title: 'Mentor Office Hours', type: 'networking', room: 'Breakout Rooms' },
      { day: 1, time: '20:00', duration: 60, title: 'Dinner & Energizer Games', type: 'activity', room: 'Atrium' },
      { day: 1, time: '21:00', duration: 240, title: 'Overnight Hacking', type: 'workshop', room: 'Innovation Labs' },
      { day: 2, time: '08:00', duration: 45, title: 'Breakfast & Progress Check-in', type: 'break', room: 'Dining Hall' },
      { day: 2, time: '09:00', duration: 180, title: 'Hacking Sprint — Round 2', type: 'workshop', room: 'Innovation Labs' },
      { day: 2, time: '12:00', duration: 60, title: 'Lunch + Final Submissions', type: 'break', room: 'Dining Hall' },
      { day: 2, time: '14:00', duration: 120, title: 'Project Demos to Judges', type: 'panel', room: 'Main Auditorium' },
      { day: 2, time: '16:30', duration: 45, title: 'Judges Deliberation', type: 'panel', room: 'Green Room' },
      { day: 2, time: '17:15', duration: 45, title: 'Awards & Closing Ceremony', type: 'ceremony', room: 'Main Auditorium' }
    );
  } else {
    for (let d = 1; d <= ctx.days; d += 1) {
      schedule.push(
        { day: d, time: '09:00', duration: 45, title: 'Registration & Networking Breakfast', type: 'networking', room: 'Lobby' },
        { day: d, time: '10:00', duration: 60, title: d === 1 ? 'Opening Keynote: The Future' : 'Day 2 Opening Keynote', type: 'keynote', room: 'Main Hall' },
        { day: d, time: '11:15', duration: 45, title: 'Spotlight Talk Session', type: 'talk', room: 'Track A' },
        { day: d, time: '12:00', duration: 30, title: 'Coffee & Connections', type: 'break', room: 'Expo Hall' },
        { day: d, time: '12:30', duration: 90, title: 'Hands-on Workshop', type: 'workshop', room: 'Workshop Rooms' },
        { day: d, time: '14:00', duration: 45, title: 'Lunch', type: 'break', room: 'Dining Hall' },
        { day: d, time: '15:00', duration: 60, title: 'Industry Panel Discussion', type: 'panel', room: 'Main Hall' },
        { day: d, time: '16:15', duration: 45, title: 'Lightning Talks', type: 'talk', room: 'Track B' },
        { day: d, time: '17:00', duration: 60, title: 'Networking Hour', type: 'networking', room: 'Atrium' }
      );
    }
  }

  const registrationFields = [
    { label: 'Full Name', type: 'text', required: true, placeholder: 'As per college/company ID' },
    { label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
    { label: 'Phone', type: 'phone', required: true, placeholder: '+91 …' },
    ...(ctx.isCollege
      ? [{ label: 'College & Year', type: 'text', required: true, placeholder: 'e.g. KKWIEER, Third Year' }]
      : [{ label: 'Organization', type: 'text', required: true, placeholder: 'Company / Institute' }]),
    ...(ctx.isHackathon
      ? [
          { label: 'Team Name (if any)', type: 'text', required: false, placeholder: 'Solo participants welcome' },
          { label: 'Experience Level', type: 'radio', required: true, options: ['Beginner', 'Intermediate', 'Advanced'] },
          { label: 'Technologies you use', type: 'checkbox', required: false, options: tagList.slice(0, 5) },
          { label: 'Dietary Preference', type: 'select', required: false, options: ['Veg', 'Non-veg', 'Vegan'] },
        ]
      : [
          { label: 'Ticket Type', type: 'select', required: true, options: ticketTypes.map((t) => t.name) },
          { label: 'Do you need a participation certificate?', type: 'radio', required: false, options: ['Yes', 'No'] },
        ]),
    { label: 'Anything we should know?', type: 'textarea', required: false, placeholder: 'Accessibility, dietary notes…' },
  ];

  const volunteers = [
    { role: 'Registration Desk', count: Math.max(2, Math.round(ctx.audience / 120)), tasks: 'Check-in, QR scanning, wristbands', zone: 'Main Entrance' },
    { role: 'Technical Support', count: Math.max(2, Math.round(ctx.audience / 150)), tasks: 'Projectors, Wi-Fi, demo stations', zone: 'All halls' },
    { role: 'Hospitality', count: Math.max(3, Math.round(ctx.audience / 100)), tasks: 'Food, water, guest welcome', zone: 'Dining & lobby' },
    { role: 'Security', count: Math.max(2, Math.round(ctx.audience / 200)), tasks: 'Crowd flow, emergency response', zone: 'Gates & halls' },
    { role: 'Photography', count: 2, tasks: 'Coverage & social content', zone: 'Floating' },
    { role: 'Stage Management', count: 3, tasks: 'Speaker coordination, timers, mics', zone: 'Main Auditorium' },
  ];

  const sponsors = [
    { tier: 'Platinum', amount: 100000, benefits: 'Logo on backdrop, 10 min stage slot, booth, 20 passes' },
    { tier: 'Gold', amount: 50000, benefits: 'Booth, logo on banners, 10 passes' },
    { tier: 'Silver', amount: 25000, benefits: 'Logo on website, 5 passes' },
    { tier: 'Bronze', amount: 10000, benefits: 'Social shout-out, 2 passes' },
  ];

  const checklist = {
    '8+ weeks before': [
      'Lock date, venue & budget approval',
      'Announce event & open registrations',
      `Recruit ${volunteers.reduce((a, v) => a + v.count, 0)} volunteers across ${volunteers.length} teams`,
      'Open sponsor outreach with tier deck',
      'Confirm keynote speakers & judges',
    ],
    '4 weeks before': [
      'Publish detailed schedule & sessions',
      'Order swag, badges, banners & certificates',
      'Set up QR check-in & ticket flow on EventSphere',
      'Brief volunteers and create WhatsApp/Slack groups',
      'Plan food, transport & signage',
    ],
    '1 week before': [
      'Send reminder emails & calendar invites',
      'Final AV + Wi-Fi rehearsal',
      'Print emergency contacts & floor plan',
      'Prepare attendance & analytics dashboard',
    ],
    'Day of': [
      'Open registration desk 60 min early',
      'Go LIVE on EventSphere and pin welcome announcement',
      'Monitor check-ins, polls and Q&A in real time',
      'Collect feedback before closing',
    ],
    'After event': [
      'Issue digital certificates within 48 hours',
      'Generate AI post-event insights report',
      'Share photos & thank-you note',
      'Reconcile revenue and sponsor reports',
    ],
  };

  const announcement = {
    title: `🚀 ${title} is almost here!`,
    body: `Hello everyone! We're excited to welcome ${ctx.audience}+ ${ctx.isCollege ? 'students' : 'participants'} to ${title}. Reach the venue by 8:45 AM, bring your QR ticket (available in the My Tickets tab), and don't forget your ID. Live updates, polls and Q&A will appear right here on the event page. See you soon! 🎉`,
  };

  const social = {
    twitter: `🚨 ${ctx.audience}+ ${ctx.isCollege ? 'students' : 'makers'}. ${ctx.days} days. One epic ${name.toLowerCase()}. 🧠\n\nJoin ${title} — talks, ${ctx.isHackathon ? '24+ hours of building, mentors and cash prizes' : 'workshops and networking'}.\n\nRegister now 👇 #${primary.label.replace(/[^A-Za-z]/g, '')} #EventSphere`,
    linkedin: `I'm thrilled to announce ${title} — a ${ctx.days}-day ${name.toLowerCase()} bringing together ${ctx.audience}+ ${ctx.isCollege ? 'students and developers' : 'industry professionals'} around ${ctx.topics.map((t) => t.label).join(', ')}. Expect hands-on workshops, expert mentorship and real networking. Registrations are open — tag someone who shouldn't miss this.`,
    instagram: `✨ THE ${name.toUpperCase()} YOU'VE BEEN WAITING FOR ✨\n\n🗓 ${ctx.days} power-packed day(s)\n📍 ${ctx.city || 'Campus Main Auditorium'}\n👥 ${ctx.audience}+ attendees\n🏆 Prizes, swag & certificates\n\nTap the link in bio to register!`,
  };

  const faq = [
    { q: 'Who can participate?', a: ctx.isCollege ? 'All students with a valid college ID; beginners are welcome!' : 'Anyone interested in the theme can register; seats are limited.' },
    { q: 'Will I get a certificate?', a: 'Yes — all checked-in participants receive a verifiable digital certificate on EventSphere within 48 hours.' },
    { q: ctx.isHackathon ? 'Can I participate solo?' : 'Is there on-site registration?', a: ctx.isHackathon ? 'Absolutely! We will help solo participants form teams before the sprint begins.' : 'We recommend registering online; on-site entry depends on remaining capacity.' },
    { q: 'Will food be provided?', a: 'Yes, meals and refreshments are covered for all registered attendees.' },
    { q: 'What should I bring?', a: 'Your QR ticket, a valid ID, laptop + charger, and enthusiasm!' },
  ];

  const risks = [
    { risk: 'Venue overcapacity at check-in', mitigation: `Cap at ${capacity}, enable smart waitlist, 2 registration desks` },
    { risk: 'Wi-Fi / AV failure', mitigation: 'Pre-event rehearsal, mobile hotspot backup, offline QR manual entry' },
    { risk: 'No-show rate > 25%', mitigation: 'Reminder emails 48h and 2h before; release waitlist seats 24h prior' },
    { risk: 'Food shortage', mitigation: `Order for ${Math.round(ctx.audience * 1.1)} (10% buffer)` },
    { risk: 'Medical / safety incident', mitigation: 'First-aid desk, volunteer marshals, emergency number pinned in live announcements' },
    { risk: 'Low engagement during sessions', mitigation: 'Run live polls and Q&A prizes; award gamification points' },
  ];

  const description = `${title} is a ${ctx.days}-day ${name.toLowerCase()} designed for ${ctx.audience}+ ${ctx.isCollege ? 'students and young innovators' : 'professionals and creators'} passionate about ${ctx.topics.map((t) => t.label).join(', ')}.\n\n${ctx.isHackathon
    ? 'Form a team (or fly solo), pick a real-world problem, and build a working prototype with mentors from industry alongside you across an intensive sprint. The event includes technical talks, API showcases, mentor office hours, judging by industry experts, and exciting prizes for the best solutions.'
    : 'The event features keynote sessions, hands-on workshops, an expert panel, and structured networking hours to help you learn from practitioners and meet peers who share your goals.'}\n\nEvery attendee gets a QR ticket for frictionless check-in, access to the live event feed with real-time announcements, polls and Q&A, gamification rewards, and a verifiable digital certificate after the event.`;

  return {
    engine: 'demo',
    context: { days: ctx.days, audience: ctx.audience, topics: ctx.topics.map((t) => t.label) },
    plan: {
      title,
      shortDescription: `${ctx.days}-day ${name.toLowerCase()} for ${ctx.audience}+ ${ctx.isCollege ? 'students' : 'professionals'} — ${primary.label}, networking and certificates.`,
      description,
      category: ctx.isHackathon ? 'Hackathon' : primary.label,
      tags: tagList,
      eventType: 'offline',
      capacity,
      suggestedPrice: ticketTypes[0]?.price || 0,
      city: ctx.city || '',
      ticketTypes,
      schedule,
      registrationFields,
      volunteers,
      sponsors,
      checklist,
      announcement,
      social,
      faq,
      risks,
    },
  };
}

const generators = {
  description: ({ title, brief }) => {
    const ctx = parseBrief(brief || title || '');
    const t = title || `${ctx.topics[0].label} Summit`;
    return {
      description: `Join us for ${t}, a curated experience bringing together ${ctx.audience}+ ${ctx.isCollege ? 'students' : 'professionals'} around ${ctx.topics.map((x) => x.label).join(', ')}. Expect expert-led sessions, hands-on learning, and meaningful networking. Your registration includes a QR ticket, real-time event updates, gamification rewards and a verifiable digital certificate of participation.`,
      shortDescription: `${ctx.topics[0].label} event for ${ctx.audience}+ attendees with workshops, networking & certificates.`,
      tags: ctx.topics.flatMap((x) => x.tags).slice(0, 6),
    };
  },
  schedule: ({ days = 1, topics = '' }) => {
    const d = parseInt(days, 10) || 1;
    const ctx = parseBrief(topics);
    const plan = demoPlan(`${d}-day ${ctx.topics[0].label.toLowerCase()} event for 200`);
    return { schedule: plan.plan.schedule };
  },
  form: ({ brief = 'event' }) => demoPlan(brief).plan.registrationFields,
  announcement: ({ title = 'your event' }) => ({
    title: `Welcome to ${title}! 🎉`,
    body: `We're live! Check the schedule tab for what's next, drop your questions in the Q&A section, and don't forget to vote in the first poll. Scan your QR pass at the desk if you haven't checked in yet. Have a great event!`,
  }),
  checklist: ({ brief = '2-day event' }) => demoPlan(brief).plan.checklist,
  improve: async (event) => {
    const [fbCount, sessions, regs] = await Promise.all([
      Feedback.countDocuments({ event: event._id }),
      Session.countDocuments({ event: event._id }),
      Registration.countDocuments({ event: event._id }),
    ]);
    const suggestions = [];
    if (!event.coverImage || event.coverImage.includes('photo-1540575')) suggestions.push({ area: 'Cover image', tip: 'Add a branded, high-resolution 1400×700 cover to improve click-through.' });
    if ((event.description || '').length < 300) suggestions.push({ area: 'Description', tip: 'Expand the description with outcomes, speakers and what attendees will get.' });
    if (!event.ticketTypes?.length) suggestions.push({ area: 'Tickets', tip: 'Offer an early-bird and a VIP tier to increase revenue.' });
    if (!sessions) suggestions.push({ area: 'Schedule', tip: 'Build a multi-session timeline so attendees know what to expect.' });
    if (!event.faq?.length) suggestions.push({ area: 'FAQ', tip: 'Answer the top 5 questions to reduce support messages.' });
    if (!event.customRegistrationFields?.length) suggestions.push({ area: 'Registration form', tip: 'Capture college/company and experience level for better analytics.' });
    if (regs === 0) suggestions.push({ area: 'Promotion', tip: 'Use the generated social captions and announce to early-bird audiences.' });
    if (!fbCount) suggestions.push({ area: 'Feedback', tip: 'Enable feedback collection before the closing session.' });
    suggestions.push({ area: 'Engagement', tip: 'Schedule at least 3 live polls and pin one emergency test announcement.' });
    return { score: Math.max(35, 90 - suggestions.length * 7), suggestions };
  },
};

async function callGemini(prompt, jsonHint) {
  if (!config.gemini.apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nRespond ONLY with valid JSON. ${jsonHint}` }] }],
        generationConfig: { temperature: 0.7, response_mime_type: 'application/json' },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text.replace(/```json|```/g, '')) : null;
  } catch (e) {
    console.warn('Gemini call failed, using demo model:', e.message);
    return null;
}
}

async function generatePlan(brief) {
  const gemini = await callGemini(
    `You are an elite event planner. Create a complete event plan for this brief: "${brief}". Include title, shortDescription, description, category, tags, capacity, ticketTypes[{name,price,quantity,description}], schedule[{day,time,duration,title,type,room}], registrationFields[{label,type,required,options,placeholder}], volunteers[{role,count,tasks,zone}], sponsors[{tier,amount,benefits}], checklist grouped by timeline, announcement{title,body}, social{twitter,linkedin,instagram}, faq[{q,a}], risks[{risk,mitigation}].`,
    'Return an object with a "plan" key.'
  );
  if (gemini?.plan) return { engine: 'gemini', context: parseBrief(brief), plan: gemini.plan };
  return demoPlan(brief);
}

async function generate(kind, payload) {
  if (kind === 'improve') {
    const event = await Event.findById(payload.eventId);
    if (!event) return { suggestions: [] };
    const gemini = await callGemini(
      `Critique this event listing and give improvement tips: ${JSON.stringify({ title: event.title, description: event.description?.slice(0, 400), tags: event.tags })}`,
      'Return {score:number,suggestions:[{area,tip}]}'
    );
    if (gemini?.suggestions) return gemini;
    return generators.improve(event);
  }
  const demo = generators[kind] ? generators[kind](payload) : demoPlan(payload.brief || '').plan;
  const gemini = await callGemini(
    `As an event copilot, generate "${kind}" for this context: ${JSON.stringify(payload)}`,
    'Return the JSON object described.'
  );
  return gemini || demo;
}

async function postEventInsights(eventId) {
  const event = await Event.findById(eventId);
  if (!event) return null;
  const analytics = await eventAnalytics(eventId, 90);
  const feedbacks = await Feedback.find({ event: eventId }).sort({ createdAt: -1 }).limit(50);
  const sessions = await Session.find({ event: eventId }).sort({ startTime: 1 });
  const checkedIn = analytics.cards.checkIns;
  const confirmed = Math.max(1, analytics.cards.confirmed);
  const noShowRate = Math.round((analytics.cards.noShows / confirmed) * 100);
  const occupancy = analytics.cards.capacityUtilization;
  const avg = analytics.cards.avgRating;

  const wentWell = [];
  const problems = [];
  if (checkedIn > 0) wentWell.push(`${checkedIn} attendees checked in (${Math.round((checkedIn / confirmed) * 100)}% attendance rate)`);
  if (avg >= 4) wentWell.push(`Strong feedback score of ${avg}/5 across ${analytics.cards.feedbackCount} responses`);
  if (analytics.cards.engagement >= 60) wentWell.push(`High live engagement: ${analytics.cards.messages} chat messages and ${analytics.cards.pollVotes} poll votes`);
  if (analytics.cards.revenue > 0) wentWell.push(`₹${analytics.cards.revenue.toLocaleString('en-IN')} ticket revenue captured`);
  if (occupancy >= 80) wentWell.push(`${occupancy}% venue capacity utilization — demand exceeded expectations`);
  if (!wentWell.length) wentWell.push('Core registration and check-in flow completed successfully.');

  if (noShowRate > 20) problems.push(`${noShowRate}% no-show rate — tighten reminders and add a 24h waitlist release`);
  if (occupancy < 50) problems.push(`Only ${occupancy}% capacity filled — earlier promotion and early-bird pricing recommended`);
  if (analytics.cards.waitlist === 0 && occupancy < 60) problems.push('No waitlist demand signals — broaden promotion channels next time');
  if (avg && avg < 3.5) problems.push(`Ratings below target (${avg}/5) — review content and venue quality`);
  if (analytics.cards.engagement < 40) problems.push('Low live engagement — schedule interactive polls and Q&A prizes next time');
  if (!problems.length) problems.push('No major issues detected; continue the current format.');

  const sortedSessions = [...analytics.engagementBySession].sort((a, b) => b.engagement - a.engagement);
  const mostPopular = sortedSessions[0]?.session || sessions[0]?.title || 'Keynote session';
  const sentimentCount = analytics.sentiments;
  const totalSent = Math.max(1, sentimentCount.positive + sentimentCount.neutral + sentimentCount.negative);
  const sentiment = {
    positive: Math.round((sentimentCount.positive / totalSent) * 100),
    neutral: Math.round((sentimentCount.neutral / totalSent) * 100),
    negative: Math.round((sentimentCount.negative / totalSent) * 100),
    label: sentimentCount.positive >= sentimentCount.negative ? 'Overall positive' : 'Mixed sentiment',
  };

  const recommendations = [
    `Workshop-style sessions showed ${mostPopular ? 'higher engagement' : 'strong pull'} — allocate 30% more workshop time next event.`,
    noShowRate > 15 ? `Cut no-shows (${noShowRate}%) with automated 48h/2h reminders and same-day waitlist promotion.` : 'Attendance conversion is healthy — keep the reminder cadence.',
    occupancy >= 90 ? 'Demand nearly hit capacity — consider a larger venue or a second date, and enable waitlists earlier.' : 'Open registrations 2 weeks earlier and target lookalike audiences.',
    avg >= 4 ? 'Doubledown on highly-rated speakers; invite them back and collect video testimonials.' : 'Run a post-event survey to isolate low-rated sessions before rebooking.',
    `Gamification drove ${analytics.cards.engagement} engagement points — add sponsor-branded challenges for monetization.`,
  ];

  const quotes = feedbacks.filter((f) => f.comment).slice(0, 3).map((f) => ({ rating: f.rating, comment: f.comment }));

  return {
    engine: 'demo-insights',
    generatedAt: new Date(),
    eventTitle: event.title,
    headline: `${event.title} delivered ${occupancy}% occupancy with ${sentiment.label.toLowerCase()} sentiment`,
    wentWell,
    problems,
    mostPopularSession: mostPopular,
    sentiment,
    recommendations,
    quotes,
    metrics: {
      registrations: analytics.cards.totalRegistrations,
      checkIns: checkedIn,
      noShowRate,
      revenue: analytics.cards.revenue,
      avgRating: avg,
      engagement: analytics.cards.engagement,
      capacityUtilization: occupancy,
    },
  };
}

module.exports = { generatePlan, generate, postEventInsights, parseBrief, demoPlan };
