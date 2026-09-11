import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Hand, Mic2, QrCode, MapPin, Clock, Radio, ChevronRight, BadgeCheck,
} from 'lucide-react';
import { endpoints } from '../lib/api';
import { useAuth } from '../store/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/misc';
import { EmptyState } from '../components/ui/states';
import { fmtDate, fmtTime, fmtDateTime } from '../lib/format';

export default function RoleHome() {
  const { user } = useAuth();
  return user.role === 'speaker' ? <SpeakerHome /> : <VolunteerHome />;
}

function VolunteerHome() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['my-assignments'], queryFn: endpoints.myAssignments });
  if (q.isLoading) return <Spinner />;
  const items = q.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold">My Volunteer Assignments</h2>
        <p className="text-sm text-muted-foreground">Welcome, {user.name?.split(' ')[0]} — your shifts and check-in desks.</p>
      </div>

      {items.length === 0 ? (
        <Card><CardContent>
          <EmptyState icon={Hand} title="No assignments yet"
            description="When an organizer assigns you to an event, it will appear here with your role, zone and shift." />
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((v) => (
            <Card key={v._id}>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {v.event?.coverImage
                    ? <img src={v.event.coverImage} alt="" className="size-20 rounded-xl object-cover" />
                    : <span className="grid size-20 place-items-center rounded-xl bg-muted"><Hand className="size-8 text-muted-foreground" /></span>}
                  <div className="min-w-0 flex-1">
                    <Link to={`/events/${v.event?.slug}`} className="font-bold hover:text-primary">{v.event?.title || 'Event'}</Link>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {fmtDateTime(v.startTime || v.event?.startDate)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {v.event?.venue?.name || v.zone || 'Venue TBA'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{v.role}</Badge>
                      {v.zone && <Badge variant="outline">{v.zone}</Badge>}
                      <Badge variant={v.status === 'accepted' || v.status === 'completed' ? 'success' : 'warning'} className="capitalize">{v.status}</Badge>
                    </div>
                  </div>
                </div>
                {v.task && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">{v.task}</p>}
                {v.event?.organizer && (
                  <p className="mt-2 text-xs text-muted-foreground">Organizer: {v.event.organizer.name} {v.event.organizer.phone ? `· ${v.event.organizer.phone}` : ''}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Link to={`/dashboard/check-in/${v.event?._id}`}><Button size="sm"><QrCode className="size-4" /> Check-in desk</Button></Link>
                  {v.event?.status === 'live' && <Link to={`/events/${v.event.slug}/live`}><Button size="sm" variant="outline"><Radio className="size-4" /> Live event</Button></Link>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakerHome() {
  const q = useQuery({ queryKey: ['my-speaking'], queryFn: endpoints.mySpeaking });
  if (q.isLoading) return <Spinner />;
  const items = q.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold">My Speaking Sessions</h2>
        <p className="text-sm text-muted-foreground">Your upcoming and past sessions across EventSphere.</p>
      </div>

      {items.length === 0 ? (
        <Card><CardContent>
          <EmptyState icon={Mic2} title="No sessions yet"
            description="When organizers add you as a speaker, your sessions and prep materials show up here." />
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map((s) => (
            <Card key={s._id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                {s.event?.coverImage
                  ? <img src={s.event.coverImage} alt="" className="size-20 rounded-xl object-cover" />
                  : <span className="grid size-20 place-items-center rounded-xl bg-muted"><Mic2 className="size-8 text-muted-foreground" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BadgeCheck className="size-3.5 text-primary" />
                    {fmtDate(s.event?.startDate)} · {fmtTime(s.startTime)} – {fmtTime(s.endTime)} · {s.room}
                  </p>
                  <Link to={`/events/${s.event?.slug}`} className="mt-1 block text-lg font-bold hover:text-primary">{s.title}</Link>
                  <p className="text-sm text-muted-foreground">at {s.event?.title}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">{s.type}</Badge>
                </div>
                <div className="flex gap-2">
                  {s.event?.status === 'live' && <Link to={`/events/${s.event.slug}/live`}><Button size="sm"><Radio className="size-4" /> Join live</Button></Link>}
                  <Link to={`/events/${s.event?.slug}`}><Button size="sm" variant="outline">Event page <ChevronRight className="size-4" /></Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
