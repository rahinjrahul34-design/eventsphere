import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Sliders, ArrowRight, RotateCcw, AlertCircle, TrendingUp } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function TrustSimulator({ currentProfile, onSimulationChange }) {
  const currentMetrics = currentProfile?.metrics || {};
  const currentScore = currentProfile?.trustScore || 0;

  // Simulation form state initialized from current live profile
  const [completionRate, setCompletionRate] = useState(currentMetrics.completionRate ?? 100);
  const [satisfactionPercentage, setSatisfactionPercentage] = useState(currentMetrics.satisfactionPercentage ?? 90);
  const [attendanceRate, setAttendanceRate] = useState(currentMetrics.attendanceRate ?? 80);
  const [additionalEvents, setAdditionalEvents] = useState(2);
  const [additionalAttendees, setAdditionalAttendees] = useState(50);

  const [simulationResult, setSimulationResult] = useState(null);

  const simulateMutation = useMutation({
    mutationFn: (overrides) => endpoints.trust.simulate(overrides),
    onSuccess: (data) => {
      setSimulationResult(data);
      if (onSimulationChange) onSimulationChange(data);
    },
  });

  const handleRunSimulation = (overrides = {}) => {
    simulateMutation.mutate({
      completionRate: Number(completionRate),
      satisfactionPercentage: Number(satisfactionPercentage),
      attendanceRate: Number(attendanceRate),
      additionalCompletedEvents: Number(additionalEvents),
      additionalAttendeesServed: Number(additionalAttendees),
      ...overrides,
    });
  };

  const handleReset = () => {
    setCompletionRate(currentMetrics.completionRate ?? 100);
    setSatisfactionPercentage(currentMetrics.satisfactionPercentage ?? 90);
    setAttendanceRate(currentMetrics.attendanceRate ?? 80);
    setAdditionalEvents(0);
    setAdditionalAttendees(0);
    setSimulationResult(null);
  };

  const projectedScore = simulationResult?.simulated?.trustScore ?? currentScore;
  const scoreDelta = simulationResult?.scoreDelta ?? 0;
  const projectedLevel = simulationResult?.simulated?.trustLevel ?? currentProfile?.trustLevel;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-soft">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </span>
            <h3 className="font-display text-lg font-bold">What-If Reputation Simulator</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Model hypothetical event outcomes to observe direct mathematical impacts on your TrustScore.
          </p>
        </div>

        <Badge variant="outline" className="gap-1 border-warning/30 bg-warning/10 text-warning dark:text-warning font-semibold text-xs">
          <AlertCircle className="size-3.5" /> Simulation Sandbox Only
        </Badge>
      </div>

      {/* Interactive Controls & Projected Comparison Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Completion Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-foreground">Target Completion Rate</label>
              <span className="font-mono font-bold text-primary">{completionRate}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={completionRate}
              onChange={(e) => setCompletionRate(e.target.value)}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Maintaining 100% completion maximizes reliability and unlocks the Highly Reliable badge.
            </p>
          </div>

          {/* Attendee Satisfaction Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-foreground">Expected Attendee Satisfaction</label>
              <span className="font-mono font-bold text-primary">{satisfactionPercentage}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={satisfactionPercentage}
              onChange={(e) => setSatisfactionPercentage(e.target.value)}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Bayesian smoothing requires multiple 4★+ reviews to elevate overall satisfaction index.
            </p>
          </div>

          {/* Additional Completed Events Input */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Add'l Completed Events</label>
              <input
                type="number"
                min="0"
                max="25"
                value={additionalEvents}
                onChange={(e) => setAdditionalEvents(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">Hosts without cancellations</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Add'l Attendees Served</label>
              <input
                type="number"
                min="0"
                max="1000"
                step="10"
                value={additionalAttendees}
                onChange={(e) => setAdditionalAttendees(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">Verified ticket check-ins</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleRunSimulation()}
              disabled={simulateMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="size-4" />
              {simulateMutation.isPending ? 'Simulating...' : 'Run Simulation'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Projected Outcome Column */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <TrendingUp className="size-4" /> Projected Reputation Impact
            </h4>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-mono text-2xl font-extrabold text-foreground">{currentScore}</p>
              </div>

              <ArrowRight className="size-5 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Projected</p>
                <p className="font-mono text-2xl font-extrabold text-primary">{projectedScore}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Delta</p>
                <Badge
                  variant={scoreDelta > 0 ? 'success' : scoreDelta < 0 ? 'destructive' : 'secondary'}
                  className="font-mono font-bold"
                >
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
                </Badge>
              </div>
            </div>

            {simulationResult && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Projected Trust Tier:</span>
                  <span className="font-bold capitalize text-foreground">{projectedLevel?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Completion Component:</span>
                  <span className="font-bold text-foreground">
                    {simulationResult.simulated.components?.completion}/100
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Satisfaction Component:</span>
                  <span className="font-bold text-foreground">
                    {simulationResult.simulated.components?.satisfaction}/100
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/50">
            Simulations are purely mathematical projections calculated in memory and do not affect platform audits.
          </p>
        </div>
      </div>
    </div>
  );
}
