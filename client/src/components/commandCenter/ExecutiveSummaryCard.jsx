import { useState } from 'react';
import { HelpCircle, ShieldAlert, Radio, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScoreRing, scoreTone } from '../ui/ai';
import HealthFormulaModal from './HealthFormulaModal';

const STATUS_VARIANT = {
  Excellent: 'success',
  Good: 'info',
  'Needs Attention': 'warning',
  'At Risk': 'warning',
  Critical: 'destructive',
};

export default function ExecutiveSummaryCard({ overallHealth, onRefresh, isRefreshing, isLive, lastUpdated }) {
  const [showModal, setShowModal] = useState(false);

  if (!overallHealth) return null;

  const { score, status, description, confidence, isOverridden, overrideReason } = overallHealth;
  const tone = scoreTone(score);

  return (
    <>
      <Card hero className="overflow-hidden">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Health gauge + status */}
          <div className="flex items-center gap-5">
            <ScoreRing value={score} size={104} label="Health" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Event Health Index
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
                    Live pulse
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[status] || 'default'} className="text-xs">
                  {status}
                </Badge>
                {confidence != null && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Model confidence <strong className="tabular text-foreground">{confidence}%</strong>
                  </span>
                )}
              </div>
              <p className="max-w-xl text-sm font-medium leading-relaxed text-foreground/90">{description}</p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-hover"
              >
                <HelpCircle className="size-3.5" aria-hidden="true" />
                How is this calculated?
              </button>
            </div>
          </div>

          {/* Right rail: override notice + freshness */}
          <div className="flex shrink-0 flex-col gap-3 border-t pt-4 lg:min-w-[240px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {isOverridden && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-xs font-semibold leading-relaxed text-destructive">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{overrideReason || 'Score capped by safety override'}</span>
              </div>
            )}
            <div className="flex items-center gap-2 lg:justify-end">
              {lastUpdated && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  Updated{' '}
                  <time>
                    {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </span>
              )}
              <Button variant="outline" size="sm" onClick={onRefresh} loading={isRefreshing}>
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
            {!isLive && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground lg:justify-end">
                <Radio className="size-3" aria-hidden="true" />
                Reconnecting to live socket…
              </span>
            )}
          </div>
        </div>
        {/* Tone hairline — subtle semantic accent under the hero */}
        <div
          className={`h-0.5 w-full ${
            tone === 'success' ? 'bg-success/70' : tone === 'primary' ? 'bg-primary/70' : tone === 'warning' ? 'bg-warning/70' : 'bg-destructive/70'
          }`}
          aria-hidden="true"
        />
      </Card>

      <HealthFormulaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        overallHealth={overallHealth}
      />
    </>
  );
}
