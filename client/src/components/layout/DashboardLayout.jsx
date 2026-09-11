import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Plus, Bot, Users, ClipboardList, Mic2,
  ShieldCheck, Flag, Tags, ScrollText, Menu, X, Sparkles, Home, LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../store/auth';
import { Avatar } from '../ui/avatar';
import GlobalSearch from '../search/GlobalSearch';
import { useGlobalSocket } from '../../hooks/useSocket';
import NotificationBell from '../notifications/NotificationBell';
import { cn } from '../../lib/utils';
import { disconnectSocket } from '../../lib/socket';
import { useTheme } from '../../store/theme';
import { Sun, Moon } from 'lucide-react';

export default function DashboardLayout() {
  useGlobalSocket();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { theme, toggle } = useTheme();

  const organizerNav = [
    { to: '/dashboard/overview', icon: LayoutDashboard, label: 'Overview' },
    { to: '/dashboard/events', icon: CalendarDays, label: 'My Events' },
    { to: '/dashboard/events/create', icon: Plus, label: 'Create Event' },
    { to: '/dashboard/copilot', icon: Bot, label: 'AI Copilot' },
  ];
  const adminNav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/events', icon: CalendarDays, label: 'Event Approvals' },
    { to: '/admin/users', icon: Users, label: 'Users & Organizers' },
    { to: '/admin/reports', icon: Flag, label: 'Reports' },
    { to: '/admin/categories', icon: Tags, label: 'Categories' },
    { to: '/admin/audit', icon: ScrollText, label: 'Audit Logs' },
  ];

  const nav =
    user.role === 'admin'
      ? adminNav
      : user.role === 'organizer'
        ? organizerNav
        : user.role === 'volunteer'
          ? [{ to: '/dashboard/assignments', icon: ClipboardList, label: 'My Assignments' }]
          : [{ to: '/dashboard/speaking', icon: Mic2, label: 'My Sessions' }];

  const title =
    user.role === 'admin' ? 'Admin Console'
      : user.role === 'organizer' ? 'Organizer Studio'
        : user.role === 'volunteer' ? 'Volunteer Desk' : 'Speaker Hub';

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b font-display text-lg font-extrabold">
        <span className="grid size-8 place-items-center rounded-lg gradient-brand text-white"><Sparkles className="size-4" /></span>
        EventSphere
      </Link>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                (isActive || (item.to !== '/dashboard/events/create' && item.to.startsWith('/dashboard/events') && loc.pathname.startsWith('/dashboard/events/')))
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
        <div className="pt-3">
          <Link to="/events" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary">
            <Home className="size-4" /> Back to site
          </Link>
        </div>
      </div>
      <div className="border-t p-3">
        <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary">
          <Avatar name={user.name} src={user.avatar} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={() => { logout(); disconnectSocket(); navigate('/'); }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r bg-card z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card animate-fade-in">
            <button className="absolute right-3 top-4 z-10" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 backdrop-blur px-4 sm:px-6">
          <button className="lg:hidden grid size-9 place-items-center rounded-lg hover:bg-secondary" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <h1 className="font-display font-bold text-lg">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {user.role === 'organizer' && (
              <Link to="/dashboard/events/create" className="hidden sm:inline-flex h-9 items-center gap-2 rounded-lg gradient-brand px-4 text-sm font-semibold text-white hover:brightness-110">
                <Plus className="size-4" /> New Event
              </Link>
            )}
            <button onClick={toggle} className="grid size-9 place-items-center rounded-lg hover:bg-secondary" aria-label="theme">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
      <GlobalSearch />
    </div>
  );
}
