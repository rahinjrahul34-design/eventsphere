import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'gradient-brand text-white shadow-soft hover:shadow-lift hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted hover:border-border border border-transparent',
        outline: 'border border-input bg-card hover:bg-secondary text-foreground',
        ghost: 'hover:bg-secondary text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110 shadow-soft',
        success: 'bg-success text-success-foreground hover:brightness-105 shadow-soft',
        warning: 'bg-warning text-warning-foreground hover:brightness-105',
        link: 'text-primary underline-offset-4 hover:underline rounded-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-md',
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
    {...props}
  >
    {loading && <Loader2 className="animate-spin" />}
    {children}
  </button>
));
Button.displayName = 'Button';

export { Button, buttonVariants };
