import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, ChevronRight } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Spinner } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { fmtDate } from '../lib/format';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MyTickets() {
  usePageTitle('My Tickets');
  const q = useQuery({ queryKey: ['tickets'], queryFn: endpoints.myTickets });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const tickets = q.data || [];

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-extrabold">My Tickets</h1>
      <p className="mt-1 text-muted-foreground">Your digital QR passes for check-in.</p>

      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets yet"
          description="Register for an event and your QR pass will appear here instantly."
          action={<Link to="/events" className="inline-flex h-10 items-center rounded-lg gradient-brand px-4 text-sm font-semibold text-white">Explore events</Link>}
        />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => (
            <Link key={t._id} to={`/my-tickets/${t._id}`}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft hover:shadow-lift transition">
              <div className="rounded-lg bg-white p-1.5 ring-1 ring-border">
                <QRCodeSVG value={t.code} size={64} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold group-hover:text-primary">{t.event?.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(t.event?.startDate)} · {t.ticketType}</p>
                <div className="mt-1.5">
                  {t.status === 'used' ? <Badge variant="success">Checked in</Badge>
                    : t.status === 'cancelled' ? <Badge variant="destructive">Cancelled</Badge>
                      : <Badge>Valid pass</Badge>}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
