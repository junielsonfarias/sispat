import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { RouteFallback } from './RouteFallback'

interface ProtectedRouteProps {
  children?: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <RouteFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (
    user?.role === 'superuser' &&
    !location.pathname.startsWith('/superuser')
  ) {
    return <Navigate to="/superuser" replace />
  }

  if (
    user?.role !== 'superuser' &&
    location.pathname.startsWith('/superuser')
  ) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const defaultDashboardMap: Record<UserRole, string> = {
      superuser: '/superuser',
      admin: '/dashboard/admin',
      supervisor: '/dashboard/supervisor',
      usuario: '/dashboard/usuario',
      visualizador: '/dashboard/visualizador',
    }
    const defaultDashboard = user ? defaultDashboardMap[user.role] : '/'
    return <Navigate to={defaultDashboard} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
