import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { usePatrimonioStats } from '@/hooks/queries/use-patrimonio-stats'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('useAllPatrimonios', () => {
  it('busca /patrimonios?all=true e normaliza historico_movimentacao a partir de historico', async () => {
    mockApi.get.mockResolvedValue({
      patrimonios: [{ id: 'p1', numero_patrimonio: '001', historico: [{ action: 'CREATE' }] }],
      pagination: {},
    })
    const { result } = renderHook(() => useAllPatrimonios(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApi.get).toHaveBeenCalledWith('/patrimonios?all=true')
    expect(result.current.data?.[0].historico_movimentacao).toEqual([{ action: 'CREATE' }])
  })

  it('aceita array direto e preserva historico_movimentacao já existente', async () => {
    mockApi.get.mockResolvedValue([
      { id: 'p1', historico_movimentacao: [{ action: 'X' }], historico: [{ action: 'IGNORAR' }] },
    ])
    const { result } = renderHook(() => useAllPatrimonios(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].historico_movimentacao).toEqual([{ action: 'X' }])
  })

  it('historico ausente → historico_movimentacao = []', async () => {
    mockApi.get.mockResolvedValue([{ id: 'p1' }])
    const { result } = renderHook(() => useAllPatrimonios(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].historico_movimentacao).toEqual([])
  })

  it('enabled:false não dispara a requisição', () => {
    renderHook(() => useAllPatrimonios({ enabled: false }), { wrapper: makeWrapper() })
    expect(mockApi.get).not.toHaveBeenCalled()
  })
})

describe('usePatrimonioStats', () => {
  it('busca /patrimonios/stats e devolve as estatísticas', async () => {
    const stats = { totalCount: 10, totalValue: 1000, ativosCount: 8, porStatus: [] }
    mockApi.get.mockResolvedValue(stats)
    const { result } = renderHook(() => usePatrimonioStats(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApi.get).toHaveBeenCalledWith('/patrimonios/stats')
    expect(result.current.data?.totalCount).toBe(10)
  })
})
