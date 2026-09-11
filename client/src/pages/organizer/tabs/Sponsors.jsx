import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Award, X, ExternalLink } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input, Textarea, Label, Select } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Spinner } from '../../../components/ui/misc';
import { EmptyState } from '../../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../../components/ui/dialog';
import { toast } from 'sonner';

const TIERS = ['title', 'platinum', 'gold', 'silver', 'bronze', 'partner'];
const blank = { name: '', tier: 'gold', logo: '', website: '', description: '', contribution: '' };

export default function Sponsors() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [toDelete, setToDelete] = useState(null);

  const q = useQuery({ queryKey: ['sponsors', event._id], queryFn: () => endpoints.sponsors(event._id) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sponsors', event._id] });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, contribution: form.contribution ? Number(form.contribution) : undefined };
      return editing ? endpoints.updateSponsor(editing._id, body) : endpoints.createSponsor(event._id, body);
    },
    onSuccess: () => { toast.success(editing ? 'Sponsor updated' : 'Sponsor added'); invalidate(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: endpoints.deleteSponsor,
    onSuccess: () => { toast.success('Sponsor removed'); invalidate(); setToDelete(null); },
  });

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...blank, ...s }); setOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (q.isLoading) return <Spinner />;
  const sponsors = q.data || [];
  const byTier = TIERS.map((t) => ({ tier: t, list: sponsors.filter((s) => s.tier === t) })).filter((g) => g.list.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}><Plus className="size-4" /> Add sponsor</Button>
      </div>

      {sponsors.length === 0 ? (
        <Card><CardContent><EmptyState icon={Award} title="No sponsors yet" description="Showcase title, platinum, gold and partner sponsors with their logos." action={<Button onClick={openNew}><Plus className="size-4" /> Add first sponsor</Button>} /></CardContent></Card>
      ) : (
        byTier.map((group) => (
          <Card key={group.tier}>
            <CardContent className="p-4">
              <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-primary">{group.tier} sponsors</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.list.map((s) => (
                  <div key={s._id} className="group flex items-center gap-3 rounded-xl border p-3">
                    {s.logo
                      ? <img src={s.logo} alt="" className="size-12 rounded-lg object-contain bg-muted p-1" />
                      : <span className="grid size-12 place-items-center rounded-lg bg-muted text-lg font-bold">{s.name?.[0]}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-sm">{s.name}</p>
                      <Badge variant="secondary" className="capitalize">{s.tier}</Badge>
                      {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex align-middle text-xs text-primary"><ExternalLink className="size-3" /></a>}
                    </div>
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(s)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit sponsor' : 'Add sponsor'}>
        <div className="grid gap-3">
          <div><Label required>Sponsor name</Label><Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tier</Label>
              <Select className="mt-1" value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </Select>
            </div>
            <div><Label>Contribution (₹)</Label><Input type="number" className="mt-1" value={form.contribution} onChange={(e) => set('contribution', e.target.value)} /></div>
          </div>
          <div><Label>Logo URL</Label><Input className="mt-1" value={form.logo} onChange={(e) => set('logo', e.target.value)} placeholder="https://…" /></div>
          <div><Label>Website</Label><Input className="mt-1" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></div>
          <div><Label>Description / perks</Label><Textarea className="mt-1" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /> Cancel</Button>
          <Button loading={save.isPending} onClick={() => form.name ? save.mutate() : toast.error('Name is required')}>{editing ? 'Save' : 'Add sponsor'}</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Remove sponsor?"
        message={`Remove ${toDelete?.name}?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
