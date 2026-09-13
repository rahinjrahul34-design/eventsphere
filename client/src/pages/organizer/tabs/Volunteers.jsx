import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Hand, X, CheckCircle2, Phone } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input, Textarea, Label, Select } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar } from '../../../components/ui/avatar';

import { EmptyState } from '../../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../../components/ui/dialog';
import { fmtDateTime } from '../../../lib/format';
import { toast } from 'sonner';
import { ListSkeleton } from '../../../components/ui/skeleton';

const ROLES = ['Registration Desk', 'Crowd Management', 'Tech Support', 'Stage & Backstage', 'Food & Hospitality', 'Photography', 'Security'];
const blank = { name: '', email: '', phone: '', role: ROLES[0], task: '', zone: '', startTime: '', endTime: '' };

export default function Volunteers() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [toDelete, setToDelete] = useState(null);

  const q = useQuery({ queryKey: ['volunteers', event._id], queryFn: () => endpoints.volunteers(event._id) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['volunteers', event._id] });

  const save = useMutation({
    mutationFn: () => endpoints.createVolunteer(event._id, {
      ...form,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
    }),
    onSuccess: () => { toast.success('Volunteer assigned'); invalidate(); setOpen(false); setForm(blank); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: endpoints.deleteVolunteer,
    onSuccess: () => { toast.success('Assignment removed'); invalidate(); setToDelete(null); },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => endpoints.updateVolunteer(id, { status }),
    onSuccess: () => { toast.success('Status updated'); invalidate(); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (q.isLoading) return <ListSkeleton rows={5} />;
  const volunteers = q.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{volunteers.length} volunteer assignment{volunteers.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Assign volunteer</Button>
      </div>

      {volunteers.length === 0 ? (
        <Card><CardContent><EmptyState icon={Hand} title="No volunteers assigned" description="Recruit volunteers for the desk, crowd, stage and tech support." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Assign a volunteer</Button>} /></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {volunteers.map((v) => (
            <Card key={v._id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={v.name} src={v.user?.avatar} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{v.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{v.email}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="opacity-0 transition group-hover:opacity-100" onClick={() => setToDelete(v)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{v.role}</Badge>
                  {v.zone && <Badge variant="outline">{v.zone}</Badge>}
                  <Badge variant={v.status === 'accepted' || v.status === 'completed' ? 'success' : 'warning'} className="capitalize">{v.status}</Badge>
                </div>
                {v.task && <p className="mt-2 text-xs text-muted-foreground">{v.task}</p>}
                {(v.startTime || v.phone) && (
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {v.startTime && <p>Shift: {fmtDateTime(v.startTime)}{v.endTime ? ` – ${fmtDateTime(v.endTime)}` : ''}</p>}
                    {v.phone && <p className="flex items-center gap-1"><Phone className="size-3" /> {v.phone}</p>}
                  </div>
                )}
                {v.status === 'assigned' && (
                  <Button size="sm" variant="outline" className="mt-3 w-full" loading={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: v._id, status: 'accepted' })}>
                    <CheckCircle2 className="size-4" /> Mark accepted
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Assign volunteer">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label required>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" className="mt-1" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div>
            <Label>Role</Label>
            <Select className="mt-1" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Zone / area</Label><Input className="mt-1" value={form.zone} onChange={(e) => set('zone', e.target.value)} placeholder="e.g. Main entrance, Hall B" /></div>
          <div><Label>Shift start</Label><Input type="datetime-local" className="mt-1" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></div>
          <div><Label>Shift end</Label><Input type="datetime-local" className="mt-1" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Task details</Label><Textarea className="mt-1" value={form.task} onChange={(e) => set('task', e.target.value)} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /> Cancel</Button>
          <Button loading={save.isPending} onClick={() => form.name && form.email ? save.mutate() : toast.error('Name and email are required')}>Assign</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Remove volunteer?"
        message={`Remove ${toDelete?.name} from this event?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
