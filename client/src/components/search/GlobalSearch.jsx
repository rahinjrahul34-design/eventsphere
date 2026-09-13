import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarDays, Users, Tag, Mic2, Loader2 } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { useUI } from '../../store/ui';
import { fmtDate } from '../../lib/format';
import { Avatar } from '../ui/avatar';

function Row({ icon: Icon, title, sub, to, onNavigate }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        navigate(to);
        onNavigate();
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary transition"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

export default function GlobalSearch() {
  const { searchOpen, setSearchOpen } = useUI();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
    else {
      setQ('');
      setResults(null);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await endpoints.search(q.trim()));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (!searchOpen) return null;
  const close = () => setSearchOpen(false);
  const empty =
    results &&
    !results.events.length &&
    !results.people.length &&
    !results.organizers.length &&
    !results.categories.length &&
    !results.speakers.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-label="Global search">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl overflow-hidden card-surface shadow-lift animate-scale-in">
        <div className="flex items-center gap-3 border-b px-4">
          {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Search className="size-5 text-muted-foreground" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, people, speakers, categories…"
            className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === 'Escape' && close()}
          />
          <kbd className="hidden sm:block rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {!results && q.length < 2 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Try “AI”, “hackathon”, “Nashik” or a speaker name
            </p>
          )}
          {empty && <p className="p-6 text-center text-sm text-muted-foreground">No results for “{q}”</p>}
          {results?.events?.length > 0 && (
            <Section label="Events">
              {results.events.map((e) => (
                <Row
                  key={e._id}
                  icon={CalendarDays}
                  title={e.title}
                  sub={`${fmtDate(e.startDate, 'd MMM')} · ${e.venue?.city || 'Online'}`}
                  to={`/events/${e.slug}`}
                  onNavigate={close}
                />
              ))}
            </Section>
          )}
          {results?.speakers?.length > 0 && (
            <Section label="Speakers">
              {results.speakers.map((s) => (
                <Row key={s._id} icon={Mic2} title={s.name} sub={`${s.title} · ${s.company}`} to={`/network`} onNavigate={close} />
              ))}
            </Section>
          )}
          {results?.organizers?.length > 0 && (
            <Section label="Organizers">
              {results.organizers.map((o) => (
                <Row key={o._id} icon={Users} title={o.name} sub={o.company || o.bio} to={`/network`} onNavigate={close} />
              ))}
            </Section>
          )}
          {results?.people?.length > 0 && (
            <Section label="People">
              {results.people.map((p) => (
                <button
                  key={p._id}
                  onClick={() => {
                    navigate(`/network`);
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary"
                >
                  <Avatar name={p.name} src={p.avatar} className="size-9" />
                  <span>
                    <span className="block text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{p.title} {p.company ? `· ${p.company}` : ''}</span>
                  </span>
                </button>
              ))}
            </Section>
          )}
          {results?.categories?.length > 0 && (
            <Section label="Categories">
              {results.categories.map((c) => (
                <Row
                  key={c._id}
                  icon={Tag}
                  title={c.name}
                  sub={c.description}
                  to={`/events?category=${c.slug}`}
                  onNavigate={close}
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
