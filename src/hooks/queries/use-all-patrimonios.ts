import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { Patrimonio, HistoricoEntry } from '@/types'

/**
 * Chave canônica para o cache de todos os patrimônios (sem paginação).
 * Exporte aqui para que PatrimonioContext, SyncContext, InventoryContext e
 * DistribuirDialog invalidem a mesma query key após mutações.
 */
export const PATRIMONIOS_ALL_KEY = ['patrimonios-all'] as const

/**
 * Busca o conjunto COMPLETO de patrimônios via GET /patrimonios?all=true.
 * Respeita tenant e permissão de setor do usuário (o backend aplica ambos).
 *
 * Use em dashboards, análises e relatórios que precisam de todos os bens.
 * Para listagens paginadas, use usePatrimonios() (hooks/queries/use-patrimonios.ts).
 *
 * IMPORTANTE: passe `{ enabled: false }` (ou condicional) em componentes que
 * ficam SEMPRE montados (ex.: GlobalSearch no cabeçalho) para não disparar o
 * carregamento completo a cada sessão — habilite só quando a tela/abertura
 * realmente precisar dos dados.
 */
export const useAllPatrimonios = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: PATRIMONIOS_ALL_KEY,
    queryFn: async () => {
      const response = await api.get<{ patrimonios: Patrimonio[]; pagination: unknown }>(
        '/patrimonios?all=true',
      )
      // A API pode retornar array direto ou objeto com propriedade patrimonios
      const data = Array.isArray(response) ? response : (response.patrimonios ?? [])
      // O backend devolve o histórico no campo `historico` (relação). Normaliza
      // para `historico_movimentacao` (nome usado no frontend) para telas como a
      // Análise Temporal funcionarem e evitar acessos a undefined.
      return (data as Array<Patrimonio & { historico?: HistoricoEntry[] }>).map((p) => ({
        ...p,
        historico_movimentacao: p.historico_movimentacao ?? p.historico ?? [],
      }))
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // dados frescos por 2 minutos
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Tipo mínimo retornado por GET /patrimonios/analytics.
 * Mantido para compatibilidade com dashboards que usam a rota analytics.
 * Datas chegam como string ISO do JSON; aceitamos string | Date para flexibilidade.
 */
export interface PatrimonioAnalytics {
  id: string
  numero_patrimonio: string
  descricao_bem: string
  tipo: string
  status: string
  situacao_bem: string
  setor_responsavel: string
  sectorId: string
  valor_aquisicao: number
  data_aquisicao: string | Date
  data_baixa: string | Date | null
  vida_util_anos: number | null
  valor_residual: number | null
  metodo_depreciacao: string | null
  createdAt: string | Date
}
