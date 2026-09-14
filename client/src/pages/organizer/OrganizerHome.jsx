import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, IndianRupee, Plus, Bot, QrCode, Radio, ArrowRight, Star } from 'lucide-react';
import { endpoints } from '../../lib/api';
import StatCard from '../../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatsSkeleton, ChartSkeleton, ListSkeleton } from '../../components/ui/skeleton';
import { TrendChart } from '../../components/charts/Charts';
import { fmtDate } from '../../lib/format';
import { useMemo } from 'react';
import SmartImage from '../../components/ui/smart-image';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function OrganizerHome() {
  usePageTitle('Organizer Dashboard');
  const eventsQ = useQuery({ queryKey: ['my-events'], queryFn: endpoints.myEvents });
  const events = eventsQ.data || [];
  const ids = events.map((e) => e._id);

  // Fetch analytics for each event (small demos stay cheap).
  const statsQ = useQuery({
    queryKey: ['my-analytics', ids.join(',')],
    queryFn: async () => Promise.all(ids.map((id) => endpoints.analytics(id, 90).catch(() => null))),
    enabled: ids.length > 0,
  });

  const totals = useMemo(() => {
    const all = (statsQ.data || []).filter(Boolean);
    return {
      registrations: all.reduce((a, s) => a + s.cards.totalRegistrations, 0),
      checkIns: all.reduce((a, s) => a + s.cards.checkIns, 0),
      revenue: all.reduce((a, s) => a + s.cards.revenue, 0),
      avgRating: (all.filter((s) => s.cards.feedbackCount).reduce((a, s) => a + s.cards.avgRating * s.cards.feedbackCount, 0) /
        Math.max(1, all.reduce((a, s) => a + s.cards.feedbackCount, 0))).toFixed(1),
      trend: aggregateTrend(all),
    };
  }, [statsQ.data]);

  function aggregateTrend(all) {
    const map = new Map();
    all.forEach((s) => s.trend.forEach((r) => {
      const cur = map.get(r.date) || { date: r.date, registrations: 0, checkIns: 0, revenue: 0 };
      cur.registrations += r.registrations; cur.checkIns += r.checkIns; cur.revenue += r.revenue;
      map.set(r.date, cur);
    }));
    return [...map.values()];
  }

  if (eventsQ.isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="skeleton h-7 w-64" /><div className="skeleton h-4 w-80 max-w-full" /></div>
          <div className="skeleton h-9 w-44 rounded-lg" />
        </div>
        <StatsSkeleton />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <ListSkeleton rows={3} />
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Welcome back, organizer</h2>
          <p className="text-sm text-muted-foreground">Here’s what’s happening across your events.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/copilot"><Button variant="outline"><Bot className="size-4" /> AI Copilot</Button></Link>
          <Link to="/dashboard/events/create"><Button><Plus className="size-4" /> Create event</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total registrations" value={totals.registrations || events.reduce((a, e) => a + e.registrationCount, 0)} accent="primary" />
        <StatCard icon={CheckCircle2} label="Check-ins" value={totals.checkIns || events.reduce((a, e) => a + e.checkedInCount, 0)} accent="success" />
        <StatCard icon={IndianRupee} label="Revenue (₹)" value={(totals.revenue || 0).toLocaleString('en-IN')} accent="info" />
        <StatCard icon={Star} label="Avg. feedback" value={totals.avgRating !== 'NaN' ? `${totals.avgRating}/5` : '—'} accent="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Registration trend (90 days)</CardTitle></CardHeader>
          <CardContent>
            {statsQ.isLoading ? <div className="skeleton h-[260px]" /> : (
              <TrendChart data={totals.trend.slice(-30)} lines={[{ key: 'registrations', label: 'Registrations', color: '#7c5cfc' }, { key: 'checkIns', label: 'Check-ins', color: '#10b981' }]} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <QuickLink to="/dashboard/events/create" icon={Plus} label="Create new event" />
            <QuickLink to="/dashboard/copilot" icon={Bot} label="Generate an AI event plan" />
            {events[0] && <QuickLink to={`/dashboard/events/${events[0]._id}/check-in`} icon={QrCode} label="Open QR check-in" />}
            {events.some((e) => e.status === 'published' || e.status === 'live') && (
              <QuickLink to={`/events/${events.find((e) => e.status === 'live')?.slug || events[0]?.slug}/live`} icon={Radio} label="Live control center" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Your events</CardTitle>
          <Link to="/dashboard/events" className="text-sm font-bold text-primary">Manage all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.slice(0, 6).map((e) => (
            <Link key={e._id} to={`/dashboard/events/${e._id}`} className="flex items-center gap-4 rounded-xl border p-3 hover:shadow-soft transition">
              <SmartImage src={e.coverImage} alt={e.title} className="size-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-sm">{e.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(e.startDate)} · {e.registrationCount} registered</p>
              </div>
              <div className="hidden sm:block w-32">
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (e.registrationCount / e.capacity) * 100)}%` }} />
                </div>
              </div>
              <StatusBadge e={e} />
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition">
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
      {label}
    </Link>
  );
}

function StatusBadge({ e }) {
  const map = {
    draft: ['secondary', 'Draft'], published: ['success', 'Published'], live: ['live', 'LIVE'],
    completed: ['secondary', 'Completed'], cancelled: ['destructive', 'Cancelled'],
  };
  const [v, label] = map[e.status] || ['secondary', e.status];
  const pending = e.approvalStatus === 'pending' && e.status !== 'live';
  return (
    <Badge variant={v} className="capitalize">
      {pending ? 'Pending approval' : label}
    </Badge>
  );
}
