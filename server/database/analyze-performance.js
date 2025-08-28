import { query, getRows } from './connection.js'
import { logInfo, logWarning, logError, logPerformance } from '../utils/logger.js'

/**
 * Script para análise de performance do banco de dados
 * Identifica queries lentas, índices faltantes e oportunidades de otimização
 */

// Habilitar extensão pg_stat_statements se não estiver habilitada
export const enablePerformanceMonitoring = async () => {
  try {
    logInfo('Habilitando monitoramento de performance...')
    
    // Verificar se pg_stat_statements está disponível
    const extensions = await getRows(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'pg_stat_statements'
    `)
    
    if (extensions.length === 0) {
      logWarning('Extensão pg_stat_statements não encontrada - tentando criar...')
      try {
        await query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements')
        logInfo('Extensão pg_stat_statements criada com sucesso')
      } catch (error) {
        logWarning('Não foi possível criar pg_stat_statements - análise limitada', { error: error.message })
        return false
      }
    } else {
      logInfo('Extensão pg_stat_statements já está habilitada', { version: extensions[0].extversion })
    }
    
    return true
  } catch (error) {
    logError('Erro ao habilitar monitoramento de performance', error)
    return false
  }
}

// Analisar queries mais lentas
export const analyzeSlowQueries = async () => {
  try {
    logInfo('Analisando queries mais lentas...')
    
    const slowQueries = await getRows(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time,
        min_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%pg_catalog%'
        AND mean_time > 10 -- queries com tempo médio > 10ms
      ORDER BY total_time DESC 
      LIMIT 20
    `)
    
    if (slowQueries.length > 0) {
      logWarning(`Encontradas ${slowQueries.length} queries lentas`, {
        type: 'PERFORMANCE_ANALYSIS',
        slowQueries: slowQueries.map(q => ({
          query: q.query.substring(0, 100) + '...',
          calls: q.calls,
          meanTime: `${parseFloat(q.mean_time).toFixed(2)}ms`,
          totalTime: `${parseFloat(q.total_time).toFixed(2)}ms`,
          hitPercent: q.hit_percent ? `${parseFloat(q.hit_percent).toFixed(2)}%` : 'N/A'
        }))
      })
      
      return slowQueries
    } else {
      logInfo('Nenhuma query lenta encontrada (tempo médio > 10ms)')
      return []
    }
  } catch (error) {
    logWarning('Não foi possível analisar queries lentas - pg_stat_statements pode não estar disponível', { error: error.message })
    return []
  }
}

// Analisar índices existentes
export const analyzeExistingIndexes = async () => {
  try {
    logInfo('Analisando índices existentes...')
    
    const indexes = await getRows(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND indexname NOT LIKE 'pg_%'
      ORDER BY tablename, indexname
    `)
    
    logInfo(`Encontrados ${indexes.length} índices personalizados`, {
      type: 'INDEX_ANALYSIS',
      indexes: indexes.map(idx => ({
        table: idx.tablename,
        index: idx.indexname,
        size: idx.size,
        definition: idx.indexdef
      }))
    })
    
    return indexes
  } catch (error) {
    logError('Erro ao analisar índices existentes', error)
    return []
  }
}

// Analisar uso de índices
export const analyzeIndexUsage = async () => {
  try {
    logInfo('Analisando uso de índices...')
    
    const indexUsage = await getRows(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `)
    
    // Identificar índices não utilizados
    const unusedIndexes = indexUsage.filter(idx => idx.idx_scan === '0' || idx.idx_scan === 0)
    
    if (unusedIndexes.length > 0) {
      logWarning(`Encontrados ${unusedIndexes.length} índices não utilizados`, {
        type: 'UNUSED_INDEXES',
        unusedIndexes: unusedIndexes.map(idx => ({
          table: idx.tablename,
          index: idx.indexname,
          size: idx.size
        }))
      })
    }
    
    return { indexUsage, unusedIndexes }
  } catch (error) {
    logError('Erro ao analisar uso de índices', error)
    return { indexUsage: [], unusedIndexes: [] }
  }
}

// Analisar estatísticas das tabelas
export const analyzeTableStats = async () => {
  try {
    logInfo('Analisando estatísticas das tabelas...')
    
    const tableStats = await getRows(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `)
    
    // Identificar tabelas que precisam de VACUUM/ANALYZE
    const needMaintenance = tableStats.filter(table => {
      const deadRatio = table.dead_tuples / (table.live_tuples + table.dead_tuples || 1)
      const needsVacuum = deadRatio > 0.1 // mais de 10% de tuplas mortas
      const needsAnalyze = !table.last_analyze || !table.last_autoanalyze
      return needsVacuum || needsAnalyze
    })
    
    if (needMaintenance.length > 0) {
      logWarning(`${needMaintenance.length} tabelas precisam de manutenção`, {
        type: 'TABLE_MAINTENANCE',
        tables: needMaintenance.map(t => ({
          table: t.tablename,
          size: t.total_size,
          deadTuples: t.dead_tuples,
          liveTuples: t.live_tuples,
          lastVacuum: t.last_vacuum,
          lastAnalyze: t.last_analyze
        }))
      })
    }
    
    return { tableStats, needMaintenance }
  } catch (error) {
    logError('Erro ao analisar estatísticas das tabelas', error)
    return { tableStats: [], needMaintenance: [] }
  }
}

// Sugerir índices baseado em queries comuns
export const suggestIndexes = async () => {
  try {
    logInfo('Sugerindo índices baseado em padrões de uso...')
    
    const suggestions = []
    
    // Analisar padrões comuns de consulta
    const commonPatterns = [
      {
        table: 'patrimonios',
        columns: ['municipality_id', 'status'],
        reason: 'Filtros frequentes por município e status'
      },
      {
        table: 'patrimonios',
        columns: ['setor_responsavel', 'data_aquisicao'],
        reason: 'Consultas por setor e período'
      },
      {
        table: 'users',
        columns: ['municipality_id', 'role'],
        reason: 'Filtros por município e role'
      },
      {
        table: 'users',
        columns: ['email'],
        reason: 'Login por email (se não existir)'
      },
      {
        table: 'activity_logs',
        columns: ['user_id', 'created_at'],
        reason: 'Consulta de logs por usuário e data'
      },
      {
        table: 'activity_logs',
        columns: ['entity_type', 'entity_id'],
        reason: 'Consulta de logs por entidade'
      },
      {
        table: 'transfers',
        columns: ['from_sector_id', 'status'],
        reason: 'Consulta de transferências por setor origem'
      },
      {
        table: 'transfers',
        columns: ['to_sector_id', 'status'],
        reason: 'Consulta de transferências por setor destino'
      },
      {
        table: 'inventories',
        columns: ['municipality_id', 'status', 'created_at'],
        reason: 'Consulta de inventários por município e status'
      }
    ]
    
    // Verificar quais índices já existem
    const existingIndexes = await getRows(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `)
    
    const existingIndexNames = existingIndexes.map(idx => idx.indexname.toLowerCase())
    
    for (const pattern of commonPatterns) {
      const indexName = `idx_${pattern.table}_${pattern.columns.join('_')}`
      
      if (!existingIndexNames.includes(indexName.toLowerCase())) {
        suggestions.push({
          table: pattern.table,
          columns: pattern.columns,
          indexName,
          reason: pattern.reason,
          sql: `CREATE INDEX CONCURRENTLY ${indexName} ON ${pattern.table} (${pattern.columns.join(', ')})`
        })
      }
    }
    
    logInfo(`${suggestions.length} novos índices sugeridos`, {
      type: 'INDEX_SUGGESTIONS',
      suggestions: suggestions.map(s => ({
        table: s.table,
        columns: s.columns.join(', '),
        reason: s.reason
      }))
    })
    
    return suggestions
  } catch (error) {
    logError('Erro ao sugerir índices', error)
    return []
  }
}

// Executar análise completa de performance
export const runCompleteAnalysis = async () => {
  const startTime = Date.now()
  
  try {
    logInfo('🔍 Iniciando análise completa de performance do banco de dados')
    
    const results = {
      timestamp: new Date().toISOString(),
      performanceMonitoringEnabled: false,
      slowQueries: [],
      existingIndexes: [],
      indexUsage: { indexUsage: [], unusedIndexes: [] },
      tableStats: { tableStats: [], needMaintenance: [] },
      indexSuggestions: []
    }
    
    // 1. Habilitar monitoramento
    results.performanceMonitoringEnabled = await enablePerformanceMonitoring()
    
    // 2. Analisar queries lentas
    results.slowQueries = await analyzeSlowQueries()
    
    // 3. Analisar índices existentes
    results.existingIndexes = await analyzeExistingIndexes()
    
    // 4. Analisar uso de índices
    results.indexUsage = await analyzeIndexUsage()
    
    // 5. Analisar estatísticas das tabelas
    results.tableStats = await analyzeTableStats()
    
    // 6. Sugerir novos índices
    results.indexSuggestions = await suggestIndexes()
    
    const duration = Date.now() - startTime
    
    logPerformance('Database Performance Analysis', duration, {
      type: 'PERFORMANCE_ANALYSIS_COMPLETE',
      slowQueriesFound: results.slowQueries.length,
      existingIndexes: results.existingIndexes.length,
      unusedIndexes: results.indexUsage.unusedIndexes.length,
      suggestedIndexes: results.indexSuggestions.length,
      tablesNeedingMaintenance: results.tableStats.needMaintenance.length
    })
    
    return results
  } catch (error) {
    const duration = Date.now() - startTime
    logError('Erro durante análise de performance', error, { duration })
    throw error
  }
}

export default {
  enablePerformanceMonitoring,
  analyzeSlowQueries,
  analyzeExistingIndexes,
  analyzeIndexUsage,
  analyzeTableStats,
  suggestIndexes,
  runCompleteAnalysis
}
