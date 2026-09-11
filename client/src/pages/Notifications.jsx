import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Spinner } from '../components/ui/misc';
import { Button } from '../components/ui/button';
import { timeAgo, cn } from '../lib/utils';

const ICONS = {
  registration: '🎟️', reminder: '⏰', schedule_change: '🗓️', announcement: '📣', ticket: '🎫',
  waitlist: '⏳', certificate: '🏆', connection: '🤝', system: '✨', poll: '📊',
};

export default function Notifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: endpoints.notifications });
  const readAll = useMutation({
    mutationFn: endpoints.markAllNotifications,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readOne = useMutation({
    mutationFn: endpoints.markNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const items = q.data?.notifications || [];

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Notifications</h1>
        {q.data?.unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAll.mutate()}><CheckCheck className="size-4" /> Mark all read</Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="Updates about registrations, announcements and connections will land here." />
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((n) => (
            <Link
              key={n._id}
              to={n.link || '#'}
              onClick={() => !n.read && readOne.mutate(n._id)}
              className={cn('flex gap-3 rounded-xl border bg-card p-4 transition hover:shadow-soft', !n.read && 'border-primary/40 bg-primary/5')}
            >
              <span className="text-xl">{ICONS[n.type] || '🔔'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{n.title}</p>
                {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="size-2.5 shrink-0 self-center rounded-full bg-primary" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
