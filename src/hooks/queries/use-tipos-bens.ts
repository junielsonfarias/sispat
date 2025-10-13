import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface TipoBem {
  id: string
  nome: string
  descricao?: string
  codigo?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook para buscar tipos de bens
 */
export const useTiposBens = () => {
  return useQuery({
    queryKey: ['tipos-bens'],
    queryFn: async () => {
      const response = await api.get<TipoBem[]>('/tipos-bens')
      return response
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (dados mudam pouco)
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook para criar tipo de bem
 */
export const useCreateTipoBem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; codigo?: string }) => {
      const response = await api.post<TipoBem>('/tipos-bens', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-bens'] })
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem criado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar tipo de bem',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar tipo de bem
 */
export const useUpdateTipoBem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<TipoBem>) => {
      const response = await api.put<TipoBem>(`/tipos-bens/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-bens'] })
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem atualizado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar tipo de bem',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar tipo de bem
 */
export const useDeleteTipoBem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tipos-bens/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-bens'] })
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem deletado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao deletar tipo de bem',
        variant: 'destructive',
      })
    },
  })
}

