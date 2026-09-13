import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';

export default function HealthFormulaModal({ isOpen, onClose, overallHealth }) {
  if (!overallHealth) return null;

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
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Event Health Score Formula"
      description="Transparent, deterministic composite calculation across 6 operational dimensions."
      size="lg"
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      {/* Current Score Pill */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-secondary/40 p-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Event Health</span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tabular text-foreground">{score}</span>
            <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
            <Badge variant={status === 'Excellent' ? 'success' : status === 'Good' ? 'info' : status === 'Needs Attention' ? 'warning' : 'destructive'}>
              {status}
            </Badge>
          </div>
        </div>
        {isOverridden && (
          <div className="flex max-w-xs items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>{overrideReason || 'Score capped due to critical hazard'}</span>
          </div>
        )}
      </div>

      {/* Mathematical Equation */}
      <div className="mt-5 space-y-1.5 rounded-xl border bg-muted/30 p-3.5 text-xs">
        <p className="font-bold text-foreground">Mathematical Equation</p>
        <code className="block rounded-lg border bg-background p-2 font-mono text-[11px] leading-relaxed text-primary">
          {formula?.equation || 'Health = (Attendance × 0.25) + (Safety × 0.20) + (Registration × 0.20) + (Queue × 0.15) + (SEO × 0.10) + (Trust × 0.10)'}
        </code>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {formula?.explanation || 'Component scores are bounded in [0, 100], multiplied by their category weights, and summed integer-rounded.'}
        </p>
      </div>

      {/* Component Contributions Grid */}
      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Component Contributions</h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {components.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">Weight: {c.weight}</p>
              </div>
              <div className="text-right">
                <span className="font-display text-sm font-bold tabular">{c.data?.score ?? 70}</span>
                <span className="block text-[10px] tabular text-muted-foreground">+{c.data?.weightedScore ?? 15} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Safety Override Rule explanation */}
      <div className="mt-5 space-y-1 rounded-xl border border-warning/25 bg-warning/[0.06] p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-warning">
          <ShieldAlert className="size-4" aria-hidden="true" />
          <span>Safety Override Matrix</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          To guarantee attendee physical safety, if EventShield detects an active critical safety violation (e.g. fire hazard, severe overcrowding &gt;110%), the overall health score is automatically capped at &le; 45 (&quot;At Risk&quot; or &quot;Critical&quot;), regardless of attendance pacing.
        </p>
      </div>

      {/* Positive & Negative Drivers */}
      <div className="mt-5 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>Positive Contributors (+)</span>
          </div>
          {drivers.positive && drivers.positive.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {drivers.positive.map((d, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-bold text-success" aria-hidden="true">•</span>
                  <span><strong className="text-foreground">{d.area}:</strong> {d.factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-muted-foreground">No primary positive bonuses registered yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <span>Negative Detractors (-)</span>
          </div>
          {drivers.negative && drivers.negative.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {drivers.negative.map((d, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-bold text-warning" aria-hidden="true">•</span>
                  <span><strong className="text-foreground">{d.area}:</strong> {d.factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-muted-foreground">No negative detractors penalizing score.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
