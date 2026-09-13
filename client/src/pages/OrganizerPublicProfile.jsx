import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, CheckCircle2, MapPin, Calendar, ArrowLeft, Award, Mail } from 'lucide-react';
import { endpoints } from '../lib/api';
import OrganizerTrustCard from '../components/trustsphere/OrganizerTrustCard';
import EventCard from '../components/events/EventCard';
import { Spinner, ErrorState } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { usePageTitle } from '../hooks/usePageTitle';
import { ListSkeleton } from '../components/ui/skeleton';

export default function OrganizerPublicProfile() {
  const { id } = useParams();

  const { data: profile, isLoading: profileLoading, isError, error, refetch } = useQuery({
    queryKey: ['organizer-public-profile', id],
    queryFn: () => endpoints.trust.getOrganizer(id),
    staleTime: 60 * 1000,
  });

  const organizer = profile?.organizer || {};
  usePageTitle(organizer.company || organizer.name ? `${organizer.company || organizer.name} — Organizer Profile` : 'Organizer Profile');

  // Query events by this organizer
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['organizer-events', id],
    queryFn: async () => {
      const res = await endpoints.events({ limit: 20 });
      const events = res?.events || [];
      return events.filter((e) => {
        const orgId = typeof e.organizer === 'object' ? e.organizer?._id : e.organizer;
        return orgId && orgId.toString() === id.toString();
      });
    },
    enabled: !!id,
  });

  if (profileLoading) return <div className="max-w-4xl mx-auto space-y-5"><div className="skeleton h-36 rounded-xl" /><ListSkeleton rows={2} /></div>;
  if (isError) return <ErrorState message={error?.message || 'Organizer profile not found'} onRetry={refetch} />;

  const events = eventsData || [];
  const upcomingEvents = events.filter((e) => new Date(e.startDate) >= new Date() && e.status !== 'cancelled');
  const pastEvents = events.filter((e) => new Date(e.startDate) < new Date() || e.status === 'completed');

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Back link */}
      <div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-3.5" /> Back to Explore Events
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-card via-card to-background p-6 sm:p-8 shadow-sm">
        {/* Subtle decorative background blur */}
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative size-20 sm:size-24 rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center font-display text-2xl font-extrabold text-primary shrink-0 shadow-md">
              {organizer.avatar ? (
                <img src={organizer.avatar} alt={organizer.name} className="size-full object-cover" />
              ) : (
                <span>{(organizer.name || 'O').charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  {organizer.company || organizer.name || 'EventSphere Organizer'}
                </h1>
                {profile.verified && (
                  <Badge variant="secondary" className="gap-1 text-xs font-semibold text-primary">
                    <CheckCircle2 className="size-3.5" /> Verified Host
                  </Badge>
                )}
              </div>

              {organizer.company && organizer.name && organizer.company !== organizer.name && (
                <p className="text-sm font-medium text-muted-foreground">
                  Represented by {organizer.name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                {organizer.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-primary" /> {organizer.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-primary" /> Member of EventSphere
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={`mailto:contact@eventsphere.demo`}>
                <Mail className="size-3.5" /> Contact Organizer
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* TrustSphere Reputation Profile */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span>Organizer Trust Intelligence</span>
        </h2>
        <OrganizerTrustCard profile={profile} showBreakdown={true} />
      </div>

      {/* Active & Upcoming Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <span>Upcoming Events by {organizer.company || organizer.name}</span>
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">
            {upcomingEvents.length} upcoming
          </span>
        </div>

        {eventsLoading ? (
          <Spinner />
        ) : upcomingEvents.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((ev) => (
              <EventCard key={ev._id} event={ev} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No upcoming events scheduled right now. Check back soon!
          </div>
        )}
      </div>

      {/* Past Completed Events Section */}
      {pastEvents.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Award className="size-5 text-primary" />
            <span>Completed Events ({pastEvents.length})</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((ev) => (
              <EventCard key={ev._id} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
