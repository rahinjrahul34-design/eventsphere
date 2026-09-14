import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, Users, Zap } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Tabs } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { fmtDate } from '../lib/format';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePageTitle } from '../hooks/usePageTitle';
import SmartImage from '../components/ui/smart-image';
import { GridSkeleton } from '../components/ui/skeleton';

const statusVariant = {
  confirmed: 'success', checked_in: 'success', waitlisted: 'warning', cancelled: 'destructive', pending: 'secondary',
};

// SmartQueue attendee status presentation (CORE FEATURES 20/21/50)
const wlStatus = {
  waiting: { label: 'WAITING', variant: 'secondary' },
  eligible: { label: 'ELIGIBLE', variant: 'secondary' },
  hold_active: { label: 'SEAT RESERVED', variant: 'warning' },
  notified: { label: 'NOTIFIED', variant: 'warning' },
  promoted: { label: 'CONFIRMED', variant: 'success' },
  expired: { label: 'HOLD EXPIRED', variant: 'destructive' },
  declined: { label: 'DECLINED', variant: 'destructive' },
  skipped: { label: 'SKIPPED', variant: 'destructive' },
  ineligible: { label: 'INELIGIBLE', variant: 'destructive' },
};

function WaitlistRow({ entry }) {
  const s = wlStatus[entry.status] || wlStatus.waiting;
  const isHold = Boolean(entry.activeHold) || entry.status === 'hold_active';
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
      {entry.event.coverImage && (
        <SmartImage src={entry.event.coverImage} alt={entry.event.title} className="size-20 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <Link to={`/events/${entry.event.slug}`} className="font-bold hover:text-primary">{entry.event.title}</Link>
        <p className="text-xs text-muted-foreground">
          {fmtDate(entry.event.startDate, 'EEE d MMM yyyy · h:mm a')} · Joined {fmtDate(entry.joinedAt, 'd MMM')}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant={s.variant} className="text-[10px] font-bold tracking-wide">{s.label}</Badge>
          {['waiting', 'eligible'].includes(entry.status) && (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                <Users className="size-3.5 text-muted-foreground" /> Position #{entry.position}
              </span>
              <span className="text-xs text-muted-foreground">{entry.peopleAhead} ahead of you</span>
            </>
          )}
          {entry.status === 'promoted' && entry.promotedAt && (
            <span className="text-xs font-semibold text-success">Promoted {fmtDate(entry.promotedAt, 'd MMM, h:mm a')}</span>
          )}
        </div>
      </div>
      {isHold && entry.activeHold ? (
        <Link to={`/events/${entry.event.slug}?action=claim-hold&holdId=${entry.activeHold._id}`}>
          <Button size="sm" className="gap-1.5">
            <Zap className="size-3.5" /> Complete Registration
          </Button>
        </Link>
      ) : (
        <Link to={`/events/${entry.event.slug}`}><Button variant="outline" size="sm">View</Button></Link>
      )}
    </div>
  );
}

export default function MyEvents() {
  usePageTitle('My Events');
  const q = useQuery({ queryKey: ['my-registrations'], queryFn: endpoints.myRegistrations });
  const wlQ = useQuery({
    queryKey: ['my-waitlist'],
    queryFn: () => endpoints.myWaitlist(),
    refetchInterval: 60000, // REST fallback; socket events invalidate sooner
  });
  const [tab, setTab] = useState('upcoming');

  if (q.isLoading) return <GridSkeleton count={6} />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const regs = (q.data || []).filter((r) => r.event);
  const now = new Date();
  const upcoming = regs.filter((r) => ['confirmed', 'waitlisted', 'pending'].includes(r.status) && new Date(r.event.endDate) >= now);
  const past = regs.filter((r) => new Date(r.event.endDate) < now || r.status === 'checked_in' || r.status === 'cancelled');
  const waitlist = wlQ.data || [];
  const list = tab === 'upcoming' ? upcoming : tab === 'past' ? past : waitlist;

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-extrabold">My Events</h1>
      <Tabs className="mt-4 w-fit" active={tab} onChange={setTab}
        tabs={[
          { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { value: 'past', label: `Past (${past.length})` },
          { value: 'waitlist', label: `Waitlist (${waitlist.length})` },
        ]} />

      {tab === 'waitlist' ? (
        wlQ.isLoading ? (
          <Spinner />
        ) : wlQ.isError ? (
          <ErrorState message={wlQ.error.message} onRetry={wlQ.refetch} />
        ) : waitlist.length === 0 ? (
          <EmptyState icon={Clock} title="Waitlist is empty"
            description="When an event you join is full, you'll be able to wait here for a seat — SmartQueue will notify you automatically if one opens."
            action={<Link to="/events"><Button>Discover events</Button></Link>} />
        ) : (
          <div className="mt-6 space-y-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> You'll be notified automatically if a seat becomes available. Promotion order is primarily based on waitlist position.
            </p>
            {waitlist.map((entry) => <WaitlistRow key={entry._id} entry={entry} />)}
          </div>
        )
      ) : list.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events here" description="When you register for events, they’ll show up here."
          action={<Link to="/events"><Button>Discover events</Button></Link>} />
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
              <SmartImage src={r.event.coverImage} alt={r.event.title} className="size-20 rounded-lg object-cover" />
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
