import { useState } from 'react';
import { Sparkles, HelpCircle, RefreshCw, ShieldAlert, Radio, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import HealthFormulaModal from './HealthFormulaModal';
import { cn } from '../../lib/utils';

export default function ExecutiveSummaryCard({ overallHealth, onRefresh, isRefreshing, isLive, lastUpdated }) {
  const [showModal, setShowModal] = useState(false);

  if (!overallHealth) return null;

  const { score, status, description, confidence, isOverridden, overrideReason } = overallHealth;

  const getStatusColor = (s) => {
    switch (s) {
      case 'Excellent':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Good':
        return 'text-teal-500 bg-teal-500/10 border-teal-500/20';
      case 'Needs Attention':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'At Risk':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Critical':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      default:
        return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Health Gauge & Score */}
          <div className="flex items-center gap-5">
            <div className="relative flex size-24 shrink-0 items-center justify-center rounded-2xl border bg-secondary/30 p-2 shadow-inner">
              <div className="text-center">
                <span className="text-3xl font-black font-display tracking-tight text-foreground block leading-none">
                  {score}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mt-1">
                  / 100
                </span>
              </div>
              {/* Circular border pulse */}
              <div
                className={cn(
                  'absolute inset-0 rounded-2xl border-2 pointer-events-none opacity-40',
                  score >= 80 ? 'border-emerald-500' : score >= 60 ? 'border-teal-500' : score >= 45 ? 'border-amber-500' : 'border-destructive'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Event Health Index
                </span>
                <Badge variant={status === 'Excellent' ? 'success' : status === 'Good' ? 'default' : status === 'Needs Attention' ? 'warning' : 'destructive'} className="font-bold">
                  {status}
                </Badge>
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Pulse
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-foreground leading-snug max-w-xl">
                {description}
              </h2>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  Model Confidence: <strong className="text-foreground">{confidence != null ? `${confidence}%` : 'N/A'}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <HelpCircle className="size-3.5" />
                  How is this calculated?
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions & Metadata */}
          <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
            {isOverridden && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20 max-w-xs">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{overrideReason || 'Score capped by safety override'}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border bg-secondary/80 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition disabled:opacity-50"
              >
                <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Modal */}
      <HealthFormulaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        overallHealth={overallHealth}
      />
    </>
  );
}
