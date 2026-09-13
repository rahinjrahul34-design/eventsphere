import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Zap, TrendingUp, AlertCircle, CheckCircle2, Play, RotateCw, Settings2, Sparkles, Timer, Sliders, History } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input, Label } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { Spinner } from '../ui/misc';
import { toast } from 'sonner';

export default function SmartQueueConsole({ eventId }) {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Queries
  const metricsQ = useQuery({
    queryKey: ['smartqueue-metrics', eventId],
    queryFn: () => endpoints.smartQueue.getMetrics(eventId),
    refetchInterval: 10000, // Real-time poll every 10s
  });

  const aiQ = useQuery({
    queryKey: ['smartqueue-ai', eventId],
    queryFn: () => endpoints.smartQueue.getAiInsights(eventId),
    staleTime: 60000,
  });

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState(null);

  // Initialize settings once loaded
  if (metricsQ.data?.settings && !settingsForm) {
    setSettingsForm({
      enabled: metricsQ.data.settings.enabled ?? true,
      autoPromote: metricsQ.data.settings.autoPromote ?? true,
      holdDurationMinutes: metricsQ.data.settings.holdDurationMinutes ?? 15,
      sendReminders: metricsQ.data.settings.sendReminders ?? true,
      priorityStrategy: metricsQ.data.settings.priorityStrategy ?? 'fifo',
    });
  }

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings) => endpoints.smartQueue.updateSettings(eventId, newSettings),
    onSuccess: (data) => {
      toast.success('SmartQueue settings updated');
      queryClient.invalidateQueries({ queryKey: ['smartqueue-metrics', eventId] });
      setShowSettings(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to update settings'),
  });

  const simulateMutation = useMutation({
    mutationFn: () => endpoints.smartQueue.simulate(eventId),
    onSuccess: (data) => {
      setSimulationResult(data);
      toast.info('Promotion simulation complete');
    },
    onError: (err) => toast.error(err.message || 'Simulation failed'),
  });

  const manualPromoteMutation = useMutation({
    mutationFn: (waitlistEntryId) => endpoints.smartQueue.manualPromote(eventId, waitlistEntryId),
    onSuccess: () => {
      toast.success('Candidate manually promoted into a temporary seat hold');
      queryClient.invalidateQueries({ queryKey: ['smartqueue-metrics', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventRegistrations', eventId] });
    },
    onError: (err) => toast.error(err.message || 'Manual promotion failed'),
  });

  if (metricsQ.isLoading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (metricsQ.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        <AlertCircle className="mx-auto mb-2 size-6" />
        Failed to load SmartQueue Console: {metricsQ.error.message}
      </div>
    );
  }

  const data = metricsQ.data;
  const metrics = data.metrics || {};
  const aiData = aiQ.data || {};
  const efficiency = metrics.efficiencyScore ?? 75;

  const getEfficiencyColor = (score) => {
    if (score >= 80) return 'text-success bg-success/10 border-success/20';
    if (score >= 60) return 'text-primary bg-primary/10 border-primary/20';
    if (score >= 40) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary dark:text-primary">
              <Zap className="size-4" />
            </span>
            <h2 className="font-display text-xl font-bold">SmartQueue AI Console</h2>
            <Badge variant={data.settings?.enabled !== false ? 'default' : 'secondary'} className="text-xs">
              {data.settings?.enabled !== false ? 'Engine Active' : 'Paused'}
            </Badge>
            {data.settings?.autoPromote && (
              <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs">
                Auto-Promote On
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Temporary seat holds, zero double-promotions, and automated waitlist conversion engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            className="text-xs"
          >
            <Play className="size-3.5 mr-1 text-primary" />
            Simulate Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs"
          >
            <Settings2 className="size-3.5 mr-1" />
            Queue Config
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => metricsQ.refetch()}
            disabled={metricsQ.isFetching}
            className="size-8"
          >
            <RotateCw className={`size-3.5 ${metricsQ.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Settings Modal / Panel */}
      <AnimatePresence>
        {showSettings && settingsForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  SmartQueue Operational Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Fine-tune hold durations, reminders, and automated priority promotion strategy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hold Duration (Minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="60"
                      value={settingsForm.holdDurationMinutes}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, holdDurationMinutes: parseInt(e.target.value, 10) || 15 })
                      }
                      className="bg-card"
                    />
                    <p className="text-[11px] text-muted-foreground">Between 5 and 60 minutes</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Auto Promotion</Label>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.autoPromote}
                          onChange={(e) => setSettingsForm({ ...settingsForm, autoPromote: e.target.checked })}
                          className="size-4 rounded accent-primary"
                        />
                        Auto-promote when seat opens
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">T-5m Reminders</Label>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.sendReminders}
                          onChange={(e) => setSettingsForm({ ...settingsForm, sendReminders: e.target.checked })}
                          className="size-4 rounded accent-primary"
                        />
                        Send reminder 5m before expiry
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Engine State</Label>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.enabled}
                          onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                          className="size-4 rounded accent-primary"
                        />
                        Enable SmartQueue Engine
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateSettingsMutation.mutate(settingsForm)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    Save Queue Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Efficiency Score */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Queue Efficiency</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEfficiencyColor(efficiency)}`}>
                {efficiency >= 80 ? 'Optimal' : efficiency >= 60 ? 'Healthy' : 'Needs Tuning'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-extrabold">{efficiency}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Conversion & response speed</p>
          </CardContent>
        </Card>

        {/* Active Holds */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active Holds</span>
              <Timer className="size-4 text-warning" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-warning dark:text-warning">
                {metrics.activeHoldsCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">locked seats</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {data.availableCapacity ?? 0} seats open for regular booking
            </p>
          </CardContent>
        </Card>

        {/* Claim Conversion */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Claim Conversion</span>
              <TrendingUp className="size-4 text-success" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-extrabold">{metrics.acceptanceRate ?? 0}%</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metrics.acceptedCount ?? 0} claimed of {metrics.totalHoldsCreated ?? 0} holds
            </p>
          </CardContent>
        </Card>

        {/* Avg Claim Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Avg Claim Time</span>
              <Clock className="size-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl font-extrabold">
                {metrics.avgClaimTimeFormatted || 'N/A'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Time from notice to claim</p>
          </CardContent>
        </Card>

        {/* Waitlist Queue Depth */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Waitlist Depth</span>
              <Users className="size-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-extrabold">{metrics.waitingCount ?? 0}</span>
              <span className="text-xs text-muted-foreground">waiting</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{metrics.totalWaitlist ?? 0} total joined</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Operational Intelligence & Velocity Analysis */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary dark:text-primary" />
              SmartQueue AI Operational Intelligence
            </CardTitle>
            {aiData.churnRiskLevel && (
              <Badge
                variant="outline"
                className={`text-xs font-bold ${
                  aiData.churnRiskLevel === 'LOW'
                    ? 'text-success border-success/30'
                    : aiData.churnRiskLevel === 'MEDIUM'
                    ? 'text-warning border-warning/30'
                    : 'text-destructive border-destructive/30'
                }`}
              >
                Churn Risk: {aiData.churnRiskLevel}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Dynamic inventory analysis, attendee claim velocity narrative, and suggested hold window adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {aiQ.isLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Spinner className="size-5 mx-auto mb-2" />
              Generating queue performance insights...
            </div>
          ) : (
            <>
              <p className="leading-relaxed text-foreground/90 text-sm bg-card/60 p-3.5 rounded-xl border">
                {aiData.summary || 'SmartQueue operational metrics indicate stable queue circulation.'}
              </p>

              {aiData.recommendations?.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {aiData.recommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-xl border bg-card p-3 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-primary">
                        <CheckCircle2 className="size-3.5" />
                        {rec.title}
                      </div>
                      <p className="text-muted-foreground leading-normal">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Simulation Result Drawer / Card (if run) */}
      {simulationResult && (
        <Card className="border-primary/40 bg-card shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="size-4 text-primary" />
                Dry-Run Allocation Simulation
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSimulationResult(null)} className="text-xs">
                Dismiss
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/30 p-3 rounded-lg">
              <div>
                <span className="text-muted-foreground block">Event Capacity</span>
                <span className="font-bold text-sm">{simulationResult.eventCapacity}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Current Registrations</span>
                <span className="font-bold text-sm">{simulationResult.currentRegistrations}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Active Holds</span>
                <span className="font-bold text-sm text-warning">{simulationResult.activeHoldsCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Open Seats</span>
                <span className="font-bold text-sm text-success">{simulationResult.availableSeats}</span>
              </div>
            </div>

            {simulationResult.nextInLine ? (
              <div className="rounded-xl border p-3 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <Avatar name={simulationResult.nextInLine.user?.name} className="size-8" />
                  <div>
                    <p className="font-bold text-sm">{simulationResult.nextInLine.user?.name}</p>
                    <p className="text-muted-foreground text-[11px]">{simulationResult.nextInLine.user?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-success border-success/30">
                    Next in FIFO line (#{simulationResult.nextInLine.position})
                  </Badge>
                  <Button
                    size="sm"
                    className="mt-1.5 block text-xs"
                    onClick={() => manualPromoteMutation.mutate(simulationResult.nextInLine.waitlistId)}
                    disabled={manualPromoteMutation.isPending}
                  >
                    Hold Seat Now
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No eligible candidate found in waitlist queue.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Holds Monitor */}
      {data.activeHolds?.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="size-4 text-warning" />
              Active Seat Reservations ({data.activeHolds.length})
            </CardTitle>
            <CardDescription className="text-xs">
              These seats are temporarily held with real-time countdown clocks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.activeHolds.map((h) => {
                const mins = Math.floor(h.secondsRemaining / 60);
                const secs = h.secondsRemaining % 60;
                return (
                  <div key={h._id} className="rounded-xl border bg-card p-3.5 space-y-2 text-xs shadow-soft">
                    <div className="flex items-center justify-between">
                      <Badge variant="warning" className="font-mono text-xs">
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')} left
                      </Badge>
                      <span className="font-semibold text-muted-foreground">{h.ticketType?.name || 'General'}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Expires: {new Date(h.holdExpiresAt).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waitlist Queue Table & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Waitlist Candidates</CardTitle>
              <CardDescription className="text-xs">
                Attendees waiting in deterministic FIFO priority order.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {data.waitlist?.length || 0} Registered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(!data.waitlist || data.waitlist.length === 0) ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No attendees currently on the waitlist for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5">Rank</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Attendee</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Tier</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Status</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Joined</th>
                    <th className="py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.waitlist.map((entry) => (
                    <tr key={entry._id} className="hover:bg-muted/40 transition">
                      <td className="py-2.5 font-mono font-bold text-foreground">
                        #{entry.position}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={entry.user?.name} src={entry.user?.avatar} className="size-6" />
                          <div>
                            <span className="font-semibold block">{entry.user?.name || 'Anonymous'}</span>
                            <span className="text-[11px] text-muted-foreground">{entry.user?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">{entry.ticketType?.name || 'General'}</td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            entry.status === 'promoted'
                              ? 'default'
                              : entry.status === 'hold_active'
                              ? 'warning'
                              : entry.status === 'declined'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] capitalize"
                        >
                          {entry.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        {entry.status === 'waiting' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => manualPromoteMutation.mutate(entry._id)}
                            disabled={manualPromoteMutation.isPending}
                            className="h-7 text-[11px]"
                          >
                            Hold Seat
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operational Audit Trail */}
      {data.recentAudits?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              SmartQueue Immutable Audit Trail
            </CardTitle>
            <CardDescription className="text-xs">
              Cryptographically timestamped action history of all seat allocations and state transitions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {data.recentAudits.map((audit) => (
                <div
                  key={audit._id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${
                        audit.action.includes('ACCEPTED') || audit.action.includes('CONFIRMED')
                          ? 'bg-success'
                          : audit.action.includes('EXPIRED') || audit.action.includes('DECLINED')
                          ? 'bg-destructive'
                          : 'bg-primary'
                      }`}
                    />
                    <span className="font-mono font-bold text-[11px]">{audit.action}</span>
                    {audit.userId?.name && (
                      <span className="text-muted-foreground">({audit.userId.name})</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(audit.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
