import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Bot, Sparkles, Wand2, Copy, Check, ArrowRight, FileText, ListChecks, Megaphone,
  CalendarRange, ClipboardList, Gauge, ChevronDown, ChevronUp,
} from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Label, Select } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/misc';
import { toast } from 'sonner';

const SUGGESTIONS = [
  '2-day AI/ML hackathon in Nashik for 300 college students',
  '1-day corporate leadership summit for 150 employees in Pune',
  'Weekend cultural fest with music, dance and food stalls for 800 students',
];

export default function Copilot() {
  const navigate = useNavigate();
  const [brief, setBrief] = useState('');
  const [plan, setPlan] = useState(null);
  const [engine, setEngine] = useState('demo-engine');

  const planMut = useMutation({
    mutationFn: endpoints.aiPlan,
    onSuccess: (data) => { setPlan(data.plan); setEngine(data.provider); toast.success('Plan generated'); },
    onError: (e) => toast.error(e.message),
  });

  const sendToWizard = () => {
    const p = plan;
    const draft = {
      title: p.title || '',
      shortDescription: p.shortDescription || '',
      description: p.description || '',
      tags: (p.tags || []).join(', '),
      capacity: p.capacity || 100,
      price: p.ticketTypes?.[0]?.price || 0,
      ticketTypes: (p.ticketTypes || []).map((t) => ({ ...t, quantity: t.quantity || 0 })),
      schedule: (p.schedule || []).map((s) => ({ day: s.day || 1, time: s.time || '10:00', title: s.title, type: s.type || 'talk', room: s.room || 'Main Hall', duration: s.duration || 60 })),
      customFields: (p.registrationFields || []).map((f) => ({ ...f, id: crypto.randomUUID() })),
    };
    localStorage.setItem('es-event-draft', JSON.stringify({ ...blankDraft(), ...draft }));
    toast.success('Plan loaded into the event wizard');
    navigate('/dashboard/events/create');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl gradient-brand text-white"><Bot className="size-6" /></span>
        <div>
          <h2 className="font-display text-2xl font-extrabold">AI Event Copilot</h2>
          <p className="text-sm text-muted-foreground">Describe your event and get a complete, ready-to-use plan.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{engine.includes('gemini') ? '✨ Gemini powered' : '🧪 Demo engine'}</Badge>
      </div>

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="p-6">
          <Label className="font-display text-base font-bold">What are you organizing?</Label>
          <Textarea className="mt-2 min-h-[110px]" value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. A 2-day national-level hackathon in Nashik for 300 students, with ₹50k prizes, workshops and an overnight coding sprint…" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setBrief(s)} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {s}
              </button>
            ))}
          </div>
          <Button className="mt-4" size="lg" loading={planMut.isPending} disabled={brief.length < 10}
            onClick={() => planMut.mutate(brief)}>
            <Sparkles className="size-4" /> Generate complete event plan
          </Button>
        </CardContent>
      </Card>

      {planMut.isPending && <Card><CardContent className="py-16"><Spinner /></CardContent></Card>}

      {plan && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-extrabold">{plan.title || 'Your event plan'}</h3>
            <Button onClick={sendToWizard}>Use this plan in the wizard <ArrowRight className="size-4" /></Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <PlanCard icon={FileText} title="Overview">
              <p className="text-sm font-semibold">{plan.shortDescription}</p>
              {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
              {!!plan.tags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{plan.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>}
            </PlanCard>
            <PlanCard icon={ClipboardList} title={`Ticket tiers (${plan.ticketTypes?.length || 0})`}>
              <div className="space-y-2">
                {(plan.ticketTypes || []).map((t, i) => (
                  <div key={i} className="rounded-lg border p-2.5 text-sm">
                    <div className="flex justify-between font-bold"><span>{t.name}</span><span>{t.price === 0 ? 'Free' : `₹${t.price}`}</span></div>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    {!!t.quantity && <p className="text-[11px] text-muted-foreground">Qty: {t.quantity}</p>}
                  </div>
                ))}
              </div>
            </PlanCard>
            <PlanCard icon={CalendarRange} title={`Schedule (${plan.schedule?.length || 0} sessions)`} collapsible>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {(plan.schedule || []).map((s, i) => (
                  <div key={i} className="flex gap-2 rounded-lg bg-muted/60 p-2 text-xs">
                    <span className="shrink-0 font-bold text-primary">D{s.day} {s.time}</span>
                    <span className="font-semibold">{s.title}</span>
                    <Badge variant="outline" className="ml-auto shrink-0 capitalize">{s.type}</Badge>
                  </div>
                ))}
              </div>
            </PlanCard>
            <PlanCard icon={ListChecks} title="Registration questions" collapsible>
              <ul className="space-y-1.5 text-sm">
                {(plan.registrationFields || []).map((f, i) => (
                  <li key={i} className="flex items-center gap-2"><ClipboardList className="size-3.5 text-muted-foreground" />{f.label}<Badge variant="secondary" className="ml-auto text-[10px]">{f.type}{f.required ? ' · required' : ''}</Badge></li>
                ))}
              </ul>
            </PlanCard>
            {plan.volunteers?.length > 0 && (
              <PlanCard icon={Wand2} title="Volunteer plan">
                <ul className="space-y-1.5 text-sm">
                  {plan.volunteers.map((v, i) => <li key={i} className="rounded-lg bg-muted/60 p-2"><b>{v.role}</b>{v.count ? ` × ${v.count}` : ''} — {v.tasks || v.zone}</li>)}
                </ul>
              </PlanCard>
            )}
            {plan.sponsors?.length > 0 && (
              <PlanCard icon={Wand2} title="Sponsorship targets">
                <ul className="space-y-1.5 text-sm">
                  {plan.sponsors.map((s, i) => <li key={i} className="rounded-lg bg-muted/60 p-2 capitalize"><b>{s.tier}</b>{s.amount ? ` · ₹${s.amount.toLocaleString?.('en-IN') ?? s.amount}` : ''} — {s.benefits}</li>)}
                </ul>
              </PlanCard>
            )}
            {plan.checklist?.length > 0 && (
              <PlanCard icon={ListChecks} title="Organizer checklist" collapsible>
                <ul className="space-y-1 text-sm">
                  {plan.checklist.map((c, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {typeof c === 'string' ? c : c.task || c.item}</li>)}
                </ul>
              </PlanCard>
            )}
            {plan.social && (
              <PlanCard icon={Megaphone} title="Social posts">
                <div className="space-y-2">
                  {Object.entries(plan.social).map(([k, v]) => <CopyBlock key={k} label={k} text={v} />)}
                </div>
              </PlanCard>
            )}
            {plan.announcement && (
              <PlanCard icon={Megaphone} title="Welcome announcement">
                <CopyBlock label={plan.announcement.title} text={plan.announcement.body} />
              </PlanCard>
            )}
            {plan.faq?.length > 0 && (
              <PlanCard icon={FileText} title="Suggested FAQ" collapsible>
                <div className="space-y-2 text-sm">
                  {plan.faq.map((f, i) => <div key={i}><p className="font-bold">{f.q || f.question}</p><p className="text-muted-foreground">{f.a || f.answer}</p></div>)}
                </div>
              </PlanCard>
            )}
            {plan.risks?.length > 0 && (
              <PlanCard icon={Gauge} title="Risk plan" collapsible>
                <ul className="space-y-1.5 text-sm">
                  {plan.risks.map((r, i) => <li key={i}><b>{r.risk}</b> <span className="text-muted-foreground">— {r.mitigation}</span></li>)}
                </ul>
              </PlanCard>
            )}
          </div>
        </div>
      )}

      <QuickGenerators />
      <ListingImprover />
    </div>
  );
}

function PlanCard({ icon: Icon, title, children, collapsible }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <Card>
      <CardHeader className="cursor-pointer flex-row items-center justify-between" onClick={() => collapsible && setOpen(!open)}>
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-primary" /> {title}</CardTitle>
        {collapsible && (open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />)}
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function CopyBlock({ label, text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
        <Button size="icon-sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function QuickGenerators() {
  const [kind, setKind] = useState('description');
  const [inputs, setInputs] = useState({ title: '', brief: '', days: 1, topics: '' });
  const [out, setOut] = useState(null);

  const tools = [
    { kind: 'description', label: 'Description', icon: FileText },
    { kind: 'checklist', label: 'Checklist', icon: ListChecks },
    { kind: 'announcement', label: 'Announcement', icon: Megaphone },
    { kind: 'schedule', label: 'Schedule', icon: CalendarRange },
    { kind: 'form', label: 'Reg. form', icon: ClipboardList },
  ];

  const run = useMutation({
    mutationFn: () => endpoints.aiGenerate(kind, inputs),
    onSuccess: (d) => { setOut(JSON.stringify(d.data, null, 2)); toast.success('Generated'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="size-5 text-primary" /> Quick content generators</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {tools.map((t) => (
            <Button key={t.kind} size="sm" variant={kind === t.kind ? 'default' : 'outline'} onClick={() => { setKind(t.kind); setOut(null); }}>
              <t.icon className="size-4" /> {t.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(kind === 'description' || kind === 'announcement') && <Input placeholder="Event title" value={inputs.title} onChange={(e) => setInputs({ ...inputs, title: e.target.value })} />}
          {(kind === 'description' || kind === 'checklist' || kind === 'form') && <Input placeholder="Brief (e.g. 2-day tech fest for 500 students)" value={inputs.brief} onChange={(e) => setInputs({ ...inputs, brief: e.target.value })} />}
          {kind === 'schedule' && (
            <>
              <Input type="number" min="1" max="5" placeholder="Days" value={inputs.days} onChange={(e) => setInputs({ ...inputs, days: e.target.value })} />
              <Input placeholder="Topics (e.g. AI, web3, cybersecurity)" value={inputs.topics} onChange={(e) => setInputs({ ...inputs, topics: e.target.value })} />
            </>
          )}
        </div>
        <Button className="mt-3" loading={run.isPending} onClick={() => run.mutate()}><Sparkles className="size-4" /> Generate {tools.find((t) => t.kind === kind)?.label?.toLowerCase()}</Button>
        {out && (
          <pre className="mt-4 max-h-80 overflow-auto rounded-xl border bg-muted/50 p-4 text-xs">{out}</pre>
        )}
      </CardContent>
    </Card>
  );
}

function ListingImprover() {
  const eventsQ = useQuery({ queryKey: ['my-events'], queryFn: endpoints.myEvents });
  const [eventId, setEventId] = useState('');
  const [report, setReport] = useState(null);
  const run = useMutation({
    mutationFn: () => endpoints.aiGenerate('improve', { eventId }),
    onSuccess: (d) => { setReport(d.data); },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-5 text-primary" /> Event listing score &amp; improver</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Select className="max-w-md flex-1" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Select one of your events…</option>
            {(eventsQ.data || []).map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
          </Select>
          <Button disabled={!eventId} loading={run.isPending} onClick={() => run.mutate()}>Analyze listing</Button>
        </div>
        {report && (
          <div className="mt-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={report.score} />
              <div>
                <p className="font-bold">Listing quality score</p>
                <p className="text-sm text-muted-foreground">{report.suggestions.length} improvement{report.suggestions.length !== 1 ? 's' : ''} found</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {report.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-xl border p-3 text-sm">
                  <Badge variant="warning" className="h-fit shrink-0">{s.area}</Badge>
                  <span>{s.tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, hsl(var(--muted)) 0deg)` }}>
      <div className="grid size-14 place-items-center rounded-full bg-card font-display text-xl font-extrabold" style={{ color }}>{score}</div>
    </div>
  );
}

function blankDraft() {
  return {
    title: '', shortDescription: '', description: '', coverImage: '', categorySlug: '', tags: '', eventType: 'offline',
    startDate: '', endDate: '', timezone: 'Asia/Kolkata', registrationDeadline: '',
    venueName: '', address: '', city: '', onlineUrl: '', lat: '', lng: '',
    capacity: 100, price: 0, ticketTypes: [], speakers: [], schedule: [], customFields: [],
  };
}
