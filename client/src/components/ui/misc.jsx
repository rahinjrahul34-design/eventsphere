import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Progress({ value = 0, className, barClassName }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full gradient-brand transition-all duration-700', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function Tabs({ tabs, active, onChange, className, size = 'md' }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-muted p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={active === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'whitespace-nowrap rounded-lg font-semibold transition-all flex items-center gap-1.5',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            active === t.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
          {t.count != null && (
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active === t.value ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Accordion({ items = [], defaultOpen = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-secondary/50 transition"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </button>
            <div className={cn('grid transition-all duration-300', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dropdown({ trigger, children, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-2 min-w-[200px] rounded-xl border bg-card p-1.5 shadow-lift animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, danger, ...props }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-secondary text-left',
        danger && 'text-destructive hover:bg-destructive/10'
      )}
      {...props}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center py-10 text-muted-foreground', className)}>
      <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function Chip({ active, children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition',
        active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-card hover:border-primary/40 hover:text-primary',
        className
      )}
    >
      {children}
    </button>
  );
}

// Convenience re-exports so pages can import states from the ui/misc barrel
export { ErrorState, EmptyState, QueryState } from './states';
