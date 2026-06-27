import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { LocalProvider, useLocais } from '@/contexts/LocalContext'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>

const locaisFixture = [
  { id: 'l1', name: 'Sala 1', sectorId: 's1', municipalityId: 'mun-A' },
  { id: 'l2', name: 'Sala 2', sectorId: 's2', municipalityId: 'mun-A' },
]

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <LocalProvider>{children}</LocalProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(locaisFixture)
})

describe('LocalContext (React Query)', () => {
  it('carrega locais e filtra por setor', async () => {
    const { result } = renderHook(() => useLocais(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.locais).toHaveLength(2))
    expect(result.current.getLocaisBySectorId('s1')).toHaveLength(1)
    expect(result.current.getLocaisBySectorId('s1')[0].id).toBe('l1')
  })

  it('addLocal posta { name, sectorId } (sem municipalityId) e invalida', async () => {
    mockApi.post.mockResolvedValue({ id: 'l3', name: 'Nova', sectorId: 's1', municipalityId: 'mun-A' })
    const { result } = renderHook(() => useLocais(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.locais).toHaveLength(2))

    await act(async () => {
      await result.current.addLocal('Nova', 's1')
    })

    expect(mockApi.post).toHaveBeenCalledWith('/locais', { name: 'Nova', sectorId: 's1' })
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })
})
