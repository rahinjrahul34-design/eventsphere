import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { endpoints } from '../lib/api';
import EventCalendarView from '../components/events/EventCalendarView';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Spinner } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { fmtDate, fmtTime } from '../lib/format';

export default function CalendarPage() {
  const q = useQuery({ queryKey: ['calendar'], queryFn: endpoints.calendar });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const { registered = [], saved = [] } = q.data || {};
  const all = [...registered, ...saved].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-extrabold">My Calendar</h1>
      <p className="mt-1 text-muted-foreground">Registered and saved events — export to Google Calendar or iCal.</p>

      {all.length === 0 ? (
        <EmptyState icon={CalendarPlus} title="Your calendar is empty" description="Save or register for events to see them here." />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <EventCalendarView events={all} />
          <div className="space-y-3">
            <h3 className="font-bold">{all.length} events</h3>
            {all.map((e) => (
              <div key={e._id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/events/${e.slug}`} className="text-sm font-bold hover:text-primary line-clamp-2">{e.title}</Link>
                  <Badge variant={e.relation === 'registered' ? 'success' : 'secondary'}>{e.relation}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(e.startDate, 'EEE d MMM')} · {fmtTime(e.startDate)}</p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${new Date(e.startDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(e.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`}
                    target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">
                    Google
                  </a>
                  <a href={endpoints.ical(e._id)} className="text-xs font-bold text-primary hover:underline">iCal download</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
