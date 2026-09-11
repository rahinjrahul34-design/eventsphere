import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 p-12 text-white">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-32 bottom-0 size-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2 font-display text-xl font-extrabold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="size-5" /></span>
          EventSphere
        </Link>
        <div className="relative space-y-6">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            The intelligent event<br />operating system.
          </h2>
          <ul className="space-y-3 text-white/90">
            {['QR tickets & one-tap check-in', 'Live event mode with polls, Q&A and chat', 'AI event copilot and smart recommendations', 'Certificates, gamification and networking'].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm font-medium">
                <CheckCircle2 className="size-5 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} EventSphere · Hackathon demo</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl font-extrabold lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl gradient-brand text-white"><Sparkles className="size-5" /></span>
            EventSphere
          </Link>
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
