import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Progress({ value = 0, className, barClassName }) {
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-all duration-500 ease-out', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, id, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-primary bg-primary' : 'border-border-strong bg-input'
      )}
    >
      <span
        className="block rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
        style={{ width: 18, height: 18, transform: checked ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

export function Tabs({ tabs, active, onChange, className, size = 'md' }) {
  return (
    <div
      className={cn('flex gap-1 overflow-x-auto no-scrollbar rounded-lg bg-muted p-1', className)}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={active === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'whitespace-nowrap rounded-md font-semibold transition-all duration-150 flex items-center gap-1.5',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-1.5 text-sm',
            active === t.value
              ? 'bg-card text-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
          {t.count != null && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular',
                active === t.value ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'
              )}
            >
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
    <div className="divide-y rounded-xl border bg-card shadow-soft">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold transition-colors hover:bg-secondary/50"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
            </button>
            <div className={cn('grid transition-all duration-200 ease-out', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Accessible dropdown menu: click or Enter/Space to open, Arrow keys to move,
 * Escape to close (focus returns to trigger), outside click to close.
 */
export function Dropdown({ trigger, children, align = 'right', className = '', panelClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const openMenu = (focusFirst) => {
    setOpen(true);
    if (focusFirst) requestAnimationFrame(() => panelRef.current?.querySelector('button, a')?.focus());
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(panelRef.current?.querySelectorAll('button, a') || []);
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      items[next].focus();
    }
  };

  return (
    <div className="relative" ref={rootRef} onKeyDown={onKeyDown}>
      <div
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(open && 'data-[state=open]:opacity-100')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            role="menu"
            onClick={() => setOpen(false)}
            className={cn(
              'absolute z-40 mt-2 min-w-[200px] origin-top rounded-xl border bg-card p-1.5 shadow-pop',
              align === 'right' ? 'right-0' : 'left-0',
              className,
              panelClassName
            )}
          >
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ icon: Icon, children, danger, className, ...props }) {
  return (
    <button
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors duration-100 focus-visible:outline-none focus-visible:bg-secondary hover:bg-secondary',
        danger ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10' : 'text-foreground',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0 text-current opacity-70" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

/** Lightweight tooltip — shows on hover and keyboard focus. */
export function Tooltip({ content, children, side = 'top', className }) {
  const [show, setShow] = useState(false);
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && content && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-pop',
              pos[side]
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center py-10 text-muted-foreground', className)} role="status" aria-label="Loading">
      <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function Chip({ active, children, onClick, className, ...props }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-all duration-150',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-soft'
          : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Convenience re-exports so pages can import states from the ui/misc barrel
export { ErrorState, EmptyState, QueryState } from './states';
