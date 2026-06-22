/**
 * Configuração de Otimização do Banco de Dados
 * 
 * Este arquivo contém configurações e utilitários para otimizar
 * as queries do banco de dados PostgreSQL
 */

import { prisma } from './database'
import { logInfo, logError } from './logger'

export interface QueryOptimizationConfig {
  // Configurações de paginação
  defaultPageSize: number
  maxPageSize: number
  
  // Configurações de cache
  cacheEnabled: boolean
  cacheTTL: number // em segundos
  
  // Configurações de índices
  indexesEnabled: boolean
  
  // Configurações de query timeout
  queryTimeout: number // em milissegundos
}

export const queryConfig: QueryOptimizationConfig = {
  defaultPageSize: 50,
  maxPageSize: 100,
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutos
  indexesEnabled: true,
  queryTimeout: 30000 // 30 segundos
}

/**
 * Utilitário para construir queries otimizadas
 */
export class QueryOptimizer {
  /**
   * Aplica paginação otimizada
   */
  static applyPagination(page: string | undefined, limit: string | undefined) {
    const pageNum = Math.max(1, parseInt(page || '1'))
    const limitNum = Math.min(
      queryConfig.maxPageSize,
      Math.max(1, parseInt(limit || queryConfig.defaultPageSize.toString()))
    )
    
    return {
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      page: pageNum,
      limit: limitNum
    }
  }

  /**
   * Aplica filtros de busca otimizados
   */
  static applySearchFilters(search: string | undefined, searchFields: string[]) {
    if (!search) return {}
    
    return {
      OR: searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive' as const
        }
      }))
    }
  }

  /**
   * Aplica filtros de data otimizados
   */
  static applyDateFilters(startDate?: string, endDate?: string, field = 'createdAt') {
    const filters: any = {}
    
    if (startDate) {
      const start = new Date(startDate)
      if (!isNaN(start.getTime())) {
        filters[field] = { ...filters[field], gte: start }
      }
    }
    
    if (endDate) {
      const end = new Date(endDate)
      if (!isNaN(end.getTime())) {
        filters[field] = { ...filters[field], lte: end }
      }
    }
    
    return filters
  }

  /**
   * Aplica ordenação otimizada
   */
  static applyOrdering(orderBy?: string, orderDirection: 'asc' | 'desc' = 'desc'): Record<string, 'asc' | 'desc'> {
    if (!orderBy) return { createdAt: 'desc' as const }
    
    return {
      [orderBy]: orderDirection
    } as Record<string, 'asc' | 'desc'>
  }

  /**
   * Aplica filtros de permissão otimizados
   */
  static async applyPermissionFilters(
    user: any,
    entityType: 'patrimonio' | 'imovel' | 'transferencia' | 'documento'
  ) {
    // Admin, Supervisor e Superuser veem tudo
    if (['admin', 'supervisor', 'superuser'].includes(user.role)) {
      return {}
    }

    // Buscar setores do usuário
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { responsibleSectors: true }
    })

    if (!userData?.responsibleSectors?.length) {
      return { id: { in: [] } } // Retorna vazio se não tem setores
    }

    // Buscar IDs dos setores
    const sectors = await prisma.sector.findMany({
      where: {
        name: { in: userData.responsibleSectors },
        municipalityId: user.municipalityId
      },
      select: { id: true }
    })

    const sectorIds = sectors.map(s => s.id)
    
    if (sectorIds.length === 0) {
      return { id: { in: [] } } // Retorna vazio se não encontrou setores
    }

    return { sectorId: { in: sectorIds } }
  }
}

/**
 * Cache simples em memória para queries frequentes
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>()

  set(key: string, data: any, ttl = queryConfig.cacheTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl * 1000)
    })
  }

  get(key: string) {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    if (Date.now() > item.timestamp) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  clear() {
    this.cache.clear()
  }

  clearByPattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const queryCache = new QueryCache()

/**
 * Wrapper para queries com cache e otimizações
 */
export async function executeOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  useCache = true
): Promise<T> {
  // Verificar cache primeiro
  if (useCache && queryConfig.cacheEnabled) {
    const cached = queryCache.get(queryKey)
    if (cached) {
      return cached
    }
  }

  // Executar query com timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), queryConfig.queryTimeout)
  })

  try {
    const result = await Promise.race([queryFn(), timeoutPromise])
    
    // Armazenar no cache
    if (useCache && queryConfig.cacheEnabled) {
      queryCache.set(queryKey, result)
    }
    
    return result
  } catch (error) {
    logError(`Erro na query ${queryKey}`, error)
    throw error
  }
}

/**
 * Scripts SQL para criar índices otimizados
 */
export const optimizationIndexes = [
  // Índices para Patrimônios
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_municipality_status ON patrimonios(municipality_id, status)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_sector_status ON patrimonios(sector_id, status)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_numero_patrimonio ON patrimonios(numero_patrimonio)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_descricao_bem ON patrimonios USING gin(to_tsvector(\'portuguese\', descricao_bem))',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_created_at ON patrimonios(created_at)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_tipo_status ON patrimonios(tipo, status)',
  
  // Índices para Imóveis
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_municipality_status ON imoveis(municipality_id, status)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_sector_status ON imoveis(sector_id, status)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_numero_patrimonio ON imoveis(numero_patrimonio)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_denominacao ON imoveis USING gin(to_tsvector(\'portuguese\', denominacao))',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_endereco ON imoveis USING gin(to_tsvector(\'portuguese\', endereco))',
  
  // Índices para Transferências
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_status ON transferencias(status)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_patrimonio_id ON transferencias(patrimonio_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_created_at ON transferencias(created_at)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_setor_origem ON transferencias(setor_origem)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_setor_destino ON transferencias(setor_destino)',
  
  // Índices para Documentos
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_gerais_tipo ON documentos_gerais(tipo)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_gerais_is_public ON documentos_gerais(is_public)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_gerais_uploaded_by ON documentos_gerais(uploaded_by_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_gerais_titulo ON documentos_gerais USING gin(to_tsvector(\'portuguese\', titulo))',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_gerais_created_at ON documentos_gerais(created_at)',
  
  // Índices para Activity Logs
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type)',
  
  // Índices para Setores
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_municipality_id ON sectors(municipality_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_name ON sectors(name)',
  
  // Índices para Locais
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locais_sector_id ON locais(sector_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locais_municipality_id ON locais(municipality_id)',
  
  // Índices para Usuários
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_municipality_id ON users(municipality_id)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active ON users(is_active)',
]

/**
 * Aplicar índices de otimização
 */
export async function applyOptimizationIndexes() {
  logInfo('🚀 Aplicando índices de otimização...')

  for (const indexQuery of optimizationIndexes) {
    try {
      await prisma.$executeRawUnsafe(indexQuery)
      logInfo(`✅ Índice aplicado: ${indexQuery.split(' ')[5]}`)
    } catch (error) {
      logError(`Erro ao aplicar índice: ${indexQuery.split(' ')[5]}`, error)
    }
  }

  logInfo('✅ Índices de otimização aplicados com sucesso!')
}

/**
 * Analisar performance de queries
 */
export async function analyzeQueryPerformance() {
  logInfo('📊 Analisando performance das queries...')
  
  // Query para verificar queries mais lentas
  const slowQueries = await prisma.$queryRaw`
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      rows
    FROM pg_stat_statements 
    WHERE mean_time > 1000  -- queries com mais de 1s em média
    ORDER BY mean_time DESC
    LIMIT 10
  `
  
  logInfo('🐌 Queries mais lentas', { slowQueries })
  
  // Query para verificar índices não utilizados
  const unusedIndexes = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes 
    WHERE idx_tup_read = 0
    ORDER BY tablename, indexname
  `
  
  logInfo('📊 Índices não utilizados', { unusedIndexes })
  
  return { slowQueries, unusedIndexes }
}
