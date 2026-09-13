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
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden="true"
                />
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <button onClick={() => navigate(user.role === 'organizer' ? '/dashboard/events' : '/home')} className="sr-only">
        dashboard
      </button>
    </nav>
  );
}
