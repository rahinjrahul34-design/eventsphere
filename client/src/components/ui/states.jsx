import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { PanelSkeleton } from './skeleton';

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description = '', action = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center ${className}`}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl border bg-muted/50 text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/[0.04] px-6 py-14 text-center ${className}`}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message || 'Please check your connection and try again.'}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function QueryState({ query, skeleton, empty, children, errorClassName = '' }) {
  const { isLoading, isError, error, data, refetch, isFetching } = query;
  if (isLoading) return skeleton || <PanelSkeleton />;
  if (isError) return <ErrorState message={error?.message} onRetry={refetch} className={errorClassName} />;
  const isEmpty = empty?.isEmpty?.(data);
  if (empty && isEmpty) return empty.view;
  return typeof children === 'function' ? children(data, { refetch, isFetching }) : children;
}
