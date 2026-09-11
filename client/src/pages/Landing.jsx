import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight, Compass, TicketCheck, QrCode, Users, Sparkles, Radio, Bot, Trophy,
  Award, CalendarCheck, Search, MapPin, Star,
} from 'lucide-react';
import { endpoints } from '../lib/api';
import { Button } from '../components/ui/button';
import EventCard from '../components/events/EventCard';
import { EVENT_CATEGORIES, fmtDate } from '../lib/format';

const stats = [
  { value: 10000, suffix: '+', label: 'Attendees' },
  { value: 500, suffix: '+', label: 'Events' },
  { value: 120, suffix: '+', label: 'Organizers' },
  { value: 98, suffix: '%', label: 'Satisfaction' },
];

const testimonials = [
  { name: 'Ananya Iyer', role: 'Student Council Head', text: 'QR check-in that used to take an hour now takes ten minutes. The live announcements saved our cultural fest.', rating: 5 },
  { name: 'Rohit Menon', role: 'Hackathon Organizer', text: 'The AI Copilot drafted our schedule, sponsor tiers and social captions in seconds. Felt like having a co-organizer.', rating: 5 },
  { name: 'Fatima Sheikh', role: 'Corporate L&D Lead', text: 'Post-event AI insights told us workshops had 24% higher engagement than keynotes — priceless for planning next year.', rating: 5 },
];

function Counter({ value, suffix }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const start = performance.now();
        const dur = 1400;
        const tick = (t) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.floor(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl sm:text-5xl font-extrabold gradient-text">
        {n.toLocaleString('en-IN')}{suffix}
      </p>
    </div>
  );
}

const innovations = [
  { icon: Bot, title: 'AI Event Copilot', text: 'Turn one sentence into schedules, forms, ticket tiers, checklists and social posts.' },
  { icon: Sparkles, title: 'Personalized recommendations', text: 'A scored “For You” feed based on interests, history and location.' },
  { icon: Users, title: 'Smart networking', text: 'See compatibility scores, connect and chat with people you should meet.' },
  { icon: Radio, title: 'Live Event Mode', text: 'Real-time announcements, polls, Q&A and chat over Socket.IO.' },
  { icon: QrCode, title: 'QR attendance', text: 'Digital passes, camera scanning, duplicate-check-in protection.' },
  { icon: Trophy, title: 'Gamification', text: 'Points, leaderboards and badges reward engagement.' },
  { icon: Award, title: 'Digital certificates', text: 'Auto-issued, QR-verifiable certificates within 48 hours.' },
  { icon: CalendarCheck, title: 'Smart waitlist', text: 'Open seats promote the next attendee automatically.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['events', 'featured'],
    queryFn: () => endpoints.events({ featured: 'true', limit: 6, sort: 'popular', date: 'upcoming' }),
  });
  const events = data?.events || [];

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.14),transparent)]" />
        <div className="container grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-soft">
              <span className="flex size-2 rounded-full bg-destructive animate-pulse" />
              Live: Nashik Developer Meetup happening now
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Create. <span className="gradient-text">Discover.</span> Experience.
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground">
              EventSphere is the intelligent event operating system for college fests, community meetups and
              corporate summits — from QR ticketing and live engagement to AI-powered insights.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/events')}>
                <Compass /> Explore Events
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/register')}>
                Create an Event <ArrowRight />
              </Button>
            </div>
            <div className="mt-8 flex max-w-md items-center gap-2 rounded-xl border bg-card p-2 shadow-soft">
              <Search className="ml-2 size-4 text-muted-foreground" />
              <input
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/events?q=${e.target.value}`)}
                placeholder='Search “AI”, “hackathon”, “Nashik”…'
                className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button size="sm" onClick={(e) => {
                const v = e.target.closest('div').querySelector('input').value;
                navigate(`/events?q=${v || ''}`);
              }}>
                Search
              </Button>
            </div>
          </motion.div>

          {/* Floating event cards */}
          <div className="relative hidden h-[460px] lg:block">
            {[
              { t: 'AI Innovation Summit', d: 'in 3 days · Nashik', img: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=600&q=70', cls: 'left-0 top-0 rotate-[-4deg]', delay: 0.1 },
              { t: 'TechNova Hackathon', d: 'in 12 days · Pune', img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=70', cls: 'right-0 top-24 rotate-[3deg]', delay: 0.25 },
              { t: 'Campus Startup Expo', d: 'in 6 days · Mumbai', img: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&q=70', cls: 'left-8 bottom-0 rotate-[2deg]', delay: 0.4 },
            ].map((c) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: [0, -12, 0] }}
                transition={{ delay: c.delay, y: { repeat: Infinity, duration: 5, ease: 'easeInOut' }, opacity: { duration: 0.5 } }}
                className={`absolute w-72 overflow-hidden rounded-2xl border bg-card shadow-lift ${c.cls}`}
              >
                <img src={c.img} alt={c.t} className="h-36 w-full object-cover" />
                <div className="p-3">
                  <p className="text-sm font-bold">{c.t}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {c.d}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y bg-card">
        <div className="container grid grid-cols-2 gap-8 py-12 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <Counter value={s.value} suffix={s.suffix} />
              <p className="mt-1 text-center text-sm font-semibold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Featured events ─── */}
      <section className="container py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold">Featured events</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked experiences filling up fast.</p>
          </div>
          <Link to="/events" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:gap-2 transition-all">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(events.length ? events : Array.from({ length: 6 }).map((_, i) => ({ _id: `sk${i}`, slug: '' }))).slice(0, 6).map((e, i) =>
            e.slug ? <EventCard key={e._id} event={e} index={i} /> : <div key={i} className="h-80 rounded-xl border bg-muted/40 animate-pulse" />
          )}
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section className="bg-card py-16 sm:py-20">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-extrabold">Explore by category</h2>
          <p className="mt-1 text-center text-muted-foreground">From hackathons to leadership summits.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {EVENT_CATEGORIES.map((c, i) => (
              <motion.button
                key={c.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/events?category=${c.slug}`)}
                className="group flex flex-col items-center gap-3 rounded-2xl border bg-background p-5 text-center transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl text-white transition group-hover:scale-110" style={{ backgroundColor: c.color }}>
                  <CategoryIcon name={c.icon} />
                </span>
                <span className="text-sm font-bold">{c.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="container py-16 sm:py-20">
        <h2 className="text-center font-display text-3xl font-extrabold">How it works</h2>
        <p className="mt-1 text-center text-muted-foreground">Four steps from discovery to connection.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { icon: Compass, n: '01', t: 'Discover', d: 'Search, filter and get AI recommendations tuned to your interests.' },
            { icon: TicketCheck, n: '02', t: 'Register', d: 'Pick tickets, fill custom forms, pay securely and get a QR pass instantly.' },
            { icon: QrCode, n: '03', t: 'Attend', d: 'Scan in at the gate, follow the live feed, join polls and Q&A.' },
            { icon: Users, n: '04', t: 'Connect', d: 'Meet compatible attendees, earn badges and collect certificates.' },
          ].map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border bg-card p-6 shadow-soft">
              <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-primary/10">{s.n}</span>
              <span className="grid size-12 place-items-center rounded-xl gradient-brand text-white"><s.icon className="size-6" /></span>
              <h3 className="mt-4 font-bold text-lg">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Innovations ─── */}
      <section className="bg-card py-16 sm:py-20">
        <div className="container">
          <div className="text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Not just a booking website</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold">An intelligent event operating system</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {innovations.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.06 }}
                className="rounded-2xl border bg-background p-5 hover:shadow-lift transition">
                <f.icon className="size-7 text-primary" />
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="container py-16 sm:py-20">
        <h2 className="text-center font-display text-3xl font-extrabold">Loved by organizers & attendees</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed">“{t.text}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full gradient-brand text-sm font-bold text-white">{t.name[0]}</span>
                <span>
                  <span className="block text-sm font-bold">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 p-10 text-center text-white sm:p-16">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative font-display text-3xl sm:text-4xl font-extrabold">Ready to create your next event?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/85">
            Set up registration, QR check-in, live engagement and analytics in minutes — with an AI copilot doing the busywork.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register"><Button size="lg" variant="secondary">Start free — no card needed</Button></Link>
            <Link to="/events"><Button size="lg" className="bg-white/15 text-white hover:bg-white/25"><Compass /> Browse events</Button></Link>
          </div>
          <p className="relative mt-6 text-xs text-white/70">Demo accounts ready: attendee@eventsphere.demo · organizer@eventsphere.demo · Event@123</p>
        </div>
      </section>
    </div>
  );
}

function CategoryIcon({ name }) {
  // lucide icons mapped via dynamic import alternative
  const icons = {
    Code2: <span className="text-lg font-black">&lt;/&gt;</span>,
    Wrench: <span className="text-lg">🔧</span>, Mic2: <span className="text-lg">🎤</span>,
    Palmtree: <span className="text-lg">🌴</span>, Trophy: <span className="text-lg">🏆</span>,
    Users: <span className="text-lg">🤝</span>, Presentation: <span className="text-lg">📊</span>,
    Briefcase: <span className="text-lg">💼</span>, Coffee: <span className="text-lg">☕</span>,
    Cpu: <span className="text-lg">🧠</span>,
  };
  return icons[name] || <Sparkles className="size-6" />;
}
