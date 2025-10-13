import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { Imovel } from '@/types'
import { toast } from '@/hooks/use-toast'

interface ImovelFilters {
  search?: string
  tipo?: string
  sectorId?: string
  page?: number
  limit?: number
}

interface ImoveisResponse {
  imoveis: Imovel[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Hook para buscar lista de imóveis com filtros e paginação
 */
export const useImoveis = (filters: ImovelFilters = {}) => {
  return useQuery({
    queryKey: ['imoveis', filters],
    queryFn: async () => {
      const response = await api.get<ImoveisResponse>('/imoveis', {
        params: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          search: filters.search,
          tipo: filters.tipo,
          sectorId: filters.sectorId,
        },
      })
      return response
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook para buscar um imóvel específico
 */
export const useImovel = (id: string | undefined) => {
  return useQuery({
    queryKey: ['imovel', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não fornecido')
      const response = await api.get<Imovel>(`/imoveis/${id}`)
      return response
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para criar imóvel
 */
export const useCreateImovel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Imovel>) => {
      const response = await api.post<Imovel>('/imoveis', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imoveis'] })
      toast({
        title: 'Sucesso',
        description: 'Imóvel criado com sucesso!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar imóvel',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar imóvel
 */
export const useUpdateImovel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Imovel> }) => {
      const response = await api.put<Imovel>(`/imoveis/${id}`, data)
      return response
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['imovel', id] })
      await queryClient.cancelQueries({ queryKey: ['imoveis'] })

      const previousImovel = queryClient.getQueryData(['imovel', id])

      queryClient.setQueryData(['imovel', id], (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousImovel }
    },
    onError: (err, variables, context) => {
      if (context?.previousImovel) {
        queryClient.setQueryData(['imovel', variables.id], context.previousImovel)
      }
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar imóvel',
        variant: 'destructive',
      })
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['imovel', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['imoveis'] })
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Imóvel atualizado com sucesso!',
      })
    },
  })
}

/**
 * Hook para deletar imóvel
 */
export const useDeleteImovel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/imoveis/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imoveis'] })
      toast({
        title: 'Sucesso',
        description: 'Imóvel deletado com sucesso!',
      })
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao deletar imóvel',
        variant: 'destructive',
      })
    },
  })
}

