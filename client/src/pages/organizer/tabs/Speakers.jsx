import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Mic2, X } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input, Textarea, Label } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar } from '../../../components/ui/avatar';
import { Spinner } from '../../../components/ui/misc';
import { EmptyState } from '../../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../../components/ui/dialog';
import { toast } from 'sonner';

const blankForm = { name: '', title: '', company: '', bio: '', photo: '', skills: '', featured: false };

export default function Speakers() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [toDelete, setToDelete] = useState(null);

  const q = useQuery({ queryKey: ['speakers', event._id], queryFn: () => endpoints.speakers(event._id) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['speakers', event._id] });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, skills: String(form.skills).split(',').map((s) => s.trim()).filter(Boolean) };
      return editing ? endpoints.updateSpeaker(editing._id, body) : endpoints.createSpeaker(event._id, body);
    },
    onSuccess: () => { toast.success(editing ? 'Speaker updated' : 'Speaker added'); invalidate(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: endpoints.deleteSpeaker,
    onSuccess: () => { toast.success('Speaker removed'); invalidate(); setToDelete(null); },
  });

  const openNew = () => { setEditing(null); setForm(blankForm); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...blankForm, ...s, skills: (s.skills || []).join(', ') }); setOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (q.isLoading) return <Spinner />;
  const speakers = q.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{speakers.length} speaker{speakers.length !== 1 ? 's' : ''} featured on the event page.</p>
        <Button size="sm" onClick={openNew}><Plus className="size-4" /> Add speaker</Button>
      </div>

      {speakers.length === 0 ? (
        <Card><CardContent><EmptyState icon={Mic2} title="No speakers yet" description="Add keynote speakers, panelists and workshop hosts." action={<Button onClick={openNew}><Plus className="size-4" /> Add your first speaker</Button>} /></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {speakers.map((s) => (
            <Card key={s._id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} src={s.photo} className="size-14 text-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{s.name} {s.featured && <Badge variant="warning" className="ml-1">Keynote</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{s.title}{s.company ? ` · ${s.company}` : ''}</p>
                  </div>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(s)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                {s.bio && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.bio}</p>}
                {!!s.skills?.length && <div className="mt-2 flex flex-wrap gap-1">{s.skills.slice(0, 4).map((sk) => <Badge key={sk} variant="secondary" className="text-[10px]">{sk}</Badge>)}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit speaker' : 'Add speaker'}>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={form.name} src={form.photo} className="size-14" />
            <div className="flex-1">
              <Label>Photo URL</Label>
              <Input className="mt-1" value={form.photo} onChange={(e) => set('photo', e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div><Label required>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
            <div><Label>Company / institution</Label><Input className="mt-1" value={form.company} onChange={(e) => set('company', e.target.value)} /></div>
          </div>
          <div><Label>Skills (comma separated)</Label><Input className="mt-1" value={form.skills} onChange={(e) => set('skills', e.target.value)} /></div>
          <div><Label>Bio</Label><Textarea className="mt-1" value={form.bio} onChange={(e) => set('bio', e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature as keynote speaker</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /> Cancel</Button>
          <Button loading={save.isPending} onClick={() => form.name ? save.mutate() : toast.error('Name is required')}>
            {editing ? 'Save changes' : 'Add speaker'}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Remove speaker?"
        message={`Remove ${toDelete?.name} from this event?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
