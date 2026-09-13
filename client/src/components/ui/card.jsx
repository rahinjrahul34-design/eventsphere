import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Card hierarchy (spec §6): surface (L1) / interactive (L2) /
// featured (L3 — AI intelligence) / hero (L4 — summary/flagship).
const cardVariants = cva('text-card-foreground', {
  variants: {
    variant: {
      surface: 'card-surface',
      interactive: 'card-interactive',
      featured: 'card-featured',
      hero: 'card-surface shadow-lift ring-1 ring-primary/10',
      none: '',
    },
  },
  defaultVariants: { variant: 'surface' },
});

export function Card({ className, variant, ...props }) {
  return (
    <div
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-5 sm:p-6', className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-lg font-bold leading-tight tracking-tight', className)} {...props} />;
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
