import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { InventoryProvider, useInventory } from '@/contexts/InventoryContext'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete' | 'patch', ReturnType<typeof vi.fn>>

// Inventário no formato BRUTO do backend (title/setor/em_andamento/encontrado...).
const backendInventarios = {
  inventarios: [
    {
      id: 'inv1',
      title: 'Inventário 2025',
      setor: 'TI',
      status: 'em_andamento',
      dataInicio: '2025-01-10T00:00:00.000Z',
      scope: 'sector',
      items: [
        { patrimonioId: 'p1', patrimonio: { numero_patrimonio: '2025-001', descricao_bem: 'Notebook' }, encontrado: true },
        { imovelId: 'im1', imovel: { numero_patrimonio: '2025-I-001', denominacao: 'Prédio' }, encontrado: false },
      ],
    },
  ],
}

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <InventoryProvider>{children}</InventoryProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(backendInventarios)
})

describe('InventoryContext (React Query)', () => {
  it('mapeia o formato do backend para o modelo do frontend', async () => {
    const { result } = renderHook(() => useInventory(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.inventories).toHaveLength(1))

    const inv = result.current.inventories[0]
    expect(inv.name).toBe('Inventário 2025') // title -> name
    expect(inv.sectorName).toBe('TI') // setor -> sectorName
    expect(inv.status).toBe('in_progress') // em_andamento -> in_progress
    expect(inv.items).toHaveLength(2)
    // Móvel: encontrado true -> found
    expect(inv.items[0]).toMatchObject({ patrimonioId: 'p1', numero_patrimonio: '2025-001', status: 'found', isImovel: false })
    // Imóvel: imovelId vira patrimonioId, denominacao -> descricao_bem, encontrado false -> not_found
    expect(inv.items[1]).toMatchObject({ patrimonioId: 'im1', descricao_bem: 'Prédio', status: 'not_found', isImovel: true })
  })

  it('createInventory mapeia o payload (name->title, sectorName->setor) e invalida', async () => {
    mockApi.post.mockResolvedValue({ id: 'inv2', title: 'Novo', setor: 'RH', status: 'em_andamento', items: [] })
    const { result } = renderHook(() => useInventory(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.inventories).toHaveLength(1))

    await act(async () => {
      await result.current.createInventory({ name: 'Novo', sectorName: 'RH', scope: 'sector' })
    })

    expect(mockApi.post).toHaveBeenCalledWith(
      '/inventarios',
      expect.objectContaining({ title: 'Novo', setor: 'RH', scope: 'sector' }),
    )
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('updateInventoryItemStatus aplica update otimista e persiste (patch)', async () => {
    mockApi.patch.mockResolvedValue({})
    const { result } = renderHook(() => useInventory(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.inventories).toHaveLength(1))

    await act(async () => {
      await result.current.updateInventoryItemStatus('inv1', 'p1', 'not_found')
    })

    // Otimista: o item p1 mudou para not_found no cache, sem depender de refetch.
    await waitFor(() => {
      const item = result.current.inventories[0].items.find((i) => i.patrimonioId === 'p1')
      expect(item?.status).toBe('not_found')
    })
    expect(mockApi.patch).toHaveBeenCalledWith('/inventarios/inv1/items/p1', { encontrado: false })
  })

  it('finalizeInventory retorna os extraviados da resposta do backend', async () => {
    mockApi.post.mockResolvedValue({
      inventario: {},
      extraviados: [{ id: 'p9', numero_patrimonio: '2025-099', descricao_bem: 'Sumido', statusAnterior: 'ativo' }],
    })
    const { result } = renderHook(() => useInventory(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.inventories).toHaveLength(1))

    let missing: { numero_patrimonio: string }[] = []
    await act(async () => {
      missing = await result.current.finalizeInventory('inv1')
    })

    expect(mockApi.post).toHaveBeenCalledWith('/inventarios/inv1/finalizar')
    expect(missing).toHaveLength(1)
    expect(missing[0].numero_patrimonio).toBe('2025-099')
  })
})
