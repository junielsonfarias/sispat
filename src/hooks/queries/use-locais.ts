import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface Local {
  id: string
  name: string
  description?: string
  municipalityId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook para buscar locais
 */
export const useLocais = () => {
  return useQuery({
    queryKey: ['locais'],
    queryFn: async () => {
      const response = await api.get<Local[]>('/locais')
      return response
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook para criar local
 */
export const useCreateLocal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; municipalityId: string }) => {
      const response = await api.post<Local>('/locais', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais'] })
      toast({
        title: 'Sucesso',
        description: 'Local criado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar local',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar local
 */
export const useUpdateLocal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Local>) => {
      const response = await api.put<Local>(`/locais/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais'] })
      toast({
        title: 'Sucesso',
        description: 'Local atualizado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar local',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar local
 */
export const useDeleteLocal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/locais/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais'] })
      toast({
        title: 'Sucesso',
        description: 'Local deletado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao deletar local',
        variant: 'destructive',
      })
    },
  })
}

