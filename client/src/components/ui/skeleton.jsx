import { cn } from '../../lib/utils';

export function Skeleton({ className = '' }) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="h-44 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6, className }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton rows that match the shared table metrics */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'h-9 flex-[1.5]' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-xl border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Chart placeholder with axes hint */
export function ChartSkeleton({ height = 260 }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[35, 55, 40, 70, 50, 85, 60, 75, 45, 65].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Full dashboard body while intelligence loads */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <StatsSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartSkeleton />
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
