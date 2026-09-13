import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendChart } from '../charts/Charts';
import { riskBadgeVariant, riskLabel } from './shieldUtils';

export default function RiskHistory({ history = [] }) {
  const rows = [...history].slice(-8).reverse();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk history</CardTitle>
        <CardDescription className="text-xs">What improved (or worsened) after each analysis snapshot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {history.length > 1 ? (
          <TrendChart
            data={history.map((h) => ({
              date: new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              safety: h.safetyScore,
              readiness: h.readinessScore,
            }))}
            xKey="date"
            lines={[
              { key: 'safety', label: 'Safety Score (0–100)', color: '#10b981' },
              { key: 'readiness', label: 'Readiness (%)', color: '#38b0f0' },
            ]}
            height={260}
          />
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Baseline recorded. Re-run analysis after fixing issues to plot the trend.
          </p>
        )}
        <div className="space-y-2 border-t pt-4">
          {rows.map((h) => (
            <div key={h._id} className="flex items-center justify-between rounded-lg border bg-card/60 p-3 text-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">Safety {h.safetyScore}/100</span>
                  <span className="text-muted-foreground">Readiness {h.readinessScore}%</span>
                  <Badge variant={riskBadgeVariant(h.overallRiskLevel)}>{riskLabel(h.overallRiskLevel)}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {h.improvements?.[0] || `Trigger: ${h.trigger}`} · {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              {h.delta !== 0 && (
                <Badge variant={h.delta > 0 ? 'success' : 'destructive'} className="font-bold">
                  {h.delta > 0 ? `+${h.delta}` : h.delta}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
