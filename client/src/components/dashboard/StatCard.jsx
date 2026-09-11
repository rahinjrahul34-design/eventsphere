import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StatCard({ icon: Icon, label, value, sub, accent = 'primary', delta }) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    blue: 'bg-blue-500/10 text-blue-500',
  };
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className={cn('grid size-10 place-items-center rounded-lg', accents[accent])}>
          {Icon && <Icon className="size-5" />}
        </span>
        {delta != null && (
          <span className={cn('flex items-center gap-0.5 text-xs font-bold', delta >= 0 ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}
