import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Clock, X, Sparkles } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input, Textarea, Label, Select } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Spinner } from '../../../components/ui/misc';
import { EmptyState } from '../../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../../components/ui/dialog';
import { fmtTime, fmtDay } from '../../../lib/format';
import { toast } from 'sonner';

const TYPES = ['keynote', 'talk', 'workshop', 'panel', 'break', 'networking', 'activity', 'ceremony'];
const blankForm = { title: '', description: '', type: 'talk', room: 'Main Hall', start: '', end: '', speakerIds: [] };

// Build a datetime-local value N days after the event start.
const baseDay = (event, day = 1) => {
  const d = new Date(event.startDate);
  d.setDate(d.getDate() + (day - 1));
  d.setHours(9, 0, 0, 0);
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export default function Schedule() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [toDelete, setToDelete] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const q = useQuery({ queryKey: ['sessions', event._id], queryFn: () => endpoints.sessions(event._id) });
  const speakersQ = useQuery({ queryKey: ['speakers', event._id], queryFn: () => endpoints.speakers(event._id) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sessions', event._id] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title, description: form.description, type: form.type, room: form.room,
        startTime: new Date(form.start).toISOString(),
        endTime: new Date(form.end).toISOString(),
        speaker: form.speakerIds[0] || undefined,
      };
      return editing ? endpoints.updateSession(editing._id, body) : endpoints.createSession(event._id, body);
    },
    onSuccess: () => { toast.success(editing ? 'Session updated' : 'Session added'); invalidate(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: endpoints.deleteSession,
    onSuccess: () => { toast.success('Session removed'); invalidate(); setToDelete(null); },
  });

  const openNew = () => {
    setEditing(null);
    const start = baseDay(event);
    const endD = new Date(new Date(start).getTime() + 60 * 60000);
    setForm({ ...blankForm, start, end: endD.toISOString().slice(0, 16) });
    setOpen(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    const toLocal = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
    setForm({
      title: s.title, description: s.description || '', type: s.type, room: s.room || '',
      start: toLocal(s.startTime), end: toLocal(s.endTime), speakerIds: s.speaker?._id ? [s.speaker._id] : [],
    });
    setOpen(true);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const data = await endpoints.aiPlan(`${event.title}: ${event.shortDescription || event.categorySlug}, ${event.eventType} event running ${fmtDay(event.startDate)}`);
      const plan = data.plan?.schedule || [];
      for (const s of plan) {
        const day = Number(s.day || 1);
        const [hh, mm] = String(s.time || '10:00').split(':').map(Number);
        const startD = new Date(event.startDate);
        startD.setDate(startD.getDate() + day - 1); startD.setHours(hh, mm, 0, 0);
        const endD = new Date(startD.getTime() + Number(s.duration || 60) * 60000);
        // eslint-disable-next-line no-await-in-loop
        await endpoints.createSession(event._id, {
          title: s.title, type: s.type || 'talk', room: s.room || 'Main Hall',
          startTime: startD.toISOString(), endTime: endD.toISOString(), day,
        });
      }
      toast.success(`AI generated ${plan.length} sessions`);
      invalidate();
    } catch (e) {
      toast.error(e.message);
    } finally { setAiLoading(false); }
  };

  if (q.isLoading) return <Spinner />;
  const sessions = q.data || [];
  const days = [...new Set(sessions.map((s) => {
    const start = new Date(s.startTime); const base = new Date(event.startDate);
    return Math.floor((start.setHours(0, 0, 0, 0) - new Date(base).setHours(0, 0, 0, 0)) / 86400000) + 1;
  }))].sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{sessions.length} sessions</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" loading={aiLoading} onClick={generateAI}><Sparkles className="size-4" /> AI-generate schedule</Button>
          <Button size="sm" onClick={openNew}><Plus className="size-4" /> Add session</Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card><CardContent><EmptyState icon={Clock} title="No sessions scheduled" description="Build your agenda — or let the AI Copilot generate a full plan." action={<Button onClick={openNew}><Plus className="size-4" /> Add first session</Button>} /></CardContent></Card>
      ) : (
        days.map((day) => {
          const dayDate = new Date(event.startDate); dayDate.setDate(dayDate.getDate() + day - 1);
          const items = sessions.filter((s) => {
            const start = new Date(s.startTime); const base = new Date(event.startDate);
            return Math.floor((new Date(start).setHours(0, 0, 0, 0) - new Date(base).setHours(0, 0, 0, 0)) / 86400000) + 1 === day;
          });
          return (
            <Card key={day}>
              <CardContent className="p-4">
                <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-primary">Day {day} · {fmtDay(dayDate)}</p>
                <div className="space-y-2">
                  {items.map((s) => (
                    <div key={s._id} className="group flex items-start gap-3 rounded-xl border p-3">
                      <div className="w-28 shrink-0 text-right">
                        <p className="text-sm font-bold">{fmtTime(s.startTime)}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(s.endTime)}</p>
                      </div>
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-sm">{s.title}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{s.type}</Badge>
                          {s.room && <Badge variant="outline" className="text-[10px]">{s.room}</Badge>}
                        </div>
                        {s.speaker && <p className="text-xs text-muted-foreground">{s.speaker.name}{s.speaker.title ? ` · ${s.speaker.title}` : ''}</p>}
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
          );
        })
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit session' : 'Add session'} size="lg">
        <div className="grid gap-3">
          <div><Label required>Session title</Label><Input className="mt-1" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Opening Keynote: The Future of AI" /></div>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description (optional)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Start</Label><Input type="datetime-local" className="mt-1" value={form.start} onChange={(e) => {
              set('start', e.target.value);
              const endD = new Date(new Date(e.target.value).getTime() + 60 * 60000);
              setForm((f) => ({ ...f, start: e.target.value, end: new Date(endD.getTime() - endD.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
            }} /></div>
            <div><Label>End</Label><Input type="datetime-local" className="mt-1" value={form.end} onChange={(e) => set('end', e.target.value)} /></div>
            <div>
              <Label>Type</Label>
              <Select className="mt-1" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </Select>
            </div>
            <div><Label>Room / stage</Label><Input className="mt-1" value={form.room} onChange={(e) => set('room', e.target.value)} /></div>
          </div>
          <div>
            <Label>Speaker</Label>
            <Select className="mt-1" value={form.speakerIds[0] || ''} onChange={(e) => set('speakerIds', e.target.value ? [e.target.value] : [])}>
              <option value="">— No speaker —</option>
              {(speakersQ.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /> Cancel</Button>
          <Button loading={save.isPending} onClick={() => form.title && form.start ? save.mutate() : toast.error('Title and start time are required')}>
            {editing ? 'Save changes' : 'Add session'}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Remove session?"
        message={`Remove “${toDelete?.title}” from the schedule?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
