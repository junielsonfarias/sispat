import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Inventory, InventoryItem, Patrimonio } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { usePatrimonio } from './PatrimonioContext'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface InventoryContextType {
  inventories: Inventory[]
  getInventoryById: (id: string) => Inventory | undefined
  createInventory: (data: {
    name: string
    sectorName: string
    scope: 'sector' | 'location' | 'specific_location'
    locationType?: string
    specificLocationId?: string
  }) => Promise<Inventory>
  updateInventory: (inventoryId: string, updatedInventory: Inventory) => Promise<void>
  updateInventoryItemStatus: (
    inventoryId: string,
    patrimonioId: string,
    status: 'found' | 'not_found',
  ) => void
  finalizeInventory: (inventoryId: string) => Promise<Patrimonio[]>
  deleteInventory: (inventoryId: string) => Promise<void>
}

const InventoryContext = createContext<InventoryContextType | null>(null)

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [allInventories, setAllInventories] = useState<Inventory[]>([])
  const { patrimonios, updatePatrimonio } = usePatrimonio()
  const { user } = useAuth()

  const fetchInventories = useCallback(async () => {
    if (!user) {
      return
    }
    try {
      const response = await api.get<{ inventarios: Inventory[]; pagination: any }>('/inventarios')
      
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
          patrimonioId: item.patrimonioId,
          numero_patrimonio: item.patrimonio?.numero_patrimonio || item.numero_patrimonio || '',
          descricao_bem: item.patrimonio?.descricao_bem || item.descricao_bem || '',
          status: item.encontrado !== undefined ? (item.encontrado ? 'found' : 'not_found') : item.status,
        })),
        scope: inv.scope || 'sector',
        locationType: inv.local || inv.locationType,
        specificLocationId: inv.specificLocationId,
        municipalityId: user?.municipalityId || '',
      }))
      
      setAllInventories(mappedInventories)
    } catch (error) {
      console.error('❌ [ERROR] fetchInventories: Erro ao carregar inventários:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar inventários.',
      })
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

  const persistInventories = (newInventories: Inventory[]) => {
    setAllInventories(newInventories)
  }

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
    }) => {
      try {
        const { name, sectorName, scope, locationType, specificLocationId } = data

        const inventoryPayload = {
          title: name,
          description: `Inventário do setor ${sectorName}`,
          setor: sectorName,
          local: specificLocationId || locationType || '',
          dataInicio: new Date().toISOString(),
          scope,
        }
        
        const newInventory = await api.post<any>('/inventarios', inventoryPayload)
        
        // ✅ CORREÇÃO: Mapear items do backend para o formato do frontend
        // O backend retorna items com a estrutura InventoryItem do Prisma
        const mappedItems: InventoryItem[] = (newInventory.items || []).map((item: any) => ({
          patrimonioId: item.patrimonioId,
          numero_patrimonio: item.patrimonio?.numero_patrimonio || '',
          descricao_bem: item.patrimonio?.descricao_bem || '',
          status: item.encontrado ? 'found' : 'not_found',
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
        console.error('❌ [ERROR] Erro ao criar inventário:', error)
        console.error('❌ [ERROR] Stack trace:', error instanceof Error ? error.stack : 'N/A')
        throw error // Re-throw para que o componente possa capturar
      }
    },
    [fetchInventories, user],
  )

  const updateInventory = useCallback(
    async (inventoryId: string, updatedInventory: Inventory) => {
      try {
        await api.put<Inventory>(`/inventarios/${inventoryId}`, updatedInventory)
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
    (
      inventoryId: string,
      patrimonioId: string,
      status: 'found' | 'not_found',
    ) => {
      const newInventories = allInventories.map((inv) => {
        if (inv.id === inventoryId) {
          return {
            ...inv,
            items: inv.items.map((item) =>
              item.patrimonioId === patrimonioId ? { ...item, status } : item,
            ),
          }
        }
        return inv
      })
      persistInventories(newInventories)
    },
    [allInventories],
  )

  const finalizeInventory = useCallback(
    async (inventoryId: string): Promise<Patrimonio[]> => {
      const inventory = allInventories.find((inv) => inv.id === inventoryId)
      if (!inventory) throw new Error('Inventário não encontrado.')

      const newlyMissingPatrimonios: Patrimonio[] = []
      inventory.items.forEach((item) => {
        if (item.status === 'not_found') {
          const patrimonioToUpdate = patrimonios.find(
            (p) => p.id === item.patrimonioId,
          )
          if (
            patrimonioToUpdate &&
            patrimonioToUpdate.status !== 'extraviado'
          ) {
            updatePatrimonio({ ...patrimonioToUpdate, status: 'extraviado' })
            newlyMissingPatrimonios.push(patrimonioToUpdate)
          }
        }
      })

      const newInventories = allInventories.map((inv) =>
        inv.id === inventoryId
          ? { ...inv, status: 'completed', finalizedAt: new Date() }
          : inv,
      )
      persistInventories(newInventories)
      return newlyMissingPatrimonios
    },
    [allInventories, patrimonios, updatePatrimonio],
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
