import { useEffect, useRef, useState } from 'react';
import { Sliders, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { scoreToneClass, riskBadgeVariant, riskLabel } from './shieldUtils';

function SliderField({ label, value, unit, min, max, step, onChange }) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="font-mono text-primary">{value} {unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={label}
      />
    </label>
  );
}

export default function WhatIfSimulator({ eventId, event, initial }) {
  const [params, setParams] = useState(initial);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const run = async (next) => {
    setLoading(true);
    try {
      const res = await endpoints.eventShield.simulate(eventId, next);
      setResult(res);
    } catch (e) {
      toast.error(e.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const schedule = (next) => {
    setParams(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(next), 320);
  };

  useEffect(() => {
    run(params);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const patch = (key, value) => schedule({ ...params, [key]: value });

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="size-5 text-primary" />
              What-If simulator
            </CardTitle>
            <CardDescription className="text-xs">
              In-memory deterministic recalculation only. Slider moves do not call the AI model and never write to the event.
            </CardDescription>
          </div>
          <Badge variant="warning" className="font-bold">
            <FlaskConical className="size-3.5" /> Simulation
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SliderField label="Venue capacity" unit="seats" min={10} max={5000} step={10} value={params.capacity} onChange={(v) => patch('capacity', v)} />
          <SliderField label="Expected attendees" unit="ppl" min={0} max={5000} step={10} value={params.registrations} onChange={(v) => patch('registrations', v)} />
          <SliderField label="Entry points" unit="gates" min={1} max={20} step={1} value={params.entryGates} onChange={(v) => patch('entryGates', v)} />
          <SliderField label="Check-in counters" unit="desks" min={1} max={30} step={1} value={params.checkInDesks} onChange={(v) => patch('checkInDesks', v)} />
          <SliderField label="Volunteers / staff" unit="staff" min={0} max={100} step={1} value={params.staffCount} onChange={(v) => patch('staffCount', v)} />
          <SliderField label="Parking bays" unit="spots" min={0} max={2000} step={20} value={params.parkingCapacity} onChange={(v) => patch('parkingCapacity', v)} />
        </div>

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['hasEmergencyContact', 'Emergency contact'],
            ['hasFirstAid', 'First-aid station'],
            ['hasAccessibility', 'Ramp & seating'],
            ['isOutdoor', 'Outdoor venue'],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={Boolean(params[key])}
                onChange={(e) => patch(key, e.target.checked)}
                className="rounded text-primary"
              />
              {label}
            </label>
          ))}
        </div>

        {result && (
          <div className="space-y-4 rounded-2xl border bg-muted/20 p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Current plan vs simulated plan {loading ? '· updating…' : ''}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Current plan</p>
                <p className="mt-1 font-display text-3xl font-black">{result.baselineSafetyScore}<span className="text-sm font-semibold text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground">Readiness {result.baselineReadinessScore}%</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-card p-4">
                <p className="text-[11px] font-bold uppercase text-primary">Simulated plan</p>
                <p className={`mt-1 font-display text-3xl font-black ${scoreToneClass(result.simulatedSafetyScore)}`}>
                  {result.simulatedSafetyScore}<span className="text-sm font-semibold text-muted-foreground">/100</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={result.deltaSafety >= 0 ? 'success' : 'destructive'} className="font-bold">
                    {result.deltaSafety > 0 ? '+' : ''}{result.deltaSafety} safety
                  </Badge>
                  <Badge variant={riskBadgeVariant(result.simulatedRiskLevel)}>{riskLabel(result.simulatedRiskLevel)}</Badge>
                </div>
              </div>
            </div>
            {result.recommendations?.map((rec, i) => (
              <p key={i} className="text-xs font-medium">{rec}</p>
            ))}
            {result.categoryDeltas?.some((d) => d.delta !== 0) && (
              <ul className="grid gap-1 text-[11px] sm:grid-cols-2">
                {result.categoryDeltas.filter((d) => d.delta !== 0).map((d) => (
                  <li key={d.id} className="flex justify-between rounded-lg border bg-card px-2 py-1">
                    <span>{d.name}</span>
                    <span className={d.delta > 0 ? 'font-bold text-emerald-500' : 'font-bold text-rose-500'}>
                      {d.baselineScore} → {d.simulatedScore}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground">
              Simulation — results use deterministic models and should be treated as guidance, not guaranteed outcomes.
              Event “{event?.title}” is unchanged.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
