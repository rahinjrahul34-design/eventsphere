import { useOutletContext, Link } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { Button } from '../../../components/ui/button';

// The full live control center lives on the public event live route,
// which shows organizer controls when the visitor manages the event.
export default function LiveTab() {
  const { event } = useOutletContext();
  if (event.status === 'live' || event.status === 'published' || event.status === 'completed') {
    return <Navigate to={`/events/${event.slug}/live`} replace />;
  }
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Radio className="size-7" /></span>
      <h3 className="mt-4 font-display text-lg font-extrabold">Go live to open the control center</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        The live center lets you broadcast announcements, run polls, moderate Q&amp;A, watch attendance and
        share a leaderboard once your event starts.
      </p>
      <Link to="/dashboard/events" className="mt-5 inline-block">
        <Button variant="outline">Back to events to go live</Button>
      </Link>
    </div>
  );
}
