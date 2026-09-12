import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Check, X, Send, MessageCircle, Sparkles, Target, XCircle } from 'lucide-react';
import { endpoints } from '../lib/api';
import { useAuth } from '../store/auth';
import { connectSocket, getSocket } from '../lib/socket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, Spinner, EmptyState } from '../components/ui/misc';
import { Avatar } from '../components/ui/avatar';
import { ErrorState } from '../components/ui/states';
import { GOALS } from '../lib/format';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Network() {
  usePageTitle('Network');
  const { user } = useAuth();
  const [tab, setTab] = useState('discover');

  const sugQ = useQuery({ queryKey: ['suggestions'], queryFn: endpoints.suggestions });
  const conQ = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });
  const threadsQ = useQuery({ queryKey: ['threads'], queryFn: endpoints.threads });

  useEffect(() => {
    const open = () => setTab('messages');
    window.addEventListener('open-dm', open);
    return () => window.removeEventListener('open-dm', open);
  }, []);

  const incoming = (conQ.data || []).filter((c) => c.status === 'pending' && c.direction === 'incoming');
  const pending = (conQ.data || []).filter((c) => c.status === 'pending');
  const accepted = (conQ.data || []).filter((c) => c.status === 'accepted');

  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">Smart Networking <Sparkles className="text-primary" /></h1>
          <p className="mt-1 text-muted-foreground">People you should meet, ranked by shared interests, skills and goals.</p>
        </div>
        {user.networkingGoal && (
          <Badge variant="secondary" className="text-sm"><Target className="size-3.5" /> Looking for: {GOALS.find((g) => g.value === user.networkingGoal)?.label || user.networkingGoal}</Badge>
        )}
      </div>

      <Tabs
        className="mt-6 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { value: 'discover', label: 'Discover', icon: Users },
          { value: 'requests', label: 'Requests', icon: UserPlus, count: incoming.length },
          { value: 'connections', label: 'My Network', icon: Check, count: accepted.length },
          { value: 'messages', label: 'Messages', icon: MessageCircle },
        ]}
      />

      <div className="mt-6">
        {tab === 'discover' && (
          sugQ.isLoading ? <Spinner /> : sugQ.isError ? <ErrorState message={sugQ.error.message} onRetry={sugQ.refetch} /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sugQ.data?.map((p) => <SuggestionCard key={p._id} person={p} />)}
            </div>
          )
        )}

        {tab === 'requests' && (
          pending.length === 0 ? <EmptyState icon={UserPlus} title="No pending requests" description="Connection requests you send and receive will appear here." /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((c) => <ConnectionCard key={c._id} connection={c} />)}
            </div>
          )
        )}

        {tab === 'connections' && (
          accepted.length === 0 ? <EmptyState icon={Users} title="No connections yet" description="Accept requests or discover people with shared goals." /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accepted.map((c) => <ConnectionCard key={c._id} connection={c} accepted />)}
            </div>
          )
        )}

        {tab === 'messages' && <MessagesPanel threads={threadsQ.data || []} loading={threadsQ.isLoading} />}
      </div>
    </div>
  );
}

function MatchRing({ score }) {
  const color = score >= 85 ? '#16a34a' : score >= 70 ? '#7c3aed' : '#d97706';
  return (
    <div className="relative grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, hsl(var(--muted)) 0deg)` }}>
      <div className="grid size-11 place-items-center rounded-full bg-card text-sm font-extrabold">{score}%</div>
    </div>
  );
}

function SuggestionCard({ person }) {
  const qc = useQueryClient();
  const connect = useMutation({
    mutationFn: () => endpoints.connect(person._id),
    onSuccess: () => { toast.success(`Request sent to ${person.name}`); qc.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft hover:shadow-lift transition">
      <div className="flex items-start justify-between">
        <Avatar name={person.name} src={person.avatar} className="size-14" fallbackClass="text-lg" />
        <MatchRing score={person.score} />
      </div>
      <p className="mt-3 font-bold">{person.name}</p>
      <p className="text-xs text-muted-foreground">{person.title}{person.company ? ` · ${person.company}` : ''}</p>
      <p className="mt-2 text-xs font-medium text-primary">“{person.reasons[0]}”</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {person.interests?.slice(0, 3).map((i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{i}</span>)}
      </div>
      {person.networkingGoal && <p className="mt-2 text-[11px] text-muted-foreground">Looking for: {person.networkingGoal.replace('-', ' ')}</p>}
      <Button className="mt-4 w-full" size="sm" loading={connect.isPending} onClick={() => connect.mutate()}>
        <UserPlus className="size-4" /> Connect
      </Button>
    </div>
  );
}

function ConnectionCard({ connection, accepted }) {
  const qc = useQueryClient();
  const respond = useMutation({
    mutationFn: (action) => endpoints.respondConnection(connection._id, action),
    onSuccess: (_d, action) => {
      toast.success(action === 'accept' ? 'You are now connected! +15 points' : 'Request declined');
      qc.invalidateQueries({ queryKey: ['connections'] });
    },
  });
  const u = connection.user;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} src={u.avatar} className="size-12" />
        <div className="min-w-0">
          <p className="truncate font-bold">{u.name}</p>
          <p className="truncate text-xs text-muted-foreground">{u.title} · {u.location}</p>
        </div>
      </div>
      {connection.status === 'pending' && (
        <Badge variant={connection.direction === 'incoming' ? 'warning' : 'secondary'} className="mt-3">
          {connection.direction === 'incoming' ? 'Wants to connect' : 'Request sent'}
        </Badge>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {u.interests?.slice(0, 3).map((i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{i}</span>)}
      </div>
      <div className="mt-4 flex gap-2">
        {connection.direction === 'incoming' && connection.status === 'pending' ? (
          <>
            <Button size="sm" className="flex-1" loading={respond.isPending} onClick={() => respond.mutate('accept')}><Check className="size-4" /> Accept</Button>
            <Button size="sm" variant="outline" onClick={() => respond.mutate('reject')}><X className="size-4" /></Button>
          </>
        ) : accepted ? (
          <Button size="sm" variant="outline" onClick={() => {
            window.__pendingDM = u;
            window.dispatchEvent(new CustomEvent('open-dm', { detail: u }));
          }}>
            <MessageCircle className="size-4" /> Message
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled className="flex-1"><XCircle className="size-4" /> Pending</Button>
        )}
      </div>
    </div>
  );
}

function MessagesPanel({ threads, loading }) {
  const [activeUser, setActiveUser] = useState(typeof window !== 'undefined' ? window.__pendingDM || null : null);
  useEffect(() => {
    const open = (e) => setActiveUser(e.detail);
    window.addEventListener('open-dm', open);
    return () => window.removeEventListener('open-dm', open);
  }, []);
  if (loading) return <Spinner />;
  if (threads.length === 0) return <EmptyState icon={MessageCircle} title="No conversations" description="Connect with people and start chatting." />;
  return (
    <div className="grid h-[65vh] grid-cols-1 overflow-hidden rounded-2xl border bg-card md:grid-cols-[280px_1fr]">
      <div className="overflow-y-auto border-b md:border-b-0 md:border-r">
        {threads.map((t) => (
          <button key={t.user._id} onClick={() => setActiveUser(t.user)}
            className={`flex w-full items-center gap-3 border-b p-3 text-left hover:bg-secondary ${activeUser?._id === t.user._id ? 'bg-secondary' : ''}`}>
            <Avatar name={t.user.name} src={t.user.avatar} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{t.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t.lastMessage.text}</p>
            </div>
          </button>
        ))}
      </div>
      <ChatPane user={activeUser} />
    </div>
  );
}

function ChatPane({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const { user: me } = useAuth();

  useEffect(() => {
    if (!user) return undefined;
    const s = connectSocket();
    endpoints.dmHistory(user._id).then(setMessages);
    const onDM = (m) => {
      if (m.sender === user._id) endpoints.dmHistory(user._id).then(setMessages);
    };
    s.on('dm:message', onDM);
    return () => s.off('dm:message', onDM);
  }, [user, me._id]);

  if (!user) return <div className="grid place-items-center text-sm text-muted-foreground">Select a conversation</div>;

  const send = async () => {
    if (!text.trim()) return;
    const m = await endpoints.sendDM(user._id, text.trim());
    setMessages((p) => [...p, m]);
    setText('');
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b p-3">
        <Avatar name={user.name} src={user.avatar} className="size-9" />
        <div><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-muted-foreground">{user.title}</p></div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender === me._id;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : ''}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{m.text}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Message ${user.name.split(' ')[0]}…`} />
        <Button onClick={send} aria-label="Send"><Send className="size-4" /></Button>
      </div>
    </div>
  );
}
