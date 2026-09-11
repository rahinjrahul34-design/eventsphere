import { format, formatDistanceToNowStrict } from 'date-fns';

export const fmtDate = (d, pattern = 'EEE, d MMM yyyy') => (d ? format(new Date(d), pattern) : '');
export const fmtTime = (d) => (d ? format(new Date(d), 'h:mm a') : '');
export const fmtDateTime = (d) => (d ? format(new Date(d), 'd MMM yyyy, h:mm a') : '');
export const fmtDay = (d) => (d ? format(new Date(d), 'EEEE, d MMM') : '');
export const relative = (d) => (d ? formatDistanceToNowStrict(new Date(d), { addSuffix: true }) : '');

export const inr = (n) =>
  n === 0 || n == null ? 'Free' : `₹${Number(n).toLocaleString('en-IN')}`;

export const rangeLabel = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return format(s, 'EEE, d MMM yyyy');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${format(s, 'EEE d')} – ${format(e, 'd MMM yyyy')}`;
  return `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`;
};

export const typeLabel = {
  offline: 'In Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

export const EVENT_CATEGORIES = [
  { slug: 'hackathon', name: 'Hackathon', icon: 'Code2', color: '#7c3aed' },
  { slug: 'workshop', name: 'Workshop', icon: 'Wrench', color: '#0891b2' },
  { slug: 'conference', name: 'Conference', icon: 'Mic2', color: '#4f46e5' },
  { slug: 'cultural', name: 'Cultural', icon: 'Palmtree', color: '#db2777' },
  { slug: 'sports', name: 'Sports', icon: 'Trophy', color: '#16a34a' },
  { slug: 'networking', name: 'Networking', icon: 'Users', color: '#d97706' },
  { slug: 'seminar', name: 'Seminar', icon: 'Presentation', color: '#0d9488' },
  { slug: 'corporate', name: 'Corporate', icon: 'Briefcase', color: '#334155' },
  { slug: 'meetup', name: 'Meetup', icon: 'Coffee', color: '#ea580c' },
  { slug: 'tech-talk', name: 'Tech Talk', icon: 'Cpu', color: '#2563eb' },
];

export const INTERESTS = [
  'AI/ML', 'Web Development', 'Cyber Security', 'Business', 'Startups',
  'Sports', 'Cultural', 'Music', 'Networking', 'Cloud', 'Design', 'Data Science',
];

export const SKILLS = [
  'React', 'Node.js', 'MERN', 'Python', 'TensorFlow', 'Docker', 'Kubernetes',
  'Figma', 'Flutter', 'SQL', 'AWS', 'Java', 'Go', 'Next.js', 'DevOps', 'UI/UX',
];

export const GOALS = [
  { value: 'co-founder', label: 'A co-founder' },
  { value: 'job', label: 'Job opportunities' },
  { value: 'internship', label: 'Internships' },
  { value: 'collaboration', label: 'Project collaboration' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'friends', label: 'Like-minded friends' },
];

export const categoryMeta = (slug) =>
  EVENT_CATEGORIES.find((c) => c.slug === slug) || { name: slug, color: '#6d28d9', icon: 'Sparkles' };
