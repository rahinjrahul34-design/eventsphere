import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle2, IndianRupee, Gauge, MessageSquare, Star, Award, Bot, Radio, Download, Activity, Sparkles } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import StatCard from '../../../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

import { TrendChart } from '../../../components/charts/Charts';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Overview() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const analyticsQ = useQuery({ queryKey: ['analytics', event._id], queryFn: () => endpoints.analytics(event._id, 90) });
  const feedbackQ = useQuery({ queryKey: ['feedback', event._id], queryFn: () => endpoints.feedback(event._id) });

  const issueCerts = useMutation({
    mutationFn: () => endpoints.issueCertificates(event._id),
    onSuccess: (d) => { toast.success(`Issued ${d.issued} certificates`); qc.invalidateQueries({ queryKey: ['analytics', event._id] }); },
    onError: (e) => toast.error(e.message),
  });

  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      setInsights(await endpoints.aiInsights(event._id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  const c = analyticsQ.data?.cards;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Confirmed registrations" value={c?.confirmed ?? event.registrationCount} sub={`${c?.totalRegistrations || 0} all-time`} />
        <StatCard icon={CheckCircle2} label="Check-ins" value={c?.checkIns ?? event.checkedInCount} accent="success" sub={`${c?.noShows || 0} no-shows`} />
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${(c?.revenue || 0).toLocaleString('en-IN')}`} accent="info" />
        <StatCard icon={Gauge} label="Capacity used" value={`${c?.capacityUtilization || 0}%`} accent="warning" sub={`${c?.seatsLeft ?? 0} seats left`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Registrations & check-ins</CardTitle></CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? <div className="skeleton h-[260px]" /> : (
              <TrendChart
                data={analyticsQ.data.trend.slice(-21)}
                lines={[
                  { key: 'registrations', label: 'Registrations', color: '#7c5cfc' },
                  { key: 'checkIns', label: 'Check-ins', color: '#10b981' },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link to={`/dashboard/events/${event._id}/eventboost`}>
              <Button variant="outline" className="w-full justify-start font-bold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10">
                <Sparkles className="size-4" /> EventBoost AI & SEO
              </Button>
            </Link>
            <Link to={`/dashboard/events/${event._id}/eventpulse`}>
              <Button variant="outline" className="w-full justify-start font-bold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10">
                <Activity className="size-4" /> EventPulse AI Forecast
              </Button>
            </Link>
            <Link to={`/dashboard/events/${event._id}/check-in`}><Button variant="outline" className="w-full justify-start"><CheckCircle2 className="size-4" /> QR check-in desk</Button></Link>
            <Link to={`/events/${event.slug}/live`}><Button variant="outline" className="w-full justify-start"><Radio className="size-4" /> Live control center</Button></Link>
            <Button variant="outline" className="w-full justify-start" loading={issueCerts.isPending} onClick={() => issueCerts.mutate()}>
              <Award className="size-4" /> Issue certificates to attendees
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                const { api } = await import('../../../lib/api');
                const res = await api.get(`/organizer/events/${event._id}/export`, { responseType: 'blob' });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url; a.download = `${event.slug}-registrations.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-4" /> Export registrations CSV
            </Button>
            <Button variant="outline" className="w-full justify-start" loading={loadingInsights} onClick={generateInsights}>
              <Bot className="size-4" /> Generate AI insights
            </Button>
          </CardContent>
        </Card>
      </div>

      {insights && <InsightsReport data={insights} />}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Star className="size-5 text-warning" /> Latest feedback</CardTitle>
          <Badge variant="secondary" className="text-sm">{analyticsQ.data?.cards.avgRating || '—'} / 5</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedbackQ.isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div> : (feedbackQ.data?.feedback || []).slice(0, 5).map((f) => (
            <div key={f._id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{f.user?.name || 'Attendee'}</span>
                <span className="flex text-warning text-xs">{Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
              </div>
              {f.comment && <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>}
            </div>
          ))}
          {(!feedbackQ.data?.feedback || feedbackQ.data.feedback.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><MessageSquare className="size-4" /> Feedback appears after attendees check in.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsReport({ data }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" /> AI Post-Event Insights</CardTitle>
        <p className="text-sm font-medium text-muted-foreground">{data.headline}</p>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <InsightColumn title="What went well" items={data.wentWell} tone="success" />
        <InsightColumn title="Problems" items={data.problems} tone="warning" />
        <div>
          <p className="font-bold text-sm">Most popular session</p>
          <p className="mt-1 rounded-lg bg-card p-3 text-sm">{data.mostPopularSession}</p>
          <p className="mt-3 font-bold text-sm">Attendee sentiment</p>
          <div className="mt-1 flex gap-2">
            {['positive', 'neutral', 'negative'].map((s) => (
              <div key={s} className="flex-1 rounded-lg bg-card p-2 text-center">
                <p className={`font-display text-lg font-extrabold ${s === 'positive' ? 'text-success' : s === 'negative' ? 'text-destructive' : 'text-muted-foreground'}`}>{data.sentiment[s]}%</p>
                <p className="text-[10px] uppercase text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </div>
        <InsightColumn title="Recommendations" items={data.recommendations} tone="primary" />
      </CardContent>
    </Card>
  );
}

function InsightColumn({ title, items, tone }) {
  return (
    <div>
      <p className="font-bold text-sm">{title}</p>
      <ul className="mt-2 space-y-2">
        {(items || []).map((i, n) => (
          <li key={n} className="flex gap-2 rounded-lg bg-card p-3 text-sm">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-primary'}`} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
