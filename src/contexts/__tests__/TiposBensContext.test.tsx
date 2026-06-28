import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { TiposBensProvider, useTiposBens } from '@/contexts/TiposBensContext'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete' | 'patch', ReturnType<typeof vi.fn>>

const tiposFixture = [
  { id: 't1', nome: 'Eletrônico', ativo: true, codigo: '01', municipalityId: 'mun-A' },
  { id: 't2', nome: 'Mobiliário', ativo: false, codigo: '02', municipalityId: 'mun-A' },
]

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <TiposBensProvider>{children}</TiposBensProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(tiposFixture)
})

describe('TiposBensContext (React Query)', () => {
  it('carrega tipos de bens', async () => {
    const { result } = renderHook(() => useTiposBens(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tiposBens).toHaveLength(2))
    expect(result.current.error).toBeNull()
  })

  it('createTipoBem posta, invalida e retorna o criado', async () => {
    mockApi.post.mockResolvedValue({ id: 't3', nome: 'Veículo', ativo: true })
    const { result } = renderHook(() => useTiposBens(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tiposBens).toHaveLength(2))

    let created: { id: string } | undefined
    await act(async () => {
      created = await result.current.createTipoBem({ nome: 'Veículo', ativo: true } as never)
    })

    expect(mockApi.post).toHaveBeenCalledWith('/tipos-bens', expect.objectContaining({ nome: 'Veículo' }))
    expect(created?.id).toBe('t3')
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('toggleTipoBemStatus usa PUT com ativo invertido (rota /toggle não existe)', async () => {
    mockApi.put.mockResolvedValue({ id: 't2', nome: 'Mobiliário', ativo: true })
    const { result } = renderHook(() => useTiposBens(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tiposBens).toHaveLength(2))

    await act(async () => {
      await result.current.toggleTipoBemStatus('t2')
    })

    // t2 está ativo:false no fixture → toggle envia ativo:true
    expect(mockApi.put).toHaveBeenCalledWith('/tipos-bens/t2', { ativo: true })
  })
})
