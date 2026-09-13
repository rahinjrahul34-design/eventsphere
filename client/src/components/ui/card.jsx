import { cn } from '../../lib/utils';

/**
 * Card levels:
 *  - default    → Level 1: static content surface
 *  - interactive→ Level 2: clickable — border sharpens + shadow lifts on hover
 *  - featured   → Level 3: AI / intelligence surface with a gradient hairline
 *  - hero       → Level 4: summary banner with a subtle top accent
 */
export function Card({ className, interactive = false, featured = false, hero = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-soft',
        interactive && 'card-hover cursor-pointer',
        featured && 'card-featured',
        hero && 'border-border/80 bg-gradient-to-b from-accent/40 to-card',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-bold leading-tight tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

/** Compact label + value block used inside intelligence/stat cards */
export function StatTile({ label, value, sub, className, valueClassName }) {
  return (
    <div className={cn('rounded-lg bg-secondary/50 px-3 py-2.5', className)}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('mt-0.5 block font-display text-lg font-bold tabular leading-tight', valueClassName)}>{value}</span>
      {sub && <span className="mt-0.5 block text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}
