import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { PanelSkeleton } from './skeleton';

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description = '', action = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message || 'Please check your connection and try again.'}</p>
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
