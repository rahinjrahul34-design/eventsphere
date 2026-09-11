import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Ticket, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/utils';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const items = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/events', icon: Compass, label: 'Explore' },
    { to: '/my-tickets', icon: Ticket, label: 'Tickets' },
    { to: '/network', icon: Users, label: 'Network' },
    { to: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </div>
      <button onClick={() => navigate(user.role === 'organizer' ? '/dashboard/events' : '/home')} className="sr-only">
        dashboard
      </button>
    </nav>
  );
}
