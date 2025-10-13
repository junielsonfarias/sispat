import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface FormaAquisicao {
  id: string
  nome: string
  descricao?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook para buscar formas de aquisição
 */
export const useFormasAquisicao = () => {
  return useQuery({
    queryKey: ['formas-aquisicao'],
    queryFn: async () => {
      const response = await api.get<FormaAquisicao[]>('/formas-aquisicao')
      return response
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook para criar forma de aquisição
 */
export const useCreateFormaAquisicao = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string }) => {
      const response = await api.post<FormaAquisicao>('/formas-aquisicao', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas-aquisicao'] })
      toast({
        title: 'Sucesso',
        description: 'Forma de aquisição criada!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar forma de aquisição',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar forma de aquisição
 */
export const useUpdateFormaAquisicao = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FormaAquisicao>) => {
      const response = await api.put<FormaAquisicao>(`/formas-aquisicao/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas-aquisicao'] })
      toast({
        title: 'Sucesso',
        description: 'Forma de aquisição atualizada!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar forma de aquisição',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar forma de aquisição
 */
export const useDeleteFormaAquisicao = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/formas-aquisicao/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas-aquisicao'] })
      toast({
        title: 'Sucesso',
        description: 'Forma de aquisição deletada!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao deletar forma de aquisição',
        variant: 'destructive',
      })
    },
  })
}

