import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={!!error}
    className={cn(
      'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive focus-visible:ring-destructive',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={!!error}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
      error && 'border-destructive focus-visible:ring-destructive',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Label = forwardRef(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none text-foreground/90', className)}
    {...props}
  >
    {children} {required && <span className="text-destructive">*</span>}
  </label>
));
Label.displayName = 'Label';

export const Select = forwardRef(({ className, children, error, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={!!error}
    className={cn(
      'flex h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9',
      error && 'border-destructive',
      className
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive mt-1">{message}</p>;
}
