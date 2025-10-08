import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

const DashboardRedirect = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      const dashboardMap: Record<UserRole, string> = {
        superuser: '/superuser',
        admin: '/',
        supervisor: '/',
        usuario: '/dashboard/usuario',
        visualizador: '/dashboard/visualizador',
      }
      const destination = dashboardMap[user.role] || '/'
      navigate(destination, { replace: true })
    }
  }, [user, navigate])

  return null
}

export default DashboardRedirect
