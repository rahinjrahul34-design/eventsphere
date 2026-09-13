import { cva } from 'class-variance-authority';
import { Sparkles, BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
        info: 'border-info/25 bg-info/10 text-info',
        outline: 'border-border text-muted-foreground',
        live: 'border-transparent bg-destructive text-white',
        // AI / intelligence accent
        ai: 'border-primary/25 bg-gradient-to-r from-primary/12 to-info/12 text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({ className, variant, dot = false, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** AI module chip — consistent visual language for every intelligence system */
export function AiBadge({ children = 'AI', className }) {
  return (
    <Badge variant="ai" className={cn('uppercase tracking-wide', className)}>
      <Sparkles aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function VerifiedBadge({ children = 'Verified', className }) {
  return (
    <Badge variant="success" className={className}>
      <BadgeCheck aria-hidden="true" />
      {children}
    </Badge>
  );
}

/**
 * StatusBadge — one source of truth for domain statuses.
 * Every status in the product maps to a semantic color + label.
 */
const STATUS_MAP = {
  // Event lifecycle
  published: { variant: 'success', label: 'Published' },
  draft: { variant: 'secondary', label: 'Draft' },
  live: { variant: 'live', label: 'Live', pulse: true },
  ongoing: { variant: 'live', label: 'Ongoing', pulse: true },
  completed: { variant: 'info', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  // Approval / review
  pending: { variant: 'warning', label: 'Pending' },
  pending_approval: { variant: 'warning', label: 'Pending approval' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  suspended: { variant: 'destructive', label: 'Suspended' },
  // Risk
  high_risk: { variant: 'destructive', label: 'High risk' },
  medium_risk: { variant: 'warning', label: 'Medium risk' },
  low_risk: { variant: 'success', label: 'Low risk' },
  critical: { variant: 'destructive', label: 'Critical' },
  // Registration / tickets
  confirmed: { variant: 'success', label: 'Confirmed' },
  checked_in: { variant: 'info', label: 'Checked in' },
  waitlisted: { variant: 'warning', label: 'Waitlisted' },
  expired: { variant: 'secondary', label: 'Expired' },
  // Intelligence
  ai_insight: { variant: 'ai', label: 'AI insight' },
  recommended: { variant: 'default', label: 'Recommended' },
  verified: { variant: 'success', label: 'Verified' },
};

export function StatusBadge({ status, label, className, ...props }) {
  const meta = STATUS_MAP[status] || { variant: 'secondary', label: status };
  return (
    <Badge variant={meta.variant} className={cn('capitalize', meta.pulse && 'animate-pulse', className)} {...props}>
      {meta.pulse && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label || meta.label}
    </Badge>
  );
}

export { badgeVariants };
