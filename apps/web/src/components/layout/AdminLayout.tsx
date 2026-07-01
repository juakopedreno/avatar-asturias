import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import TopBar from './TopBar';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import PrtrFundingNotice from '@/components/shared/PrtrFundingNotice';

export default function AdminLayout() {
  const { auth, hydrateMe } = useAuth();

  useEffect(() => {
    if (auth) {
      void hydrateMe();
    }
  }, [auth, hydrateMe]);

  if (!auth) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex" style={{ backgroundImage: 'var(--gradient-surface)' }}>
      <AdminSidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen min-w-0 transition-all duration-200">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto min-w-0">
          <Outlet />
        </main>
        <div className="px-6 pb-6">
          <PrtrFundingNotice compact />
        </div>
      </div>
    </div>
  );
}
