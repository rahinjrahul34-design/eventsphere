import { cn } from '../../lib/utils';

/**
 * PageHeader — consistent dashboard page intro: eyebrow, title,
 * description and right-aligned actions.
 */
export default function PageHeader({ eyebrow, icon: Icon, title, description, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {eyebrow}
          </p>
        )}
        <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
