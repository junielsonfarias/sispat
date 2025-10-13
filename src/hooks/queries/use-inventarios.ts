import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface InventoryItem {
  id: string
  inventoryId: string
  patrimonioId: string
  status: 'conforme' | 'nao_conforme' | 'nao_localizado'
  observacoes?: string
  patrimonio?: any
}

interface Inventory {
  id: string
  nome: string
  descricao?: string
  dataInicio: Date
  dataFim?: Date
  status: 'em_andamento' | 'concluido' | 'cancelado'
  setor?: string
  responsavel: string
  items?: InventoryItem[]
  createdAt: Date
  updatedAt: Date
}

interface InventoryInput {
  nome: string
  descricao?: string
  dataInicio: Date
  dataFim?: Date
  setor?: string
}

/**
 * Hook para buscar inventários
 */
export const useInventarios = () => {
  return useQuery({
    queryKey: ['inventarios'],
    queryFn: async () => {
      const response = await api.get<Inventory[]>('/inventarios')
      return response
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para buscar inventário por ID
 */
export const useInventario = (id: string) => {
  return useQuery({
    queryKey: ['inventarios', id],
    queryFn: async () => {
      const response = await api.get<Inventory>(`/inventarios/${id}`)
      return response
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook para criar inventário
 */
export const useCreateInventario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InventoryInput) => {
      const response = await api.post<Inventory>('/inventarios', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      toast({
        title: 'Sucesso',
        description: 'Inventário criado com sucesso!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar inventário',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar inventário
 */
export const useUpdateInventario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Inventory>) => {
      const response = await api.put<Inventory>(`/inventarios/${id}`, data)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      queryClient.invalidateQueries({ queryKey: ['inventarios', variables.id] })
      toast({
        title: 'Sucesso',
        description: 'Inventário atualizado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar inventário',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para adicionar item ao inventário
 */
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      inventoryId,
      patrimonioId,
      status,
      observacoes,
    }: {
      inventoryId: string
      patrimonioId: string
      status: 'conforme' | 'nao_conforme' | 'nao_localizado'
      observacoes?: string
    }) => {
      const response = await api.post(`/inventarios/${inventoryId}/items`, {
        patrimonioId,
        status,
        observacoes,
      })
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventarios', variables.inventoryId] })
      toast({
        title: 'Item Adicionado',
        description: 'Item adicionado ao inventário!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao adicionar item',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para finalizar inventário
 */
export const useFinalizarInventario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/inventarios/${id}/finalizar`)
      return response
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      queryClient.invalidateQueries({ queryKey: ['inventarios', id] })
      toast({
        title: 'Inventário Finalizado',
        description: 'O inventário foi finalizado com sucesso!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao finalizar inventário',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar inventário
 */
export const useDeleteInventario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/inventarios/${id}`)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      toast({
        title: 'Inventário Deletado',
        description: 'O inventário foi removido.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao deletar inventário',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Exemplo de uso:
 * 
 * const InventariosPage = () => {
 *   const { data: inventarios, isLoading } = useInventarios()
 *   const createMutation = useCreateInventario()
 *   
 *   if (isLoading) return <SkeletonList />
 *   
 *   return (
 *     <>
 *       {inventarios?.map(inv => (
 *         <InventarioCard key={inv.id} inventario={inv} />
 *       ))}
 *       <button onClick={() => createMutation.mutate({ 
 *         nome: 'Inventário 2025',
 *         dataInicio: new Date()
 *       })}>
 *         Criar Inventário
 *       </button>
 *     </>
 *   )
 * }
 * 
 * const InventarioDetail = ({ id }: { id: string }) => {
 *   const { data: inventario, isLoading } = useInventario(id)
 *   const addItemMutation = useAddInventoryItem()
 *   const finalizarMutation = useFinalizarInventario()
 *   
 *   if (isLoading) return <Skeleton />
 *   
 *   return (
 *     <>
 *       <h1>{inventario?.nome}</h1>
 *       {inventario?.items?.map(item => (
 *         <InventoryItemCard key={item.id} item={item} />
 *       ))}
 *       <button onClick={() => finalizarMutation.mutate(id)}>
 *         Finalizar
 *       </button>
 *     </>
 *   )
 * }
 */


