import { useAuth } from '@/contexts/AuthContext'
import { Permission } from '@/types'

export const usePermissions = () => {
  const { user, roles } = useAuth()

  const hasPermission = (requiredPermission: Permission): boolean => {
    if (!user || !user.roles) {
      return false
    }

    if (user.roles.includes('superuser')) {
      return true
    }

    for (const userRole of user.roles) {
      const roleDetails = roles.find((r) => r.id === userRole)
      if (roleDetails && roleDetails.permissions.includes(requiredPermission)) {
        return true
      }
    }

    return false
  }

  return { hasPermission }
}
