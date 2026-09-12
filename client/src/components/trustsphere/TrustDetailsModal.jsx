import { Fragment } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Info, X, TrendingUp,
  Award, Sparkles, UserCheck, CalendarCheck, HelpCircle, Shield,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

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
      color: 'bg-emerald-500',
    },
    {
      key: 'satisfaction',
      title: 'Attendee Satisfaction & Feedback',
      weight: '25%',
      score: components.satisfaction ?? 75,
      description: 'Bayesian smoothed satisfaction from verified attendee post-event ratings and reviews.',
      metricText: `${metrics.averageRating || 0}★ avg (${metrics.totalFeedbackCount || 0} reviews, ${metrics.satisfactionPercentage || 0}% positive)`,
      color: 'bg-blue-500',
    },
    {
      key: 'attendance',
      title: 'Registration Fulfillment & Check-In',
      weight: '15%',
      score: components.attendance ?? 75,
      description: 'Measures how many registered attendees physically or virtually attend verified events.',
      metricText: `${metrics.attendeesServed || 0} attendees checked in (${metrics.attendanceRate || 75}% attendance rate)`,
      color: 'bg-violet-500',
    },
    {
      key: 'compliance',
      title: 'Platform Compliance & Safety',
      weight: '15%',
      score: components.compliance ?? 100,
      description: 'Deductions apply only when moderators uphold verified policy violations or safety issues.',
      metricText: `${metrics.confirmedViolationsCount || 0} confirmed violation(s)`,
      color: components.compliance < 80 ? 'bg-amber-500' : 'bg-emerald-500',
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
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">TrustSphere Transparency & Breakdown</h3>
              <p className="text-xs text-muted-foreground">Deterministic, Anti-Gaming Organizer Reputation Methodology</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Transparency Guarantee Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200 flex gap-3">
            <Shield className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold text-sm block mb-1">100% Verified Platform Activity Guarantee</span>
              TrustSphere scores cannot be purchased, sponsored, or artificially boosted. All calculations are strictly derived from verified event outcomes, validated ticket check-ins, authentic attendee reviews, and platform moderation records.
            </div>
          </div>

          {/* Cold-Start Notice if applicable */}
          {profile.confidenceLevel === 'limited' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200 flex gap-3">
              <Info className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
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
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-950 dark:text-emerald-200">{f.label}</p>
                      <p className="text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </div>
                ))}
                {negativeFactors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-950 dark:text-rose-200">{f.label}</p>
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
                        <span className={`text-[11px] font-bold ${snap.scoreDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {snap.scoreDelta > 0 ? `+${snap.scoreDelta}` : snap.scoreDelta}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Calculated: {profile.lastCalculatedAt ? new Date(profile.lastCalculatedAt).toLocaleString() : 'Just now'}
          </span>
          <Button variant="default" size="sm" onClick={onClose}>
            Close Breakdown
          </Button>
        </div>
      </div>
    </div>
  );
}
