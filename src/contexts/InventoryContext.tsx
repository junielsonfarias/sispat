import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Inventory, InventoryItem, Patrimonio } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'
import { PATRIMONIOS_ALL_KEY } from '@/hooks/queries/use-all-patrimonios'
import { PATRIMONIO_STATS_KEY } from '@/hooks/queries/use-patrimonio-stats'

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
  const [allInventories, setAllInventories] = useState<Inventory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const fetchInventories = useCallback(async () => {
    if (!user) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ inventarios: Inventory[]; pagination: unknown }>('/inventarios')
      
      // A API retorna objeto com inventarios e pagination
      let inventariosData: Inventory[] = []
      
      if (Array.isArray(response)) {
        inventariosData = response
      } else if (response && typeof response === 'object') {
        if ('inventarios' in response && Array.isArray(response.inventarios)) {
          inventariosData = response.inventarios
        } else if ('data' in response && Array.isArray((response as any).data?.inventarios)) {
          inventariosData = (response as any).data.inventarios
        } else {
          inventariosData = []
        }
      }
      
      // ✅ CORREÇÃO: Mapear campos do backend para o frontend
      const mappedInventories: Inventory[] = inventariosData.map((inv: any) => ({
        id: inv.id,
        name: inv.title || inv.name,
        sectorName: inv.setor || inv.sectorName, // Backend retorna 'setor', frontend espera 'sectorName'
        status: inv.status === 'em_andamento' ? 'in_progress' : 
                inv.status === 'concluido' ? 'completed' : 
                inv.status,
        createdAt: inv.dataInicio ? new Date(inv.dataInicio) : inv.createdAt ? new Date(inv.createdAt) : new Date(),
        finalizedAt: inv.dataFim ? new Date(inv.dataFim) : inv.finalizedAt ? new Date(inv.finalizedAt) : undefined,
        items: (inv.items || []).map((item: any) => ({
          // Móvel (patrimonioId) ou imóvel (imovelId) — Art. 16.
          patrimonioId: item.patrimonioId || item.imovelId,
          numero_patrimonio:
            item.patrimonio?.numero_patrimonio || item.imovel?.numero_patrimonio || item.numero_patrimonio || '',
          descricao_bem:
            item.patrimonio?.descricao_bem || item.imovel?.denominacao || item.descricao_bem || '',
          status: item.encontrado !== undefined ? (item.encontrado ? 'found' : 'not_found') : item.status,
          isImovel: !!item.imovelId,
        })),
        scope: inv.scope || 'sector',
        locationType: inv.local || inv.locationType,
        specificLocationId: inv.specificLocationId,
        municipalityId: user?.municipalityId || '',
      }))
      
      setAllInventories(mappedInventories)
      setError(null)
    } catch (error) {
      logger.error('fetchInventories: Erro ao carregar inventários:', error)
      setError('Falha ao carregar inventários.')
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar inventários.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchInventories()
  }, [fetchInventories])

  const inventories = useMemo(() => {
    // Agora todos os inventários são visíveis para todos os usuários
    // pois temos apenas um município
    return allInventories
  }, [allInventories])

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
      // Campos opcionais novos (Sprint 18 — tipos de inventário)
      tipo?: 'anual' | 'transferencia' | 'extraordinario' | 'inicial'
      dataBase?: string
      exercicio?: number
      agenteAnterior?: string
      agenteNovo?: string
    }) => {
      try {
        const {
          name,
          sectorName,
          scope,
          locationType,
          specificLocationId,
          tipo,
          dataBase,
          exercicio,
          agenteAnterior,
          agenteNovo,
        } = data

        const inventoryPayload: Record<string, unknown> = {
          title: name,
          description: `Inventário do setor ${sectorName}`,
          setor: sectorName,
          local: specificLocationId || locationType || '',
          dataInicio: new Date().toISOString(),
          scope,
        }

        // Incluir campos opcionais apenas quando definidos
        if (tipo !== undefined) inventoryPayload.tipo = tipo
        if (dataBase !== undefined && dataBase !== '') inventoryPayload.dataBase = dataBase
        if (exercicio !== undefined) inventoryPayload.exercicio = exercicio
        if (agenteAnterior !== undefined && agenteAnterior !== '') inventoryPayload.agenteAnterior = agenteAnterior
        if (agenteNovo !== undefined && agenteNovo !== '') inventoryPayload.agenteNovo = agenteNovo
        
        const newInventory = await api.post<any>('/inventarios', inventoryPayload)
        
        // ✅ CORREÇÃO: Mapear items do backend para o formato do frontend
        // O backend retorna items com a estrutura InventoryItem do Prisma
        const mappedItems: InventoryItem[] = (newInventory.items || []).map((item: any) => ({
          patrimonioId: item.patrimonioId || item.imovelId,
          numero_patrimonio: item.patrimonio?.numero_patrimonio || item.imovel?.numero_patrimonio || '',
          descricao_bem: item.patrimonio?.descricao_bem || item.imovel?.denominacao || '',
          status: item.encontrado ? 'found' : 'not_found',
          isImovel: !!item.imovelId,
        }))
        
        const inventoryData: Inventory = {
          id: newInventory.id,
          name: newInventory.title || name,
          sectorName: newInventory.setor || sectorName,
          status: (newInventory.status === 'em_andamento' ? 'in_progress' : 
                  newInventory.status === 'concluido' ? 'completed' : 
                  newInventory.status) as any,
          createdAt: newInventory.dataInicio ? new Date(newInventory.dataInicio) : new Date(),
          finalizedAt: newInventory.dataFim ? new Date(newInventory.dataFim) : undefined,
          items: mappedItems,
          scope: newInventory.scope || scope,
          locationType,
          specificLocationId,
          municipalityId: user?.municipalityId || '',
        }
        
        await fetchInventories()
        
        return inventoryData
      } catch (error) {
        logger.error('Erro ao criar inventário:', error)
        logger.debug('Stack trace do erro de inventário', { stack: error instanceof Error ? error.stack : 'N/A' })
        throw error // Re-throw para que o componente possa capturar
      }
    },
    [fetchInventories, user],
  )

  const updateInventory = useCallback(
    async (inventoryId: string, updatedInventory: Inventory) => {
      try {
        // updateInventarioSchema do backend é .strict() e usa title/setor/local
        // (não name/sectorName/scope/items do modelo do frontend). Mapear, senão
        // o PUT do objeto inteiro tomava 400 e a edição nunca salvava.
        const payload = {
          title: updatedInventory.name,
          setor: updatedInventory.sectorName,
          local:
            updatedInventory.specificLocationId ||
            updatedInventory.locationType ||
            '',
        }
        await api.put<Inventory>(`/inventarios/${inventoryId}`, payload)
        await fetchInventories() // Recarregar a lista
        toast({
          title: 'Sucesso',
          description: 'Inventário atualizado com sucesso.',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar inventário.',
        })
      }
    },
    [fetchInventories],
  )

  const updateInventoryItemStatus = useCallback(
    async (
      inventoryId: string,
      patrimonioId: string,
      status: 'found' | 'not_found',
    ) => {
      // Atualização otimista para UX imediata...
      setAllInventories((prev) =>
        prev.map((inv) =>
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
      // ...e persistência no backend (InventoryItem.encontrado + verificadoEm/Por).
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
        // Reverte para o estado real do servidor.
        await fetchInventories()
        throw error
      }
    },
    [fetchInventories],
  )

  const finalizeInventory = useCallback(
    async (inventoryId: string): Promise<Patrimonio[]> => {
      // O backend conclui o inventário e marca os não-encontrados como extraviados
      // de forma atômica (transação) — é a fonte da verdade.
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

      // Monta a lista de extraviados a partir da RESPOSTA do backend (fonte da
      // verdade) — o contexto não mantém mais todos os bens em memória.
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
        // Invalidar caches React Query para telas sob demanda refletirem os bens extraviados
        void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
        void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
      }

      await fetchInventories()
      return newlyMissing
    },
    [queryClient, fetchInventories],
  )

  const deleteInventory = useCallback(
    async (inventoryId: string) => {
      try {
        await api.delete(`/inventarios/${inventoryId}`)
        await fetchInventories() // Recarregar a lista
        toast({ 
          title: 'Sucesso',
          description: 'Inventário excluído com sucesso.' 
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir inventário.',
        })
      }
    },
    [fetchInventories],
  )

  return (
    <InventoryContext.Provider
      value={{
        inventories,
        isLoading,
        error,
        refetch: fetchInventories,
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
