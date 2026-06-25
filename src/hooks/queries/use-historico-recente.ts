import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'

/**
 * Evento de histórico para a linha do tempo (Análise Temporal).
 * Vem do backend já ordenado (mais recentes primeiro), limitado e filtrado por
 * tenant + permissão de setor — não precisa carregar todos os bens.
 */
export interface HistoricoRecenteEvento {
  id: string
  date: string
  action: string
  details: string
  user: string
  patrimonioId: string | null
  patrimonio: string // número do patrimônio
  setor_responsavel: string
}

export const useHistoricoRecente = (limit = 20) =>
  useQuery({
    queryKey: ['historico-recente', limit],
    queryFn: async () => {
      const res = await api.get<{ eventos: HistoricoRecenteEvento[] }>(
        `/patrimonios/historico-recente?limit=${limit}`,
      )
      return res.eventos ?? []
    },
    staleTime: 60 * 1000,
  })
