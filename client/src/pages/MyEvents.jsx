import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Spinner, Tabs } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { fmtDate } from '../lib/format';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePageTitle } from '../hooks/usePageTitle';

const statusVariant = {
  confirmed: 'success', checked_in: 'success', waitlisted: 'warning', cancelled: 'destructive', pending: 'secondary',
};

export default function MyEvents() {
  usePageTitle('My Events');
  const q = useQuery({ queryKey: ['my-registrations'], queryFn: endpoints.myRegistrations });
  const [tab, setTab] = useState('upcoming');

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const regs = (q.data || []).filter((r) => r.event);
  const now = new Date();
  const upcoming = regs.filter((r) => ['confirmed', 'waitlisted', 'pending'].includes(r.status) && new Date(r.event.endDate) >= now);
  const past = regs.filter((r) => new Date(r.event.endDate) < now || r.status === 'checked_in' || r.status === 'cancelled');
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-extrabold">My Events</h1>
      <Tabs className="mt-4 w-fit" active={tab} onChange={setTab}
        tabs={[{ value: 'upcoming', label: `Upcoming (${upcoming.length})` }, { value: 'past', label: `Past (${past.length})` }]} />

      {list.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events here" description="When you register for events, they’ll show up here."
          action={<Link to="/events"><Button>Discover events</Button></Link>} />
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
              <img src={r.event.coverImage} alt="" className="size-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <Link to={`/events/${r.event.slug}`} className="font-bold hover:text-primary">{r.event.title}</Link>
                <p className="text-xs text-muted-foreground">{fmtDate(r.event.startDate, 'EEE d MMM yyyy · h:mm a')} · {r.event.venue?.city || 'Online'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant[r.status] || 'secondary'} className="capitalize">{r.status.replace('_', ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{r.ticketType?.name}</span>
                  {r.status === 'waitlisted' && <span className="text-xs font-semibold text-warning">Position #{r.waitlistPosition || '—'}</span>}
                </div>
              </div>
              {r.ticket ? (
                <Link to={`/my-tickets/${r.ticket._id}`} className="flex flex-col items-center gap-1">
                  <div className="rounded-lg bg-white p-1 ring-1 ring-border"><QRCodeSVG value={r.ticket.code} size={52} /></div>
                  <span className="text-[10px] font-bold text-primary">View pass</span>
                </Link>
              ) : (
                <Link to={`/events/${r.event.slug}`}><Button variant="outline" size="sm">View</Button></Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
