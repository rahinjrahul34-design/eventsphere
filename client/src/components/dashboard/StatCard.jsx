import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const ACCENTS = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

export default function StatCard({ icon: Icon, label, value, sub, accent = 'primary', delta }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft transition-shadow duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={cn('grid size-10 place-items-center rounded-lg', ACCENTS[accent] || ACCENTS.primary)}>
          {Icon && <Icon className="size-5" aria-hidden="true" />}
        </span>
        {delta != null && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular',
              delta >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
          >
            {delta >= 0 ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}
