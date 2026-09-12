import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Compass, Search, Sun, Moon, Menu, LogOut, LayoutDashboard, User as UserIcon, Sparkles, Ticket, Award } from 'lucide-react';
import { useTheme } from '../../store/theme';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import NotificationBell from '../notifications/NotificationBell';
import { Avatar } from '../ui/avatar';
import { Dropdown, MenuItem } from '../ui/misc';
import { useState } from 'react';
import { disconnectSocket } from '../../lib/socket';

const navLinks = [
  { to: '/events', label: 'Explore' },
  { to: '/events?category=hackathon', label: 'Hackathons' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/network', label: 'Network' },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardLink =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'organizer'
        ? '/dashboard/events'
        : user?.role === 'volunteer'
          ? '/dashboard/assignments'
          : user?.role === 'speaker'
            ? '/dashboard/speaking'
            : '/home';

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="container flex h-16 items-center gap-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight shrink-0">
          <span className="grid size-9 place-items-center rounded-xl gradient-brand text-white shadow-soft">
            <Sparkles className="size-5" />
          </span>
          <span className="hidden sm:block">
            Event<span className="gradient-text">Sphere</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setSearchOpen(true)}
          className="ml-auto lg:ml-4 flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground hover:border-primary/50 transition"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline truncate">Search events, people…</span>
          <span className="hidden sm:inline ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-bold">⌘K</span>
        </button>

        <button onClick={toggle} aria-label="Toggle theme" className="grid size-10 place-items-center rounded-full hover:bg-secondary transition shrink-0">
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        {user ? (
          <>
            <div className="hidden sm:block">
              <NotificationBell />
            </div>
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 rounded-full p-0.5 pr-1 hover:bg-secondary transition" aria-label="Account menu">
                  <Avatar name={user.name} src={user.avatar} className="size-9" />
                </button>
              }
            >
              {(close) => (
                <div>
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {user.role}
                    </span>
                  </div>
                  <Link to={dashboardLink} onClick={close}><MenuItem icon={LayoutDashboard}>Dashboard</MenuItem></Link>
                  <Link to="/my-tickets" onClick={close}><MenuItem icon={Ticket}>My Tickets</MenuItem></Link>
                  <Link to="/certificates" onClick={close}><MenuItem icon={Award}>My Certificates</MenuItem></Link>
                  <Link to="/profile" onClick={close}><MenuItem icon={UserIcon}>Profile & Preferences</MenuItem></Link>
                  <Link to="/notifications" className="sm:hidden" onClick={close}><MenuItem icon={Compass}>Notifications</MenuItem></Link>
                  <MenuItem
                    icon={LogOut}
                    danger
                    onClick={() => {
                      logout();
                      disconnectSocket();
                      navigate('/');
                      close();
                    }}
                  >
                    Log out
                  </MenuItem>
                </div>
              )}
            </Dropdown>
          </>
        ) : (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button onClick={() => navigate('/login')} className="h-9 rounded-lg px-4 text-sm font-semibold hover:bg-secondary transition">
              Log in
            </button>
            <button onClick={() => navigate('/register')} className="h-9 rounded-lg gradient-brand px-4 text-sm font-semibold text-white hover:brightness-110">
              Get started
            </button>
          </div>
        )}

        <button className="lg:hidden grid size-10 place-items-center rounded-full hover:bg-secondary" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          <Menu className="size-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t bg-card px-4 py-3 space-y-1 animate-fade-in">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
              {l.label}
            </Link>
          ))}
          {!user && (
            <div className="flex gap-2 pt-2">
              <button onClick={() => navigate('/login')} className="h-10 flex-1 rounded-lg border text-sm font-semibold">Log in</button>
              <button onClick={() => navigate('/register')} className="h-10 flex-1 rounded-lg gradient-brand text-white text-sm font-semibold">Get started</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
