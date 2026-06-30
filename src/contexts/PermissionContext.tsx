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

/** Formato devolvido pelo endpoint GET /config/role-permissions */
type RolePermissionRaw = {
  roleId: UserRole
  name: string
  permissions: Permission[]
}

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
      'imoveis:create',
      'imoveis:read',
      'imoveis:update',
      'imoveis:delete',
      'emprestimos:read',
      'emprestimos:create',
      'emprestimos:update',
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
      'imoveis:create',
      'imoveis:read',
      'imoveis:update',
      'imoveis:delete',
      'emprestimos:read',
      'emprestimos:create',
      'emprestimos:update',
      'reports:generate',
    ],
  },
  {
    id: 'usuario',
    name: 'Responsável Patrimonial',
    permissions: [
      'bens:create',
      'bens:read',
      'bens:update',
      'imoveis:create',
      'imoveis:read',
      'imoveis:update',
      'emprestimos:read',
      'emprestimos:create',
      'emprestimos:update',
    ],
  },
  {
    id: 'visualizador',
    name: 'Visualizador',
    permissions: ['bens:read', 'imoveis:read', 'emprestimos:read'],
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
      const rolePermissions = await api.get<RolePermissionRaw[]>('/config/role-permissions')
      // Converter para o formato esperado
      const rolesData: Role[] = rolePermissions.map(rp => ({
        id: rp.roleId,
        name: rp.name,
        permissions: rp.permissions,
      }))

      // MESCLA sobre os padrões canônicos em vez de SUBSTITUIR. Antes, se o banco
      // só tivesse a linha de um papel (ex.: `supervisor`, criada ao salvar esse
      // papel uma vez), `setRoles(rolesData)` apagava todos os outros papéis →
      // o dropdown de permissões só mostrava supervisor e o `usuario` perdia
      // `bens:update` (sumia o botão "Distribuir para local final"). Agora todos
      // os papéis canônicos existem sempre; o banco só sobrescreve quando há
      // customização persistida para aquele papel.
      const merged: Role[] = defaultRoles.map((def) => {
        const fromDb = rolesData.find((r) => r.id === def.id)
        return fromDb
          ? { ...def, name: fromDb.name || def.name, permissions: fromDb.permissions }
          : def
      })
      // Inclui papéis vindos do banco que não existam nos padrões (future-proof).
      rolesData.forEach((r) => {
        if (!merged.some((m) => m.id === r.id)) merged.push(r)
      })
      setRoles(merged)
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
