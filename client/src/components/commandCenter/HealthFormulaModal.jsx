import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function HealthFormulaModal({ isOpen, onClose, overallHealth }) {
  if (!isOpen || !overallHealth) return null;

  const { score, status, breakdown = {}, drivers = {}, isOverridden, overrideReason, formula } = overallHealth;

  const components = [
    { key: 'attendance', name: 'Attendance & Turnout', weight: '25%', data: breakdown.attendance },
    { key: 'safety', name: 'Safety & Risk Management', weight: '20%', data: breakdown.safety },
    { key: 'registration', name: 'Registration Velocity', weight: '20%', data: breakdown.registration },
    { key: 'queue', name: 'Queue & Waitlist Health', weight: '15%', data: breakdown.queue },
    { key: 'content', name: 'SEO & Content Quality', weight: '10%', data: breakdown.content },
    { key: 'trust', name: 'Organizer Trust Profile', weight: '10%', data: breakdown.trust },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto card-surface p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <HelpCircle className="size-4" />
              </span>
              <h3 className="font-display text-lg font-bold">Event Health Score Formula</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transparent, deterministic composite calculation across 6 operational dimensions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            aria-label="Close formula modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Current Score Pill */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Event Health</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-display text-foreground">{score}</span>
              <span className="text-xs text-muted-foreground font-semibold">/ 100</span>
              <Badge variant={status === 'Excellent' ? 'success' : status === 'Good' ? 'default' : status === 'Needs Attention' ? 'warning' : 'destructive'} className="ml-2">
                {status}
              </Badge>
            </div>
          </div>
          {isOverridden && (
            <div className="flex items-center gap-2 text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20 max-w-xs">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{overrideReason || 'Score capped due to critical hazard'}</span>
            </div>
          )}
        </div>

        {/* Mathematical Equation */}
        <div className="rounded-xl border bg-muted/30 p-3.5 text-xs space-y-1.5">
          <p className="font-bold text-foreground">Mathematical Equation:</p>
          <code className="block rounded bg-background p-2 font-mono text-[11px] text-primary border">
            {formula?.equation || 'Health = (Attendance × 0.25) + (Safety × 0.20) + (Registration × 0.20) + (Queue × 0.15) + (SEO × 0.10) + (Trust × 0.10)'}
          </code>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {formula?.explanation || 'Component scores are bounded in [0, 100], multiplied by their category weights, and summed integer-rounded.'}
          </p>
        </div>

        {/* Component Contributions Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Component Contributions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {components.map((c) => (
              <div key={c.key} className="rounded-xl border bg-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">Weight: {c.weight}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-display">{c.data?.score ?? 70}</span>
                  <span className="text-[10px] text-muted-foreground block">+{c.data?.weightedScore ?? 15} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Safety Override Rule explanation */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-600 dark:text-amber-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="size-4" />
            <span>Safety Override Matrix:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            To guarantee attendee physical safety, if EventShield detects an active critical safety violation (e.g. fire hazard, severe overcrowding &gt;110%), the overall health score is automatically capped at &le; 45 ("At Risk" or "Critical"), regardless of attendance pacing.
          </p>
        </div>

        {/* Positive & Negative Drivers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          {/* Positive */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Positive Contributors (+)</span>
            </div>
            {drivers.positive && drivers.positive.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {drivers.positive.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong className="text-foreground">{d.area}:</strong> {d.factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No primary positive bonuses registered yet.</p>
            )}
          </div>

          {/* Negative */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              <span>Negative Detractors (-)</span>
            </div>
            {drivers.negative && drivers.negative.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {drivers.negative.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span><strong className="text-foreground">{d.area}:</strong> {d.factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No negative detractors penalizing score.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
