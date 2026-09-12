import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, TrendingUp, Users, UserX, Flame, Sparkles, RefreshCw,
  AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, MessageSquare,
  BarChart3, Sliders, Send, Clock, ShieldCheck, ArrowUpRight, ArrowDownRight,
  Minus, Info, Check, Play, Zap,
} from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Spinner, ErrorState } from '../../../components/ui/misc';
import { TrendChart, BarsChart, COLORS } from '../../../components/charts/Charts';
import { toast } from 'sonner';

export default function EventPulseTab() {
  const { event } = useOutletContext();
  const qc = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'engagement' | 'actions' | 'alerts' | 'timeline' | 'accuracy' | 'simulator' | 'qa'
  const [showSim, setShowSim] = useState(false);

  // Natural Language Q&A state
  const [qaQuery, setQaQuery] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState([
    {
      q: 'How many attendees should I expect?',
      a: 'Current prediction is estimated around your attendance rate with expected no-shows factored into the likely range.',
    },
  ]);

  // Simulator state
  const [simForm, setSimForm] = useState({
    capacity: event.capacity || 100,
    currentRegistrations: event.registrationCount || 0,
    isPaid: Boolean(event.price > 0),
    daysRemaining: 7,
    velocity24h: 5,
    reminderSent: false,
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Queries
  const predQ = useQuery({
    queryKey: ['eventpulse-prediction', event._id],
    queryFn: () => endpoints.eventPulse.getPrediction(event._id),
    refetchInterval: 30000,
  });

  const historyQ = useQuery({
    queryKey: ['eventpulse-history', event._id],
    queryFn: () => endpoints.eventPulse.getHistory(event._id),
  });

  const accuracyQ = useQuery({
    queryKey: ['eventpulse-accuracy', event._id],
    queryFn: () => endpoints.eventPulse.getAccuracy(event._id),
    enabled: event.status === 'completed' || activeSubTab === 'accuracy',
  });

  // Mutation: Recalculate
  const analyzeMutation = useMutation({
    mutationFn: () => endpoints.eventPulse.analyze(event._id),
    onSuccess: () => {
      toast.success('EventPulse prediction recalculated from latest signals');
      qc.invalidateQueries({ queryKey: ['eventpulse-prediction', event._id] });
      qc.invalidateQueries({ queryKey: ['eventpulse-history', event._id] });
      qc.invalidateQueries({ queryKey: ['manage-event', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Simulator trigger
  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await endpoints.eventPulse.simulate(event._id, simForm);
      setSimResult(res);
      toast.success('Simulation executed');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSimLoading(false);
    }
  };

  // Q&A trigger
  const submitQa = async (e) => {
    e?.preventDefault();
    if (!qaQuery.trim()) return;
    const qText = qaQuery;
    setQaQuery('');
    setQaLoading(true);

    try {
      const res = await endpoints.eventPulse.query(event._id, qText);
      setQaHistory((prev) => [...prev, { q: qText, a: res.answer, drivers: res.keyDrivers }]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setQaLoading(false);
    }
  };

  if (predQ.isLoading) return <Spinner />;
  if (predQ.isError) return <ErrorState message={predQ.error.message} onRetry={predQ.refetch} />;

  const p = predQ.data;
  const f = p.forecast || {};
  const att = p.attendance || {};
  const eng = p.engagement || {};
  const h = p.health || {};
  const conf = p.confidence || {};
  const drivers = p.drivers || [];
  const recs = p.recommendations || [];
  const alerts = p.activeAlerts || [];

  // Prepare chart data for registration forecast trajectory
  const historyList = historyQ.data || [];
  const chartData = (p.features?.registrations?.dailyHistory || []).map((d) => ({
    date: d.date,
    actual: d.registrations,
  }));

  // Trend line styles
  const momentumBadgeVariant = {
    accelerating: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    growing: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    stable: 'bg-muted text-muted-foreground border-border',
    slowing: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    declining: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  }[f.momentumState || 'stable'];

  const healthBadgeVariant = {
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    good: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    attention: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    at_risk: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  }[h.status || 'healthy'];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md">
            <Activity className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl font-black">EventPulse AI</h3>
              <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider">
                {p.modelVersion || 'v1.0'}
              </Badge>
              {p.isColdStart && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Cold Start Baseline
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Predictive Attendance, Engagement & Performance Intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-xs text-muted-foreground">Model Confidence</div>
            <div className="text-sm font-extrabold text-foreground">{conf.score || 75}% ({conf.level?.toUpperCase()})</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSim(!showSim)}
            className={showSim ? 'border-primary text-primary bg-primary/5' : ''}
          >
            <Sliders className="size-3.5" /> What-If Simulator
          </Button>
          <Button
            size="sm"
            loading={analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate()}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Recalculate
          </Button>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* KPI 1: Registrations */}
        <Card className="relative overflow-hidden border-border/70 hover:border-primary/40 transition">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Registration Forecast</span>
              <Badge variant="outline" className={`text-[10px] capitalize ${momentumBadgeVariant}`}>
                {f.momentumState}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="font-display text-2xl font-black text-foreground">
              {f.predictedRegistrations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current: <b className="text-foreground">{p.features?.registrations?.totalConfirmed || 0}</b> / {event.capacity}
            </p>
            <div className="mt-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <span>24h Inflow:</span>
              <span className="text-foreground font-bold">+{f.velocity24h || 0}</span>
              <span>({f.growthRate >= 0 ? '+' : ''}{Math.round((f.growthRate || 0) * 100)}%)</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Expected Attendance */}
        <Card className="relative overflow-hidden border-border/70 hover:border-primary/40 transition">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Expected Attendance</span>
              <Users className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="font-display text-2xl font-black text-emerald-500">
              {att.expectedAttendees || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected rate: <b className="text-foreground">{att.attendanceRate || 0}%</b>
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Range: <span className="font-bold text-foreground">{att.lowerBound || 0}–{att.upperBound || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Expected No-Shows */}
        <Card className="relative overflow-hidden border-border/70 hover:border-primary/40 transition">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Expected No-Shows</span>
              <UserX className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="font-display text-2xl font-black text-amber-500">
              {att.expectedNoShows || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No-show rate: <b className="text-foreground">{att.noShowRate || 0}%</b>
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {att.noShowRate > 30 ? '⚠ Above average risk' : '✓ Normal tolerance'}
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Engagement */}
        <Card className="relative overflow-hidden border-border/70 hover:border-primary/40 transition">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Predicted Engagement</span>
              <TrendingUp className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="font-display text-2xl font-black text-primary">
              {eng.score || 0}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Level: <b className="text-foreground capitalize">{eng.level?.replace('_', ' ')}</b>
            </p>
            <div className="mt-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <span>Trend:</span>
              <span className="capitalize text-foreground font-bold">{eng.trend}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Event Health */}
        <Card className="relative overflow-hidden border-border/70 hover:border-primary/40 transition">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Event Health Score</span>
              <Badge variant="outline" className={`text-[10px] uppercase font-extrabold ${healthBadgeVariant}`}>
                {h.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="font-display text-2xl font-black text-foreground">
              {h.score || 0}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Commercial & turnout readiness
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Capacity: <span className="font-bold text-foreground">{Math.round((p.features?.registrations?.capacityUtilization || 0) * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulator Drawer (Toggleable) */}
      {showSim && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <CardTitle className="text-base font-extrabold">What-If Scenario Simulator</CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30">
                  DEMO / SIMULATION MODE — SYNTHETIC DATA
                </Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowSim(false)}>Close</Button>
            </div>
            <CardDescription className="text-xs">
              Test how adjusting capacity, ticket pricing, lead days, or sending attendee reminders impacts attendance and health.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Capacity</label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-xs"
                  value={simForm.capacity}
                  onChange={(e) => setSimForm({ ...simForm, capacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Current Regs</label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-xs"
                  value={simForm.currentRegistrations}
                  onChange={(e) => setSimForm({ ...simForm, currentRegistrations: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Days Remaining</label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-xs"
                  value={simForm.daysRemaining}
                  onChange={(e) => setSimForm({ ...simForm, daysRemaining: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Pricing Tier</label>
                <select
                  className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  value={simForm.isPaid ? 'paid' : 'free'}
                  onChange={(e) => setSimForm({ ...simForm, isPaid: e.target.value === 'paid' })}
                >
                  <option value="free">Free Event</option>
                  <option value="paid">Paid Event (+12% commitment)</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-1.5 font-bold text-muted-foreground cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={simForm.reminderSent}
                    onChange={(e) => setSimForm({ ...simForm, reminderSent: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  Reminder Sent (+10%)
                </label>
                <Button size="sm" loading={simLoading} onClick={runSimulation} className="h-8 text-xs">
                  Run Simulation
                </Button>
              </div>
            </div>

            {simResult && (
              <div className="rounded-xl border bg-card p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-foreground">Simulated Outcome:</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary">
                    Simulated Confidence: {simResult.confidence?.score}%
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-4 pt-1">
                  <div>
                    <span className="text-muted-foreground">Predicted Registrations:</span>{' '}
                    <b className="text-foreground">{simResult.forecast?.predictedRegistrations}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Attendees:</span>{' '}
                    <b className="text-emerald-500 font-extrabold">{simResult.attendance?.expectedAttendees}</b>{' '}
                    ({simResult.attendance?.attendanceRate}%)
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected No-Shows:</span>{' '}
                    <b className="text-amber-500 font-extrabold">{simResult.attendance?.expectedNoShows}</b>{' '}
                    ({simResult.attendance?.noShowRate}%)
                  </div>
                  <div>
                    <span className="text-muted-foreground">Event Health Score:</span>{' '}
                    <b className="text-foreground font-extrabold">{simResult.health?.score}/100</b> ({simResult.health?.status})
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl border bg-card p-1">
        {[
          { id: 'overview', label: 'Forecast & Trajectory', icon: BarChart3 },
          { id: 'engagement', label: 'Engagement Signals', icon: TrendingUp },
          { id: 'actions', label: `Actions (${recs.length})`, icon: Zap },
          { id: 'alerts', label: `Alerts (${alerts.length})`, icon: AlertTriangle },
          { id: 'timeline', label: 'Prediction Timeline', icon: Clock },
          { id: 'accuracy', label: 'Post-Event Accuracy', icon: ShieldCheck },
          { id: 'qa', label: 'AI Copilot Q&A', icon: Sparkles },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition ${
              activeSubTab === t.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <t.icon className="size-4" /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: Overview & Trajectory */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* AI Executive Summary */}
          {p.aiSummary && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="font-display text-sm font-bold text-foreground">
                    EventPulse AI Executive Synthesis
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {p.engine === 'hybrid-gemini' ? '✨ Gemini Grounded' : 'Deterministic Rule Engine'}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.aiSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Forecast Chart & Attendee Funnel */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Registration Trend & Inflow</CardTitle>
                  <span className="text-xs text-muted-foreground">Last 14 days activity</span>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <TrendChart
                    data={chartData}
                    height={280}
                    lines={[
                      { key: 'actual', label: 'Daily Registrations', color: COLORS[0] },
                    ]}
                  />
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Awaiting registration signals to construct trendline.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendee Transition Funnel Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Attendance Transition Flow</CardTitle>
                <CardDescription className="text-xs">
                  Expected conversion from registrations to actual attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-3.5 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>1. Total Pool</span>
                    <span className="text-foreground">{p.features?.registrations?.totalConfirmed || 0} Regs</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="text-center font-extrabold text-muted-foreground text-xs">↓</div>

                <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-3.5 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>2. Expected Attendees</span>
                    <span>{att.expectedAttendees || 0} ({att.attendanceRate || 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${att.attendanceRate || 0}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    90% prediction interval: <b>{att.lowerBound} – {att.upperBound}</b>
                  </div>
                </div>

                <div className="text-center font-extrabold text-muted-foreground text-xs">↓</div>

                <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-3.5 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-amber-600">
                    <span>3. Expected No-Shows</span>
                    <span>{att.expectedNoShows || 0} ({att.noShowRate || 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${att.noShowRate || 0}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    Estimated voluntary drop-off
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* What is driving the prediction? (Explainability) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Info className="size-4 text-primary" /> What is driving this prediction?
              </CardTitle>
              <CardDescription className="text-xs">
                Transparent factor attribution showing positive and negative influences on the forecast.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {drivers.map((d, i) => {
                  const isPos = d.direction === 'positive';
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3.5 text-xs transition ${
                        isPos
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {isPos ? '✓' : '⚠'} {d.factor}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {d.magnitude} impact
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-snug">{d.impact}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 2: Engagement Signals */}
      {activeSubTab === 'engagement' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 5-Factor Engagement Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">5-Dimension Engagement Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Audience engagement composite score ({eng.score}/100 — {eng.level?.toUpperCase()})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarsChart
                  data={[
                    { name: 'Participation', value: eng.breakdown?.participation || 0 },
                    { name: 'Interaction', value: eng.breakdown?.interaction || 0 },
                    { name: 'Live Activity', value: eng.breakdown?.liveActivity || 0 },
                    { name: 'Feedback', value: eng.breakdown?.feedback || 0 },
                    { name: 'Networking', value: eng.breakdown?.networking || 0 },
                  ]}
                  xKey="name"
                  valueKey="value"
                  color={COLORS[0]}
                  height={240}
                />
              </CardContent>
            </Card>

            {/* Live Signals & Telemetry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Real-Time Interaction Signals</CardTitle>
                <CardDescription className="text-xs">
                  Active engagement telemetry logged across EventSphere modules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Poll Votes Cast</span>
                    <div className="font-display text-xl font-bold mt-1 text-foreground">
                      {p.features?.engagement?.pollVotes || 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Across {p.features?.engagement?.pollsCount || 0} polls</span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Q&A Questions</span>
                    <div className="font-display text-xl font-bold mt-1 text-foreground">
                      {p.features?.engagement?.questionsCount || 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{p.features?.engagement?.questionUpvotes || 0} upvotes</span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Event Chat Messages</span>
                    <div className="font-display text-xl font-bold mt-1 text-foreground">
                      {p.features?.engagement?.chatMessages || 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Live room activity</span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Feedback Reviews</span>
                    <div className="font-display text-xl font-bold mt-1 text-foreground">
                      {p.features?.engagement?.feedbackCount || 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Avg: {p.features?.engagement?.avgRating || 0}/5.0</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-primary/5 border-primary/20 p-3.5 text-xs">
                  <div className="font-bold text-foreground">Engagement Momentum: <span className="capitalize text-primary">{eng.trend}</span></div>
                  <p className="text-muted-foreground mt-0.5">
                    {eng.trend === 'rising'
                      ? 'Signals show expanding audience interaction over the most recent time window.'
                      : eng.trend === 'declining'
                      ? 'Live audience interaction has slowed. Consider prompting a poll or stage question.'
                      : 'Audience participation is holding steady at projected baseline rates.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Action Center */}
      {activeSubTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold">Recommended Organizer Actions</h4>
            <span className="text-xs text-muted-foreground">Tied directly to detected forecast signals</span>
          </div>

          <div className="space-y-3">
            {recs.map((r, i) => {
              const prioColor = {
                high: 'text-rose-600 bg-rose-500/10 border-rose-500/30',
                medium: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
                low: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
              }[r.priority || 'medium'];

              return (
                <Card key={i} className="border-border/80 hover:border-primary/40 transition">
                  <CardContent className="p-4 flex flex-wrap sm:flex-nowrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${prioColor}`}>
                          {r.priority} Priority
                        </Badge>
                        <h5 className="font-bold text-sm text-foreground">{r.title}</h5>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-1">{r.action}</p>
                      <p className="text-xs text-muted-foreground">{r.rationale}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 text-xs">
                      Take Action
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Alerts */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold">Active Predictive Risk Alerts</h4>
            <span className="text-xs text-muted-foreground">{alerts.length} active notifications</span>
          </div>

          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                <h5 className="font-bold text-sm">No Active Prediction Risk Alerts</h5>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  All performance indicators (registration velocity, attendance trajectory, capacity utilization) are within safe parameters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((al, i) => (
                <Card key={i} className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{al.type.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-500/30">
                          {al.severity} Severity
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{al.message}</p>
                      {al.actionRecommended && (
                        <p className="font-semibold text-foreground pt-1">
                          Recommended: {al.actionRecommended}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: Prediction Timeline & History */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold">Prediction Evolution Timeline</h4>
            <span className="text-xs text-muted-foreground">Historical snapshot log</span>
          </div>

          {historyList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-xs text-muted-foreground">
                Snapshot history will log dynamically as campaign days progress.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-bold text-muted-foreground">
                    <tr>
                      <th className="p-3">Snapshot Date</th>
                      <th className="p-3">Predicted Regs</th>
                      <th className="p-3">Actual Regs</th>
                      <th className="p-3">Expected Attendance</th>
                      <th className="p-3">Engagement</th>
                      <th className="p-3">Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyList.map((sn, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold">
                          {new Date(sn.snapshotTime).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 font-bold text-foreground">{sn.predictedRegistrations}</td>
                        <td className="p-3 text-muted-foreground">{sn.actualRegistrations}</td>
                        <td className="p-3 font-bold text-emerald-600">{sn.expectedAttendance}</td>
                        <td className="p-3">{sn.engagementScore}/100</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {sn.trigger}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SUB-TAB 6: Post-Event Accuracy */}
      {activeSubTab === 'accuracy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold">Post-Event Prediction vs Actuals</h4>
            <span className="text-xs text-muted-foreground">Evaluation metrics (MAE / MAPE)</span>
          </div>

          {accuracyQ.data?.evaluated === false ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <Info className="size-8 text-muted-foreground mx-auto" />
                <h5 className="font-bold text-sm">Event Not Yet Completed</h5>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Accuracy metrics and evaluation error rates will be computed once the event reaches its conclusion or is marked completed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Registrations Error</span>
                    <div className="font-display text-xl font-bold mt-1">
                      {accuracyQ.data?.errors?.registrationPE || 0}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Pred: {accuracyQ.data?.predicted?.registrations} vs Actual: {accuracyQ.data?.actual?.registrations}
                    </span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Attendance Error</span>
                    <div className="font-display text-xl font-bold mt-1 text-emerald-600">
                      {accuracyQ.data?.errors?.attendancePE || 0}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Pred: {accuracyQ.data?.predicted?.attendance} vs Actual: {accuracyQ.data?.actual?.attendance}
                    </span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">No-Show Error</span>
                    <div className="font-display text-xl font-bold mt-1 text-amber-600">
                      {Math.abs((accuracyQ.data?.predicted?.noShows || 0) - (accuracyQ.data?.actual?.noShows || 0))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Absolute difference</span>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <span className="text-muted-foreground">Engagement Error</span>
                    <div className="font-display text-xl font-bold mt-1">
                      {accuracyQ.data?.errors?.engagementPE || 0}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">Score error margin</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SUB-TAB 7: AI Copilot Q&A */}
      {activeSubTab === 'qa' && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Natural Language Prediction Q&A
            </CardTitle>
            <CardDescription className="text-xs">
              Query EventPulse AI for instant natural language answers grounded strictly in verified event metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs">
              {qaHistory.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-3.5 py-2 max-w-md font-medium">
                      {item.q}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-xs bg-muted border px-3.5 py-2.5 max-w-lg space-y-1">
                      <p className="text-foreground leading-relaxed whitespace-pre-line">{item.a}</p>
                      {item.drivers && (
                        <div className="pt-1 flex flex-wrap gap-1">
                          {item.drivers.map((drv, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">{drv}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {qaLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-xs bg-muted p-3">
                    <Spinner className="size-4" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={submitQa} className="flex gap-2">
              <Input
                placeholder="e.g. Why is attendance predicted at this level? What can I do?"
                value={qaQuery}
                onChange={(e) => setQaQuery(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="sm" loading={qaLoading} disabled={!qaQuery.trim()}>
                <Send className="size-3.5" />
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <span>Try asking:</span>
              {[
                'How many attendees should I expect?',
                'Why is attendance prediction falling?',
                'What actions can I take right now?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => { setQaQuery(suggestion); }}
                  className="rounded-full border bg-card px-2.5 py-0.5 hover:border-primary hover:text-foreground transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
