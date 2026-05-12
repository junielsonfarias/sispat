import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Após M15: existe apenas UM dashboard por rota raiz (UnifiedDashboard).
 * Superuser tem entrada separada em /superuser. Demais roles vão para /dashboard.
 */
const DashboardRedirect = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const destination = user.role === 'superuser' ? '/superuser' : '/dashboard'
    navigate(destination, { replace: true })
  }, [user, navigate])

  return null
}

export default DashboardRedirect
