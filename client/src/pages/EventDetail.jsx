import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin, CalendarDays, Clock, Users, Building2, Radio, Video, Share2, Heart,
  ChevronRight, Sparkles, CalendarPlus, AlertCircle, Star, Trophy, MessageSquare, Zap,
} from 'lucide-react';
import { endpoints } from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Accordion } from '../components/ui/misc';
import { Progress } from '../components/ui/misc';
import { Avatar } from '../components/ui/avatar';
import FavoriteButton from '../components/events/FavoriteButton';
import ShareMenu from '../components/events/ShareMenu';
import MapView from '../components/events/MapView';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import CheckoutDialog from '../components/events/CheckoutDialog';
import SmartHoldModal from '../components/waitlist/SmartHoldModal';
import OrganizerTrustCard from '../components/trustsphere/OrganizerTrustCard';
import { Spinner, ErrorState } from '../components/ui/misc';
import { rangeLabel, fmtTime, fmtDate, inr, typeLabel, categoryMeta } from '../lib/format';
import { useAuth } from '../store/auth';
import { usePageTitle } from '../hooks/usePageTitle';
import EventSeoHead from '../components/seo/EventSeoHead';

export default function EventDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);

  const eventQ = useQuery({ queryKey: ['event', slug], queryFn: () => endpoints.event(slug) });
  const event = eventQ.data;
  usePageTitle(event?.title || 'Event Details');

  const holdQ = useQuery({
    queryKey: ['smartqueue-hold', event?._id],
    queryFn: () => endpoints.smartQueue.getHold(event._id),
    enabled: !!event?._id && !!user,
    refetchInterval: (query) => (query.state.data?.hasActiveHold ? 3000 : 15000),
  });
  const activeHold = holdQ.data?.hasActiveHold ? holdQ.data.hold : null;

  useEffect(() => {
    if (searchParams.get('action') === 'claim-hold' && activeHold) {
      setShowHoldModal(true);
    }
  }, [searchParams, activeHold]);

  const sessionsQ = useQuery({
    queryKey: ['sessions', event?._id], queryFn: () => endpoints.sessions(event._id), enabled: !!event,
  });
  const speakersQ = useQuery({
    queryKey: ['speakers', event?._id], queryFn: () => endpoints.speakers(event._id), enabled: !!event,
  });
  const sponsorsQ = useQuery({
    queryKey: ['sponsors', event?._id], queryFn: () => endpoints.sponsors(event._id), enabled: !!event,
  });
  const similarQ = useQuery({
    queryKey: ['similar', event?._id], queryFn: () => endpoints.similar(event._id), enabled: !!event,
  });
  const feedbackQ = useQuery({
    queryKey: ['feedback', event?._id], queryFn: () => endpoints.feedback(event._id), enabled: !!event,
  });

  if (eventQ.isLoading) return <Spinner className="min-h-[60vh]" />;
  if (eventQ.isError) return <ErrorState message={eventQ.error.message} onRetry={eventQ.refetch} className="min-h-[60vh]" />;

  const cat = categoryMeta(event.categorySlug);
  const effectiveCount = (event.registrationCount || 0) + (event.activeHoldsCount || 0);
  const seatsLeft = Math.max(0, event.capacity - effectiveCount);
  const fillPct = Math.round((effectiveCount / Math.max(1, event.capacity)) * 100);
  const TypeIcon = event.eventType === 'online' ? Video : event.eventType === 'hybrid' ? Radio : Building2;
  const registered = ['confirmed', 'checked_in', 'pending'].includes(event.myRegistration?.status);
  const waitlisted = event.myRegistration?.status === 'waitlisted';

  const days = groupSessionsByDay(sessionsQ.data || []);
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGcal(event.startDate)}/${toGcal(event.endDate)}&details=${encodeURIComponent(event.shortDescription || '')}&location=${encodeURIComponent([event.venue?.name, event.venue?.address, event.venue?.city].filter(Boolean).join(', '))}`;

  const register = () => {
    if (!user) return navigate('/login', { state: { from: `/events/${event.slug}` } });
    setCheckout(true);
  };

  return (
    <div className="pb-16">
      <EventSeoHead event={event} />
      {/* Hero */}
      <div className="relative">
        <div className="h-[38vh] min-h-[280px] w-full overflow-hidden">
          <img src={event.coverImage} alt={event.title} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30" />
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: cat.color }}>
                  {cat.name}
                </span>
                <Badge variant="secondary" className="bg-black/50 text-white border-transparent">
                  <TypeIcon className="size-3" /> {typeLabel[event.eventType]}
                </Badge>
                {event.status === 'live' && (
                  <Link to={`/events/${event.slug}/live`}>
                    <Badge variant="live" className="animate-pulse"><span className="size-1.5 rounded-full bg-white" /> LIVE NOW — join</Badge>
                  </Link>
                )}
                {event.featured && <Badge variant="warning"><Sparkles className="size-3" /> Featured</Badge>}
              </div>
              <h1 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold leading-tight">{event.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
                <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-primary" /> {rangeLabel(event.startDate, event.endDate)}</span>
                <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" /> {fmtTime(event.startDate)} onwards</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" /> {event.venue?.city || 'Online'}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-10">
          {waitlisted && (
            <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertCircle className="size-5 text-warning shrink-0" />
              You’re on the waitlist. We’ll notify and auto-promote you if a seat opens.
            </div>
          )}
          {registered && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-5 text-success" /> You’re registered for this event</p>
              <Link to="/my-tickets"><Button size="sm" variant="outline">View my QR ticket</Button></Link>
            </div>
          )}

          {/* About */}
          <Section id="about" title="About this event">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{event.description}</p>
            {event.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {event.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">#{t}</span>
                ))}
              </div>
            )}
          </Section>

          {/* Schedule */}
          {sessionsQ.data?.length > 0 && (
            <Section id="schedule" title="Schedule">
              <div className="space-y-6">
                {days.map((day2, di) => (
                  <div key={di}>
                    <p className="mb-3 font-bold text-sm text-primary">{fmtDate(day2.date, 'EEEE, d MMMM')}</p>
                    <div className="relative space-y-4 border-l-2 border-muted pl-5">
                      {day2.items.map((s) => (
                        <div key={s._id} className="relative">
                          <span className={`absolute -left-[27px] top-1.5 size-3 rounded-full ring-4 ring-background ${s.type === 'break' ? 'bg-muted-foreground' : 'bg-primary'}`} />
                          <div className="rounded-xl border bg-card p-4 transition hover:shadow-soft">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold">{s.title}</p>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="capitalize">{s.type}</Badge>
                              <span className="flex items-center gap-1"><MapPin className="size-3" /> {s.room}</span>
                              {s.speaker && <span className="flex items-center gap-1.5"><Avatar name={s.speaker.name} src={s.speaker.photo} className="size-5" /> {s.speaker.name}</span>}
                            </div>
                            {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Speakers */}
          {speakersQ.data?.length > 0 && (
            <Section id="speakers" title="Speakers">
              <div className="grid gap-4 sm:grid-cols-2">
                {speakersQ.data.map((sp) => (
                  <Card key={sp._id} className="overflow-hidden">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar name={sp.name} src={sp.photo} className="size-16" fallbackClass="text-lg" />
                      <div className="min-w-0">
                        <p className="font-bold">{sp.name}</p>
                        <p className="text-sm text-primary">{sp.title}</p>
                        <p className="text-xs text-muted-foreground">{sp.company}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {sp.skills?.slice(0, 3).map((s) => (
                            <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{s}</span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* Venue */}
          <Section id="venue" title="Venue">
            <div className="grid gap-4 md:grid-cols-[1fr_300px]">
              <MapView coordinates={event.venue?.coordinates} label={event.venue?.name} className="h-72" />
              <div className="rounded-xl border bg-card p-5">
                <p className="font-bold text-lg">{event.venue?.name || 'Online event'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.venue?.address}</p>
                <p className="text-sm text-muted-foreground">{event.venue?.city}</p>
                {event.venue?.onlineUrl && (
                  <a href={event.venue.onlineUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    <Video className="size-4" /> Join online link
                  </a>
                )}
                <p className="mt-4 text-xs text-muted-foreground">Timezone: {event.timezone}</p>
              </div>
            </div>
          </Section>

          {/* FAQ */}
          {event.faq?.length > 0 && (
            <Section id="faq" title="FAQ">
              <Accordion items={event.faq.map((f) => ({ q: f.q, a: f.a }))} />
            </Section>
          )}

          {/* Community */}
          <Section id="community" title="Community & feedback">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <MessageSquare className="size-6 text-primary" />
                  <p className="mt-2 font-bold">Live discussion, Q&A and polls</p>
                  <p className="mt-1 text-sm text-muted-foreground">When the event goes live, chat with attendees, upvote questions and answer polls.</p>
                  <Link to={`/events/${event.slug}/live`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">Open live page <ChevronRight className="size-4" /></Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Star className="size-6 text-warning" />
                  <p className="mt-2 font-bold">
                    {feedbackQ.data?.count ? `${feedbackQ.data.averageRating.toFixed(1)} / 5 from ${feedbackQ.data.count} reviews` : 'No reviews yet'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Feedback opens after check-in — your ratings power AI post-event insights.</p>
                </CardContent>
              </Card>
            </div>
            {feedbackQ.data?.feedback?.length > 0 && (
              <div className="mt-4 space-y-3">
                {feedbackQ.data.feedback.slice(0, 3).map((f) => (
                  <div key={f._id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <Avatar name={f.user?.name} src={f.user?.avatar} className="size-7" /> {f.user?.name}
                      </span>
                      <span className="flex text-warning">{Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
                    </div>
                    {f.comment && <p className="mt-2 text-sm text-muted-foreground">{f.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Sponsors */}
          {sponsorsQ.data?.length > 0 && (
            <Section title="Sponsors">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sponsorsQ.data.map((sp) => (
                  <div key={sp._id} className="rounded-xl border bg-card p-4 text-center">
                    <img src={sp.logo} alt={sp.name} className="mx-auto size-16 rounded-lg object-cover" />
                    <p className="mt-2 font-bold text-sm">{sp.name}</p>
                    <Badge variant="secondary" className="mt-1 capitalize">{sp.tier} partner</Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Similar */}
          {similarQ.data?.length > 0 && (
            <Section title="More events you may like">
              <div className="grid gap-5 sm:grid-cols-2">
                {similarQ.data.map((e, i) => (
                  <RecommendationCard key={e._id} event={e} index={i} />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sticky registration panel */}
        <aside className="space-y-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                {activeHold && (
                  <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <Zap className="size-4 animate-pulse" />
                      <span>Reserved Seat Waiting!</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Promoted from waitlist! Seat reserved exclusively for you.
                    </p>
                    <Button
                      className="w-full font-bold shadow-md shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      size="sm"
                      onClick={() => setShowHoldModal(true)}
                    >
                      Claim Seat ({Math.floor((activeHold.secondsRemaining || 0) / 60)}m left)
                    </Button>
                  </div>
                )}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Starting at</p>
                    <p className="font-display text-3xl font-extrabold">
                      {event.price === 0 && !(event.ticketTypes || []).some((t) => t.price > 0) ? 'Free' : inr(Math.min(event.price || Infinity, ...event.ticketTypes.filter((t) => t.price > 0).map((t) => t.price)))}
                    </p>
                  </div>
                  <Badge variant={seatsLeft <= 10 ? 'warning' : 'secondary'}>
                    <Users className="size-3" /> {seatsLeft} left
                  </Badge>
                </div>
                <Progress value={fillPct} className="mt-3" />
                <p className="mt-1.5 text-xs text-muted-foreground">{event.registrationCount} registered · {event.capacity} capacity</p>

                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={activeHold ? () => setShowHoldModal(true) : register}
                  disabled={registered}
                >
                  {registered
                    ? 'Already registered'
                    : activeHold
                    ? '⚡ Claim Reserved Seat'
                    : waitlisted
                    ? 'On waitlist (Queue Active)'
                    : seatsLeft === 0
                    ? 'Join waitlist'
                    : 'Register now'}
                </Button>
                {event.status === 'live' && (
                  <Link to={`/events/${event.slug}/live`}><Button variant="destructive" className="mt-2 w-full"><Radio /> Join Live Event</Button></Link>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={gcal} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-semibold hover:bg-secondary transition">
                    <CalendarPlus className="size-4 text-primary" /> Google
                  </a>
                  <a href={endpoints.ical(event._id)} className="flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-semibold hover:bg-secondary transition">
                    <CalendarPlus className="size-4 text-primary" /> iCal
                  </a>
                  <ShareMenu event={event} className="w-full justify-center !px-2 text-[11px] [&_span]:hidden sm:[&_span]:inline" />
                </div>
                <div className="mt-3 flex justify-center">
                  <FavoriteButton eventId={event._id} favorite={event.isFavorite} size="sm" className="!bg-muted !text-foreground hover:!bg-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Organized by</p>
                  {event.organizer?._id && (
                    <Link
                      to={`/organizers/${event.organizer._id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View Profile
                    </Link>
                  )}
                </div>
                <Link
                  to={event.organizer?._id ? `/organizers/${event.organizer._id}` : '#'}
                  className="flex items-center gap-3 group"
                >
                  <Avatar name={event.organizer?.name} src={event.organizer?.avatar} className="size-11" />
                  <div>
                    <p className="font-bold text-sm group-hover:text-primary transition">{event.organizer?.name}</p>
                    <p className="text-xs text-muted-foreground">{event.organizer?.company || 'Event organizer'}</p>
                  </div>
                </Link>

                {/* TrustSphere Reputation Card */}
                {event.organizer?._id && (
                  <div className="pt-2 border-t border-border/60">
                    <OrganizerTrustCard organizerId={event.organizer._id} compact={true} showBreakdown={true} />
                  </div>
                )}
              </CardContent>
            </Card>

            <button onClick={() => navigate(`/events/${event.slug}/live`)} className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left hover:shadow-soft transition">
              <span>
                <span className="block text-sm font-bold flex items-center gap-1.5"><Heart className="size-4 text-rose-500" /> Why you’ll love it</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">QR pass · live polls · digital certificate · points</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        </aside>
      </div>

      <CheckoutDialog event={event} open={checkout} onClose={() => setCheckout(false)} />

      {activeHold && (
        <SmartHoldModal
          open={showHoldModal}
          onClose={() => setShowHoldModal(false)}
          event={event}
          hold={activeHold}
          onClaimSuccess={() => {
            eventQ.refetch();
            holdQ.refetch();
          }}
          onDeclineSuccess={() => {
            eventQ.refetch();
            holdQ.refetch();
          }}
        />
      )}
    </div>
  );
}

function Section({ title, id, children }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 font-display text-2xl font-extrabold">{title}</h2>
      {children}
    </motion.section>
  );
}

function groupSessionsByDay(sessions) {
  const map = new Map();
  [...sessions]
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .forEach((s) => {
      const d = new Date(s.startTime);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      map.get(key).items.push(s);
    });
  return [...map.values()];
}

function toGcal(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
