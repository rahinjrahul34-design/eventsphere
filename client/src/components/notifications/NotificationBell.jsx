import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, TicketCheck, Clock, CalendarClock, Megaphone, QrCode, Hourglass, Trophy, UserPlus, Sparkles, BarChart3, CheckCheck } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Dropdown } from '../ui/misc';
import { timeAgo, cn } from '../../lib/utils';

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

export default function NotificationBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => endpoints.notifications(),
    refetchInterval: 60_000,
  });
  const readAll = useMutation({
    mutationFn: endpoints.markAllNotifications,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readOne = useMutation({
    mutationFn: endpoints.markNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.notifications?.slice(0, 8) || [];
  const unread = data?.unread || 0;

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold tabular text-white ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      }
      className="w-[360px] max-w-[calc(100vw-1.5rem)]"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <button
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
                onClick={() => readAll.mutate()}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-10 place-items-center rounded-lg border bg-muted/50 text-muted-foreground">
                  <Bell className="size-4" />
                </span>
                <p className="text-sm font-semibold">You're all caught up</p>
                <p className="text-xs text-muted-foreground">New notifications will appear here.</p>
              </div>
            )}
            {items.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const Icon = meta.icon;
              return (
                <Link
                  key={n._id}
                  to={n.link || '/notifications'}
                  onClick={() => {
                    if (!n.read) readOne.mutate(n._id);
                    close();
                  }}
                  className={cn(
                    'flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary',
                    !n.read && 'bg-primary/[0.05]'
                  )}
                >
                  <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', meta.cls)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                    {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground line-clamp-2">{n.message}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="ml-auto mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </Link>
              );
            })}
          </div>
          <Link
            to="/notifications"
            onClick={close}
            className="mt-1 block border-t px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-secondary"
          >
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
