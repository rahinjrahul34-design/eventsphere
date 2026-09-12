import { AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export default function AlertsStrip({ alerts = [], onResolve, pending }) {
  if (!alerts.length) return null;
  return (
    <section className="space-y-2" aria-live="polite">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-rose-500">
        <AlertTriangle className="size-4" /> Live operational alerts ({alerts.length})
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.map((alert) => (
          <div key={alert._id} className="flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  [{alert.severity}] {String(alert.type || '').replace(/_/g, ' ')}
                </span>
                <Badge variant="destructive" className="py-0 text-[10px] font-bold">Active</Badge>
              </div>
              <p className="mt-1 text-sm font-semibold">{alert.message}</p>
              {alert.actionRequired && (
                <p className="mt-2 rounded-lg border bg-card/60 p-2 text-xs font-medium text-muted-foreground">
                  <strong>Action:</strong> {alert.actionRequired}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-rose-500/20 pt-2">
              <span className="text-[11px] text-muted-foreground">
                {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-500/40 text-xs text-rose-600 hover:bg-rose-500 hover:text-white"
                onClick={() => onResolve(alert._id)}
                disabled={pending}
              >
                Mark resolved
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
