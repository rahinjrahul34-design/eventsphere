import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Plus, Bot, Users, ClipboardList, Mic2, ShieldCheck, Flag, Tags, ScrollText, Menu, X, Sparkles, Home, LogOut, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../store/auth';
import { Avatar } from '../ui/avatar';
import GlobalSearch from '../search/GlobalSearch';
import { useGlobalSocket } from '../../hooks/useSocket';
import NotificationBell from '../notifications/NotificationBell';
import { cn } from '../../lib/utils';
import { disconnectSocket } from '../../lib/socket';
import { useTheme } from '../../store/theme';
import { Sun, Moon } from 'lucide-react';
import { Tooltip } from '../ui/misc';

function SidebarLink({ item, collapsed, isActive }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive: active }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )
      }
    >
      <item.icon className="size-4 shrink-0" />
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
    </NavLink>
  );
  if (collapsed) return <Tooltip content={item.label} side="right" className="w-full">{link}</Tooltip>;
  return link;
}

export default function DashboardLayout() {
  useGlobalSocket();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('es-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const loc = useLocation();
  const { theme, toggle } = useTheme();

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem('es-sidebar-collapsed', v ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  // Close the mobile drawer on navigation + Escape
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const organizerNav = [
    {
      section: 'General',
      items: [
        { to: '/dashboard/overview', icon: LayoutDashboard, label: 'Overview' },
        { to: '/dashboard/events', icon: CalendarDays, label: 'My Events' },
        { to: '/dashboard/events/create', icon: Plus, label: 'Create Event' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { to: '/dashboard/command-center', icon: Activity, label: 'AI Command Center' },
        { to: '/dashboard/trust', icon: ShieldCheck, label: 'TrustSphere AI' },
        { to: '/dashboard/copilot', icon: Bot, label: 'AI Copilot' },
      ],
    },
  ];
  const adminNav = [
    {
      section: 'Console',
      items: [{ to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true }],
    },
    {
      section: 'Management',
      items: [
        { to: '/admin/events', icon: CalendarDays, label: 'Event Approvals' },
        { to: '/admin/users', icon: Users, label: 'Users & Organizers' },
        { to: '/admin/reports', icon: Flag, label: 'Reports' },
        { to: '/admin/categories', icon: Tags, label: 'Categories' },
      ],
    },
    {
      section: 'Intelligence',
      items: [{ to: '/admin/trust', icon: ShieldCheck, label: 'Trust Intelligence' }],
    },
    {
      section: 'System',
      items: [{ to: '/admin/audit', icon: ScrollText, label: 'Audit Logs' }],
    },
  ];

  const nav =
    user.role === 'admin'
      ? adminNav
      : user.role === 'organizer'
        ? organizerNav
        : user.role === 'volunteer'
          ? [{ section: 'Volunteer', items: [{ to: '/dashboard/assignments', icon: ClipboardList, label: 'My Assignments' }] }]
          : [{ section: 'Speaker', items: [{ to: '/dashboard/speaking', icon: Mic2, label: 'My Sessions' }] }];

  const title =
    user.role === 'admin' ? 'Admin Console'
      : user.role === 'organizer' ? 'Organizer Studio'
        : user.role === 'volunteer' ? 'Volunteer Desk' : 'Speaker Hub';

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b px-4', collapsed && 'justify-center px-0')}>
        <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-base font-extrabold tracking-tight">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg gradient-brand text-white shadow-soft">
            <Sparkles className="size-4" />
          </span>
          {!collapsed && (
            <span className="truncate">
              Event<span className="gradient-text">Sphere</span>
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="ml-auto hidden size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="mb-1 hidden w-full place-items-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        {nav.map((group) => (
          <div key={group.section} className="mb-4 first:mb-0">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
                {group.section}
              </p>
            )}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden="true" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
        <div className="pt-2">
          <Link
            to="/events"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Home className="size-4 shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>Back to site</span>
          </Link>
        </div>
      </div>

      <div className="border-t p-3">
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary',
            collapsed && 'justify-center p-0 py-2'
          )}
          title={collapsed ? user.name : undefined}
        >
          <Avatar name={user.name} src={user.avatar} className="size-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => {
            logout();
            disconnectSocket();
            navigate('/');
          }}
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="size-4 shrink-0" />
          <span className={cn(collapsed && 'sr-only')}>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-[hsl(var(--overlay)/0.5)] backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 w-72 border-r bg-card shadow-pop"
            >
              <button
                className="absolute right-3 top-3.5 z-10 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-200 ease-out', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <button
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            {user.role === 'organizer' && (
              <Link
                to="/dashboard/events/create"
                className="hidden h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all duration-150 hover:bg-primary-hover hover:shadow-lift sm:inline-flex"
              >
                <Plus className="size-4" /> New Event
              </Link>
            )}
            <button
              onClick={toggle}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <GlobalSearch />
    </div>
  );
}
