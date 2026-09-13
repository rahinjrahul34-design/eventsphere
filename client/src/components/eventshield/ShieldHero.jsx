import { ShieldAlert, RefreshCw, Printer, Settings2, Activity, Radio } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ScoreGauge from './ScoreGauge';
import { riskBadgeVariant, riskLabel } from './shieldUtils';

export default function ShieldHero({
  assessment,
  event,
  activeAlertCount = 0,
  analyzing,
  onAnalyze,
  onOpenConfig,
  onOpenReport,
}) {
  const live = event?.status === 'live';

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/12 via-card to-primary/8 p-5 sm:p-7 shadow-soft">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl gradient-brand text-white shadow-soft">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">EventShield AI</h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Safety &amp; operations intelligence · hybrid rule engine + AI reasoning
              </p>
            </div>
            {live && (
              <Badge variant="live" className="ml-1">
                <Radio className="size-3" /> LIVE
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border bg-card/70 px-2.5 py-1 font-medium">
              <Activity className="size-3.5 text-primary" />
              Engine <strong className="text-foreground">{assessment.engine || 'hybrid'}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-card/70 px-2.5 py-1">
              v{assessment.version || 1}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-card/70 px-2.5 py-1">
              Analyzed {new Date(assessment.analyzedAt || Date.now()).toLocaleString()}
            </span>
            <Badge variant={riskBadgeVariant(assessment.overallRiskLevel)}>
              {riskLabel(assessment.overallRiskLevel)}
            </Badge>
            <Badge variant={activeAlertCount ? 'destructive' : 'success'}>
              {activeAlertCount} active alert{activeAlertCount === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onOpenConfig} className="font-bold">
              <Settings2 className="size-4" /> Safety settings
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenReport} className="font-bold">
              <Printer className="size-4" /> Safety report
            </Button>
            <Button
              size="sm"
              onClick={onAnalyze}
              disabled={analyzing}
              className="font-bold"
            >
              <RefreshCw className={`size-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing…' : 'Run AI analysis'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <ScoreGauge value={assessment.safetyScore} label="Safety" />
          <ScoreGauge value={assessment.readinessScore} label="Readiness" suffix="%" />
        </div>
      </div>
    </section>
  );
}
