import { useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Patrimonio, Imovel, ActivityLog, Inventory } from '@/types'
import { logger } from '@/lib/logger'

/**
 * Hook para filtrar dados baseado no setor do usuário logado.
 * Admin e Supervisor veem todos os dados.
 * Usuário e Visualizador veem apenas dados dos seus setores responsáveis.
 */
export const useSectorFilter = () => {
  const { user } = useAuth()

  // Verificar se o usuário pode ver todos os dados
  const canViewAllData = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'superuser'
  }, [user?.role])

  // Obter setores responsáveis do usuário
  const userSectors = useMemo(() => {
    return user?.responsibleSectors || []
  }, [user?.responsibleSectors])

  /**
   * Filtrar patrimônios por setor do usuário.
   * Memoizado para não forçar recomputação de useMemo/useEffect dependentes.
   */
  const filterPatrimonios = useCallback((patrimonios: Patrimonio[]): Patrimonio[] => {
    if (canViewAllData) {
      return patrimonios
    }

    if (userSectors.length === 0) {
      if (import.meta.env.DEV) {
        logger.warn('[useSectorFilter] Usuário sem setores atribuídos')
      }
      return []
    }

    return patrimonios.filter((patrimonio) =>
      userSectors.includes(patrimonio.setor_responsavel),
    )
  }, [canViewAllData, userSectors])

  /**
   * Filtrar imóveis por setor do usuário.
   */
  const filterImoveis = useCallback((imoveis: Imovel[]): Imovel[] => {
    if (canViewAllData) {
      return imoveis
    }

    if (userSectors.length === 0) {
      if (import.meta.env.DEV) {
        logger.warn('[useSectorFilter] Usuário sem setores atribuídos')
      }
      return []
    }

    return imoveis.filter((imovel) => userSectors.includes(imovel.setor))
  }, [canViewAllData, userSectors])

  /**
   * Filtrar logs de atividade por setor do usuário.
   */
  const filterActivityLogs = useCallback((logs: ActivityLog[]): ActivityLog[] => {
    if (canViewAllData) {
      return logs
    }

    if (userSectors.length === 0) {
      if (import.meta.env.DEV) {
        logger.warn('[useSectorFilter] Usuário sem setores atribuídos')
      }
      return []
    }

    return logs.filter((log) => {
      // Se o log tem setor específico, filtrar por ele
      if (log.sector) {
        return userSectors.includes(log.sector)
      }
      // Se não tem setor específico, incluir (logs gerais)
      return true
    })
  }, [canViewAllData, userSectors])

  /**
   * Filtrar inventários por setor do usuário.
   */
  const filterInventories = useCallback((inventories: Inventory[]): Inventory[] => {
    if (canViewAllData) {
      return inventories
    }

    if (userSectors.length === 0) {
      if (import.meta.env.DEV) {
        logger.warn('[useSectorFilter] Usuário sem setores atribuídos')
      }
      return []
    }

    return inventories.filter((inventory) =>
      userSectors.includes(inventory.sectorName),
    )
  }, [canViewAllData, userSectors])

  /**
   * Obter estatísticas filtradas por setor.
   */
  const getFilteredStats = useCallback((patrimonios: Patrimonio[]) => {
    const filtered = filterPatrimonios(patrimonios)

    return {
      total: filtered.length,
      ativos: filtered.filter((p) => p.status === 'ativo').length,
      inativos: filtered.filter((p) => p.status === 'inativo').length,
      manutencao: filtered.filter((p) => p.status === 'manutencao').length,
      baixados: filtered.filter((p) => p.status === 'baixado').length,
      extraviados: filtered.filter((p) => p.status === 'extraviado').length,
      valorTotal: filtered.reduce((acc, p) => {
        const valor = typeof p.valor_aquisicao === 'number'
          ? p.valor_aquisicao
          : parseFloat(p.valor_aquisicao as string) || 0
        return acc + valor
      }, 0),
      setores: [...new Set(filtered.map((p) => p.setor_responsavel))].length,
    }
  }, [filterPatrimonios])

  /**
   * Verificar se um patrimônio específico está acessível ao usuário.
   */
  const canAccessPatrimonio = useCallback((patrimonio: Patrimonio): boolean => {
    if (canViewAllData) return true
    return userSectors.includes(patrimonio.setor_responsavel)
  }, [canViewAllData, userSectors])

  /**
   * Verificar se um imóvel específico está acessível ao usuário.
   */
  const canAccessImovel = useCallback((imovel: Imovel): boolean => {
    if (canViewAllData) return true
    return userSectors.includes(imovel.setor)
  }, [canViewAllData, userSectors])

  /**
   * Obter informações de acesso do usuário.
   */
  const accessInfo = useMemo(() => ({
    canViewAllData,
    userSectors,
    userRole: user?.role,
    hasSectorAccess: userSectors.length > 0,
    sectorCount: userSectors.length,
  }), [canViewAllData, userSectors, user?.role])

  return {
    // Funções de filtro
    filterPatrimonios,
    filterImoveis,
    filterActivityLogs,
    filterInventories,
    getFilteredStats,

    // Funções de verificação de acesso
    canAccessPatrimonio,
    canAccessImovel,

    // Informações de acesso
    accessInfo,

    // Valores diretos
    canViewAllData,
    userSectors,
    userRole: user?.role,
  }
}

export default useSectorFilter
