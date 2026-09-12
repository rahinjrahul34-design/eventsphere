import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CalendarDays, Ticket, IndianRupee, ShieldCheck, Flag, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { endpoints } from '../../lib/api';
import StatCard from '../../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Spinner } from '../../components/ui/misc';
import { TrendChart, DonutChart, COLORS } from '../../components/charts/Charts';
import { fmtDate } from '../../lib/format';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function AdminHome() {
  usePageTitle('Admin Dashboard');
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => endpoints.adminStats(30), refetchInterval: 60000 });
  const recQ = useQuery({ queryKey: ['recommendation-analytics'], queryFn: endpoints.recommendationAnalytics });
  if (q.isLoading) return <Spinner />;
  const d = q.data;
  const cards = d.cards || {};
  const toPairs = (obj) => (obj && !Array.isArray(obj)
    ? Object.entries(obj).map(([name, value]) => ({ name, value }))
    : (obj || []).map((r) => ({ name: r._id, value: r.count })));
  const roleChart = toPairs(d.usersByRole).map((r, i) => ({ ...r, color: COLORS[i % COLORS.length] }));
  const statusChart = toPairs(d.eventsByStatus).map((r, i) => ({ ...r, color: COLORS[(i + 2) % COLORS.length] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Platform Overview</h2>
        <p className="text-sm text-muted-foreground">Last 30 days across EventSphere.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="New users (30d)" value={cards.users} sub={`${cards.totalUsers} total`} />
        <StatCard icon={CalendarDays} label="New events (30d)" value={cards.events} sub={`${cards.totalEvents} total · ${cards.activeOrganizers} organizers`} accent="blue" />
        <StatCard icon={Ticket} label="New registrations (30d)" value={cards.registrations} sub={`${cards.totalRegistrations} total`} accent="success" />
        <StatCard icon={IndianRupee} label="Revenue (30d)" value={`₹${(cards.revenue || 0).toLocaleString('en-IN')}`} sub={`₹${(cards.totalRevenue || 0).toLocaleString('en-IN')} all-time`} accent="warning" />
      </div>

      {(cards.pendingApprovals > 0 || cards.openReports > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.pendingApprovals > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="flex items-center gap-4 p-5">
                <ShieldCheck className="size-10 text-warning" />
                <div className="flex-1">
                  <p className="font-bold">{cards.pendingEvents} events &amp; {cards.pendingOrgs} organizer applications awaiting review</p>
                  <p className="text-sm text-muted-foreground">Approvals unlock discovery visibility.</p>
                </div>
                <Link to="/admin/events"><Button size="sm">Review <ArrowRight className="size-4" /></Button></Link>
              </CardContent>
            </Card>
          )}
          {cards.openReports > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-4 p-5">
                <Flag className="size-10 text-destructive" />
                <div className="flex-1">
                  <p className="font-bold">{cards.openReports} open report{cards.openReports !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-muted-foreground">Community reports need moderation.</p>
                </div>
                <Link to="/admin/reports"><Button size="sm" variant="outline">Moderate <ArrowRight className="size-4" /></Button></Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Growth — registrations (30 days)</CardTitle></CardHeader>
        <CardContent>
          <TrendChart data={d.trend.map((t) => ({ date: t.date, registrations: t.count || t.registrations }))} lines={[{ key: 'registrations', color: COLORS[0] }]} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Users by role</CardTitle></CardHeader>
          <CardContent>{roleChart.length ? <DonutChart data={roleChart} /> : <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Events by status</CardTitle></CardHeader>
          <CardContent>{statusChart.length ? <DonutChart data={statusChart} /> : <Empty />}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pending event approvals</CardTitle>
            <Link to="/admin/events" className="text-sm font-bold text-primary">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(d.pendingEvents || []).map((e) => (
              <div key={e._id} className="flex items-center gap-3 rounded-xl border p-3">
                <img src={e.coverImage} alt="" className="size-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/events/${e.slug}`} className="truncate block text-sm font-bold hover:text-primary">{e.title}</Link>
                  <p className="truncate text-xs text-muted-foreground">by {e.organizer?.name || 'organizer'} · {fmtDate(e.createdAt, 'd MMM')}</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}
            {!d.pendingEvents?.length && <p className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><ShieldCheck className="size-4" /> All caught up.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Organizer applications</CardTitle>
            <Link to="/admin/users" className="text-sm font-bold text-primary">Manage users</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(d.pendingOrgs || []).map((u) => (
              <div key={u._id} className="flex items-center gap-3 rounded-xl border p-3">
                <Avatar name={u.name} src={u.avatar} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <UserCheck className="size-4 text-warning" />
              </div>
            ))}
            {!d.pendingOrgs?.length && <p className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><UserCheck className="size-4" /> No applications pending.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Newest users</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="p-2">User</th><th className="p-2">Role</th><th className="p-2">Joined</th>
              </tr></thead>
              <tbody>
                {(d.recentUsers || []).map((u) => (
                  <tr key={u._id} className="border-b last:border-0">
                    <td className="p-2"><div className="flex items-center gap-2"><Avatar name={u.name} src={u.avatar} className="size-8" /><div><p className="font-semibold leading-tight">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div></td>
                    <td className="p-2"><Badge variant="secondary" className="capitalize">{u.role}</Badge></td>
                    <td className="p-2 text-xs text-muted-foreground">{fmtDate(u.createdAt, 'd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Recommendation Intelligence (AI 2.0) ─── */}
      <Card className="border-primary/20">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Recommendation Intelligence (v2)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Live algorithmic CTR, satisfaction ratings, and user interaction signals
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
            v2 ENGINE ACTIVE
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Signals</p>
              <p className="mt-1 font-display text-2xl font-extrabold">{recQ.data?.totalInteractions || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clicks, dismissals & ratings</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recommendation CTR</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-primary">{recQ.data?.ctr || '0.0%'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{recQ.data?.clicks || 0} direct clicks</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Satisfaction Rate</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {recQ.data?.satisfactionRate || '100%'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{recQ.data?.likes || 0} likes vs {recQ.data?.dislikes || 0} dislikes</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dismissals</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-rose-500">{recQ.data?.dismissals || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trained negative penalties</p>
            </div>
          </div>

          {recQ.data?.recentInteractions?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Recent Recommendation Signals
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground uppercase">
                      <th className="p-2">User</th>
                      <th className="p-2">Event</th>
                      <th className="p-2">Signal</th>
                      <th className="p-2">Source</th>
                      <th className="p-2">Detail / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recQ.data.recentInteractions.slice(0, 8).map((inter) => (
                      <tr key={inter._id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{inter.user?.name || 'Anonymous User'}</td>
                        <td className="p-2 font-semibold">{inter.event?.title || 'Unknown Event'}</td>
                        <td className="p-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inter.interactionType === 'click'
                                ? 'bg-primary/10 text-primary'
                                : inter.interactionType === 'dismiss'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {inter.interactionType}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground font-mono text-[10px]">
                          {inter.recommendationSource || 'PERSONALIZED'}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {inter.feedbackReason || (inter.feedbackType === 'like' ? 'Positive match' : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>;
}
