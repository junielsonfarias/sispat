import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Inventory, InventoryItem, InventoryStatus, InventoryItemStatus, Patrimonio } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { extractApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { PATRIMONIOS_ALL_KEY } from '@/hooks/queries/use-all-patrimonios'
import { PATRIMONIO_STATS_KEY } from '@/hooks/queries/use-patrimonio-stats'

// Cache compartilhado de inventários (React Query). Fonte única.
const INVENTARIOS_KEY = ['inventarios'] as const

/** Formato bruto de item devolvido pelo backend (antes do mapeamento frontend) */
type BackendInventoryItem = {
  patrimonioId?: string
  imovelId?: string
  patrimonio?: { numero_patrimonio?: string; descricao_bem?: string }
  imovel?: { numero_patrimonio?: string; denominacao?: string }
  encontrado?: boolean
  status?: string
  numero_patrimonio?: string
  descricao_bem?: string
}

/** Formato bruto de inventário devolvido pelo backend (antes do mapeamento frontend) */
type BackendInventoryRaw = {
  id: string
  title?: string
  name?: string
  setor?: string
  sectorName?: string
  status?: string
  dataInicio?: string
  createdAt?: string
  dataFim?: string
  finalizedAt?: string
  items?: BackendInventoryItem[]
  scope?: string
  local?: string
  locationType?: string
  specificLocationId?: string
}

// Mapeia o inventário bruto do backend para o modelo do frontend (campos/enums).
const mapInventory = (inv: BackendInventoryRaw, municipalityId: string): Inventory => ({
  id: inv.id,
  name: inv.title || inv.name || '',
  sectorName: inv.setor || inv.sectorName || '', // Backend retorna 'setor'
  status: (inv.status === 'em_andamento'
    ? 'in_progress'
    : inv.status === 'concluido'
    ? 'completed'
    : inv.status ?? 'in_progress') as InventoryStatus,
  createdAt: inv.dataInicio ? new Date(inv.dataInicio) : inv.createdAt ? new Date(inv.createdAt) : new Date(),
  finalizedAt: inv.dataFim ? new Date(inv.dataFim) : inv.finalizedAt ? new Date(inv.finalizedAt) : undefined,
  items: (inv.items || []).map((item): InventoryItem => ({
    // Móvel (patrimonioId) ou imóvel (imovelId) — Art. 16.
    patrimonioId: item.patrimonioId || item.imovelId || '',
    numero_patrimonio:
      item.patrimonio?.numero_patrimonio || item.imovel?.numero_patrimonio || item.numero_patrimonio || '',
    descricao_bem:
      item.patrimonio?.descricao_bem || item.imovel?.denominacao || item.descricao_bem || '',
    status: (item.encontrado !== undefined
      ? item.encontrado
        ? 'found'
        : 'not_found'
      : item.status ?? 'not_found') as InventoryItemStatus,
    isImovel: !!item.imovelId,
  })),
  scope: (inv.scope || 'sector') as Inventory['scope'],
  locationType: inv.local || inv.locationType,
  specificLocationId: inv.specificLocationId,
  municipalityId,
})

interface InventoryContextType {
  inventories: Inventory[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getInventoryById: (id: string) => Inventory | undefined
  createInventory: (data: {
    name: string
    sectorName: string
    scope: 'sector' | 'location' | 'specific_location'
    locationType?: string
    specificLocationId?: string
    // Campos opcionais novos (Sprint 18 — tipos de inventário)
    tipo?: 'anual' | 'transferencia' | 'extraordinario' | 'inicial'
    dataBase?: string
    exercicio?: number
    agenteAnterior?: string
    agenteNovo?: string
  }) => Promise<Inventory>
  updateInventory: (inventoryId: string, updatedInventory: Inventory) => Promise<void>
  updateInventoryItemStatus: (
    inventoryId: string,
    patrimonioId: string,
    status: 'found' | 'not_found',
  ) => Promise<void>
  finalizeInventory: (inventoryId: string) => Promise<Patrimonio[]>
  deleteInventory: (inventoryId: string) => Promise<void>
}

const InventoryContext = createContext<InventoryContextType | null>(null)

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: INVENTARIOS_KEY,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const response = await api.get<unknown>('/inventarios')
      // A API pode devolver array direto, { inventarios } ou { data: { inventarios } }.
      let raw: BackendInventoryRaw[] = []
      if (Array.isArray(response)) {
        raw = response as BackendInventoryRaw[]
      } else if (response && typeof response === 'object') {
        const obj = response as Record<string, unknown>
        if (Array.isArray(obj.inventarios)) {
          raw = obj.inventarios as BackendInventoryRaw[]
        } else if (obj.data && typeof obj.data === 'object') {
          const nested = obj.data as Record<string, unknown>
          if (Array.isArray(nested.inventarios)) {
            raw = nested.inventarios as BackendInventoryRaw[]
          }
        }
      }
      return raw.map((inv) => mapInventory(inv, user?.municipalityId || ''))
    },
  })

  const inventories = data ?? []
  const error = queryError ? extractApiError(queryError).message : null

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: INVENTARIOS_KEY }),
    [queryClient],
  )

  const getInventoryById = useCallback(
    (id: string) => inventories.find((inv) => inv.id === id),
    [inventories],
  )

  const createInventory = useCallback(
    async (data: {
      name: string
      sectorName: string
      scope: 'sector' | 'location' | 'specific_location'
      locationType?: string
      specificLocationId?: string
      tipo?: 'anual' | 'transferencia' | 'extraordinario' | 'inicial'
      dataBase?: string
      exercicio?: number
      agenteAnterior?: string
      agenteNovo?: string
    }) => {
      try {
        const { name, sectorName, scope, locationType, specificLocationId, tipo, dataBase, exercicio, agenteAnterior, agenteNovo } = data

        const inventoryPayload: Record<string, unknown> = {
          title: name,
          description: `Inventário do setor ${sectorName}`,
          setor: sectorName,
          local: specificLocationId || locationType || '',
          dataInicio: new Date().toISOString(),
          scope,
        }
        if (tipo !== undefined) inventoryPayload.tipo = tipo
        if (dataBase !== undefined && dataBase !== '') inventoryPayload.dataBase = dataBase
        if (exercicio !== undefined) inventoryPayload.exercicio = exercicio
        if (agenteAnterior !== undefined && agenteAnterior !== '') inventoryPayload.agenteAnterior = agenteAnterior
        if (agenteNovo !== undefined && agenteNovo !== '') inventoryPayload.agenteNovo = agenteNovo

        const newInventory = await api.post<BackendInventoryRaw>('/inventarios', inventoryPayload)
        await invalidate()
        // Mapeia para o modelo do frontend (mantém locationType informado).
        return {
          ...mapInventory(newInventory, user?.municipalityId || ''),
          locationType: locationType ?? (newInventory.local || newInventory.locationType),
          specificLocationId,
        }
      } catch (error) {
        logger.error('Erro ao criar inventário:', error)
        throw error // Re-throw para o componente capturar
      }
    },
    [invalidate, user],
  )

  const updateInventory = useCallback(
    async (inventoryId: string, updatedInventory: Inventory) => {
      try {
        // updateInventarioSchema do backend é .strict() e usa title/setor/local
        // (não name/sectorName/scope/items do modelo do frontend). Mapear.
        const payload = {
          title: updatedInventory.name,
          setor: updatedInventory.sectorName,
          local: updatedInventory.specificLocationId || updatedInventory.locationType || '',
        }
        await api.put<Inventory>(`/inventarios/${inventoryId}`, payload)
        await invalidate()
        toast({ title: 'Sucesso', description: 'Inventário atualizado com sucesso.' })
      } catch {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar inventário.' })
      }
    },
    [invalidate],
  )

  const updateInventoryItemStatus = useCallback(
    async (inventoryId: string, patrimonioId: string, status: 'found' | 'not_found') => {
      // Atualização otimista direto no cache do React Query (UX imediata)...
      queryClient.setQueryData<Inventory[]>(INVENTARIOS_KEY, (prev) =>
        prev?.map((inv) =>
          inv.id === inventoryId
            ? {
                ...inv,
                items: inv.items.map((item) =>
                  item.patrimonioId === patrimonioId ? { ...item, status } : item,
                ),
              }
            : inv,
        ),
      )
      // ...e persistência (InventoryItem.encontrado + verificadoEm/Por).
      try {
        await api.patch(`/inventarios/${inventoryId}/items/${patrimonioId}`, {
          encontrado: status === 'found',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar a conferência. Recarregando dados.',
        })
        await invalidate() // Reverte para o estado real do servidor.
        throw error
      }
    },
    [queryClient, invalidate],
  )

  const finalizeInventory = useCallback(
    async (inventoryId: string): Promise<Patrimonio[]> => {
      // O backend conclui e marca os não-encontrados como extraviados atomicamente.
      const result = await api.post<{
        inventario: unknown
        extraviados: {
          id: string
          numero_patrimonio: string
          descricao_bem?: string
          statusAnterior?: string
        }[]
      }>(`/inventarios/${inventoryId}/finalizar`)

      const extraviados = result.extraviados || []
      const newlyMissing = extraviados.map(
        (e) =>
          ({
            id: e.id,
            numero_patrimonio: e.numero_patrimonio,
            descricao_bem: e.descricao_bem ?? '',
            status: e.statusAnterior ?? 'ativo',
          }) as Patrimonio,
      )

      if (extraviados.length > 0) {
        // Telas sob demanda refletem os bens extraviados.
        void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
        void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
      }

      await invalidate()
      return newlyMissing
    },
    [queryClient, invalidate],
  )

  const deleteInventory = useCallback(
    async (inventoryId: string) => {
      try {
        await api.delete(`/inventarios/${inventoryId}`)
        await invalidate()
        toast({ title: 'Sucesso', description: 'Inventário excluído com sucesso.' })
      } catch {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir inventário.' })
      }
    },
    [invalidate],
  )

  return (
    <InventoryContext.Provider
      value={{
        inventories,
        isLoading,
        error,
        refetch: invalidate,
        getInventoryById,
        createInventory,
        updateInventory,
        updateInventoryItemStatus,
        finalizeInventory,
        deleteInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventory = () => {
  const context = useContext(InventoryContext)
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider')
  }
  return context
}
