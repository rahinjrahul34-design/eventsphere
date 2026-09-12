import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';

import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public pages
import Landing from './pages/Landing';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import LiveEvent from './pages/LiveEvent';
import VerifyCertificate from './pages/VerifyCertificate';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOtp from './pages/auth/VerifyOtp';
import ResetPassword from './pages/auth/ResetPassword';
import PasswordResetSuccess from './pages/auth/PasswordResetSuccess';

// Attendee / authenticated pages
import HomeFeed from './pages/HomeFeed';
import MyEvents from './pages/MyEvents';
import CalendarPage from './pages/CalendarPage';
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import MyCertificates from './pages/MyCertificates';
import Notifications from './pages/Notifications';
import Network from './pages/Network';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';

// Organizer studio
import OrganizerHome from './pages/organizer/OrganizerHome';
import EventsList from './pages/organizer/EventsList';
import EventCreate from './pages/organizer/EventCreate';
import ManageEvent from './pages/organizer/ManageEvent';
import Copilot from './pages/organizer/Copilot';
import Overview from './pages/organizer/tabs/Overview';
import EventPulseTab from './pages/organizer/tabs/EventPulseTab';
import EventShieldTab from './pages/organizer/tabs/EventShieldTab';
import SmartQueueTab from './pages/organizer/tabs/SmartQueueTab';
import Analytics from './pages/organizer/tabs/Analytics';
import Registrations from './pages/organizer/tabs/Registrations';
import CheckIn from './pages/organizer/tabs/CheckIn';
import LiveTab from './pages/organizer/tabs/LiveTab';
import Schedule from './pages/organizer/tabs/Schedule';
import Speakers from './pages/organizer/tabs/Speakers';
import Volunteers from './pages/organizer/tabs/Volunteers';
import Sponsors from './pages/organizer/tabs/Sponsors';
import CheckInDesk from './pages/organizer/CheckInDesk';

// Volunteer / speaker
import RoleHome from './pages/RoleHome';

// Admin
import AdminHome from './pages/admin/AdminHome';
import AdminUsers from './pages/admin/AdminUsers';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminModeration from './pages/admin/AdminModeration';
import AdminCategories from './pages/admin/AdminCategories';
import AdminAudit from './pages/admin/AdminAudit';
import AdminTrustAnalytics from './pages/admin/AdminTrustAnalytics';

// TrustSphere AI
import TrustTab from './pages/organizer/tabs/TrustTab';
import OrganizerPublicProfile from './pages/OrganizerPublicProfile';

// EventBoost AI
import EventBoostTab from './pages/organizer/tabs/EventBoostTab';

// AI Command Center
import CommandCenter from './pages/organizer/CommandCenter';
import CommandCenterTab from './pages/organizer/tabs/CommandCenterTab';

function RoleHomeRedirect() {
  const { user } = useAuth();
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'organizer') return <Navigate to="/dashboard/overview" replace />;
  if (user.role === 'volunteer') return <Navigate to="/dashboard/assignments" replace />;
  if (user.role === 'speaker') return <Navigate to="/dashboard/speaking" replace />;
  return <Navigate to="/home" replace />;
}

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold gradient-text">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you’re looking for doesn’t exist or was moved.</p>
        <a href="/" className="mt-5 inline-block rounded-lg gradient-brand px-5 py-2.5 text-sm font-bold text-white">Back to home</a>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const auth = (children, roles) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
  const ORG = ['organizer', 'admin'];
  const STAFF = ['organizer', 'admin', 'volunteer'];

  return (
    <Routes location={location}>
      {/* Public + marketing */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/organizers/:id" element={<OrganizerPublicProfile />} />
        <Route path="/verify-certificate" element={<VerifyCertificate />} />
        <Route path="/verify-certificate/:id" element={<VerifyCertificate />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-reset-success" element={<PasswordResetSuccess />} />

        {/* Authenticated app pages */}
        <Route path="/home" element={auth(<HomeFeed />)} />
        <Route path="/onboarding" element={auth(<Onboarding />)} />
        <Route path="/my-events" element={auth(<MyEvents />)} />
        <Route path="/calendar" element={auth(<CalendarPage />)} />
        <Route path="/my-tickets" element={auth(<MyTickets />)} />
        <Route path="/my-tickets/:id" element={auth(<TicketDetail />)} />
        <Route path="/certificates" element={auth(<MyCertificates />)} />
        <Route path="/notifications" element={auth(<Notifications />)} />
        <Route path="/network" element={auth(<Network />)} />
        <Route path="/profile" element={auth(<Profile />)} />
        <Route path="/events/:slug/live" element={auth(<LiveEvent />)} />
        <Route path="/organizer/command-center" element={<Navigate to="/dashboard/command-center" replace />} />
      </Route>

      {/* Dashboard shell — organizer / volunteer / speaker */}
      <Route path="/dashboard" element={auth(<DashboardLayout />, ['organizer', 'admin', 'volunteer', 'speaker'])}>
        <Route index element={<RoleHomeRedirect />} />
        <Route path="overview" element={auth(<OrganizerHome />, ORG)} />
        <Route path="command-center" element={auth(<CommandCenter />, ORG)} />
        <Route path="events" element={auth(<EventsList />, ORG)} />
        <Route path="events/create" element={auth(<EventCreate />, ORG)} />
        <Route path="trust" element={auth(<TrustTab />, ORG)} />
        <Route path="copilot" element={auth(<Copilot />, ORG)} />
        <Route path="events/:id" element={auth(<ManageEvent />, ORG)}>
          <Route index element={<Overview />} />
          <Route path="command-center" element={<CommandCenterTab />} />
          <Route path="eventboost" element={<EventBoostTab />} />
          <Route path="seo" element={<EventBoostTab />} />
          <Route path="trust" element={<TrustTab />} />
          <Route path="eventpulse" element={<EventPulseTab />} />
          <Route path="eventshield" element={<EventShieldTab />} />
          <Route path="smartqueue" element={<SmartQueueTab />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="registrations" element={<Registrations />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="live" element={<LiveTab />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="speakers" element={<Speakers />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="sponsors" element={<Sponsors />} />
        </Route>
        <Route path="check-in/:id" element={auth(<CheckInDesk />, STAFF)} />
        <Route path="assignments" element={auth(<RoleHome />, ['volunteer', 'organizer', 'admin'])} />
        <Route path="speaking" element={auth(<RoleHome />, ['speaker', 'organizer', 'admin'])} />
      </Route>

      {/* Admin console */}
      <Route path="/admin" element={auth(<DashboardLayout />, ['admin'])}>
        <Route index element={<AdminHome />} />
        <Route path="events" element={<AdminApprovals />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="trust" element={<AdminTrustAnalytics />} />
        <Route path="reports" element={<AdminModeration />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
