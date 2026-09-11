import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, MoreVertical, BarChart3, QrCode, Radio, Pencil, Trash2, Eye } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dropdown, MenuItem } from '../../components/ui/misc';
import { Spinner } from '../../components/ui/misc';
import { EmptyState } from '../../components/ui/states';
import { fmtDate, inr } from '../../lib/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useState } from 'react';

export default function EventsList() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['my-events'], queryFn: endpoints.myEvents });
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState(null);

  const del = useMutation({
    mutationFn: endpoints.deleteEvent,
    onSuccess: () => { toast.success('Event deleted'); qc.invalidateQueries({ queryKey: ['my-events'] }); setToDelete(null); },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => endpoints.setEventStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['my-events'] }); },
  });

  if (q.isLoading) return <Spinner />;
  const events = q.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold">My Events</h2>
          <p className="text-sm text-muted-foreground">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/dashboard/events/create"><Button><Plus className="size-4" /> Create event</Button></Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Plus}
              title="No events yet"
              description="Create your first event — registration, QR check-in, live mode and analytics are all included."
              action={<Link to="/dashboard/events/create"><Button>Create your first event</Button></Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((e) => (
            <Card key={e._id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <img src={e.coverImage} alt="" className="size-20 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/dashboard/events/${e._id}`} className="font-bold hover:text-primary">{e.title}</Link>
                  <p className="text-xs text-muted-foreground">{fmtDate(e.startDate, 'EEE d MMM yyyy')} · {e.venue?.city || 'Online'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={e.status === 'live' ? 'live' : e.approvalStatus === 'approved' ? 'success' : 'warning'}>
                      {e.approvalStatus === 'pending' ? 'Pending approval' : e.status}
                    </Badge>
                    <Badge variant="secondary">{e.registrationCount} registered</Badge>
                    <Badge variant="secondary">{e.checkedInCount} checked in</Badge>
                    <Badge variant="secondary">{inr(e.price)}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {e.status === 'draft' && (
                    <Button size="sm" variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: e._id, status: 'published' })}>
                      Publish
                    </Button>
                  )}
                  {e.status === 'published' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: e._id, status: 'live' })}>
                      <Radio className="size-4" /> Go live
                    </Button>
                  )}
                  {e.status === 'live' && (
                    <Link to={`/events/${e.slug}/live`}><Button size="sm" variant="destructive"><Radio className="size-4" /> Live center</Button></Link>
                  )}
                  <Link to={`/dashboard/events/${e._id}/check-in`} className="hidden sm:block">
                    <Button size="sm" variant="ghost"><QrCode className="size-4" /> Scan</Button>
                  </Link>
                  <Dropdown
                    trigger={<button className="grid size-9 place-items-center rounded-lg hover:bg-secondary" aria-label="Event actions"><MoreVertical className="size-4" /></button>}
                  >
                    <MenuItem icon={Eye} onClick={() => navigate(`/events/${e.slug}`)}>View public page</MenuItem>
                    <MenuItem icon={BarChart3} onClick={() => navigate(`/dashboard/events/${e._id}`)}>Overview &amp; analytics</MenuItem>
                    <MenuItem icon={QrCode} onClick={() => navigate(`/dashboard/events/${e._id}/check-in`)}>Check-in</MenuItem>
                    <MenuItem icon={Pencil} onClick={() => toast('Recreate or adjust events from the manage tabs — inline edit is on the roadmap')}>Edit listing</MenuItem>
                    <MenuItem icon={Trash2} danger onClick={() => setToDelete(e)}>Delete</MenuItem>
                  </Dropdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Delete this event?"
        message={`“${toDelete?.title}” and its management data will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete event"
      />
    </div>
  );
}
