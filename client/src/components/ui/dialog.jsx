import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', className }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
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
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              'relative w-full rounded-t-2xl sm:rounded-2xl border bg-card shadow-lift max-h-[92vh] overflow-y-auto',
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
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary transition"
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
          <button className="h-9 rounded-lg px-4 text-sm font-medium hover:bg-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={() => onConfirm?.()}
            className={cn(
              'h-9 rounded-lg px-4 text-sm font-semibold text-white',
              variant === 'destructive' ? 'bg-destructive hover:brightness-110' : 'gradient-brand hover:brightness-110'
            )}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Dialog>
  );
}
