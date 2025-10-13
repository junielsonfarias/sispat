import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface Transferencia {
  id: string
  patrimonioId: string
  numero_patrimonio: string
  descricao_bem: string
  setorOrigem: string
  setorDestino: string
  localOrigem: string
  localDestino: string
  motivo: string
  dataTransferencia: Date
  responsavelOrigem: string
  responsavelDestino: string
  status: 'pendente' | 'aprovada' | 'rejeitada'
  observacoes?: string
  createdAt: Date
  updatedAt: Date
}

interface TransferenciaInput {
  patrimonioId: string
  setorOrigem: string
  setorDestino: string
  localOrigem?: string
  localDestino?: string
  motivo: string
  responsavelOrigem?: string
  responsavelDestino?: string
  observacoes?: string
}

/**
 * Hook para buscar transferências
 */
export const useTransferencias = (status?: string) => {
  return useQuery({
    queryKey: ['transferencias', status],
    queryFn: async () => {
      const response = await api.get<{
        transferencias: Transferencia[]
        pagination: any
      }>('/transferencias', {
        params: { status },
      })
      return response
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (dados mudam frequentemente)
  })
}

/**
 * Hook para criar transferência
 */
export const useCreateTransferencia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransferenciaInput) => {
      const response = await api.post<Transferencia>('/transferencias', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] })
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
      toast({
        title: 'Sucesso',
        description: 'Solicitação de transferência enviada!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar transferência',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para aprovar transferência
 */
export const useAprovarTransferencia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      comentarios,
    }: {
      id: string
      comentarios?: string
    }) => {
      const response = await api.put(`/transferencias/${id}/aprovar`, {
        comentarios,
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] })
      queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
      toast({
        title: 'Sucesso',
        description: 'Transferência aprovada! Patrimônio atualizado.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao aprovar transferência',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para rejeitar transferência
 */
export const useRejeitarTransferencia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      comentarios,
    }: {
      id: string
      comentarios?: string
    }) => {
      const response = await api.put(`/transferencias/${id}/rejeitar`, {
        comentarios,
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] })
      toast({
        title: 'Transferência Rejeitada',
        description: 'A transferência foi rejeitada.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao rejeitar transferência',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Exemplo de uso:
 * 
 * const TransferenciasList = () => {
 *   const { data, isLoading } = useTransferencias('pendente')
 *   const createMutation = useCreateTransferencia()
 *   const aprovarMutation = useAprovarTransferencia()
 *   
 *   if (isLoading) return <SkeletonList />
 *   
 *   return (
 *     <>
 *       {data.transferencias.map(t => (
 *         <TransferenciaCard
 *           key={t.id}
 *           transferencia={t}
 *           onAprovar={() => aprovarMutation.mutate({ id: t.id })}
 *         />
 *       ))}
 *     </>
 *   )
 * }
 */


