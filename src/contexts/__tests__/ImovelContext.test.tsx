import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { ImovelProvider, useImovel } from '@/contexts/ImovelContext'
import type { User } from '@/types'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>
const dummyUser = { id: 'u1' } as User

const imoveisFixture = [
  { id: 'i1', denominacao: 'Escola', numero_patrimonio: '2025-I-1', municipalityId: 'mun-A' },
]

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ImovelProvider>{children}</ImovelProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(imoveisFixture)
})

describe('ImovelContext (React Query)', () => {
  it('carrega imóveis e resolve getImovelById', async () => {
    const { result } = renderHook(() => useImovel(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.imoveis).toHaveLength(1))
    expect(result.current.getImovelById('i1')?.denominacao).toBe('Escola')
    expect(result.current.error).toBeNull()
  })

  it('addImovel posta e invalida (refetch)', async () => {
    mockApi.post.mockResolvedValue({ id: 'i2', denominacao: 'Posto', municipalityId: 'mun-A' })
    const { result } = renderHook(() => useImovel(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.imoveis).toHaveLength(1))

    await act(async () => {
      await result.current.addImovel({ denominacao: 'Posto' } as never, dummyUser)
    })

    expect(mockApi.post).toHaveBeenCalledWith('/imoveis', expect.objectContaining({ denominacao: 'Posto' }))
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('erro não-conexão expõe error (mensagem)', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } })
    const { result } = renderHook(() => useImovel(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.imoveis).toEqual([])
  })

  it('conexão fora → lista vazia sem erro', async () => {
    mockApi.get.mockRejectedValue({ code: 'ERR_NETWORK' })
    const { result } = renderHook(() => useImovel(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.imoveis).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
