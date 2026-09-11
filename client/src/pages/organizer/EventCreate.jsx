import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Info, CalendarDays, MapPin, Ticket, Mic2, Clock, FileText, Rocket, Check, Plus, X,
  ChevronLeft, ChevronRight, Sparkles, Bot,
} from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Label, Select } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { EVENT_CATEGORIES } from '../../lib/format';
import { toast } from 'sonner';

const DRAFT_KEY = 'es-event-draft';
const STEPS = [
  { key: 'basic', label: 'Basics', icon: Info },
  { key: 'datetime', label: 'Date & time', icon: CalendarDays },
  { key: 'venue', label: 'Venue', icon: MapPin },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'speakers', label: 'Speakers', icon: Mic2 },
  { key: 'schedule', label: 'Schedule', icon: Clock },
  { key: 'form', label: 'Reg. form', icon: FileText },
  { key: 'publish', label: 'Publish', icon: Rocket },
];

const today = new Date();
const toLocalInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

const blank = {
  title: '', shortDescription: '', description: '', coverImage: '',
  categorySlug: '', tags: '', eventType: 'offline',
  startDate: toLocalInput(new Date(today.getTime() + 14 * 86400000)),
  endDate: toLocalInput(new Date(today.getTime() + 14 * 86400000 + 8 * 3600000)),
  timezone: 'Asia/Kolkata', registrationDeadline: '',
  venueName: '', address: '', city: '', onlineUrl: '', lat: '', lng: '',
  capacity: 100, price: 0, ticketTypes: [],
  speakers: [], schedule: [], customFields: [],
};

export default function EventCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...blank, ...JSON.parse(saved) } : blank;
    } catch { return blank; }
  });
  const [errors, setErrors] = useState({});

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: endpoints.categories });

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(form)), 400);
    return () => clearTimeout(t);
  }, [form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const cat = (categories || EVENT_CATEGORIES).find((c) => c.slug === form.categorySlug);
      const payload = {
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        coverImage: form.coverImage || undefined,
        category: cat?._id,
        categorySlug: form.categorySlug,
        tags: String(form.tags).split(',').map((t) => t.trim()).filter(Boolean),
        eventType: form.eventType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        timezone: form.timezone,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
        venue: {
          name: form.venueName, address: form.address, city: form.city, onlineUrl: form.onlineUrl,
          coordinates: form.lat && form.lng ? { type: 'Point', coordinates: [Number(form.lng), Number(form.lat)] } : undefined,
        },
        capacity: Number(form.capacity),
        price: Number(form.price),
        ticketTypes: form.ticketTypes,
        customRegistrationFields: form.customFields.map(({ id, ...rest }) => rest),
        faq: [],
        status: 'published',
      };
      const event = await endpoints.createEvent(payload);
      // Related records created in their own collections after the event exists.
      for (const sp of form.speakers) {
        // eslint-disable-next-line no-await-in-loop
        await endpoints.createSpeaker(event._id, sp);
      }
      for (const sc of form.schedule) {
        // eslint-disable-next-line no-await-in-loop
        await endpoints.createSession(event._id, {
          title: sc.title, type: sc.type || 'talk', room: sc.room || 'Main Hall',
          startTime: new Date(`${form.startDate.slice(0, 10)}T${sc.time || '10:00'}`).toISOString(),
          endTime: new Date(new Date(`${form.startDate.slice(0, 10)}T${sc.time || '10:00'}`).getTime() + Number(sc.duration || 60) * 60000).toISOString(),
          day: Number(sc.day || 1), order: Number(sc.time?.replace(':', '') || 0),
        });
      }
      return event;
    },
    onSuccess: (event) => {
      toast.success('Event published! 🎉');
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/dashboard/events/${event._id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const canNext = () => {
    if (STEPS[step].key === 'basic') return form.title && form.categorySlug && form.description.length > 20;
    if (STEPS[step].key === 'datetime') return form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate);
    if (STEPS[step].key === 'venue') return form.eventType === 'online' ? true : form.venueName && form.city;
    if (STEPS[step].key === 'tickets') return Number(form.capacity) > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Create an event</h2>
          <p className="text-sm text-muted-foreground">Drafts auto-save in your browser. {useMemo(() => '', [])}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/copilot')}>
          <Bot className="size-4" /> Generate with AI Copilot
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl border bg-card p-2">
        {STEPS.map((s, i) => (
          <button key={s.key} onClick={() => setStep(i)}
            className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
              i === step ? 'bg-primary text-primary-foreground' : i < step ? 'text-primary hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary')}>
            <span className={cn('grid size-5 place-items-center rounded-full text-[10px]', i === step ? 'bg-white/25' : i < step ? 'bg-primary/15' : 'bg-muted')}>
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && <StepBasic form={form} set={set} errors={errors} categories={categories || []} />}
          {step === 1 && <StepDateTime form={form} set={set} />}
          {step === 2 && <StepVenue form={form} set={set} />}
          {step === 3 && <StepTickets form={form} set={set} />}
          {step === 4 && <StepSpeakers form={form} set={set} />}
          {step === 5 && <StepSchedule form={form} set={set} />}
          {step === 6 && <StepForm form={form} set={set} />}
          {step === 7 && <StepPublish form={form} setForm={setForm} />}

          <div className="mt-8 flex justify-between border-t pt-5">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="size-4" /> Back
            </Button>
            {step < 7 ? (
              <Button onClick={() => (canNext() ? setStep((s) => s + 1) : toast.error('Please complete the required fields'))}>
                Continue <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button loading={create.isPending} onClick={() => create.mutate()}>
                <Rocket className="size-4" /> Publish event
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Steps ───────── */

function StepBasic({ form, set, categories }) {
  return (
    <div className="grid gap-4">
      <div>
        <Label required>Event name</Label>
        <Input className="mt-1" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. AI Innovation Summit 2026" />
      </div>
      <div>
        <Label required>Category</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(categories.length ? categories : EVENT_CATEGORIES).map((c) => (
            <button type="button" key={c.slug} onClick={() => set('categorySlug', c.slug)}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', form.categorySlug === c.slug ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50')}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label required>Short description</Label>
        <Input className="mt-1" maxLength={200} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line summary shown on cards" />
      </div>
      <div>
        <Label required>Full description</Label>
        <Textarea className="mt-1 min-h-[140px]" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe what attendees will experience…" />
        <p className="mt-1 text-xs text-muted-foreground">{form.description.length} characters</p>
      </div>
      <div>
        <Label>Tags (comma separated)</Label>
        <Input className="mt-1" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="AI/ML, Startups, Workshop" />
      </div>
      <div>
        <Label>Cover image URL</Label>
        <Input className="mt-1" value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="https://…" />
        {form.coverImage && <img src={form.coverImage} alt="" className="mt-2 h-40 rounded-lg object-cover" />}
      </div>
      <div>
        <Label required>Event type</Label>
        <div className="mt-2 flex gap-2">
          {['offline', 'online', 'hybrid'].map((t) => (
            <button type="button" key={t} onClick={() => set('eventType', t)}
              className={cn('flex-1 rounded-lg border p-3 text-sm font-semibold capitalize', form.eventType === t ? 'border-primary bg-primary/5 text-primary' : '')}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDateTime({ form, set }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label required>Start date & time</Label>
        <Input type="datetime-local" className="mt-1" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
      </div>
      <div>
        <Label required>End date & time</Label>
        <Input type="datetime-local" className="mt-1" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
      </div>
      <div>
        <Label>Timezone</Label>
        <Select className="mt-1" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="UTC">UTC</option>
          <option value="Asia/Dubai">Asia/Dubai</option>
          <option value="Europe/London">Europe/London</option>
        </Select>
      </div>
      <div>
        <Label>Registration deadline</Label>
        <Input type="datetime-local" className="mt-1" value={form.registrationDeadline} onChange={(e) => set('registrationDeadline', e.target.value)} />
      </div>
    </div>
  );
}

function StepVenue({ form, set }) {
  return (
    <div className="grid gap-4">
      {form.eventType !== 'offline' && (
        <div>
          <Label>Online link (Zoom/YouTube/Meet)</Label>
          <Input className="mt-1" value={form.onlineUrl} onChange={(e) => set('onlineUrl', e.target.value)} placeholder="https://…" />
        </div>
      )}
      {form.eventType !== 'online' && (
        <>
          <div>
            <Label required>Venue name</Label>
            <Input className="mt-1" value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="Main Auditorium, KKWIEER" />
          </div>
          <div>
            <Label>Address</Label>
            <Input className="mt-1" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Nashik-Pune Road" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label required>City</Label>
              <Input className="mt-1" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Nashik" />
            </div>
            <div>
              <Label>Latitude</Label>
              <Input className="mt-1" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="19.9975" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input className="mt-1" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="73.7898" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tip: use OpenStreetMap to find coordinates for the interactive map.</p>
        </>
      )}
    </div>
  );
}

function StepTickets({ form, set }) {
  const addTicket = () => set('ticketTypes', [...form.ticketTypes, { name: '', description: '', price: 0, quantity: 0 }]);
  const upd = (i, k, v) => set('ticketTypes', form.ticketTypes.map((t, ti) => ti === i ? { ...t, [k]: v } : t));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Total capacity</Label>
          <Input type="number" min="1" className="mt-1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </div>
        <div>
          <Label>Default price (0 = free)</Label>
          <Input type="number" min="0" className="mt-1" value={form.price} onChange={(e) => set('price', e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ticket tiers</Label>
          <Button type="button" size="sm" variant="outline" onClick={addTicket}><Plus className="size-4" /> Add tier</Button>
        </div>
        {form.ticketTypes.map((t, i) => (
          <div key={i} className="relative grid gap-2 rounded-xl border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <Input placeholder="Tier name (e.g. Pro Pass)" value={t.name} onChange={(e) => upd(i, 'name', e.target.value)} />
            <Input type="number" placeholder="Price ₹" value={t.price} onChange={(e) => upd(i, 'price', Number(e.target.value))} />
            <Input type="number" placeholder="Qty (0 ∞)" value={t.quantity} onChange={(e) => upd(i, 'quantity', Number(e.target.value))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => set('ticketTypes', form.ticketTypes.filter((_, ti) => ti !== i))}><X className="size-4 text-destructive" /></Button>
            <Input className="sm:col-span-4" placeholder="What’s included?" value={t.description} onChange={(e) => upd(i, 'description', e.target.value)} />
          </div>
        ))}
        {form.ticketTypes.length === 0 && <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">No tiers — a single free General admission tier will be used.</p>}
      </div>
    </div>
  );
}

function StepSpeakers({ form, set }) {
  const add = () => set('speakers', [...form.speakers, { name: '', title: '', company: '', bio: '', skills: '', photo: '' }]);
  const upd = (i, k, v) => set('speakers', form.speakers.map((s, si) => si === i ? { ...s, [k]: v } : s));
  return (
    <div className="space-y-3">
      {form.speakers.map((s, i) => (
        <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
          <Input placeholder="Speaker name" value={s.name} onChange={(e) => upd(i, 'name', e.target.value)} />
          <Input placeholder="Photo URL" value={s.photo} onChange={(e) => upd(i, 'photo', e.target.value)} />
          <Input placeholder="Title (e.g. AI Research Lead)" value={s.title} onChange={(e) => upd(i, 'title', e.target.value)} />
          <Input placeholder="Company / institution" value={s.company} onChange={(e) => upd(i, 'company', e.target.value)} />
          <Input className="sm:col-span-2" placeholder="Skills (comma separated)" value={s.skills} onChange={(e) => upd(i, 'skills', String(e.target.value).split(',').map((x) => x.trim()).filter(Boolean))} />
          <Textarea className="sm:col-span-2" placeholder="Short bio" value={s.bio} onChange={(e) => upd(i, 'bio', e.target.value)} />
          <Button type="button" variant="ghost" size="sm" className="sm:col-span-2" onClick={() => set('speakers', form.speakers.filter((_, si) => si !== i))}><X className="size-4" /> Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add}><Plus className="size-4" /> Add speaker</Button>
    </div>
  );
}

function StepSchedule({ form, set }) {
  const add = () => set('schedule', [...form.schedule, { day: 1, time: '10:00', title: '', type: 'talk', room: 'Main Hall', duration: 60 }]);
  const upd = (i, k, v) => set('schedule', form.schedule.map((s, si) => si === i ? { ...s, [k]: v } : s));
  return (
    <div className="space-y-3">
      {form.schedule.map((s, i) => (
        <div key={i} className="grid items-center gap-2 rounded-xl border p-3 sm:grid-cols-[70px_120px_1fr_140px_120px_90px_auto]">
          <Input type="number" min="1" aria-label="Day" value={s.day} onChange={(e) => upd(i, 'day', e.target.value)} />
          <Input type="time" aria-label="Time" value={s.time} onChange={(e) => upd(i, 'time', e.target.value)} />
          <Input placeholder="Session title" value={s.title} onChange={(e) => upd(i, 'title', e.target.value)} />
          <Select value={s.type} onChange={(e) => upd(i, 'type', e.target.value)}>
            {['keynote', 'talk', 'workshop', 'panel', 'break', 'networking', 'activity', 'ceremony'].map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Input placeholder="Room" value={s.room} onChange={(e) => upd(i, 'room', e.target.value)} />
          <Input type="number" placeholder="Min" value={s.duration} onChange={(e) => upd(i, 'duration', e.target.value)} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => set('schedule', form.schedule.filter((_, si) => si !== i))}><X className="size-4 text-destructive" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add}><Plus className="size-4" /> Add session</Button>
      <p className="text-xs text-muted-foreground">The AI Copilot can generate a complete multi-day schedule from your event brief.</p>
    </div>
  );
}

function StepForm({ form, set }) {
  const add = (type) => set('customFields', [...form.customFields, { id: crypto.randomUUID(), label: '', type, required: false, options: [] }]);
  const upd = (i, k, v) => set('customFields', form.customFields.map((f, fi) => fi === i ? { ...f, [k]: v } : f));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {['text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox'].map((t) => (
          <Button key={t} type="button" size="sm" variant="outline" onClick={() => add(t)}><Plus className="size-3.5" /> {t}</Button>
        ))}
      </div>
      {form.customFields.map((f, i) => (
        <div key={f.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_140px_auto_auto]">
          <Input placeholder="Field label" value={f.label} onChange={(e) => upd(i, 'label', e.target.value)} />
          <Badge variant="secondary" className="justify-center capitalize">{f.type}</Badge>
          <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={f.required} onChange={(e) => upd(i, 'required', e.target.checked)} /> Required</label>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => set('customFields', form.customFields.filter((_, fi) => fi !== i))}><X className="size-4 text-destructive" /></Button>
          {['select', 'radio', 'checkbox'].includes(f.type) && (
            <Input className="sm:col-span-4" placeholder="Options, comma separated"
              value={(f.options || []).join(', ')}
              onChange={(e) => upd(i, 'options', e.target.value.split(',').map((o) => o.trim()).filter(Boolean))} />
          )}
        </div>
      ))}
      {form.customFields.length === 0 && <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Name, email and the chosen ticket are always collected. Add custom questions here.</p>}
    </div>
  );
}

function StepPublish({ form, setForm }) {
  const plan = useMutation({
    mutationFn: () => endpoints.aiGenerate('checklist', { brief: form.title || 'event' }),
    onSuccess: (d) => toast.success('Checklist generated by the demo AI engine'),
  });
  const cat = EVENT_CATEGORIES.find((c) => c.slug === form.categorySlug);
  const fillDemo = async () => {
    const data = await endpoints.aiPlan(`a ${form.eventType} ${cat?.name || 'event'} called ${form.title || 'the summit'} for ${form.capacity} attendees`);
    const p = data.plan;
    setForm((f) => ({
      ...f,
      shortDescription: p.shortDescription, description: f.description || p.description,
      tags: p.tags?.join(', '), ticketTypes: p.ticketTypes?.length ? p.ticketTypes : f.ticketTypes,
      schedule: p.schedule?.map((s) => ({ day: s.day, time: s.time, title: s.title, type: s.type, room: s.room, duration: s.duration })) || f.schedule,
      customFields: (p.registrationFields || []).map((c) => ({ ...c, id: crypto.randomUUID() })),
    }));
    toast.success('AI filled your plan — review each step!');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <Sparkles className="size-5 text-primary" />
        One click fills the schedule, ticket tiers and registration form from an AI-generated plan.
        <Button size="sm" variant="outline" className="ml-auto" onClick={fillDemo}><Bot className="size-4" /> Auto-fill plan</Button>
      </div>

      {/* Preview */}
      <div className="overflow-hidden rounded-2xl border">
        <div className="relative h-48 bg-muted">
          {form.coverImage ? <img src={form.coverImage} className="size-full object-cover" alt="" /> : <div className="grid size-full place-items-center text-muted-foreground">Cover preview</div>}
          <div className="absolute bottom-3 left-4 right-4">
            {cat && <Badge style={{ backgroundColor: cat.color }} className="text-white">{cat.name}</Badge>}
            <h3 className="mt-1 font-display text-2xl font-extrabold text-white drop-shadow">{form.title || 'Your event title'}</h3>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Preview label="When" value={`${form.startDate?.slice(0, 10)} → ${form.endDate?.slice(0, 10)} (${form.timezone})`} />
          <Preview label="Where" value={form.eventType === 'online' ? 'Online' : `${form.venueName || 'Venue'}, ${form.city || 'city'}`} />
          <Preview label="Capacity" value={`${form.capacity} seats · ${form.ticketTypes.length} ticket tiers`} />
          <Preview label="Price" value={form.price > 0 ? `₹${form.price} onwards` : 'Free'} />
          <Preview label="Sessions" value={`${form.schedule.length} sessions`} />
          <Preview label="Custom fields" value={`${form.customFields.length} registration questions`} />
        </div>
        <p className="px-5 pb-5 text-sm text-muted-foreground">{form.shortDescription || form.description?.slice(0, 180)}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Pre-launch checklist</p>
        <div className="grid gap-1.5 text-sm sm:grid-cols-2">
          {['Venue & date locked', 'Ticket tiers set', 'Speakers confirmed', 'Schedule published', 'Registration form ready', 'QR check-in tested'].map((c) => (
            <label key={c} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Check className="size-4 text-success" /> {c}
            </label>
          ))}
        </div>
        <Button variant="link" className="px-0" loading={plan.isPending} onClick={() => plan.mutate()}>
          <Bot className="size-4" /> Generate full organizer checklist with AI
        </Button>
      </div>
    </div>
  );
}

function Preview({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
