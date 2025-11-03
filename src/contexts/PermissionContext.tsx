import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
  useCallback,
} from 'react'
import { Role, Permission, UserRole } from '@/types'
import { api } from '@/services/api-adapter'
import { useAuth } from './AuthContext'

const defaultRoles: Role[] = [
  {
    id: 'superuser',
    name: 'Superusuário',
    permissions: ['superuser:access', 'permissions:manage'],
  },
  {
    id: 'admin',
    name: 'Administrador',
    permissions: [
      'bens:create',
      'bens:read',
      'bens:update',
      'bens:delete',
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'settings:read',
      'settings:update',
      'reports:generate',
      'reports:manage_templates',
    ],
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    permissions: [
      'bens:create',
      'bens:read',
      'bens:update',
      'reports:generate',
    ],
  },
  {
    id: 'usuario',
    name: 'Usuário',
    permissions: ['bens:create', 'bens:read', 'bens:update'],
  },
  {
    id: 'visualizador',
    name: 'Visualizador',
    permissions: ['bens:read'],
  },
]

interface PermissionContextType {
  roles: Role[]
  updateRolePermissions: (roleId: UserRole, permissions: Permission[]) => void
}

const PermissionContext = createContext<PermissionContextType | null>(null)

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [roles, setRoles] = useState<Role[]>(defaultRoles)
  const { user } = useAuth()

  const fetchRoles = useCallback(async () => {
    if (!user) return
    
    try {
      const rolePermissions = await api.get<any[]>('/config/role-permissions')
      // Converter para o formato esperado
      const rolesData = rolePermissions.map(rp => ({
        id: rp.roleId,
        name: rp.name,
        permissions: rp.permissions,
      }))
      if (rolesData.length > 0) {
        setRoles(rolesData as Role[])
      }
    } catch (error) {
      // Usar roles padrão se falhar
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchRoles()
    }
  }, [user, fetchRoles])

  const updateRolePermissions = useCallback(
    async (roleId: UserRole, permissions: Permission[]) => {
      try {
        await api.put(`/config/role-permissions/${roleId}`, {
          name: roles.find(r => r.id === roleId)?.name || roleId,
          permissions,
        })
        await fetchRoles()
      } catch (error) {
        // Reverter mudanças
        await fetchRoles()
      }
    },
    [roles, fetchRoles],
  )

  return (
    <PermissionContext.Provider value={{ roles, updateRolePermissions }}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissionsContext = () => {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error(
      'usePermissionsContext must be used within a PermissionProvider',
    )
  }
  return context
}
