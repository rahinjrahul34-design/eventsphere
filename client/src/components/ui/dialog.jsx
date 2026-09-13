import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Trap Tab focus inside a container, restore focus on unmount. */
function useFocusTrap(active, ref) {
  const restoreRef = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    restoreRef.current = document.activeElement;
    const node = ref.current;
    // Move focus into the dialog (first focusable or the panel itself)
    const focusables = node?.querySelectorAll(FOCUSABLE);
    (focusables && focusables.length ? focusables[0] : node)?.focus?.();
    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [active, ref]);
}

function useLockBody(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', className, closeOnBackdrop = true }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useLockBody(open);
  useFocusTrap(open, panelRef);

  const onKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onKey]);

  const sizes = { xs: 'max-w-xs', sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          {/* Backdrop */}
          <motion.div
            {...backdropMotion}
            className="absolute inset-0 bg-[hsl(var(--overlay)/0.55)] backdrop-blur-[3px]"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          {/* Panel — slides up on mobile, scales in on desktop */}
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border bg-card shadow-pop outline-none sm:rounded-xl',
              sizes[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
          >
            {(title || description) && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="font-display text-lg font-bold leading-tight tracking-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-0.5 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            {footer && (
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-card px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} loading={loading} onClick={() => onConfirm?.()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
    </Dialog>
  );
}

/** Side sheet / drawer — slides in from the right (default) or left. */
export function Sheet({ open, onClose, title, description, children, footer, side = 'right', className }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useLockBody(open);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const off = side === 'right' ? '100%' : '-100%';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div {...backdropMotion} className="absolute inset-0 bg-[hsl(var(--overlay)/0.5)] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            initial={{ x: off }}
            animate={{ x: 0 }}
            exit={{ x: off }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute inset-y-0 flex w-full max-w-md flex-col border-l bg-card shadow-pop outline-none',
              side === 'left' && 'border-r',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                {title && <h2 id={titleId} className="font-display text-base font-bold leading-tight">{title}</h2>}
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
