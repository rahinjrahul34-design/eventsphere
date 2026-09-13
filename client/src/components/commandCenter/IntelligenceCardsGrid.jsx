import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Zap, Award, Sparkles, TrendingUp, ArrowRight, Clock, ShieldAlert, Eye } from 'lucide-react';
import { Badge } from '../ui/badge';
import { StatTile } from '../ui/card';
import { AiCard, ModuleHeading } from '../ui/ai';
import { cn } from '../../lib/utils';

function DetailRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <strong className={cn('tabular font-semibold', tone || 'text-foreground')}>{value}</strong>
    </div>
  );
}

function CardLink({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-hover"
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function FooterMeta({ icon: Icon = Clock, children }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * The six operational intelligence modules surfaced by the Command Center.
 * Data shape comes from GET /api/ai/command-center — see server services.
 */
export default function IntelligenceCardsGrid({ data }) {
  if (!data) return null;
  const { attendance, safety, queue, trust, seo, recommendations, event } = data;
  const eventBase = `/dashboard/events/${event?._id}`;

  const modules = [
    {
      key: 'pulse',
      icon: Users,
      title: 'Attendance Intelligence',
      subtitle: 'EventPulse Predictive AI',
      badge: <Badge variant={attendance?.available ? 'success' : 'secondary'} className="text-[10px]">{attendance?.available ? 'Active' : 'Awaiting data'}</Badge>,
      stats: [
        { label: 'Forecasted turnout', value: attendance?.expectedAttendance ?? '—', sub: attendance?.attendanceRate ? `${attendance.attendanceRate}% conversion` : 'Estimating' },
        { label: 'Registered total', value: attendance?.currentRegistrations ?? 0, sub: `+${attendance?.registrationVelocity ?? 0} / 24h` },
      ],
      details: [
        { label: 'Predicted no-shows', value: attendance?.expectedNoShows ?? 0 },
        { label: 'Confidence level', value: `${attendance?.confidence ?? 75}%` },
      ],
      footer: <FooterMeta>{attendance?.lastUpdated ? 'Live synced' : 'Syncing'}</FooterMeta>,
      link: { to: attendance?.ctaLink || `${eventBase}/eventpulse`, label: attendance?.ctaText || 'View EventPulse' },
    },
    {
      key: 'shield',
      icon: ShieldCheck,
      title: 'Safety & Risk Shield',
      subtitle: 'EventShield Real-Time',
      danger: safety?.criticalRisksCount > 0,
      badge: (
        <Badge variant={safety?.criticalRisksCount > 0 ? 'destructive' : 'success'} className="text-[10px]">
          {safety?.criticalRisksCount > 0 ? `${safety.criticalRisksCount} critical alert${safety.criticalRisksCount > 1 ? 's' : ''}` : `${safety?.safetyScore ?? 75}/100 safe`}
        </Badge>
      ),
      stats: [
        { label: 'Safety score', value: safety?.safetyScore ?? 75, sub: `${safety?.currentRiskLevel || 'Low'} risk level` },
        { label: 'Checklist readiness', value: `${safety?.operationalReadiness ?? 80}%`, sub: `${safety?.openAlertsCount || 0} open alerts` },
      ],
      details: [
        { label: 'Active safety alerts', value: safety?.openAlertsCount || 0, tone: (safety?.openAlertsCount || 0) > 0 ? 'text-warning' : undefined },
        { label: 'Checklist protocol', value: `${safety?.checklistCompletion || 100}% completed` },
      ],
      footer: <FooterMeta icon={ShieldAlert}>{safety?.lastUpdated ? 'Live guard' : 'Active'}</FooterMeta>,
      link: { to: safety?.ctaLink || `${eventBase}/eventshield`, label: safety?.ctaText || 'Review safety' },
    },
    {
      key: 'queue',
      icon: Zap,
      title: 'Queue & Waitlist',
      subtitle: 'SmartQueue Dynamic Holds',
      badge: (
        <Badge variant={queue?.queuePressure === 'High' ? 'warning' : 'secondary'} className="text-[10px]">
          {queue?.queuePressure || 'Normal'} pressure
        </Badge>
      ),
      stats: [
        { label: 'Waitlist backlog', value: queue?.waitingCount ?? 0, sub: 'Waiting attendees' },
        { label: 'Active holds', value: queue?.activeHolds ?? 0, sub: 'Temporary reservations' },
      ],
      details: [
        { label: 'Queue efficiency', value: `${queue?.efficiencyScore ?? 85}/100` },
        { label: 'Avg claim time', value: queue?.avgClaimTime || 'N/A' },
      ],
      footer: <FooterMeta>Dynamic auto-promotion</FooterMeta>,
      link: { to: queue?.ctaLink || `${eventBase}/smartqueue`, label: queue?.ctaText || 'Manage queue' },
    },
    {
      key: 'trust',
      icon: Award,
      title: 'Organizer Trust',
      subtitle: 'TrustSphere Credibility',
      badge: <Badge variant={trust?.verified ? 'success' : 'secondary'} className="text-[10px]">{trust?.verified ? 'Verified organizer' : 'Unverified'}</Badge>,
      stats: [
        { label: 'Trust score', value: trust?.trustScore ?? 70, sub: `${trust?.trustLevel || 'Standard'} tier` },
        { label: 'Platform status', value: trust?.verified ? 'KYC verified' : 'Standard', sub: `${trust?.confidenceLevel || 'Moderate'} confidence`, textValue: true },
      ],
      details: [
        { label: 'Credibility signal', value: `“${(trust?.strengths?.[0] || 'Good standing').slice(0, 42)}”` },
      ],
      footer: <FooterMeta>{trust?.verified ? 'Credibility guard' : 'Pending verification'}</FooterMeta>,
      link: { to: trust?.ctaLink || '/dashboard/trust', label: trust?.ctaText || 'View trust' },
    },
    {
      key: 'boost',
      icon: Sparkles,
      title: 'Content & SEO Boost',
      subtitle: 'EventBoost Intelligence',
      badge: <Badge variant={seo?.seoScore >= 70 ? 'success' : 'secondary'} className="text-[10px]">{seo?.seoScore ?? 50}/100 SEO</Badge>,
      stats: [
        { label: 'Content score', value: seo?.contentScore ?? 50, sub: 'Listing quality' },
        { label: 'Readability', value: seo?.readabilityScore ?? 70, sub: 'Clarity index' },
      ],
      details: [
        { label: 'Top opportunity', value: seo?.mainOpportunity || 'Enhance meta tags & headings with AI' },
      ],
      footer: <FooterMeta icon={Sparkles}>SEO Engine V1</FooterMeta>,
      link: { to: seo?.ctaLink || `${eventBase}/eventboost`, label: seo?.ctaText || 'Optimize event' },
    },
    {
      key: 'rec',
      icon: TrendingUp,
      title: 'Discovery Signals',
      subtitle: 'Recommendation 2.0 Feed',
      badge: <Badge variant="secondary" className="text-[10px]">{recommendations?.visibilitySignal || 'Emerging'} signal</Badge>,
      stats: [
        { label: 'Feed impressions', value: recommendations?.views ?? 0, sub: 'Attendee discovery' },
        { label: 'Click-through rate', value: `${recommendations?.ctr ?? 0}%`, sub: `${recommendations?.clicks ?? 0} clicks` },
      ],
      details: [
        { label: 'Attendee saves', value: recommendations?.saves ?? 0 },
        { label: 'Positive feedback', value: recommendations?.feedbackScore ?? 0 },
      ],
      footer: <FooterMeta icon={Eye}>Feed visibility</FooterMeta>,
      link: { to: '/events', label: 'Explore public feed' },
    },
  ];

  return (
    <section className="space-y-4">
      <ModuleHeading count={6}>Operational Intelligence Modules</ModuleHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <AiCard
            key={m.key}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            badge={m.badge}
            danger={m.danger}
            footer={
              <>
                {m.footer}
                <CardLink to={m.link.to} label={m.link.label} />
              </>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {m.stats.map((s) => (
                  <StatTile
                    key={s.label}
                    label={s.label}
                    value={s.value}
                    sub={s.sub}
                    valueClassName={s.textValue ? 'text-sm mt-1' : undefined}
                  />
                ))}
              </div>
              <div className="space-y-1.5 pt-0.5">
                {m.details.map((d) => (
                  <DetailRow key={d.label} label={d.label} value={d.value} tone={d.tone} />
                ))}
              </div>
            </div>
          </AiCard>
        ))}
      </div>
    </section>
  );
}
