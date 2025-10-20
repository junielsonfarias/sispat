import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Patrimonio, Imovel, ActivityLog, Inventory } from '@/types'

/**
 * Hook para filtrar dados baseado no setor do usuário logado
 * Admin e Supervisor veem todos os dados
 * Usuário e Visualizador veem apenas dados dos seus setores responsáveis
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
   * Filtrar patrimônios por setor do usuário
   */
  const filterPatrimonios = (patrimonios: Patrimonio[]): Patrimonio[] => {
    if (canViewAllData) {
      return patrimonios
    }

    if (userSectors.length === 0) {
      // Se usuário não tem setores atribuídos, não mostra nada
      console.warn('⚠️ [useSectorFilter] Usuário sem setores atribuídos')
      return []
    }

    return patrimonios.filter((patrimonio) => {
      const patrimonioSector = patrimonio.setor_responsavel || patrimonio.setorResponsavel
      return userSectors.includes(patrimonioSector)
    })
  }

  /**
   * Filtrar imóveis por setor do usuário
   */
  const filterImoveis = (imoveis: Imovel[]): Imovel[] => {
    if (canViewAllData) {
      return imoveis
    }

    if (userSectors.length === 0) {
      console.warn('⚠️ [useSectorFilter] Usuário sem setores atribuídos')
      return []
    }

    return imoveis.filter((imovel) => {
      const imovelSector = imovel.setor
      return userSectors.includes(imovelSector)
    })
  }

  /**
   * Filtrar logs de atividade por setor do usuário
   */
  const filterActivityLogs = (logs: ActivityLog[]): ActivityLog[] => {
    if (canViewAllData) {
      return logs
    }

    if (userSectors.length === 0) {
      console.warn('⚠️ [useSectorFilter] Usuário sem setores atribuídos')
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
  }

  /**
   * Filtrar inventários por setor do usuário
   */
  const filterInventories = (inventories: Inventory[]): Inventory[] => {
    if (canViewAllData) {
      return inventories
    }

    if (userSectors.length === 0) {
      console.warn('⚠️ [useSectorFilter] Usuário sem setores atribuídos')
      return []
    }

    return inventories.filter((inventory) => {
      const inventorySector = inventory.sectorName
      return userSectors.includes(inventorySector)
    })
  }

  /**
   * Obter estatísticas filtradas por setor
   */
  const getFilteredStats = (patrimonios: Patrimonio[]) => {
    const filteredPatrimonios = filterPatrimonios(patrimonios)
    
    const stats = {
      total: filteredPatrimonios.length,
      ativos: filteredPatrimonios.filter(p => p.status === 'ativo').length,
      inativos: filteredPatrimonios.filter(p => p.status === 'inativo').length,
      manutencao: filteredPatrimonios.filter(p => p.status === 'manutencao').length,
      baixados: filteredPatrimonios.filter(p => p.status === 'baixado').length,
      extraviados: filteredPatrimonios.filter(p => p.status === 'extraviado').length,
      valorTotal: filteredPatrimonios.reduce((acc, p) => {
        const valor = typeof p.valor_aquisicao === 'number' ? p.valor_aquisicao : parseFloat(p.valor_aquisicao) || 0
        return acc + valor
      }, 0),
      setores: [...new Set(filteredPatrimonios.map(p => p.setor_responsavel || p.setorResponsavel))].length
    }

    return stats
  }

  /**
   * Verificar se um patrimônio específico está acessível ao usuário
   */
  const canAccessPatrimonio = (patrimonio: Patrimonio): boolean => {
    if (canViewAllData) {
      return true
    }

    const patrimonioSector = patrimonio.setor_responsavel || patrimonio.setorResponsavel
    return userSectors.includes(patrimonioSector)
  }

  /**
   * Verificar se um imóvel específico está acessível ao usuário
   */
  const canAccessImovel = (imovel: Imovel): boolean => {
    if (canViewAllData) {
      return true
    }

    return userSectors.includes(imovel.setor)
  }

  /**
   * Obter informações de acesso do usuário
   */
  const accessInfo = useMemo(() => ({
    canViewAllData,
    userSectors,
    userRole: user?.role,
    hasSectorAccess: userSectors.length > 0,
    sectorCount: userSectors.length
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
    userRole: user?.role
  }
}

export default useSectorFilter
