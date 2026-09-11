import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CalendarDays, Ticket, IndianRupee, ShieldCheck, Flag, ArrowRight, UserCheck } from 'lucide-react';
import { endpoints } from '../../lib/api';
import StatCard from '../../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Spinner } from '../../components/ui/misc';
import { TrendChart, DonutChart, COLORS } from '../../components/charts/Charts';
import { fmtDate } from '../../lib/format';

export default function AdminHome() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => endpoints.adminStats(30), refetchInterval: 60000 });
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
    </div>
  );
}

function Empty() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>;
}
