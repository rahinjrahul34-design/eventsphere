import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, IndianRupee, Activity, Star, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import StatCard from '../../../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

import { TrendChart, BarsChart, DonutChart, GaugeChart, COLORS } from '../../../components/charts/Charts';
import { StatsSkeleton, ChartSkeleton } from '../../../components/ui/skeleton';

export default function Analytics() {
  const { event } = useOutletContext();
  const q = useQuery({ queryKey: ['analytics', event._id, 'full'], queryFn: () => endpoints.analytics(event._id, 120) });
  if (q.isLoading) return <div className="space-y-6"><StatsSkeleton /><ChartSkeleton /></div>;
  const d = q.data;
  const c = d.cards;

  const sentimentTotal = (d.sentiments.positive + d.sentiments.neutral + d.sentiments.negative) || 1;
  const sentimentPct = {
    positive: Math.round((d.sentiments.positive / sentimentTotal) * 100),
    neutral: Math.round((d.sentiments.neutral / sentimentTotal) * 100),
    negative: Math.round((d.sentiments.negative / sentimentTotal) * 100),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Confirmed registrations" value={c.confirmed} sub={`${c.totalRegistrations} total incl. waitlist/cancelled`} />
        <StatCard icon={CheckCircle2} label="Check-ins" value={c.checkIns} accent="success" sub={`${c.noShows} no-shows · ${c.waitlist} waitlisted`} />
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${c.revenue.toLocaleString('en-IN')}`} accent="info" />
        <StatCard icon={Activity} label="Engagement score" value={`${c.engagement}/100`} accent="warning" sub={`${c.messages} chat msgs · ${c.pollVotes} poll votes`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Registrations, check-ins & revenue trend</CardTitle></CardHeader>
        <CardContent>
          <TrendChart data={d.trend} height={300} lines={[
            { key: 'registrations', label: 'Registrations', color: COLORS[0] },
            { key: 'checkIns', label: 'Check-ins', color: COLORS[2] },
            { key: 'revenue', label: 'Revenue ₹', color: COLORS[3] },
          ]} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ticket distribution</CardTitle></CardHeader>
          <CardContent>
            {d.ticketDistribution.length ? <DonutChart data={d.ticketDistribution.map((t, i) => ({ ...t, color: COLORS[i % COLORS.length] }))} /> : <Empty />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Registration sources</CardTitle></CardHeader>
          <CardContent>
            {d.sourceDistribution.length ? <DonutChart data={d.sourceDistribution.map((t, i) => ({ ...t, color: COLORS[(i + 1) % COLORS.length] }))} /> : <Empty />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Session engagement</CardTitle></CardHeader>
          <CardContent>
            {d.engagementBySession.length
              ? <BarsChart data={d.engagementBySession.map((s) => ({ name: s.session, value: s.engagement }))} xKey="name" valueKey="value" layout="vertical" color={COLORS[5]} />
              : <Empty />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Capacity utilization</CardTitle></CardHeader>
          <CardContent>
            <GaugeChart value={c.capacityUtilization} label={`${c.seatsLeft} seats remaining`} />
            <div className="grid grid-cols-3 gap-3 text-center">
              <Mini label="Confirmed" value={c.confirmed} />
              <Mini label="Waitlist" value={c.waitlist} />
              <Mini label="Cancelled" value={c.cancelled} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="size-5 text-warning" /> Rating breakdown ({c.avgRating}/5)</CardTitle></CardHeader>
          <CardContent>
            {d.ratingBreakdown.some((r) => r.count > 0) ? (
              <div className="space-y-2">
                {d.ratingBreakdown.map((r) => {
                  const max = Math.max(...d.ratingBreakdown.map((x) => x.count), 1);
                  return (
                    <div key={r.star} className="flex items-center gap-3 text-sm">
                      <span className="flex w-12 items-center gap-1 font-bold">{r.star}<Star className="size-3 fill-warning text-warning" /></span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{r.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : <Empty />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Feedback sentiment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Sentiment icon={ThumbsUp} label="Positive" value={sentimentPct.positive} count={d.sentiments.positive} cls="text-success" />
              <Sentiment icon={Minus} label="Neutral" value={sentimentPct.neutral} count={d.sentiments.neutral} cls="text-muted-foreground" />
              <Sentiment icon={ThumbsDown} label="Negative" value={sentimentPct.negative} count={d.sentiments.negative} cls="text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-5 text-primary" /> Recent feedback</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {d.recentFeedback.length === 0 && <Empty />}
          {d.recentFeedback.map((f) => (
            <div key={f._id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{f.user?.name || 'Attendee'}</span>
                <span className="flex text-warning">{Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
              </div>
              {f.comment && <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>}
              {f.sentiment && <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{f.sentiment}</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="font-display text-xl font-extrabold">{value ?? 0}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Sentiment({ icon: Icon, label, value, count, cls }) {
  return (
    <div className="rounded-xl border p-4">
      <Icon className={`mx-auto size-6 ${cls}`} />
      <p className={`mt-2 font-display text-2xl font-extrabold ${cls}`}>{value}%</p>
      <p className="text-[11px] uppercase text-muted-foreground">{label} · {count}</p>
    </div>
  );
}

function Empty() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No data yet — it appears as registrations come in.</p>;
}
