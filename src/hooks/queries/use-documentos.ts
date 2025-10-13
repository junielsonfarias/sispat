import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface Documento {
  id: string
  patrimonioId?: string
  imovelId?: string
  name: string
  type: string
  url: string
  fileSize?: number
  description?: string
  uploadedBy: string
  uploadedAt: Date
  uploader?: {
    id: string
    name: string
    email: string
  }
}

interface DocumentoInput {
  patrimonioId?: string
  imovelId?: string
  name: string
  type: string
  url: string
  fileSize?: number
  description?: string
}

/**
 * Hook para buscar documentos
 */
export const useDocumentos = (patrimonioId?: string, imovelId?: string) => {
  return useQuery({
    queryKey: ['documentos', patrimonioId, imovelId],
    queryFn: async () => {
      const response = await api.get<{ documentos: Documento[] }>('/documentos', {
        params: { patrimonioId, imovelId },
      })
      return response
    },
    enabled: !!(patrimonioId || imovelId), // Só busca se tiver ID
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para criar documento
 */
export const useCreateDocumento = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DocumentoInput) => {
      const response = await api.post<Documento>('/documentos', data)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documentos', variables.patrimonioId, variables.imovelId],
      })
      toast({
        title: 'Sucesso',
        description: 'Documento adicionado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao adicionar documento',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para atualizar documento
 */
export const useUpdateDocumento = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string
      name: string
      description?: string
    }) => {
      const response = await api.put<Documento>(`/documentos/${id}`, {
        name,
        description,
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      toast({
        title: 'Sucesso',
        description: 'Documento atualizado!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar documento',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para deletar documento
 */
export const useDeleteDocumento = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/documentos/${id}`)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      toast({
        title: 'Documento Deletado',
        description: 'O documento foi removido.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao deletar documento',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Exemplo de uso:
 * 
 * const DocumentosCard = ({ patrimonioId }: { patrimonioId: string }) => {
 *   const { data, isLoading } = useDocumentos(patrimonioId)
 *   const createMutation = useCreateDocumento()
 *   const deleteMutation = useDeleteDocumento()
 *   
 *   if (isLoading) return <SkeletonList />
 *   
 *   return (
 *     <>
 *       {data?.documentos.map(doc => (
 *         <DocumentCard
 *           key={doc.id}
 *           documento={doc}
 *           onDelete={() => deleteMutation.mutate(doc.id)}
 *         />
 *       ))}
 *       <button onClick={() => createMutation.mutate({ ... })}>
 *         Adicionar
 *       </button>
 *     </>
 *   )
 * }
 */


