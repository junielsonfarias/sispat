import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { SectorProvider, useSectors } from '@/contexts/SectorContext'

// Mocks: api (fonte de dados), useAuth (gate enabled), toast/logger (no-op).
vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const sectorsFixture = [
  { id: 's1', name: 'TI', codigo: '01', municipalityId: 'mun-A' },
  { id: 's2', name: 'RH', codigo: '02', municipalityId: 'mun-A' },
]

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <SectorProvider>{children}</SectorProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(sectorsFixture)
})

describe('SectorContext (React Query)', () => {
  it('carrega setores via api.get e expõe em sectors', async () => {
    const { result } = renderHook(() => useSectors(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.sectors).toHaveLength(2))
    expect(mockApi.get).toHaveBeenCalledWith('/sectors')
    expect(result.current.getSectorById('s2')?.name).toBe('RH')
  })

  it('aceita resposta no formato { sectors }', async () => {
    mockApi.get.mockResolvedValue({ sectors: sectorsFixture, pagination: {} })
    const { result } = renderHook(() => useSectors(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.sectors).toHaveLength(2))
  })

  it('addSector posta e invalida (refetch)', async () => {
    mockApi.post.mockResolvedValue({ id: 's3', name: 'Novo', codigo: '03', municipalityId: 'mun-A' })
    const { result } = renderHook(() => useSectors(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.sectors).toHaveLength(2))

    await act(async () => {
      await result.current.addSector({ name: 'Novo', codigo: '03', municipalityId: 'mun-A' } as never)
    })

    expect(mockApi.post).toHaveBeenCalledWith('/sectors', expect.objectContaining({ name: 'Novo' }))
    // invalidate → segundo get
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('conexão fora → lista vazia (sem throw)', async () => {
    mockApi.get.mockRejectedValue({ code: 'ERR_NETWORK' })
    const { result } = renderHook(() => useSectors(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.sectors).toEqual([])
  })
})
