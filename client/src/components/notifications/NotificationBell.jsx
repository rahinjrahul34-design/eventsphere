import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Dropdown } from '../ui/misc';
import { Button } from '../ui/button';
import { timeAgo, cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const TYPE_ICON = {
  registration: '🎟️', reminder: '⏰', schedule_change: '🗓️', announcement: '📣',
  ticket: '🎫', waitlist: '⏳', certificate: '🏆', connection: '🤝', system: '✨', poll: '📊',
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
          className="relative grid size-10 place-items-center rounded-full hover:bg-secondary transition"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 h-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      }
      className="w-[340px] max-w-[90vw]"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2 border-b mb-1">
            <span className="font-bold text-sm">Notifications</span>
            {unread > 0 && (
              <button className="text-xs font-semibold text-primary hover:underline" onClick={() => readAll.mutate()}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up 🎉</p>}
            {items.map((n) => (
              <Link
                key={n._id}
                to={n.link || '/notifications'}
                onClick={() => {
                  if (!n.read) readOne.mutate(n._id);
                  close();
                }}
                className={cn(
                  'flex gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition',
                  !n.read && 'bg-primary/5'
                )}
              >
                <span className="text-lg leading-none mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                  {n.message && <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>}
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="ml-auto mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </Link>
            ))}
          </div>
          <Link to="/notifications" onClick={close} className="block border-t mt-1 px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-secondary rounded-b-lg">
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
