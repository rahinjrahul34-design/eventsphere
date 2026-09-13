import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, RefreshCw, Sparkles, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import OrganizerTrustCard from '../../../components/trustsphere/OrganizerTrustCard';
import TrustSimulator from '../../../components/trustsphere/TrustSimulator';
import { ErrorState } from '../../../components/ui/misc';
import { StatsSkeleton } from '../../../components/ui/skeleton';

export default function TrustTab() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'simulator' | 'history'

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-trust-profile'],
    queryFn: () => endpoints.trust.getMyTrust(),
    staleTime: 60 * 1000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['my-trust-history', profile?.organizer?._id],
    queryFn: () => endpoints.trust.getOrganizerHistory(profile?.organizer?._id, 20),
    enabled: !!profile?.organizer?._id,
  });

  const recalculateMutation = useMutation({
    mutationFn: () => endpoints.trust.recalculate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trust-profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-trust-history'] });
    },
  });

  const refreshAiMutation = useMutation({
    mutationFn: () => endpoints.trust.getMyAiInsights(true),
    onSuccess: (newInsights) => {
      queryClient.setQueryData(['my-trust-profile'], (old) => {
        if (!old) return old;
        return { ...old, aiInsights: newInsights };
      });
    },
  });

  if (isLoading) return <div className="space-y-6"><div className="skeleton h-28 rounded-xl" /><StatsSkeleton count={3} /></div>;
  if (isError) return <ErrorState message={error?.message || 'Failed to load trust profile'} onRetry={refetch} />;

  const metrics = profile.metrics || {};
  const aiInsights = profile.aiInsights || {};
  const factors = profile.factors || [];
  const positiveFactors = factors.filter((f) => f.impact === 'positive');
  const negativeFactors = factors.filter((f) => f.impact === 'negative');

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="font-display text-2xl font-extrabold">TrustSphere Command Center</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Deterministic, anti-gaming reputation score evaluated across 100% verified platform activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
            {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Score'}
          </Button>
        </div>
      </div>

      {/* Main Trust Card Display */}
      <OrganizerTrustCard profile={profile} showBreakdown={true} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition ${
            activeSubTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          AI Advisor & Factors
        </button>
        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition ${
            activeSubTab === 'simulator'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          What-If Simulator
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition ${
            activeSubTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Audit History & Snapshots
        </button>
      </div>

      {/* Overview Subtab: AI Advisor + Attribution Factors */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* AI Advisor Card */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary animate-pulse" />
                <h3 className="font-display text-base font-bold">AI Reputation Advisor</h3>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  GEMINI GROUNDED
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshAiMutation.mutate()}
                disabled={refreshAiMutation.isPending}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`size-3 ${refreshAiMutation.isPending ? 'animate-spin' : ''}`} />
                {refreshAiMutation.isPending ? 'Analyzing...' : 'Refresh AI'}
              </Button>
            </div>

            {/* Executive Summary */}
            <p className="text-sm leading-relaxed text-foreground font-medium">
              {aiInsights.summary || 'Organizer maintains an active hosting profile. Continued event completion will build established trust stature.'}
            </p>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 rounded-xl bg-card border border-border p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-success dark:text-success flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> Key Verified Strengths
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {(aiInsights.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                  {(!aiInsights.strengths || aiInsights.strengths.length === 0) && (
                    <li className="italic text-muted-foreground">Host more events to develop verified platform strengths.</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2 rounded-xl bg-card border border-border p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-warning dark:text-warning flex items-center gap-1.5">
                  <AlertTriangle className="size-4" /> Growth Opportunities & Risks
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {(aiInsights.weaknesses || []).map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-warning shrink-0 mt-1.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                  {(!aiInsights.weaknesses || aiInsights.weaknesses.length === 0) && (
                    <li className="text-success dark:text-success font-medium">
                      No significant reputation risks or negative signals detected.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Actionable Recommendations */}
            {(aiInsights.recommendations || []).length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Lightbulb className="size-4 text-warning" /> Actionable Reputation Growth Plan
                </h4>
                <div className="grid gap-2.5">
                  {aiInsights.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5 text-xs">
                      <div>
                        <p className="font-bold text-foreground">{rec.title}</p>
                        <p className="text-muted-foreground mt-0.5">{rec.description}</p>
                      </div>
                      <Badge
                        variant={rec.impact === 'high' ? 'success' : 'secondary'}
                        className="text-[10px] font-bold uppercase shrink-0"
                      >
                        {rec.impact} impact
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Factor Attributions Breakdown */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-base font-bold">Scoring Factor Attributions</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {positiveFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 p-3.5 text-xs">
                  <CheckCircle2 className="size-4 shrink-0 text-success dark:text-success mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-success">{f.label}</p>
                      {f.value && <span className="font-mono text-[11px] text-muted-foreground">({f.value})</span>}
                    </div>
                    <p className="text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                </div>
              ))}
              {negativeFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs">
                  <AlertTriangle className="size-4 shrink-0 text-destructive dark:text-destructive mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-destructive">{f.label}</p>
                      {f.value && <span className="font-mono text-[11px] text-muted-foreground">({f.value})</span>}
                    </div>
                    <p className="text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Subtab */}
      {activeSubTab === 'simulator' && (
        <TrustSimulator currentProfile={profile} />
      )}

      {/* History Subtab */}
      {activeSubTab === 'history' && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-bold">TrustScore Evolution Timeline</h3>
              <p className="text-xs text-muted-foreground">Historical recalculations and milestone audit snapshots</p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{history.length} snapshots</span>
          </div>

          <div className="space-y-2">
            {history.map((snap, i) => (
              <div key={snap._id || i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3.5 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{snap.changeReason || snap.trigger}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {snap.trigger}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    {new Date(snap.calculatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono text-base font-extrabold text-foreground">{snap.score}/100</span>
                    <span className="block text-[10px] text-muted-foreground capitalize">
                      {snap.trustLevel?.replace('_', ' ')}
                    </span>
                  </div>

                  {snap.scoreDelta !== 0 && (
                    <Badge
                      variant={snap.scoreDelta > 0 ? 'success' : 'destructive'}
                      className="font-mono text-xs font-bold"
                    >
                      {snap.scoreDelta > 0 ? `+${snap.scoreDelta}` : snap.scoreDelta}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <p className="text-center py-8 text-xs text-muted-foreground">
                No historical snapshots logged yet. Recalculate your score or complete events to establish an audit trail.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
