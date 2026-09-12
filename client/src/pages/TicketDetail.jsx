import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, CalendarPlus } from 'lucide-react';
import { endpoints } from '../lib/api';
import TicketPass from '../components/tickets/TicketPass';
import { Spinner, ErrorState } from '../components/ui/misc';
import { Button } from '../components/ui/button';
import { usePageTitle } from '../hooks/usePageTitle';

export default function TicketDetail() {
  usePageTitle('Ticket Details');
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => endpoints.ticket(id),
    enabled: !!id,
  });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const ticket = q.data;
  if (!ticket) return <ErrorState title="Ticket not found" message="It may belong to another account." />;

  return (
    <div className="container py-8">
      <Link to="/my-tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All tickets
      </Link>
      <div className="mt-6">
        <TicketPass ticket={ticket} />
      </div>
      <div className="mx-auto mt-6 flex max-w-md justify-center gap-2">
        <a href={endpoints.ical(ticket.event?._id)}><Button variant="outline"><CalendarPlus /> Add to calendar</Button></a>
        <Link to={`/events/${ticket.event?.slug}`}><Button>View event</Button></Link>
      </div>
    </div>
  );
}
