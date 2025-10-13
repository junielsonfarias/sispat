/**
 * Hooks customizados que substituem os contexts de dados
 * Usando React Query para melhor performance e cache
 */

// Re-exportar hooks do React Query
export { usePatrimonios, usePatrimonio, useCreatePatrimonio, useUpdatePatrimonio, useDeletePatrimonio } from './queries/use-patrimonios'
export { useImoveis, useImovel, useCreateImovel, useUpdateImovel, useDeleteImovel } from './queries/use-imoveis'
export { useSectors, useSector, useCreateSector, useUpdateSector, useDeleteSector } from './queries/use-sectors'
export { useLocais, useLocal, useCreateLocal, useUpdateLocal, useDeleteLocal } from './queries/use-locais'
export { useTiposBens, useTipoBem, useCreateTipoBem, useUpdateTipoBem, useDeleteTipoBem } from './queries/use-tipos-bens'
export { useFormasAquisicao, useFormaAquisicao, useCreateFormaAquisicao, useUpdateFormaAquisicao, useDeleteFormaAquisicao } from './queries/use-formas-aquisicao'
export { useInventarios, useInventario, useCreateInventario, useUpdateInventario, useDeleteInventario } from './queries/use-inventarios'
export { useTransferencias, useTransferencia, useCreateTransferencia, useUpdateTransferencia, useDeleteTransferencia } from './queries/use-transferencias'
export { useDocumentos, useDocumento, useCreateDocumento, useUpdateDocumento, useDeleteDocumento } from './queries/use-documentos'

/**
 * Hook principal que substitui o PatrimonioContext
 * Fornece dados de patrimônios com filtros e paginação
 */
export const usePatrimonioData = (filters: any = {}) => {
  const { data, isLoading, error, refetch } = usePatrimonios(filters)
  
  return {
    patrimonios: data?.patrimonios || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade com context antigo
    fetchPatrimonios: refetch,
    createPatrimonio: useCreatePatrimonio(),
    updatePatrimonio: useUpdatePatrimonio(),
    deletePatrimonio: useDeletePatrimonio(),
  }
}

/**
 * Hook principal que substitui o ImovelContext
 */
export const useImovelData = (filters: any = {}) => {
  const { data, isLoading, error, refetch } = useImoveis(filters)
  
  return {
    imoveis: data?.imoveis || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade
    fetchImoveis: refetch,
    createImovel: useCreateImovel(),
    updateImovel: useUpdateImovel(),
    deleteImovel: useDeleteImovel(),
  }
}

/**
 * Hook principal que substitui o SectorContext
 */
export const useSectorData = () => {
  const { data: sectors, isLoading, error, refetch } = useSectors()
  
  return {
    sectors: sectors || [],
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade
    fetchSectors: refetch,
    createSector: useCreateSector(),
    updateSector: useUpdateSector(),
    deleteSector: useDeleteSector(),
  }
}

/**
 * Hook principal que substitui o LocalContext
 */
export const useLocalData = () => {
  const { data: locais, isLoading, error, refetch } = useLocais()
  
  return {
    locais: locais || [],
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade
    fetchLocais: refetch,
    createLocal: useCreateLocal(),
    updateLocal: useUpdateLocal(),
    deleteLocal: useDeleteLocal(),
  }
}

/**
 * Hook principal que substitui o TiposBensContext
 */
export const useTiposBensData = () => {
  const { data: tiposBens, isLoading, error, refetch } = useTiposBens()
  
  return {
    tiposBens: tiposBens || [],
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade
    fetchTiposBens: refetch,
    createTipoBem: useCreateTipoBem(),
    updateTipoBem: useUpdateTipoBem(),
    deleteTipoBem: useDeleteTipoBem(),
  }
}

/**
 * Hook principal que substitui o AcquisitionFormContext
 */
export const useFormasAquisicaoData = () => {
  const { data: formasAquisicao, isLoading, error, refetch } = useFormasAquisicao()
  
  return {
    formasAquisicao: formasAquisicao || [],
    isLoading,
    error,
    refetch,
    // Métodos para compatibilidade
    fetchFormasAquisicao: refetch,
    createFormaAquisicao: useCreateFormaAquisicao(),
    updateFormaAquisicao: useUpdateFormaAquisicao(),
    deleteFormaAquisicao: useDeleteFormaAquisicao(),
  }
}
