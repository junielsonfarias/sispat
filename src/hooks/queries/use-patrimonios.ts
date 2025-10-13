import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { Patrimonio } from '@/types'
import { toast } from '@/hooks/use-toast'

interface PatrimonioFilters {
  search?: string
  status?: string
  sectorId?: string
  tipo?: string
  page?: number
  limit?: number
}

interface PatrimoniosResponse {
  patrimonios: Patrimonio[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Hook para buscar lista de patrimônios com filtros e paginação
 */
export const usePatrimonios = (filters: PatrimonioFilters = {}) => {
  return useQuery({
    queryKey: ['patrimonios', filters],
    queryFn: async () => {
      const response = await api.get<PatrimoniosResponse>('/patrimonios', {
        params: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          search: filters.search,
          status: filters.status,
          sectorId: filters.sectorId,
          tipo: filters.tipo,
        },
      })
      return response
    },
    staleTime: 5 * 60 * 1000, // Fresh por 5 minutos
    gcTime: 10 * 60 * 1000,   // Cache por 10 minutos
  })
}

/**
 * Hook para buscar um patrimônio específico
 */
export const usePatrimonio = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patrimonio', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não fornecido')
      const response = await api.get<Patrimonio>(`/patrimonios/${id}`)
      return response
    },
    enabled: !!id, // Só executa se tiver ID
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para criar patrimônio
 */
export const useCreatePatrimonio = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Patrimonio>) => {
      const response = await api.post<Patrimonio>('/patrimonios', data)
      return response
    },
    onSuccess: () => {
      // Invalida cache de patrimonios para refetch
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
      toast({
        title: 'Sucesso',
        description: 'Patrimônio criado com sucesso!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar patrimônio',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar patrimônio
 */
export const useUpdatePatrimonio = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patrimonio> }) => {
      const response = await api.put<Patrimonio>(`/patrimonios/${id}`, data)
      return response
    },
    // Optimistic update - atualiza UI antes da API responder
    onMutate: async ({ id, data }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: ['patrimonio', id] })
      await queryClient.cancelQueries({ queryKey: ['patrimonios'] })

      // Snapshot do estado anterior
      const previousPatrimonio = queryClient.getQueryData(['patrimonio', id])
      const previousList = queryClient.getQueryData(['patrimonios'])

      // Atualiza otimisticamente
      queryClient.setQueryData(['patrimonio', id], (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousPatrimonio, previousList }
    },
    // Se erro, reverte
    onError: (err, variables, context) => {
      if (context?.previousPatrimonio) {
        queryClient.setQueryData(['patrimonio', variables.id], context.previousPatrimonio)
      }
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar patrimônio',
        variant: 'destructive',
      })
    },
    // Após sucesso ou erro, refetch para garantir consistência
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patrimonio', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Patrimônio atualizado com sucesso!',
      })
    },
  })
}

/**
 * Hook para deletar patrimônio
 */
export const useDeletePatrimonio = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patrimonios/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
      toast({
        title: 'Sucesso',
        description: 'Patrimônio deletado com sucesso!',
      })
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao deletar patrimônio',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para dar baixa em patrimônio
 */
export const useBaixaPatrimonio = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.post(`/patrimonios/${id}/baixa`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
      toast({
        title: 'Sucesso',
        description: 'Baixa registrada com sucesso!',
      })
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar baixa',
        variant: 'destructive',
      })
    },
  })
}

