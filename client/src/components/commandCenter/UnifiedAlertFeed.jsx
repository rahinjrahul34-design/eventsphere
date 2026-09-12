import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertOctagon, AlertTriangle, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export default function UnifiedAlertFeed({ alerts = [] }) {
  const [sevFilter, setSevFilter] = useState('ALL');

  const filtered = alerts.filter((a) => {
    if (sevFilter === 'ALL') return true;
    if (sevFilter === 'CRITICAL') return a.severity === 'critical';
    if (sevFilter === 'WARNING') return a.severity === 'high' || a.severity === 'medium';
    return a.severity === 'low';
  });

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-secondary text-foreground">
            <Bell className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Unified Alert Stream</h3>
            <p className="text-xs text-muted-foreground">Aggregated operational notifications across connected intelligence engines.</p>
          </div>
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border text-xs">
          {['ALL', 'CRITICAL', 'WARNING'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSevFilter(s)}
              className={cn(
                'px-2.5 py-1 font-bold rounded-lg transition',
                sevFilter === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 px-4 text-center space-y-1.5">
          <ShieldCheck className="size-6 text-emerald-500 mx-auto" />
          <p className="text-xs font-semibold text-foreground">Operational Clear</p>
          <p className="text-xs text-muted-foreground">Zero active alerts matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'rounded-xl border p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                alert.severity === 'critical' ? 'bg-destructive/5 border-destructive/30' : 'bg-secondary/20'
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-lg mt-0.5',
                  alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
                )}>
                  {alert.severity === 'critical' ? <AlertOctagon className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {alert.sourceName || alert.source}
                    </span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'} className="text-[9px] py-0 px-1.5 font-bold">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {alert.message}
                  </p>
                </div>
              </div>

              {alert.link && (
                <Link
                  to={alert.link}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0 self-end sm:self-center"
                >
                  <span>Investigate</span>
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
