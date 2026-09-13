import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { ErrorState } from '../../components/ui/misc';
import CheckIn from './tabs/CheckIn';

// Standalone check-in desk, used by volunteers via their assignment.
export default function CheckInDesk() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['checkin-desk', id],
    queryFn: async () => {
      const mine = await endpoints.myAssignments();
      const assignment = mine.find((a) => a.event?._id?.toString() === id);
      if (!assignment) throw new Error('You are not assigned to this event');
      return assignment.event;
    },
  });

  if (q.isLoading) return <div className="space-y-6"><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-64 rounded-xl" /></div>;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/assignments" className="font-semibold hover:text-foreground">My Assignments</Link>
        <ChevronRight className="size-4" />
        <span className="font-bold text-foreground">{q.data.title} — Check-in desk</span>
      </div>
      <CheckIn event={q.data} />
    </div>
  );
}
