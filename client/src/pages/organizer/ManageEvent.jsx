import { useParams, NavLink, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, BarChart3, Users, QrCode, Radio, Clock, Mic2, Hand, Award,
  ChevronRight, ExternalLink, ShieldAlert, Activity, Zap, ShieldCheck, Sparkles, Sliders,
} from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Spinner, ErrorState } from '../../components/ui/misc';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

const TABS = [
  { to: '', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: 'command-center', icon: Sliders, label: 'Command Center' },
  { to: 'eventboost', icon: Sparkles, label: 'EventBoost AI' },
  { to: 'trust', icon: ShieldCheck, label: 'TrustSphere AI' },
  { to: 'eventpulse', icon: Activity, label: 'EventPulse AI' },
  { to: 'eventshield', icon: ShieldAlert, label: 'EventShield AI' },
  { to: 'smartqueue', icon: Zap, label: 'SmartQueue AI' },
  { to: 'analytics', icon: BarChart3, label: 'Analytics' },
  { to: 'registrations', icon: Users, label: 'Registrations' },
  { to: 'check-in', icon: QrCode, label: 'Check-in' },
  { to: 'live', icon: Radio, label: 'Live' },
  { to: 'schedule', icon: Clock, label: 'Schedule' },
  { to: 'speakers', icon: Mic2, label: 'Speakers' },
  { to: 'volunteers', icon: Hand, label: 'Volunteers' },
  { to: 'sponsors', icon: Award, label: 'Sponsors' },
];

export default function ManageEvent() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['manage-event', id], queryFn: async () => {
    const all = await endpoints.myEvents();
    const found = all.find((e) => e._id === id);
    if (!found) throw new Error('Event not found or not managed by you');
    return found;
  } });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const event = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard/events" className="text-sm font-semibold text-muted-foreground hover:text-foreground">My Events</Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <h2 className="font-display text-xl font-extrabold truncate">{event.title}</h2>
        <Badge variant={event.status === 'live' ? 'live' : event.approvalStatus === 'approved' ? 'success' : 'warning'}>
          {event.approvalStatus === 'pending' ? 'Pending approval' : event.status}
        </Badge>
        <Link to={`/events/${event.slug}`} className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-primary">
          Public page <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl border bg-card p-1.5">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            end={t.end}
            to={t.to}
            className={({ isActive }) =>
              cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')
            }
          >
            <t.icon className="size-4" /> <span className="hidden sm:inline">{t.label}</span>
          </NavLink>
        ))}
      </div>

      <Outlet context={{ event }} />
    </div>
  );
}
