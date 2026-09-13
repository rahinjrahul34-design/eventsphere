import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, Users, TrendingUp, CheckCircle2, ExternalLink, BarChart3, AlertOctagon, History } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { ErrorState } from '../../components/ui/misc';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { StatsSkeleton, ChartSkeleton } from '../../components/ui/skeleton';

export default function AdminTrustAnalytics() {
  const { data: analytics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-trust-analytics'],
    queryFn: () => endpoints.trust.getAdminAnalytics(),
    staleTime: 30 * 1000,
  });

  if (isLoading) return <div className="space-y-6"><StatsSkeleton count={4} /><ChartSkeleton /></div>;
  if (isError) return <ErrorState message={error?.message || 'Failed to load trust analytics'} onRetry={refetch} />;

  const distribution = analytics.distribution || {};
  const flagged = analytics.flaggedOrganizers || [];
  const snapshots = analytics.recentSnapshots || [];

  const tierColors = {
    excellent: 'bg-success',
    very_good: 'bg-info',
    good: 'bg-primary',
    fair: 'bg-warning',
    needs_improvement: 'bg-warning',
    low_trust: 'bg-destructive',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="size-7 text-primary" />
            <span>TrustSphere Platform Intelligence</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform-wide organizer reputation monitoring, risk alerts, and audit snapshot trail.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          Refresh Analytics
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-soft">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Evaluated Organizers</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-foreground">
            {analytics.totalProfiles || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Active hosting profiles scored</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-soft">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Platform Average Score</span>
            <TrendingUp className="size-4 text-success" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-foreground">
            {analytics.platformAvgTrustScore || 0}
            <span className="text-sm font-normal text-muted-foreground"> / 100</span>
          </p>
          <p className="text-[11px] text-success dark:text-success font-semibold">
            Standard platform benchmark
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-soft">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Verified Organizers</span>
            <CheckCircle2 className="size-4 text-info" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-foreground">
            {analytics.verifiedPercentage || 0}%
          </p>
          <p className="text-[11px] text-muted-foreground">
            {analytics.verifiedCount || 0} verified accounts
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-soft">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Flagged / At-Risk</span>
            <AlertOctagon className="size-4 text-destructive" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-destructive">
            {flagged.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Below 60 or confirmed reports</p>
        </div>
      </div>

      {/* Trust Level Distribution */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-soft">
        <h3 className="font-display text-base font-bold flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <span>Trust Score Distribution Across Organizers</span>
        </h3>

        <div className="space-y-3">
          {Object.entries(distribution).map(([tierKey, count]) => {
            const percentage = analytics.totalProfiles > 0 ? Math.round((count / analytics.totalProfiles) * 100) : 0;
            const barColor = tierColors[tierKey] || 'bg-primary';

            return (
              <div key={tierKey} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold capitalize">
                  <span>{tierKey.replace('_', ' ')}</span>
                  <span>{count} ({percentage}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagged / At-Risk Organizers Radar */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-destructive dark:text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4" />
              <span>Flagged & At-Risk Organizers Radar</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Accounts with low trust scores, high cancellation rates, or confirmed policy violations.
            </p>
          </div>
          <Badge variant="destructive" className="font-mono text-xs">{flagged.length} Flagged</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Organizer</th>
                <th className="py-2.5 px-3">Trust Score</th>
                <th className="py-2.5 px-3">Completion</th>
                <th className="py-2.5 px-3">Violations</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {flagged.map((org) => (
                <tr key={org._id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-3">
                    <p className="font-bold text-foreground">{org.organizer?.name || 'Unknown'}</p>
                    <p className="text-[11px] text-muted-foreground">{org.organizer?.email || org.organizer?.company || ''}</p>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={org.trustScore < 40 ? 'destructive' : 'warning'} className="font-mono font-bold">
                      {org.trustScore}/100
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold">{org.completionRate}%</span>
                    <span className="text-muted-foreground text-[11px] ml-1">({org.cancellationRate}% cancel)</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-destructive">
                    {org.confirmedViolationsCount}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {org.organizer?._id && (
                      <Link
                        to={`/organizers/${org.organizer._id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        Inspect <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}

              {flagged.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted-foreground">
                    No flagged or at-risk organizers found. The platform reputation health is pristine.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trust Recalculation Audit Trail */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-soft">
        <h3 className="font-display text-base font-bold flex items-center gap-2">
          <History className="size-4 text-primary" />
          <span>Recent TrustSnapshots Recalculation Log</span>
        </h3>

        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div key={snap._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 p-3 text-xs">
              <div>
                <span className="font-bold text-foreground">{snap.organizer?.name || 'Organizer'}</span>
                <span className="text-muted-foreground ml-2 text-[11px]">{snap.changeReason || snap.trigger}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{snap.score}/100</span>
                {snap.scoreDelta !== 0 && (
                  <Badge variant={snap.scoreDelta > 0 ? 'success' : 'destructive'} className="text-[10px] font-mono">
                    {snap.scoreDelta > 0 ? `+${snap.scoreDelta}` : snap.scoreDelta}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(snap.calculatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
