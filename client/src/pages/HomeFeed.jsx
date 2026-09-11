import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight, Ticket, Award, Users, CalendarCheck, Bot, Flame } from 'lucide-react';
import { endpoints } from '../lib/api';
import EventCard from '../components/events/EventCard';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner, ErrorState } from '../components/ui/misc';
import { fmtDate } from '../lib/format';
import { useAuth } from '../store/auth';

export default function HomeFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const recQ = useQuery({ queryKey: ['recommended'], queryFn: () => endpoints.recommended({ limit: 6 }) });
  const regsQ = useQuery({ queryKey: ['my-registrations'], queryFn: endpoints.myRegistrations });
  const gamiQ = useQuery({ queryKey: ['gamification'], queryFn: endpoints.gamification });

  const upcoming = (regsQ.data || []).filter((r) =>
    ['confirmed', 'checked_in'].includes(r.status) && r.event && new Date(r.event.endDate) >= new Date()
  ).slice(0, 3);

  return (
    <div className="container py-8 space-y-10">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-8 text-white">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <h1 className="font-display text-3xl font-extrabold">Hi {user?.name?.split(' ')[0]} 👋</h1>
        <p className="mt-1 max-w-lg text-white/85">Your personalized event dashboard — recommendations, tickets, connections and rewards in one place.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/events')}><CalendarCheck /> Explore events</Button>
          <Button className="bg-white/15 hover:bg-white/25 text-white" onClick={() => navigate('/dashboard/copilot')}><Bot /> Try AI Copilot</Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <MiniStat icon={Ticket} value={upcoming.length} label="Upcoming" />
          <MiniStat icon={Award} value={user?.points || 0} label="Points" />
          <MiniStat icon={Users} value={gamiQ.data?.badges?.length || 0} label="Badges" />
        </div>
      </div>

      {/* Recommendations */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <div>
            <h2 className="font-display text-2xl font-extrabold">For You</h2>
            <p className="text-sm text-muted-foreground">{recQ.data?.summary || 'Personalized recommendations'}</p>
          </div>
          <Link to="/events" className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-primary">View all <ArrowRight className="size-4" /></Link>
        </div>
        {recQ.isLoading ? <Spinner /> : recQ.isError ? <ErrorState message={recQ.error.message} onRetry={recQ.refetch} /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recQ.data?.events?.map((e, i) => (
              <div key={e._id}>
                <EventCard event={e} index={i} />
                {e.reasons?.[0] && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/8 px-3 py-2 text-xs font-medium text-primary">
                    <Flame className="mt-0.5 size-3.5 shrink-0" /> Why: {e.reasons[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming + badges */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Your upcoming events</h3>
              <Link to="/my-events" className="text-sm font-bold text-primary">All</Link>
            </div>
            {regsQ.isLoading ? <Spinner /> : upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing booked yet — <Link to="/events" className="font-bold text-primary">find an event</Link>.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((r) => (
                  <Link key={r._id} to={`/events/${r.event.slug}`} className="flex items-center gap-3 rounded-xl border p-3 hover:shadow-soft transition">
                    <img src={r.event.coverImage} alt="" className="size-14 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-sm">{r.event.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.event.startDate, 'EEE d MMM, h:mm a')}</p>
                    </div>
                    {r.ticket && <Badge variant="success">Ticket ready</Badge>}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 font-bold text-lg flex items-center gap-2"><Award className="size-5 text-warning" /> Badges</h3>
            {gamiQ.isLoading ? <Spinner /> : (
              <div className="grid grid-cols-3 gap-3">
                {gamiQ.data?.badges?.map((b) => (
                  <div key={b._id} className="rounded-xl border bg-muted/40 p-3 text-center">
                    <span className="text-2xl">🏅</span>
                    <p className="mt-1 text-[11px] font-bold leading-tight">{b.name}</p>
                  </div>
                ))}
                {(!gamiQ.data?.badges || gamiQ.data.badges.length === 0) && (
                  <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">Register for events to start earning badges.</p>
                )}
              </div>
            )}
            <div className="mt-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">Recent activity</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {gamiQ.data?.activities?.slice(0, 6).map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                    <span className="truncate">{a.reason}</span>
                    <span className="font-bold text-primary">+{a.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur">
      <Icon className="size-4" />
      <span className="font-display text-xl font-extrabold">{value}</span>
      <span className="text-xs text-white/80">{label}</span>
    </div>
  );
}
