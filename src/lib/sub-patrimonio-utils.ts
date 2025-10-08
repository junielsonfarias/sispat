import { SubPatrimonio } from '@/types'

/**
 * Gera o número do sub-patrimônio baseado no número do patrimônio principal
 * e no sequencial
 * @param patrimonioNumero - Número do patrimônio principal
 * @param sequencial - Número sequencial (1, 2, 3, ...)
 * @returns Número do sub-patrimônio formatado
 */
export const generateSubPatrimonioNumber = (
  patrimonioNumero: string,
  sequencial: number
): string => {
  // Determinar o padding baseado na quantidade
  // Até 999: 3 dígitos (001, 002, ..., 999)
  // Até 9999: 4 dígitos (0001, 0002, ..., 9999)
  // E assim por diante
  const padding = sequencial <= 999 ? 3 : sequencial <= 9999 ? 4 : 5
  
  const paddedSequencial = sequencial.toString().padStart(padding, '0')
  return `${patrimonioNumero}-${paddedSequencial}`
}

/**
 * Gera automaticamente os sub-patrimônios para um patrimônio kit
 * @param patrimonioId - ID do patrimônio principal
 * @param patrimonioNumero - Número do patrimônio principal
 * @param quantidadeUnidades - Quantidade de unidades do kit
 * @returns Array de sub-patrimônios gerados
 */
export const generateSubPatrimonios = (
  patrimonioId: string,
  patrimonioNumero: string,
  quantidadeUnidades: number
): Omit<SubPatrimonio, 'id'>[] => {
  const subPatrimonios: Omit<SubPatrimonio, 'id'>[] = []
  
  for (let i = 1; i <= quantidadeUnidades; i++) {
    const numeroSubPatrimonio = generateSubPatrimonioNumber(patrimonioNumero, i)
    
    subPatrimonios.push({
      patrimonio_id: patrimonioId,
      numero_subpatrimonio: numeroSubPatrimonio,
      status: 'ativo',
      localizacao_especifica: undefined,
      observacoes: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
  
  return subPatrimonios
}

/**
 * Valida se um patrimônio pode ser excluído
 * @param subPatrimonios - Lista de sub-patrimônios do patrimônio
 * @returns true se pode ser excluído, false caso contrário
 */
export const canDeletePatrimonio = (subPatrimonios: SubPatrimonio[]): boolean => {
  // Um patrimônio kit não pode ser excluído se tiver sub-patrimônios ativos
  const hasActiveSubPatrimonios = subPatrimonios.some(sp => sp.status === 'ativo')
  return !hasActiveSubPatrimonios
}

/**
 * Conta sub-patrimônios por status
 * @param subPatrimonios - Lista de sub-patrimônios
 * @returns Objeto com contagem por status
 */
export const countSubPatrimoniosByStatus = (subPatrimonios: SubPatrimonio[]) => {
  return subPatrimonios.reduce((acc, sp) => {
    acc[sp.status] = (acc[sp.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Filtra sub-patrimônios por critérios
 * @param subPatrimonios - Lista de sub-patrimônios
 * @param filters - Critérios de filtro
 * @returns Lista filtrada de sub-patrimônios
 */
export const filterSubPatrimonios = (
  subPatrimonios: SubPatrimonio[],
  filters: {
    status?: string
    searchTerm?: string
    localizacao?: string
  }
): SubPatrimonio[] => {
  return subPatrimonios.filter(sp => {
    // Filtro por status
    if (filters.status && filters.status !== 'all' && sp.status !== filters.status) {
      return false
    }
    
    // Filtro por termo de busca
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const matchesNumber = sp.numero_subpatrimonio.toLowerCase().includes(searchLower)
      const matchesLocalizacao = sp.localizacao_especifica?.toLowerCase().includes(searchLower) || false
      const matchesObservacoes = sp.observacoes?.toLowerCase().includes(searchLower) || false
      
      if (!matchesNumber && !matchesLocalizacao && !matchesObservacoes) {
        return false
      }
    }
    
    // Filtro por localização
    if (filters.localizacao && sp.localizacao_especifica !== filters.localizacao) {
      return false
    }
    
    return true
  })
}

/**
 * Exporta sub-patrimônios para formato CSV
 * @param subPatrimonios - Lista de sub-patrimônios
 * @returns String CSV
 */
export const exportSubPatrimoniosToCSV = (subPatrimonios: SubPatrimonio[]): string => {
  const headers = [
    'Número do Sub-Patrimônio',
    'Status',
    'Localização Específica',
    'Observações',
    'Data de Criação',
    'Data de Atualização'
  ]
  
  const rows = subPatrimonios.map(sp => [
    sp.numero_subpatrimonio,
    sp.status,
    sp.localizacao_especifica || '',
    sp.observacoes || '',
    sp.created_at.toLocaleDateString('pt-BR'),
    sp.updated_at.toLocaleDateString('pt-BR')
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')
  
  return csvContent
}

/**
 * Exporta sub-patrimônios para formato Excel (JSON para xlsx)
 * @param subPatrimonios - Lista de sub-patrimônios
 * @returns Array de objetos para conversão em Excel
 */
export const exportSubPatrimoniosToExcel = (subPatrimonios: SubPatrimonio[]) => {
  return subPatrimonios.map(sp => ({
    'Número do Sub-Patrimônio': sp.numero_subpatrimonio,
    'Status': sp.status,
    'Localização Específica': sp.localizacao_especifica || '',
    'Observações': sp.observacoes || '',
    'Data de Criação': sp.created_at.toLocaleDateString('pt-BR'),
    'Data de Atualização': sp.updated_at.toLocaleDateString('pt-BR')
  }))
}
