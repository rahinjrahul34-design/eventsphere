import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', className }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;

    // Move focus into the dialog on open; restore on close.
    const previouslyFocused = document.activeElement;
    const focusable = panel?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstField = panel?.querySelector('input, select, textarea');
    (firstField || focusable?.[1] || focusable?.[0] || panel)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') return onClose?.();
      // Minimal focus trap: keep Tab cycling inside the panel.
      if (e.key === 'Tab' && panel) {
        const items = Array.from(
          panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            tabIndex={-1}
            className={cn(
              'relative w-full rounded-t-2xl sm:rounded-2xl border bg-card shadow-lift outline-none max-h-[92vh] overflow-y-auto',
              sizes[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {(title || description) && (
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card/95 backdrop-blur px-5 py-4">
                <div>
                  {title && <h2 className="text-lg font-bold leading-tight">{title}</h2>}
                  {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
            {footer && <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur px-5 py-3 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', variant = 'default', loading }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            loading={loading}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Dialog>
  );
}

/**
 * Slide-in side panel (drawer). Same a11y contract as Dialog: ESC closes,
 * focus is trapped and restored, backdrop click closes, body scroll locks.
 */
export function Sheet({ open, onClose, title, description, children, footer, side = 'right', className }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement;
    (panel?.querySelector('input, select, textarea, button') || panel)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') return onClose?.();
      if (e.key === 'Tab' && panel) {
        const items = Array.from(
          panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const off = side === 'right' ? '100%' : '-100%';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            initial={{ x: off }}
            animate={{ x: 0 }}
            exit={{ x: off }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute inset-y-0 flex w-full max-w-md flex-col border-l bg-card shadow-lift outline-none',
              side === 'left' && 'border-r border-l-0',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            {(title || description) && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
                <div className="min-w-0">
                  {title && <h2 id={titleId} className="font-display text-base font-bold leading-tight">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close panel"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="shrink-0 border-t bg-card/95 px-5 py-3 flex justify-end gap-2">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
