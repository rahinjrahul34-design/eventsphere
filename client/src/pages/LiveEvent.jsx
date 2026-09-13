import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Megaphone, BarChart3, MessageCircle, HelpCircle, Trophy, Send,
  Triangle, ThumbsUp, Users, CheckCircle2, ShieldAlert, ChevronLeft,
} from 'lucide-react';
import { endpoints } from '../lib/api';
import { useAuth } from '../store/auth';
import { useEventSocket, eventSocket } from '../hooks/useSocket';
import { Button } from '../components/ui/button';
import { Input, Textarea, Select } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs } from '../components/ui/misc';
import { Avatar } from '../components/ui/avatar';
import { Spinner, ErrorState } from '../components/ui/misc';
import { fmtTime } from '../lib/format';
import { timeAgo } from '../lib/utils';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LiveEvent() {
  usePageTitle('Live Event');
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('feed');

  const eventQ = useQuery({ queryKey: ['event', slug], queryFn: () => endpoints.event(slug) });
  const event = eventQ.data;
  const eventId = event?._id;

  const liveQ = useQuery({
    queryKey: ['live', eventId],
    queryFn: () => endpoints.liveState(eventId),
    enabled: !!eventId,
    refetchInterval: 45_000,
  });
  const leaderQ = useQuery({
    queryKey: ['leaderboard', eventId],
    queryFn: () => endpoints.leaderboard(eventId),
    enabled: !!eventId,
  });

  const [liveToast, setLiveToast] = useState(null);
  useEventSocket(eventId, {
    onAttendance: (p) => setLiveToast(p),
  });

  const canManage = user && (user.role === 'admin' || event?.organizer?._id === user._id);

  if (eventQ.isLoading) return <Spinner className="min-h-[60vh]" />;
  if (eventQ.isError) return <ErrorState message={eventQ.error.message} onRetry={eventQ.refetch} />;

  const live = liveQ.data;
  const isLive = event.status === 'live';

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      {/* Header */}
      <div className={`${isLive ? 'bg-gradient-to-br from-rose-600 to-red-700' : 'bg-gradient-to-br from-indigo-700 to-violet-800'} text-white`}>
        <div className="container py-8">
          <Link to={`/events/${slug}`} className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
            <ChevronLeft className="size-4" /> Event page
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold">{event.title}</h1>
                {isLive && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-rose-600 animate-pulse">
                    <span className="size-2 rounded-full bg-rose-600" /> LIVE NOW
                  </span>
                )}
              </div>
              <p className="mt-1 text-white/80 text-sm">{event.venue?.name}, {event.venue?.city}</p>
            </div>
            {canManage && <div className="ml-auto"><OrganizerControls event={event} onChanged={() => qc.invalidateQueries({ queryKey: ['event', slug] })} /></div>}
          </div>
          {live && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Checked in" value={event.checkedInCount || 0} highlight />
              <Stat icon={Radio} label="Registered" value={live.event.registrationCount} />
              <Stat icon={Megaphone} label="Announcements" value={live.announcements.length} />
              <Stat icon={BarChart3} label="Poll votes" value={live.polls.reduce((a, p) => a + p.totalVotes, 0)} />
            </div>
          )}
        </div>
      </div>

      {/* Attendance toast */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed right-4 top-20 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lift"
          >
            <CheckCircle2 className="size-6 text-success" />
            <div>
              <p className="text-sm font-bold">{liveToast.attendee} checked in</p>
              <p className="text-xs text-muted-foreground">Live attendance counter updated</p>
            </div>
            <button className="ml-2 text-xs text-muted-foreground" onClick={() => setLiveToast(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mt-6">
        {live?.currentSession && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <Badge variant="live">Now</Badge>
            <div>
              <p className="font-bold">{live.currentSession.title}</p>
              <p className="text-xs text-muted-foreground">{live.currentSession.room} · until {fmtTime(live.currentSession.endTime)}</p>
            </div>
            {live.nextSession && (
              <div className="ml-auto hidden sm:block text-right">
                <p className="text-xs font-bold uppercase text-muted-foreground">Up next</p>
                <p className="text-sm font-semibold">{live.nextSession.title} · {fmtTime(live.nextSession.startTime)}</p>
              </div>
            )}
          </div>
        )}

        <Tabs
          className="mb-6 overflow-x-auto"
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'feed', label: 'Announcements', icon: Megaphone },
            { value: 'polls', label: 'Polls', icon: BarChart3 },
            { value: 'qna', label: 'Q&A', icon: HelpCircle },
            { value: 'chat', label: 'Chat', icon: MessageCircle },
            { value: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          ]}
        />

        {liveQ.isLoading ? <Spinner /> : (
          <>
            {tab === 'feed' && <FeedTab live={live} canManage={canManage} eventId={eventId} />}
            {tab === 'polls' && <PollsTab live={live} canManage={canManage} eventId={eventId} />}
            {tab === 'qna' && <QnaTab live={live} canManage={canManage} eventId={eventId} />}
            {tab === 'chat' && <ChatTab eventId={eventId} initial={live.messages} />}
            {tab === 'leaderboard' && <LeaderboardTab query={leaderQ} />}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-white/20' : 'bg-white/10'}`}>
      <Icon className="size-5 opacity-80" />
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-white/75">{label}</p>
    </div>
  );
}

function OrganizerControls({ event, onChanged }) {
  const setStatus = useMutation({
    mutationFn: (status) => endpoints.setEventStatus(event._id, status),
    onSuccess: () => { toast.success(`Event marked ${event.status === 'live' ? 'completed' : 'live'}`); onChanged(); },
  });
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={setStatus.isPending}
      onClick={() => setStatus.mutate(event.status === 'live' ? 'completed' : 'live')}
    >
      <Radio /> {event.status === 'live' ? 'End event' : 'Go LIVE'}
    </Button>
  );
}

function FeedTab({ live, canManage, eventId }) {
  const [form, setForm] = useState({ title: '', body: '', severity: 'info' });
  const mutation = useMutation({
    mutationFn: (b) => endpoints.announcement(eventId, b),
    onSuccess: () => { toast.success('Announcement broadcast to all attendees'); setForm({ title: '', body: '', severity: 'info' }); },
  });

  const sev = { info: 'border-l-blue-500', warning: 'border-l-warning', emergency: 'border-l-destructive', success: 'border-l-success' };
  const sevIcon = { emergency: ShieldAlert };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {live.announcements.length === 0 && <p className="py-10 text-center text-muted-foreground text-sm">No announcements yet.</p>}
        {live.announcements.map((a) => {
          const Icon = sevIcon[a.severity] || Megaphone;
          return (
            <motion.div key={a._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`rounded-xl border bg-card p-4 border-l-4 ${sev[a.severity]}`}>
              <div className="flex items-start gap-3">
                <Icon className={`size-5 mt-0.5 ${a.severity === 'emergency' ? 'text-destructive' : 'text-primary'}`} />
                <div className="min-w-0">
                  <p className="font-bold">{a.title}</p>
                  {a.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>}
                  <p className="mt-2 text-xs text-muted-foreground/70">{a.authorName} · {timeAgo(a.createdAt)}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {canManage && (
        <div className="rounded-xl border bg-card p-5 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold">Broadcast announcement</h3>
          <p className="text-xs text-muted-foreground mt-1">Delivered instantly to every connected attendee + notification.</p>
          <div className="mt-3 space-y-3">
            <Input placeholder="Title (e.g. Hall moved to Room 204)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Details…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="emergency">Emergency</option>
            </Select>
            <Button className="w-full" loading={mutation.isPending}
              onClick={() => form.title && mutation.mutate(form)}>
              <Send className="size-4" /> Send to everyone
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PollsTab({ live, canManage, eventId }) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const create = useMutation({
    mutationFn: () => endpoints.createPoll(eventId, { question, options: options.filter(Boolean) }),
    onSuccess: () => { toast.success('Poll sent live'); setQuestion(''); setOptions(['', '']); qc.invalidateQueries({ queryKey: ['live', eventId] }); },
  });
  const vote = useMutation({
    mutationFn: ({ id, idx }) => endpoints.votePoll(id, { optionIndex: idx }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['live', eventId] }),
  });
  const close = useMutation({ mutationFn: endpoints.closePoll, onSettled: () => qc.invalidateQueries({ queryKey: ['live', eventId] }) });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {live.polls.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No polls yet.</p>}
        {live.polls.map((p) => (
          <div key={p._id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{p.question}</p>
              <Badge variant={p.closed ? 'secondary' : 'success'}>{p.closed ? 'Closed' : `${p.totalVotes} votes`}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {p.options.map((o, i) => {
                const voted = p.myVote === i;
                return (
                  <button key={o._id} disabled={p.closed || (p.myVote >= 0) || vote.isPending}
                    onClick={() => vote.mutate({ id: p._id, idx: i })}
                    className="relative block w-full overflow-hidden rounded-lg border px-4 py-2.5 text-left text-sm transition hover:border-primary disabled:cursor-default">
                    <span className="absolute inset-y-0 left-0 bg-primary/[12%] transition-all" style={{ width: `${o.percent}%` }} />
                    <span className="relative flex items-center justify-between font-medium">
                      <span>{o.text} {voted && <CheckCircle2 className="inline size-4 text-primary" />}</span>
                      <span className="text-xs text-muted-foreground">{o.percent}% · {o.votes}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {canManage && !p.closed && (
              <Button size="sm" variant="ghost" className="mt-3" onClick={() => close.mutate(p._id)}>Close poll</Button>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <div className="rounded-xl border bg-card p-5 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold">Create live poll</h3>
          <div className="mt-3 space-y-2">
            <Input placeholder="Your question…" value={question} onChange={(e) => setQuestion(e.target.value)} />
            {options.map((o, i) => (
              <Input key={i} placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOptions(options.map((x, xi) => xi === i ? e.target.value : x))} />
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={() => setOptions([...options, ''])}>Add option</Button>
            <Button className="w-full" loading={create.isPending} onClick={() => question && options.filter(Boolean).length >= 2 && create.mutate()}>
              Launch poll
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QnaTab({ live, canManage, eventId }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);
  const ask = useMutation({
    mutationFn: () => endpoints.askQuestion(eventId, { text, anonymous: anon }),
    onSuccess: () => { setText(''); toast.success('Question posted'); qc.invalidateQueries({ queryKey: ['live', eventId] }); },
  });
  const upvote = useMutation({
    mutationFn: endpoints.upvoteQuestion,
    onSettled: () => qc.invalidateQueries({ queryKey: ['live', eventId] }),
  });
  const answer = useMutation({
    mutationFn: ({ id, answer: a }) => endpoints.answerQuestion(id, { answer: a }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['live', eventId] }),
  });
  const sorted = [...live.questions].sort((a, b) => b.upvotes.length - a.upvotes.length || new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {sorted.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Be the first to ask a question.</p>}
        {sorted.map((q) => (
          <div key={q._id} className="rounded-xl border bg-card p-4">
            <div className="flex gap-3">
              <button onClick={() => upvote.mutate(q._id)} className="flex h-fit flex-col items-center rounded-lg border px-2 py-1.5 text-xs font-bold hover:border-primary">
                <Triangle className="size-3.5 fill-current" /> {q.upvotes.length}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{q.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{q.userName}</p>
                {q.answered && (
                  <div className="mt-2 rounded-lg bg-success/10 p-3 text-sm">
                    <p className="text-xs font-bold text-success">Answer · {q.answeredByName}</p>
                    <p className="mt-0.5">{q.answer}</p>
                  </div>
                )}
                {canManage && !q.answered && <AnswerBox onAnswer={(a) => answer.mutate({ id: q._id, answer: a })} />}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit lg:sticky lg:top-24">
        <h3 className="font-bold">Ask a question</h3>
        <Textarea className="mt-3" placeholder="Type your question for the speakers…" value={text} onChange={(e) => setText(e.target.value)} />
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Ask anonymously</label>
        <Button className="mt-3 w-full" loading={ask.isPending} onClick={() => text.trim() && ask.mutate()}>
          <Send className="size-4" /> Submit question
        </Button>
      </div>
    </div>
  );
}

function AnswerBox({ onAnswer }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) return <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}>Answer</Button>;
  return (
    <div className="mt-2 space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an answer…" className="min-h-[64px]" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => text && onAnswer(text)}>Post answer</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function ChatTab({ eventId, initial }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(initial || []);
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const socket = eventSocket();

  useEffect(() => {
    const onMsg = (m) => setMessages((prev) => (prev.some((x) => x._id === m._id) ? prev : [...prev, m]));
    socket.emit('event:subscribe', eventId);
    socket.on('chat:message', onMsg);
    endpoints.messages(eventId).then(setMessages).catch(() => {});
    return () => socket.off('chat:message', onMsg);
  }, [eventId, socket]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    if (!user) return toast.error('Log in to chat');
    socket.emit('chat:message', { eventId, text: text.trim() }, (ack) => {
      if (!ack?.ok) toast.error(ack?.error || 'Could not send');
    });
    setText('');
  };

  return (
    <div className="mx-auto flex h-[60vh] max-w-3xl flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender === user?._id;
          return (
            <div key={m._id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar name={m.senderName} className="size-8" />
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-xs font-bold opacity-75">{m.senderName}</p>}
                <p>{m.text}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{fmtTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the event…"
          onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button onClick={send} aria-label="Send"><Send className="size-4" /></Button>
      </div>
    </div>
  );
}

function LeaderboardTab({ query }) {
  const medal = ['🥇', '🥈', '🥉'];
  if (query.isLoading) return <Spinner />;
  const rows = query.data || [];
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <div className="rounded-xl border bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
        <Trophy className="size-7" />
        <p className="mt-2 font-display text-xl font-extrabold">Event leaderboard</p>
        <p className="text-sm text-white/85">Earn points through check-in, polls, chat, sessions and networking.</p>
      </div>
      {rows.map((r, i) => (
        <div key={r.userId} className={`flex items-center gap-4 rounded-xl border bg-card p-4 ${i < 3 ? 'shadow-soft' : ''}`}>
          <span className="w-8 text-center font-display text-lg font-extrabold">{medal[i] || i + 1}</span>
          <Avatar name={r.name} src={r.avatar} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.title || 'Attendee'}{r.checkedIn && ' · checked in'}</p>
          </div>
          <Badge variant="secondary" className="text-sm">{r.points} pts</Badge>
        </div>
      ))}
    </div>
  );
}
