import { useState } from 'react';
import { Sliders, Play, RotateCcw, ArrowRight, TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export default function WhatIfSimulator({ eventId, baselineHealth }) {
  const defaultScenario = {
    registrationDeltaPct: 0,
    expectedAttendanceRate: 75,
    noShowRate: 15,
    capacityDelta: 0,
    safetyReadinessBoost: 0,
    seoScoreBoost: 0,
  };

  const [scenario, setScenario] = useState(defaultScenario);
  const [result, setResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (customScenario = null) => {
    setIsSimulating(true);
    const payload = customScenario || scenario;
    try {
      const res = await endpoints.commandCenter.simulate(eventId, payload);
      setResult(res);
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const applyPreset = (preset) => {
    let s = { ...defaultScenario };
    if (preset === 'VIRAL_SURGE') {
      s = { ...defaultScenario, registrationDeltaPct: 35, capacityDelta: 50, expectedAttendanceRate: 85, noShowRate: 8 };
    } else if (preset === 'RAIN_WEATHER') {
      s = { ...defaultScenario, expectedAttendanceRate: 50, noShowRate: 35, safetyReadinessBoost: 10 };
    } else if (preset === 'MAX_READINESS') {
      s = { ...defaultScenario, safetyReadinessBoost: 25, seoScoreBoost: 20 };
    }
    setScenario(s);
    handleSimulate(s);
  };

  const handleReset = () => {
    setScenario(defaultScenario);
    setResult(null);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sliders className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Command Center Simulator</h3>
            <p className="text-xs text-muted-foreground">Test hypothetical operational scenarios and measure Event Health impacts.</p>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('VIRAL_SURGE')}
            className="rounded-lg border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition"
          >
            🚀 Ticket Surge (+35%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('RAIN_WEATHER')}
            className="rounded-lg border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition"
          >
            🌧️ High No-Shows (35%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('MAX_READINESS')}
            className="rounded-lg border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition"
          >
            🛡️ Safety & SEO Polish
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            title="Reset to baseline"
            aria-label="Reset simulation"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator Sliders Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Registration Delta */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Registration Volume:</span>
            <span className="font-bold text-primary font-mono">
              {scenario.registrationDeltaPct > 0 ? `+${scenario.registrationDeltaPct}%` : `${scenario.registrationDeltaPct}%`}
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="100"
            step="5"
            value={scenario.registrationDeltaPct}
            onChange={(e) => setScenario({ ...scenario, registrationDeltaPct: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-50% slump</span>
            <span>Baseline (0%)</span>
            <span>+100% 2x</span>
          </div>
        </div>

        {/* Expected Attendance Turnout Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Attendance Turnout Rate:</span>
            <span className="font-bold text-primary font-mono">{scenario.expectedAttendanceRate}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            step="5"
            value={scenario.expectedAttendanceRate}
            onChange={(e) => setScenario({ ...scenario, expectedAttendanceRate: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>30% Low</span>
            <span>75% Standard</span>
            <span>100% Perfect</span>
          </div>
        </div>

        {/* Expected No-Show Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Forecasted No-Show Rate:</span>
            <span className="font-bold text-primary font-mono">{scenario.noShowRate}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={scenario.noShowRate}
            onChange={(e) => setScenario({ ...scenario, noShowRate: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0% Ideal</span>
            <span>15% Normal</span>
            <span>50% Severe</span>
          </div>
        </div>

        {/* Capacity Delta */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Venue Capacity Adjustment:</span>
            <span className="font-bold text-primary font-mono">
              {scenario.capacityDelta > 0 ? `+${scenario.capacityDelta}` : scenario.capacityDelta} seats
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="200"
            step="10"
            value={scenario.capacityDelta}
            onChange={(e) => setScenario({ ...scenario, capacityDelta: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-50 seats</span>
            <span>0</span>
            <span>+200 seats</span>
          </div>
        </div>

        {/* Safety Readiness Boost */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Safety Protocol Boost:</span>
            <span className="font-bold text-primary font-mono">+{scenario.safetyReadinessBoost} pts</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={scenario.safetyReadinessBoost}
            onChange={(e) => setScenario({ ...scenario, safetyReadinessBoost: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>+15 checklist</span>
            <span>+30 certified</span>
          </div>
        </div>

        {/* SEO / Content Boost */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">SEO Optimization Boost:</span>
            <span className="font-bold text-primary font-mono">+{scenario.seoScoreBoost} pts</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={scenario.seoScoreBoost}
            onChange={(e) => setScenario({ ...scenario, seoScoreBoost: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>+15 AI tags</span>
            <span>+30 full polish</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => handleSimulate()}
          disabled={isSimulating}
          className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition disabled:opacity-50"
        >
          <Play className={cn('size-3.5', isSimulating && 'animate-spin')} />
          <span>{isSimulating ? 'Recalculating...' : 'Run What-If Simulation'}</span>
        </button>
      </div>

      {/* Simulation Results Diff Panel */}
      {result && (
        <div className="rounded-xl border bg-gradient-to-br from-secondary/30 via-card to-secondary/30 p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                Simulation Result
              </Badge>
              <span className="text-xs text-muted-foreground">Side-by-side projection compared to live baseline</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Health Score Delta:</span>
              <span className={cn(
                'px-2 py-0.5 rounded-md text-xs font-black font-mono',
                result.deltas.healthScore > 0 ? 'bg-emerald-500/10 text-emerald-500' : result.deltas.healthScore < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              )}>
                {result.deltas.healthScore > 0 ? `+${result.deltas.healthScore}` : result.deltas.healthScore} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Health Score */}
            <div className="rounded-xl bg-card p-3 border">
              <span className="text-[11px] font-semibold text-muted-foreground block">Event Health</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-semibold text-muted-foreground line-through">{result.before.healthScore}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="text-xl font-black font-display text-foreground">{result.after.healthScore}</span>
              </div>
              <span className="text-[10px] text-muted-foreground capitalize block mt-0.5">{result.after.status}</span>
            </div>

            {/* Expected Turnout */}
            <div className="rounded-xl bg-card p-3 border">
              <span className="text-[11px] font-semibold text-muted-foreground block">Expected Attendance</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-semibold text-muted-foreground line-through">{result.before.expectedAttendees}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="text-xl font-black font-display text-foreground">{result.after.expectedAttendees}</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">{result.after.attendanceRate}% turnout</span>
            </div>

            {/* Capacity / Fill Rate */}
            <div className="rounded-xl bg-card p-3 border">
              <span className="text-[11px] font-semibold text-muted-foreground block">Venue Registrations</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-semibold text-muted-foreground line-through">{result.before.registrationCount}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="text-xl font-black font-display text-foreground">{result.after.registrationCount}</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Capacity: {result.after.capacity} seats</span>
            </div>

            {/* Safety Readiness */}
            <div className="rounded-xl bg-card p-3 border">
              <span className="text-[11px] font-semibold text-muted-foreground block">Safety Readiness</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-semibold text-muted-foreground line-through">{result.before.readinessScore}%</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="text-xl font-black font-display text-foreground">{result.after.readinessScore}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Protocol checklist</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-primary" />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
