import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Permission } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissionsContext } from '@/contexts/PermissionContext'
import { usePermissions } from '@/hooks/usePermissions'

// useAuth/usePermissionsContext são mockados como funções simples — usePermissions
// não usa hooks de React internamente além delas, então pode ser chamado direto.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/contexts/PermissionContext', () => ({ usePermissionsContext: vi.fn() }))

const roles = [
  { id: 'admin', name: 'Admin', permissions: ['bens:create', 'bens:delete', 'imoveis:delete', 'settings:read'] },
  { id: 'usuario', name: 'Usuário', permissions: ['bens:create', 'bens:read'] },
  { id: 'visualizador', name: 'Visualizador', permissions: ['bens:read'] },
]

const setUser = (role: string | null) =>
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ user: role ? { role } : null })

beforeEach(() => {
  ;(usePermissionsContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ roles })
})

describe('usePermissions.hasPermission', () => {
  it('superuser tem TODAS as permissões (bypass)', () => {
    setUser('superuser')
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:delete')).toBe(true)
    expect(hasPermission('settings:update')).toBe(true)
    expect(hasPermission('qualquer:coisa' as Permission)).toBe(true)
  })

  it('admin: tem as do seu papel, nega o que não está na lista', () => {
    setUser('admin')
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:delete')).toBe(true)
    expect(hasPermission('imoveis:delete')).toBe(true)
    expect(hasPermission('settings:read')).toBe(true)
    expect(hasPermission('users:delete')).toBe(false)
  })

  it('usuario: só as do papel', () => {
    setUser('usuario')
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:create')).toBe(true)
    expect(hasPermission('bens:delete')).toBe(false)
    expect(hasPermission('imoveis:delete')).toBe(false)
  })

  it('visualizador: só leitura', () => {
    setUser('visualizador')
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:read')).toBe(true)
    expect(hasPermission('bens:create')).toBe(false)
  })

  it('sem usuário → nega tudo', () => {
    setUser(null)
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:read')).toBe(false)
  })

  it('papel desconhecido (sem entry em roles) → nega', () => {
    setUser('papel_inexistente')
    const { hasPermission } = usePermissions()
    expect(hasPermission('bens:read')).toBe(false)
  })
})
