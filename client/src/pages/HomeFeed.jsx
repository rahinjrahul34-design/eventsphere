import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  Ticket,
  Award,
  Users,
  CalendarCheck,
  Bot,
  Flame,
  Brain,
  Compass,
  MapPin,
  SlidersHorizontal,
  History,
  HelpCircle,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { endpoints } from '../lib/api';
import RecRail from '../components/recommendations/RecRail';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';
import { Spinner, ErrorState } from '../components/ui/misc';
import { fmtDate } from '../lib/format';
import { useAuth } from '../store/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function HomeFeed() {
  usePageTitle('Home');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const isDebug = searchParams.get('debug') === 'rec' || user?.role === 'admin';

  const feedQ = useQuery({
    queryKey: ['recommendation-feed', isDebug],
    queryFn: () => endpoints.recommendationFeed({ limit: 8, debug: isDebug }),
  });

  const regsQ = useQuery({ queryKey: ['my-registrations'], queryFn: endpoints.myRegistrations });
  const gamiQ = useQuery({ queryKey: ['gamification'], queryFn: endpoints.gamification });
  const certsQ = useQuery({ queryKey: ['certificates'], queryFn: endpoints.myCertificates });

  const feed = feedQ.data || {};
  const recommended = feed.recommended || [];
  const basedOnSkills = feed.basedOnSkills || [];
  const similarToAttended = feed.similarToAttended || [];
  const nearYou = feed.nearYou || [];
  const exploreEvent = feed.exploreSomethingNew;
  const trendingInInterests = feed.trendingInInterests || [];
  const becauseYouLike = feed.becauseYouLike || [];
  const newEventsYouMayLike = feed.newEventsYouMayLike || [];
  const userSkills = feed.userSkills || user?.skills || [];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const upcoming = (regsQ.data || [])
    .filter((r) => ['confirmed', 'checked_in'].includes(r.status) && r.event && new Date(r.event.endDate) >= new Date())
    .slice(0, 3);

  return (
    <div className="container py-8 space-y-12">
      {/* ─── Greeting Hero ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-8 text-white shadow-lift">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <h1 className="font-display text-3xl font-extrabold">
          {hello} {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 max-w-xl text-white/85">
          Here are events selected for you — match scores, verified reasons, and topics to explore next.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/events')} className="font-bold">
            <CalendarCheck className="size-4" /> Explore all events
          </Button>
          <Button className="bg-white/15 hover:bg-white/25 text-white font-bold" onClick={() => navigate('/dashboard/copilot')}>
            <Bot className="size-4" /> AI Copilot
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-black/20 hover:bg-black/30 text-white font-bold"
            onClick={() => navigate('/profile')}
          >
            <SlidersHorizontal className="size-4" /> Personalize interests
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/my-tickets">
            <MiniStat icon={Ticket} value={upcoming.length} label="Upcoming" />
          </Link>
          <Link to="/certificates">
            <MiniStat icon={Award} value={certsQ.data?.length || 0} label="Certificates" highlight />
          </Link>
          <MiniStat icon={Sparkles} value={user?.points || 0} label="Points" />
          <MiniStat icon={Users} value={gamiQ.data?.badges?.length || 0} label="Badges" />
        </div>
      </div>

      {/* ─── SECTION 1: Recommended For You ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold flex items-center gap-2">
                Recommended For You
                <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-primary border-primary/30">
                  AI 2.0
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">{feed.summary || 'Personalized recommendations based on your preferences'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTransparencyOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium transition"
            >
              <HelpCircle className="size-3.5" /> How it works
            </button>
            <Link to="/events" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {feedQ.isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : feedQ.isError ? (
          <ErrorState message={feedQ.error.message} onRetry={feedQ.refetch} />
        ) : recommended.length === 0 ? (
          <Card className="p-8 text-center border-dashed space-y-4">
            <Sparkles className="size-8 mx-auto text-muted-foreground mb-1" />
            <div>
              <h3 className="font-bold text-base">We're learning what you like</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Select your top interests in your profile or explore trending categories below:
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {[
                { name: 'Technology', slug: 'technology' },
                { name: 'Business & Startups', slug: 'business' },
                { name: 'Design & UI/UX', slug: 'design' },
                { name: 'Cultural & Arts', slug: 'cultural' },
                { name: 'Sports & Fitness', slug: 'sports' },
              ].map((c) => (
                <Link
                  key={c.slug}
                  to={`/events?category=${c.slug}`}
                  className="rounded-full border bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <div>
              <Button className="mt-2 gradient-brand text-white font-bold" onClick={() => navigate('/profile')}>
                Update Profile Preferences
              </Button>
            </div>
          </Card>
        ) : (
          <RecRail events={recommended} debug={isDebug} />
        )}
      </section>

      {/* ─── SECTION 2: Based On Your Skills ─── */}
      {basedOnSkills.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 grid place-items-center">
                <Brain className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  Based on Your Skills
                </h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {userSkills.map((s, idx) => (
                    <span key={idx} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link to="/events" className="text-xs font-bold text-primary hover:underline">
              Browse skills
            </Link>
          </div>

          <RecRail events={basedOnSkills} debug={isDebug} />
        </section>
      )}

      {/* ─── SECTION: Similar to Events You Attended ─── */}
      {similarToAttended.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                <History className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Similar to Events You Attended</h2>
                <p className="text-sm text-muted-foreground">Continuations based on your verified attendance history</p>
              </div>
            </div>
            <Link to="/my-events" className="text-xs font-bold text-primary hover:underline">
              View past
            </Link>
          </div>

          <RecRail events={similarToAttended} debug={isDebug} />
        </section>
      )}

      {/* ─── SECTION 3: Something New For You (Exploration Spotlight) ─── */}
      {exploreEvent && (
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 size-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-xs px-3 py-1">
                <Compass className="size-3.5" /> Something New For You
              </span>
              <h3 className="font-display text-2xl font-extrabold text-foreground">
                {exploreEvent.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exploreEvent.topReason || 'Explore an adjacent topic to expand your horizon beyond familiar domains.'}
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <CalendarCheck className="size-3.5 text-primary" /> {fmtDate(exploreEvent.startDate, 'EEE, d MMM')}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" /> {exploreEvent.venue?.city || 'Online'}
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <Link to={`/events/${exploreEvent.slug}`}>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold gap-2 shadow-soft">
                  Explore Event <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── SECTION 4: Near You / Local Highlights ─── */}
      {nearYou.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                <MapPin className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Near You & Online</h2>
                <p className="text-sm text-muted-foreground">Convenient events matching your location and remote availability</p>
              </div>
            </div>
            <Link to="/events?type=offline" className="text-xs font-bold text-primary hover:underline">
              City events
            </Link>
          </div>

          <RecRail events={nearYou} debug={isDebug} />
        </section>
      )}

      {/* ─── SECTION 5: Trending in Your Interests ─── */}
      {trendingInInterests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 grid place-items-center">
                <Flame className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Trending in Your Domain</h2>
                <p className="text-sm text-muted-foreground">High-velocity events gaining momentum right now</p>
              </div>
            </div>
          </div>

          <RecRail events={trendingInInterests} debug={isDebug} />
        </section>
      )}

      {becauseYouLike.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Heart className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Because you like…</h2>
              <p className="text-sm text-muted-foreground">Tied to interests, favorites, and events you already attended</p>
            </div>
          </div>
          <RecRail events={becauseYouLike} debug={isDebug} />
        </section>
      )}

      {newEventsYouMayLike.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">New events you may like</h2>
              <p className="text-sm text-muted-foreground">Fresh listings that still match your profile</p>
            </div>
          </div>
          <RecRail events={newEventsYouMayLike} debug={isDebug} />
        </section>
      )}

      {/* ─── Upcoming + Badges ─── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Your upcoming events</h3>
              <Link to="/my-events" className="text-sm font-bold text-primary">All</Link>
            </div>
            {regsQ.isLoading ? (
              <Spinner />
            ) : upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing booked yet — <Link to="/events" className="font-bold text-primary">find an event</Link>.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((r) => (
                  <Link
                    key={r._id}
                    to={`/events/${r.event.slug}`}
                    className="flex items-center gap-3 rounded-xl border p-3 hover:shadow-soft transition"
                  >
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
            <h3 className="mb-4 font-bold text-lg flex items-center gap-2">
              <Award className="size-5 text-warning" /> Badges
            </h3>
            {gamiQ.isLoading ? (
              <Spinner />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {gamiQ.data?.badges?.map((b) => (
                  <div key={b._id} className="rounded-xl border bg-muted/40 p-3 text-center">
                    <span className="text-2xl">🏅</span>
                    <p className="mt-1 text-[11px] font-bold leading-tight">{b.name}</p>
                  </div>
                ))}
                {(!gamiQ.data?.badges || gamiQ.data.badges.length === 0) && (
                  <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">
                    Register for events to start earning badges.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transparency Dialog: How Recommendations Work */}
      <Dialog
        open={transparencyOpen}
        onClose={() => setTransparencyOpen(false)}
        title="How Recommendations Work"
        description="EventSphere AI Recommendation 2.0 combines profile intelligence, verified history, and multi-factor scoring."
        size="md"
      >
        <div className="p-5 space-y-4 text-sm">
          <div className="rounded-xl border bg-muted/40 p-3.5 space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Hybrid 10-Factor Scoring Architecture
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every candidate event is evaluated through transparent, deterministic weighting before ranking and diversity filtering:
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Interests Alignment</span>
              <span className="font-mono font-bold text-primary">20% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Skills Alignment</span>
              <span className="font-mono font-bold text-primary">18% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Behavioral Affinity & Feedback</span>
              <span className="font-mono font-bold text-primary">15% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Category Affinity</span>
              <span className="font-mono font-bold text-primary">12% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Past Event Attendance Similarity</span>
              <span className="font-mono font-bold text-primary">10% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Location & Haversine Distance</span>
              <span className="font-mono font-bold text-primary">8% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Semantic Topic Understanding</span>
              <span className="font-mono font-bold text-primary">7% Weight</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold text-foreground">Freshness & Popularity Velocity</span>
              <span className="font-mono font-bold text-primary">8% Weight</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-foreground">Upcoming Timing Relevance</span>
              <span className="font-mono font-bold text-primary">2% Weight</span>
            </div>
          </div>

          <div className="rounded-xl border bg-emerald-500/10 p-3.5 space-y-1 text-emerald-800 dark:text-emerald-300">
            <h5 className="font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Zero-Hallucination Verified Evidence
            </h5>
            <p className="text-xs leading-relaxed opacity-90">
              Reasons shown on each card are generated strictly from verified database records. Dismissing an event or giving feedback dynamically trains your profile with soft time-decayed penalties.
            </p>
          </div>

          <Button className="w-full font-bold" onClick={() => setTransparencyOpen(false)}>
            Got it
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label, highlight = false }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold backdrop-blur transition ${
        highlight ? 'bg-amber-400 text-slate-900 shadow-soft' : 'bg-white/10 hover:bg-white/20 text-white'
      }`}
    >
      <Icon className="size-4" />
      <span>{value}</span>
      <span className="opacity-80 font-normal">{label}</span>
    </div>
  );
}
