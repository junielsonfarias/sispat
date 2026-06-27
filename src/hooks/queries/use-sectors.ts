import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface Sector {
  id: string
  name: string
  codigo: string
  description?: string
  // Fundos de recurso da secretaria (FUNDEB, VAAT, SUS...) p/ a importação.
  fundos?: string[]
  municipalityId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook para buscar todos os setores
 */
export const useSectors = () => {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      // Mesmo cache (queryKey ['sectors']) e mesmo tratamento de shape do
      // SectorContext — a API pode devolver array direto ou { sectors }.
      const response = await api.get<Sector[] | { sectors: Sector[] }>('/sectors')
      return Array.isArray(response) ? response : response.sectors || []
    },
    staleTime: 10 * 60 * 1000, // Setores mudam raramente, cache 10min
    gcTime: 30 * 60 * 1000,    // Keep por 30min
  })
}

/**
 * Hook para criar setor
 */
export const useCreateSector = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Sector>) => {
      const response = await api.post<Sector>('/sectors', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
      toast({
        title: 'Sucesso',
        description: 'Setor criado com sucesso!',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar setor',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar setor
 */
export const useUpdateSector = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sector> }) => {
      const response = await api.put<Sector>(`/sectors/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
      toast({
        title: 'Sucesso',
        description: 'Setor atualizado com sucesso!',
      })
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar setor',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar setor
 */
export const useDeleteSector = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sectors/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
      toast({
        title: 'Sucesso',
        description: 'Setor deletado com sucesso!',
      })
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao deletar setor',
        variant: 'destructive',
      })
    },
  })
}

