import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea, Label } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Spinner, Tabs } from '../../components/ui/misc';
import { EmptyState } from '../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { fmtDate } from '../../lib/format';
import { toast } from 'sonner';

export default function AdminApprovals() {
  const [tab, setTab] = useState('events');
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Event Approvals</h2>
        <p className="text-sm text-muted-foreground">Review events before they appear in public discovery.</p>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { value: 'events', label: 'Pending events' },
        { value: 'organizers', label: 'Organizer applications' },
        { value: 'all', label: 'All events' },
      ]} />
      {tab === 'events' && <EventsList filter="pending" />}
      {tab === 'all' && <EventsList filter="all" />}
      {tab === 'organizers' && <OrganizerApps />}
    </div>
  );
}

function EventsList({ filter }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['admin-events', filter],
    queryFn: () => endpoints.adminEvents(filter === 'pending' ? { approvalStatus: 'pending' } : {}),
  });

  const approve = useMutation({
    mutationFn: ({ id, publish }) => endpoints.approveEvent(id, { publish }),
    onSuccess: () => { toast.success('Event approved'); qc.invalidateQueries({ queryKey: ['admin-events'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: ({ id, note: n }) => endpoints.rejectEvent(id, { note: n }),
    onSuccess: () => { toast.success('Event sent back to organizer'); qc.invalidateQueries({ queryKey: ['admin-events'] }); setRejecting(null); setNote(''); },
    onError: (e) => toast.error(e.message),
  });

  if (q.isLoading) return <Spinner />;
  const events = q.data || [];

  if (!events.length) return (
    <Card><CardContent><EmptyState icon={ShieldCheck} title="Nothing to review" description="Newly created events will queue up here." /></CardContent></Card>
  );

  return (
    <div className="grid gap-4">
      {events.map((e) => (
        <Card key={e._id} className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <img src={e.coverImage} alt="" className="size-20 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <Link to={`/events/${e.slug}`} className="font-bold hover:text-primary">{e.title} <ExternalLink className="ml-1 inline size-3.5" /></Link>
              <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{e.shortDescription || e.description?.slice(0, 160)}</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>by {e.organizer?.name} ({e.organizer?.email})</span> ·
                <span>{fmtDate(e.startDate)}</span> ·
                <Badge variant={e.approvalStatus === 'approved' ? 'success' : e.approvalStatus === 'rejected' ? 'destructive' : 'warning'} className="capitalize">{e.approvalStatus}</Badge>
                <Badge variant="secondary" className="capitalize">{e.status}</Badge>
                {e.approvalNote && <Badge variant="outline">Note: {e.approvalNote}</Badge>}
              </div>
            </div>
            {e.approvalStatus !== 'approved' && (
              <div className="flex gap-2">
                <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate({ id: e._id, publish: true })}>
                  <Check className="size-4" /> Approve &amp; publish
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(e)}><X className="size-4" /> Reject</Button>
              </div>
            )}
            {e.approvalStatus === 'approved' && (
              <Button size="sm" variant="outline" onClick={() => setRejecting(e)}>Request changes</Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title="Reject / request changes">
        <Label>Reason (sent to the organizer)</Label>
        <Textarea className="mt-1" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Please add a full venue address and speaker details." />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="destructive" loading={reject.isPending} onClick={() => reject.mutate({ id: rejecting._id, note })}>Send back</Button>
        </div>
      </Dialog>
    </div>
  );
}

function OrganizerApps() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-users', 'org-pending'],
    queryFn: () => endpoints.adminUsers({ role: 'organizer', organizerStatus: 'pending' }),
  });
  const update = useMutation({
    mutationFn: ({ id, body }) => endpoints.updateUser(id, body),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); },
  });
  if (q.isLoading) return <Spinner />;
  const users = q.data || [];
  if (!users.length) return (
    <Card><CardContent><EmptyState icon={ShieldCheck} title="No applications" description="Organizer applications appear here." /></CardContent></Card>
  );
  return (
    <div className="grid gap-3">
      {users.map((u) => (
        <Card key={u._id}>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{u.name}</p>
              <p className="text-sm text-muted-foreground">{u.email} · {u.company || u.title || 'Student'}</p>
              {u.organizerApplication?.reason && <p className="mt-1 rounded-lg bg-muted p-2 text-sm">“{u.organizerApplication.reason}”</p>}
            </div>
            <Button size="sm" onClick={() => update.mutate({ id: u._id, body: { organizerStatus: 'approved' } })}>
              <Check className="size-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => update.mutate({ id: u._id, body: { organizerStatus: 'rejected' } })}>
              <X className="size-4" /> Reject
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
