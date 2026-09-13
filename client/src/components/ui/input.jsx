import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const baseField =
  'flex h-9 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-soft transition-all duration-150 placeholder:text-muted-foreground/80 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={!!error}
    className={cn(baseField, error && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15', className)}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={!!error}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-soft transition-all duration-150 placeholder:text-muted-foreground/80 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:opacity-50',
      error && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Label = forwardRef(({ className, children, required, ...props }, ref) => (
  <label ref={ref} className={cn('text-sm font-medium leading-none text-foreground', className)} {...props}>
    {children} {required && <span className="text-destructive">*</span>}
  </label>
));
Label.displayName = 'Label';

export const Select = forwardRef(({ className, children, error, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={!!error}
    className={cn(
      baseField,
      'cursor-pointer appearance-none bg-no-repeat pr-9 bg-[length:14px] bg-[right_0.65rem_center]',
      error && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15',
      className
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a1a1b5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
      ...props.style,
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

export function HelperText({ children }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

/**
 * Field — label + control + helper/error text, wired with ids for a11y.
 * Renders any control as children; state comes from react-hook-form or local.
 */
export function Field({ label, hint, error, required, children, className, id }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? <FieldError message={error} /> : <HelperText>{hint}</HelperText>}
    </div>
  );
}

export const Checkbox = forwardRef(({ className, label, description, id, ...props }, ref) => {
  const autoId = useId();
  const cbId = id || autoId;
  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 inline-grid h-4.5 w-4.5 place-items-center" style={{ width: 18, height: 18 }}>
        <input
          ref={ref}
          id={cbId}
          type="checkbox"
          className="peer size-[18px] cursor-pointer appearance-none rounded-[5px] border border-border-strong bg-card shadow-soft transition-all duration-150 checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <Check
          className="pointer-events-none absolute size-3 stroke-[3] text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      {label && (
        <label htmlFor={cbId} className={cn('cursor-pointer select-none text-sm font-medium leading-none', props.disabled && 'opacity-50')}>
          {label}
          {description && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>}
        </label>
      )}
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

export const Radio = forwardRef(({ className, label, description, id, ...props }, ref) => {
  const autoId = useId();
  const rbId = id || autoId;
  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 grid size-[18px] place-items-center">
        <input
          ref={ref}
          id={rbId}
          type="radio"
          className="peer size-[18px] cursor-pointer appearance-none rounded-full border border-border-strong bg-card shadow-soft transition-all duration-150 checked:border-[5px] checked:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
      </span>
      {label && (
        <label htmlFor={rbId} className={cn('cursor-pointer select-none text-sm font-medium leading-none', props.disabled && 'opacity-50')}>
          {label}
          {description && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>}
        </label>
      )}
    </div>
  );
});
Radio.displayName = 'Radio';

/** Search input with leading icon */
export function SearchInput({ className, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input className="pl-9" {...props} />
    </div>
  );
}
