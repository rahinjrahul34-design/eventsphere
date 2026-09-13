import { Link } from 'react-router-dom';
import { Sparkles, Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
              <span className="grid size-9 place-items-center rounded-xl gradient-brand text-white">
                <Sparkles className="size-5" />
              </span>
              EventSphere
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              The intelligent event operating system — discover, register, experience and measure events end-to-end.
            </p>
            <div className="mt-4 flex gap-2 text-muted-foreground">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a key={i} href="#" onClick={(e) => e.preventDefault()} className="grid size-9 place-items-center rounded-lg border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground" aria-label="social link">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          <FooterCol title="Platform" links={[['Explore events', '/events'], ['Hackathons', '/events?category=hackathon'], ['Calendar', '/calendar'], ['Smart networking', '/network']]} />
          <FooterCol title="For organizers" links={[['Create event', '/dashboard/events/create'], ['Organizer dashboard', '/dashboard/events'], ['AI Event Copilot', '/dashboard/copilot'], ['Check-in scanner', '/dashboard/events']]} />
          <FooterCol title="Account" links={[['Log in', '/login'], ['Register', '/register'], ['My tickets', '/my-tickets'], ['Certificates', '/certificates']]} />
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EventSphere. Built for the MERN hackathon demo.</p>
          <p className="flex gap-4">
            <span>QR ticketing</span><span>•</span><span>Live event mode</span><span>•</span><span>AI copilot</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="font-bold text-sm mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="transition-colors hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
