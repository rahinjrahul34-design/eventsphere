import { cva } from 'class-variance-authority';
import { CheckCircle2, CircleDot, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-success/20 bg-success/[12%] text-success',
        warning: 'border-warning/25 bg-warning/15 text-warning',
        destructive: 'border-destructive/20 bg-destructive/[12%] text-destructive',
        info: 'border-info/25 bg-info/[12%] text-info',
        outline: 'text-foreground border-border',
        live: 'border-transparent bg-destructive text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };

// ---------------------------------------------------------------------------
// Domain status mapping (spec §13) — one semantic language for every status.
// ---------------------------------------------------------------------------
const STATUS_MAP = {
  published: { variant: 'success', icon: null },
  live: { variant: 'live', icon: CircleDot },
  completed: { variant: 'info', icon: null },
  cancelled: { variant: 'secondary', icon: null },
  draft: { variant: 'secondary', icon: null },
  pending: { variant: 'warning', icon: null },
  approved: { variant: 'success', icon: null },
  rejected: { variant: 'destructive', icon: null },
  verified: { variant: 'success', icon: CheckCircle2 },
  waitlisted: { variant: 'warning', icon: null },
  'checked in': { variant: 'success', icon: CheckCircle2 },
  'high risk': { variant: 'destructive', icon: null },
  'medium risk': { variant: 'warning', icon: null },
  'low risk': { variant: 'success', icon: null },
  'ai insight': { variant: 'default', icon: Sparkles },
};

export function StatusBadge({ status, className, children, ...props }) {
  const key = String(status || '').toLowerCase();
  const conf = STATUS_MAP[key] || { variant: 'outline', icon: null };
  const Icon = conf.icon;
  const dot = key === 'live' && !Icon ? <span className="mr-0.5 inline-block size-1.5 animate-pulse rounded-full bg-white" /> : null;
  return (
    <Badge variant={conf.variant} className={className} {...props}>
      {Icon ? <Icon /> : dot}
      {children || String(status || '').replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
}
