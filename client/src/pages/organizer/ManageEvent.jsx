import { useParams, NavLink, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, BarChart3, Users, QrCode, Radio, Clock, Mic2, Hand, Award, ChevronRight, ExternalLink, ShieldAlert, Activity, Zap, ShieldCheck, Sparkles, Sliders } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { ErrorState } from '../../components/ui/misc';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

const TAB_GROUPS = [
  {
    label: 'Operations',
    tabs: [
      { to: '', icon: LayoutDashboard, label: 'Overview', end: true },
      { to: 'registrations', icon: Users, label: 'Registrations' },
      { to: 'check-in', icon: QrCode, label: 'Check-in' },
      { to: 'live', icon: Radio, label: 'Live' },
      { to: 'schedule', icon: Clock, label: 'Schedule' },
      { to: 'speakers', icon: Mic2, label: 'Speakers' },
      { to: 'volunteers', icon: Hand, label: 'Volunteers' },
      { to: 'sponsors', icon: Award, label: 'Sponsors' },
      { to: 'analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'Intelligence',
    tabs: [
      { to: 'command-center', icon: Sliders, label: 'Command Center' },
      { to: 'eventboost', icon: Sparkles, label: 'EventBoost' },
      { to: 'trust', icon: ShieldCheck, label: 'TrustSphere' },
      { to: 'eventpulse', icon: Activity, label: 'EventPulse' },
      { to: 'eventshield', icon: ShieldAlert, label: 'EventShield' },
      { to: 'smartqueue', icon: Zap, label: 'SmartQueue' },
    ],
  },
];

export default function ManageEvent() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['manage-event', id], queryFn: async () => {
    const all = await endpoints.myEvents();
    const found = all.find((e) => e._id === id);
    if (!found) throw new Error('Event not found or not managed by you');
    return found;
  }});

  if (q.isLoading) return <div className="space-y-6"><div className="skeleton h-8 w-72" /><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-96 rounded-xl" /></div>;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const event = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard/events" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">My Events</Link>
        <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="min-w-0 truncate font-display text-xl font-extrabold tracking-tight">{event.title}</h2>
        <Badge variant={event.status === 'live' ? 'live' : event.approvalStatus === 'approved' ? 'success' : 'warning'}>
          {event.approvalStatus === 'pending' ? 'Pending approval' : event.status}
        </Badge>
        <Link to={`/events/${event.slug}`} className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover">
          Public page <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-fade-x rounded-xl border bg-card p-1.5 shadow-soft" role="tablist" aria-label="Event management">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-1.5">
            {gi > 0 && <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />}
            {group.tabs.map((t) => (
              <NavLink
                key={t.to}
                end={t.end}
                to={t.to}
                title={t.label}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )
                }
              >
                <t.icon className="size-4 shrink-0" />
                <span className="hidden md:inline">{t.label}</span>
                {group.label === 'Intelligence' && <span className="sr-only">(AI)</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <Outlet context={{ event }} />
    </div>
  );
}
