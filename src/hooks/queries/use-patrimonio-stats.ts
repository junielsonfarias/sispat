import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'

export interface PatrimonioStats {
  totalCount: number
  totalValue: number
  activePercentage: number
  ativosCount: number
  maintenanceCount: number
  baixadosCount: number
  baixadosLastMonth: number
  setoresCount: number
  porStatus: { status: string; quantidade: number }[]
  porTipo: { tipo: string; quantidade: number; valor: number }[]
  porSetor: { setor: string; quantidade: number }[]
  porMes: { mes: string; valor: number }[]
}

/**
 * Busca estatísticas agregadas de patrimônios direto do backend.
 * Evita o problema de contar apenas a 1ª página (50 registros) do array paginado.
 */
export const usePatrimonioStats = () => {
  return useQuery({
    queryKey: ['patrimonio-stats'],
    queryFn: () => api.get<PatrimonioStats>('/patrimonios/stats'),
    staleTime: 2 * 60 * 1000,  // dados frescos por 2 minutos
    gcTime: 5 * 60 * 1000,
  })
}
