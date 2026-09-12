import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) {
    const home =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'organizer'
          ? '/dashboard/events'
          : user.role === 'volunteer'
            ? '/dashboard/assignments'
            : user.role === 'speaker'
              ? '/dashboard/speaking'
              : '/home';
    return <Navigate to={home} replace />;
  }
  return children;
}
