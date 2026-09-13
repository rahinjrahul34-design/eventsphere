import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base: consistent control height, balanced padding, 150ms interactions, a11y states
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Solid brand action — clean surface, subtle resting shadow, darkens + lifts on hover
        default:
          'bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-lift',
        // Quiet neutral action for secondary prominence
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-muted',
        // Bordered action that sits on card surfaces
        outline:
          'border border-border-strong bg-card text-foreground shadow-soft hover:bg-secondary hover:border-border-strong/80 hover:shadow-soft',
        // Text-level action
        ghost: 'text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:brightness-110 hover:shadow-lift',
        success:
          'bg-success text-success-foreground shadow-soft hover:brightness-110 hover:shadow-lift',
        warning:
          'bg-warning text-warning-foreground shadow-soft hover:brightness-110',
        info:
          'bg-info text-info-foreground shadow-soft hover:brightness-110 hover:shadow-lift',
        // Destructive intent without full solid weight (e.g. "Remove" in rows)
        'destructive-outline':
          'border border-destructive/35 bg-card text-destructive hover:bg-destructive/10 hover:border-destructive/60',
        link: 'text-primary underline-offset-4 hover:underline rounded-none',
        // Heroic CTA — the one place a gradient earns its keep
        cta: 'gradient-brand text-white shadow-soft hover:shadow-lift hover:brightness-110',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        xs: 'h-7 rounded-md px-2.5 text-xs [&_svg]:size-3.5',
        lg: 'h-11 rounded-lg px-6 text-[15px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8 rounded-md [&_svg]:size-3.5',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const Button = forwardRef(({ className, variant, size, loading, children, disabled, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(buttonVariants({ variant, size }), className)}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
    {children}
  </button>
));
Button.displayName = 'Button';

export { Button, buttonVariants };
