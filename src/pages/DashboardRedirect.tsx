import { RouteFallback } from '@/components/RouteFallback';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const dashboardMap: Record<UserRole, string> = {
        superuser: '/superuser',
        admin: '/dashboard/admin',
        supervisor: '/dashboard/supervisor',
        usuario: '/dashboard/usuario',
        visualizador: '/dashboard/visualizador',
      };
      const destination = dashboardMap[user.role] || '/';
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  return <RouteFallback />;
};

export default DashboardRedirect;
