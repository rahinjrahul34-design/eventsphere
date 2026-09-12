/** Shared EventShield display helpers — scores stay deterministic; labels are UI-only. */

export const SCORE_BANDS = [
  { min: 90, max: 100, label: 'Excellent', tone: 'excellent' },
  { min: 75, max: 89, label: 'Low Risk', tone: 'low' },
  { min: 50, max: 74, label: 'Medium Risk', tone: 'medium' },
  { min: 25, max: 49, label: 'High Risk', tone: 'high' },
  { min: 0, max: 24, label: 'Critical', tone: 'critical' },
];

export function scoreBand(score = 0) {
  const n = Math.min(100, Math.max(0, Number(score) || 0));
  return SCORE_BANDS.find((b) => n >= b.min && n <= b.max) || SCORE_BANDS[SCORE_BANDS.length - 1];
}

export function scoreToneClass(score) {
  const { tone } = scoreBand(score);
  if (tone === 'excellent') return 'text-emerald-500';
  if (tone === 'low') return 'text-teal-500';
  if (tone === 'medium') return 'text-amber-500';
  if (tone === 'high') return 'text-orange-500';
  return 'text-rose-500';
}

export function scoreStroke(score) {
  const { tone } = scoreBand(score);
  if (tone === 'excellent') return '#10b981';
  if (tone === 'low') return '#14b8a6';
  if (tone === 'medium') return '#f59e0b';
  if (tone === 'high') return '#f97316';
  return '#f43f5e';
}

export function riskBadgeVariant(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'critical') return 'destructive';
  if (l === 'high') return 'destructive';
  if (l === 'medium' || l === 'warning') return 'warning';
  return 'success';
}

export function riskLabel(level) {
  const l = String(level || 'low').toLowerCase();
  if (l === 'critical') return 'Critical';
  if (l === 'high') return 'High Risk';
  if (l === 'medium') return 'Medium Risk';
  return 'Low Risk';
}

export const CATEGORY_META = {
  capacity: { icon: 'Users2', accent: 'from-violet-500/15 to-indigo-500/5' },
  crowd: { icon: 'Users2', accent: 'from-fuchsia-500/15 to-pink-500/5' },
  staffing: { icon: 'Hand', accent: 'from-sky-500/15 to-cyan-500/5' },
  venue: { icon: 'Building2', accent: 'from-amber-500/15 to-orange-500/5' },
  schedule: { icon: 'Clock', accent: 'from-blue-500/15 to-indigo-500/5' },
  registration: { icon: 'Ticket', accent: 'from-emerald-500/15 to-teal-500/5' },
  parking: { icon: 'Car', accent: 'from-slate-500/15 to-zinc-500/5' },
  emergency: { icon: 'PhoneCall', accent: 'from-rose-500/15 to-red-500/5' },
  security: { icon: 'ShieldCheck', accent: 'from-indigo-500/15 to-violet-500/5' },
  accessibility: { icon: 'Accessibility', accent: 'from-teal-500/15 to-emerald-500/5' },
  weather: { icon: 'CloudSun', accent: 'from-sky-500/15 to-blue-500/5' },
  operational: { icon: 'Activity', accent: 'from-purple-500/15 to-fuchsia-500/5' },
  communication: { icon: 'HelpCircle', accent: 'from-cyan-500/15 to-sky-500/5' },
  ticketing: { icon: 'TicketCheck', accent: 'from-lime-500/15 to-green-500/5' },
  medical: { icon: 'Stethoscope', accent: 'from-rose-500/15 to-pink-500/5' },
};

export function groupActions(categories = []) {
  const groups = { high: [], medium: [], low: [] };
  for (const cat of categories) {
    if (!cat.issues?.length) continue;
    const item = {
      id: cat.id,
      title: cat.issues[0],
      extra: cat.issues.slice(1),
      category: cat.name,
      priority: cat.priority || cat.riskLevel,
      recommendation: cat.recommendations?.[0] || '',
      evidence: cat.evidence || [],
      score: cat.score,
    };
    const p = String(item.priority).toLowerCase();
    if (p === 'critical' || p === 'high') groups.high.push(item);
    else if (p === 'medium') groups.medium.push(item);
    else groups.low.push(item);
  }
  return groups;
}
