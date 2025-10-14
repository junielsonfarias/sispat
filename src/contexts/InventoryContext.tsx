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
    if (!user) return
    try {
      const response = await api.get<{ inventarios: Inventory[]; pagination: any }>('/inventarios')
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade inventarios
      const inventariosData = Array.isArray(response) ? response : (response.inventarios || [])
      setAllInventories(inventariosData)
    } catch (error) {
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
      const { name, sectorName, scope, locationType, specificLocationId } = data

      const patrimoniosInScope = patrimonios.filter((p) => {
        const inSector = p.setor_responsavel === sectorName
        if (!inSector) return false
        if (scope === 'location') {
          return (
            locationType &&
            p.local_objeto.toLowerCase().includes(locationType.toLowerCase())
          )
        }
        if (scope === 'specific_location') {
          // Para local específico, vamos filtrar por nome do local
          // Assumindo que o local_objeto contém o nome do local
          return (
            specificLocationId &&
            p.local_objeto.toLowerCase().includes(specificLocationId.toLowerCase())
          )
        }
        return true
      })

      const items: InventoryItem[] = patrimoniosInScope.map((p) => ({
        patrimonioId: p.id,
        numero_patrimonio: p.numero_patrimonio,
        descricao_bem: p.descricao_bem,
        status: 'not_found',
      }))

      // ✅ Mapear campos para o formato que o backend espera
      const inventoryPayload = {
        title: name, // Backend espera 'title' ao invés de 'name'
        description: `Inventário do setor ${sectorName}`,
        setor: sectorName, // Backend espera 'setor' ao invés de 'sectorName'
        local: specificLocationId || locationType || '', // Backend espera 'local'
        dataInicio: new Date().toISOString(), // Backend espera 'dataInicio' ao invés de 'createdAt'
        scope,
        municipalityId: '1', // Hardcoded para São Sebastião da Boa Vista
      }
      
      const newInventory = await api.post<Inventory>('/inventarios', inventoryPayload)
      
      // ✅ Mapear resposta do backend para o formato do frontend
      const inventoryData: Inventory = {
        ...newInventory,
        name: newInventory.title || name,
        sectorName: newInventory.setor || sectorName,
        status: 'in_progress' as const,
        createdAt: newInventory.dataInicio || new Date(),
        items,
        scope,
        locationType,
        specificLocationId,
      }
      
      await fetchInventories() // Recarregar a lista
      return inventoryData
    },
    [allInventories, patrimonios],
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
