import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, TicketCheck, Clock, CalendarClock, Megaphone, QrCode, Hourglass, Trophy, UserPlus, Sparkles, BarChart3 } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { ListSkeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { timeAgo, cn } from '../lib/utils';
import { usePageTitle } from '../hooks/usePageTitle';

const TYPE_META = {
  registration: { icon: QrCode, cls: 'bg-primary/10 text-primary' },
  reminder: { icon: Clock, cls: 'bg-warning/10 text-warning' },
  schedule_change: { icon: CalendarClock, cls: 'bg-info/10 text-info' },
  announcement: { icon: Megaphone, cls: 'bg-info/10 text-info' },
  ticket: { icon: TicketCheck, cls: 'bg-success/10 text-success' },
  waitlist: { icon: Hourglass, cls: 'bg-warning/10 text-warning' },
  certificate: { icon: Trophy, cls: 'bg-success/10 text-success' },
  connection: { icon: UserPlus, cls: 'bg-primary/10 text-primary' },
  system: { icon: Sparkles, cls: 'bg-primary/10 text-primary' },
  poll: { icon: BarChart3, cls: 'bg-primary/10 text-primary' },
};

export default function Notifications() {
  usePageTitle('Notifications');
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

  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const items = q.data?.notifications || [];

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Notifications</h1>
          {q.data?.unread > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">{q.data.unread} unread</p>
          )}
        </div>
        {q.data?.unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAll.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="mt-6"><ListSkeleton rows={5} /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Updates about registrations, announcements and connections will land here."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const Icon = meta.icon;
            return (
              <Link
                key={n._id}
                to={n.link || '#'}
                onClick={() => !n.read && readOne.mutate(n._id)}
                className={cn(
                  'flex gap-3.5 rounded-xl border bg-card p-4 shadow-soft transition-all duration-150 hover:border-border-strong hover:shadow-lift',
                  !n.read && 'border-primary/30 bg-primary/[0.04]'
                )}
              >
                <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg', meta.cls)}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="size-2.5 shrink-0 self-center rounded-full bg-primary" aria-label="Unread" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
