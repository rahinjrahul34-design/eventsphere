import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import GlobalSearch from '../search/GlobalSearch';
import { useGlobalSocket } from '../../hooks/useSocket';

export default function MainLayout() {
  useGlobalSocket();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <GlobalSearch />
    </div>
  );
}
