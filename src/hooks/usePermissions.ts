import { useAuth } from '@/contexts/AuthContext'
import { usePermissionsContext } from '@/contexts/PermissionContext'
import { Permission } from '@/types'

/**
 * Verifica permissões do usuário autenticado contra o modelo de papéis
 * (PermissionContext). O modelo usa `user.role` (string única) — não `user.roles`.
 * superuser tem acesso total. Use para esconder/desabilitar ações na UI;
 * a autorização real é sempre reforçada no backend.
 */
export const usePermissions = () => {
  const { user } = useAuth()
  const { roles } = usePermissionsContext()

  const hasPermission = (requiredPermission: Permission): boolean => {
    if (!user?.role) {
      return false
    }
    if (user.role === 'superuser') {
      return true
    }
    const roleDetails = roles.find((r) => r.id === user.role)
    return Boolean(roleDetails?.permissions.includes(requiredPermission))
  }

  return { hasPermission }
}
