import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/services/api-adapter'
import { PermissionProvider, usePermissionsContext } from '@/contexts/PermissionContext'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))

const mockApi = api as unknown as Record<'get' | 'put', ReturnType<typeof vi.fn>>

const wrapper = ({ children }: { children: ReactNode }) => (
  <PermissionProvider>{children}</PermissionProvider>
)

beforeEach(() => vi.clearAllMocks())

describe('PermissionContext', () => {
  it('usa os defaultRoles quando o backend retorna vazio', async () => {
    mockApi.get.mockResolvedValue([])
    const { result } = renderHook(() => usePermissionsContext(), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/config/role-permissions'))
    // defaultRoles: admin tem as chaves novas de imoveis (lote RBAC)
    const admin = result.current.roles.find((r) => r.id === 'admin')
    expect(admin?.permissions).toContain('imoveis:delete')
    expect(result.current.roles.find((r) => r.id === 'superuser')).toBeTruthy()
  })

  it('sobrepõe só o papel que veio do backend e mantém os demais (merge)', async () => {
    mockApi.get.mockResolvedValue([
      { roleId: 'admin', name: 'Administrador', permissions: ['bens:read'] },
    ])
    const { result } = renderHook(() => usePermissionsContext(), { wrapper })

    await waitFor(() => {
      const admin = result.current.roles.find((r) => r.id === 'admin')
      expect(admin?.permissions).toEqual(['bens:read'])
    })
    // MESCLA sobre os defaults: 'admin' é sobrescrito, mas os outros papéis
    // canônicos continuam existindo (evita que o dropdown de permissões fique
    // só com o papel salvo no banco e que `usuario` perca `bens:update`).
    expect(result.current.roles.find((r) => r.id === 'supervisor')).toBeTruthy()
    expect(
      result.current.roles.find((r) => r.id === 'usuario')?.permissions,
    ).toContain('bens:update')
    expect(result.current.roles.find((r) => r.id === 'visualizador')).toBeTruthy()
    expect(result.current.roles.length).toBeGreaterThanOrEqual(5)
  })

  it('mantém os defaultRoles quando o fetch falha', async () => {
    mockApi.get.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => usePermissionsContext(), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalled())
    // Sem quebrar: continua com os defaults (5 papéis)
    expect(result.current.roles.length).toBeGreaterThanOrEqual(5)
    expect(result.current.roles.find((r) => r.id === 'visualizador')).toBeTruthy()
  })
})
