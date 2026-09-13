import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Menu, X, LogOut, LayoutDashboard, User as UserIcon, Sparkles, Ticket, Award, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../store/theme';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import NotificationBell from '../notifications/NotificationBell';
import { Avatar } from '../ui/avatar';
import { Dropdown, MenuItem } from '../ui/misc';
import { Button } from '../ui/button';
import { disconnectSocket } from '../../lib/socket';
import { cn } from '../../lib/utils';

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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on navigation
  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

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
    <header className={cn('sticky top-0 z-40 glass transition-shadow duration-200', scrolled && 'shadow-soft')}>
      <div className="container flex h-14 items-center gap-2 sm:gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-base font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg gradient-brand text-white shadow-soft">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden sm:block">
            Event<span className="gradient-text">Sphere</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground shadow-soft transition-all duration-150 hover:border-border-strong hover:text-foreground md:flex lg:w-64"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search events, people…</span>
            <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-bold text-muted-foreground">⌘K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          >
            <Search className="size-[18px]" />
          </button>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>

          {user ? (
            <>
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="rounded-full p-0.5 transition-colors hover:bg-secondary"
                    aria-label="Account menu"
                  >
                    <Avatar name={user.name} src={user.avatar} className="size-8" />
                  </button>
                }
              >
                {(close) => (
                  <div>
                    <div className="border-b px-3 py-2.5">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {user.role}
                      </span>
                    </div>
                    <div className="pt-1">
                      <Link to={dashboardLink} onClick={close}><MenuItem icon={LayoutDashboard}>Dashboard</MenuItem></Link>
                      <Link to="/my-tickets" onClick={close}><MenuItem icon={Ticket}>My Tickets</MenuItem></Link>
                      <Link to="/certificates" onClick={close}><MenuItem icon={Award}>My Certificates</MenuItem></Link>
                      <Link to="/profile" onClick={close}><MenuItem icon={UserIcon}>Profile & Preferences</MenuItem></Link>
                      <Link to="/notifications" className="sm:hidden" onClick={close}><MenuItem icon={Bell}>Notifications</MenuItem></Link>
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
                  </div>
                )}
              </Dropdown>
            </>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </div>
          )}

          <button
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t bg-card lg:hidden"
          >
            <nav className="space-y-0.5 px-4 py-3" aria-label="Mobile">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <Link
                  to={dashboardLink}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                    Log in
                  </Button>
                  <Button className="flex-1" onClick={() => navigate('/register')}>
                    Get started
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
