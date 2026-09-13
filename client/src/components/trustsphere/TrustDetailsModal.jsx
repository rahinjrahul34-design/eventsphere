import { CheckCircle2, AlertTriangle, Info, TrendingUp, Shield } from 'lucide-react';
import { Dialog } from '../ui/dialog';

export default function TrustDetailsModal({ open, onClose, profile, history = [] }) {
  if (!open || !profile) return null;

  const components = profile.components || {};
  const metrics = profile.metrics || {};
  const weights = profile.weights || {
    completion: 0.25,
    satisfaction: 0.25,
    attendance: 0.15,
    compliance: 0.15,
    verification: 0.10,
    experience: 0.10,
  };
  const factors = profile.factors || [];
  const positiveFactors = factors.filter((f) => f.impact === 'positive');
  const negativeFactors = factors.filter((f) => f.impact === 'negative');

  const componentList = [
    {
      key: 'completion',
      title: 'Event Completion & Reliability',
      weight: '25%',
      score: components.completion ?? 70,
      description: 'Tracks successfully hosted events against cancellations or unexpected terminations.',
      metricText: `${metrics.completedEvents || 0} completed / ${metrics.cancelledEvents || 0} cancelled (${metrics.completionRate || 0}% rate)`,
      color: 'bg-success',
    },
    {
      key: 'satisfaction',
      title: 'Attendee Satisfaction & Feedback',
      weight: '25%',
      score: components.satisfaction ?? 75,
      description: 'Bayesian smoothed satisfaction from verified attendee post-event ratings and reviews.',
      metricText: `${metrics.averageRating || 0}★ avg (${metrics.totalFeedbackCount || 0} reviews, ${metrics.satisfactionPercentage || 0}% positive)`,
      color: 'bg-info',
    },
    {
      key: 'attendance',
      title: 'Registration Fulfillment & Check-In',
      weight: '15%',
      score: components.attendance ?? 75,
      description: 'Measures how many registered attendees physically or virtually attend verified events.',
      metricText: `${metrics.attendeesServed || 0} attendees checked in (${metrics.attendanceRate || 75}% attendance rate)`,
      color: 'bg-primary',
    },
    {
      key: 'compliance',
      title: 'Platform Compliance & Safety',
      weight: '15%',
      score: components.compliance ?? 100,
      description: 'Deductions apply only when moderators uphold verified policy violations or safety issues.',
      metricText: `${metrics.confirmedViolationsCount || 0} confirmed violation(s)`,
      color: components.compliance < 80 ? 'bg-warning' : 'bg-success',
    },
    {
      key: 'verification',
      title: 'Host Verification & Credentials',
      weight: '10%',
      score: components.verification ?? 25,
      description: 'Evaluates official ID, email, phone verification, and administrative organizer vetting.',
      metricText: profile.verified ? 'Verified Platform Host' : 'Standard Organizer Account',
      color: 'bg-cyan-500',
    },
    {
      key: 'experience',
      title: 'Experience & Platform Longevity',
      weight: '10%',
      score: components.experience ?? 30,
      description: 'Considers hosting volume, community footprint, and sustained activity over time.',
      metricText: `${metrics.completedEvents || 0} total events, ${metrics.attendeesServed || 0} total attendees`,
      color: 'bg-primary',
    },
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      title="TrustSphere Transparency & Breakdown"
      description="Deterministic, anti-gaming organizer reputation methodology."
      size="xl"
    >
      <div className="space-y-6">
          {/* Transparency Guarantee Card */}
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-xs leading-relaxed text-success flex gap-3">
            <Shield className="size-5 shrink-0 text-success dark:text-success mt-0.5" />
            <div>
              <span className="font-bold text-sm block mb-1">100% Verified Platform Activity Guarantee</span>
              TrustSphere scores cannot be purchased, sponsored, or artificially boosted. All calculations are strictly derived from verified event outcomes, validated ticket check-ins, authentic attendee reviews, and platform moderation records.
            </div>
          </div>

          {/* Cold-Start Notice if applicable */}
          {profile.confidenceLevel === 'limited' && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning flex gap-3">
              <Info className="size-5 shrink-0 text-warning dark:text-warning mt-0.5" />
              <div>
                <span className="font-bold text-sm block mb-1">Building Trust History (Cold-Start Stage)</span>
                This host has hosted fewer than 2 completed events or fewer than 15 attendees. Neutral baselines are used to avoid unfairly penalizing new hosts while protecting attendee safety.
              </div>
            </div>
          )}

          {/* Component Scoring Breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Six Verified Scoring Components</span>
              <span className="text-xs font-normal lowercase">Weighted formula (total 100%)</span>
            </h4>

            <div className="grid gap-3">
              {componentList.map((c) => (
                <div key={c.key} className="rounded-xl border border-border/80 bg-background/60 p-4 transition hover:border-primary/30">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{c.title}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Weight: {c.weight}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-extrabold text-foreground">{c.score}</span>
                      <span className="text-xs text-muted-foreground"> / 100</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${c.color}`}
                      style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{c.description}</span>
                    <span className="font-medium text-foreground">{c.metricText}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Positive and Negative Factor Attributions */}
          {factors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Key Attribution Factors</h4>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {positiveFactors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/5 p-3 text-xs">
                    <CheckCircle2 className="size-4 shrink-0 text-success dark:text-success mt-0.5" />
                    <div>
                      <p className="font-semibold text-success">{f.label}</p>
                      <p className="text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </div>
                ))}
                {negativeFactors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-destructive dark:text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">{f.label}</p>
                      <p className="text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Evolution Snapshots if provided */}
          {history.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-4" />
                <span>Score Trajectory History</span>
              </h4>
              <div className="rounded-xl border border-border bg-background p-3 space-y-2 text-xs">
                {history.slice(-5).map((snap, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="font-semibold">{snap.changeReason || snap.trigger}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">
                        {new Date(snap.calculatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{snap.score}/100</span>
                      {snap.scoreDelta !== 0 && (
                        <span className={`text-[11px] font-bold ${snap.scoreDelta > 0 ? 'text-success' : 'text-destructive'}`}>
                          {snap.scoreDelta > 0 ? `+${snap.scoreDelta}` : snap.scoreDelta}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <p className="border-t pt-3 text-[11px] text-muted-foreground">
          Calculated {profile.lastCalculatedAt ? new Date(profile.lastCalculatedAt).toLocaleString() : 'just now'}
        </p>
      </div>
    </Dialog>
  );
}
