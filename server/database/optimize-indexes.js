import { query, getRows } from './connection.js'
import { logInfo, logWarning, logError, logPerformance } from '../utils/logger.js'

/**
 * Script para otimização de índices do banco de dados
 * Cria índices estratégicos baseados em padrões de uso
 */

// Índices essenciais para performance
const ESSENTIAL_INDEXES = [
  // Patrimônios - consultas mais frequentes
  {
    name: 'idx_patrimonios_municipality_status',
    table: 'patrimonios',
    columns: ['municipality_id', 'status'],
    reason: 'Filtros por município e status são muito frequentes',
    priority: 'high'
  },
  {
    name: 'idx_patrimonios_setor_data',
    table: 'patrimonios',
    columns: ['setor_responsavel', 'data_aquisicao'],
    reason: 'Consultas por setor e período de aquisição',
    priority: 'high'
  },
  {
    name: 'idx_patrimonios_numero',
    table: 'patrimonios',
    columns: ['numero_patrimonio'],
    reason: 'Busca por número de patrimônio',
    priority: 'high'
  },
  {
    name: 'idx_patrimonios_descricao_gin',
    table: 'patrimonios',
    columns: ['descricao_bem'],
    type: 'gin',
    transform: 'to_tsvector(\'portuguese\', descricao_bem)',
    reason: 'Busca textual na descrição dos bens',
    priority: 'medium'
  },
  
  // Usuários
  {
    name: 'idx_users_email_unique',
    table: 'users',
    columns: ['email'],
    unique: true,
    reason: 'Login por email - deve ser único',
    priority: 'high'
  },
  {
    name: 'idx_users_municipality_role',
    table: 'users',
    columns: ['municipality_id', 'role'],
    reason: 'Filtros por município e role',
    priority: 'medium'
  },
  
  // Activity Logs
  {
    name: 'idx_activity_logs_user_date',
    table: 'activity_logs',
    columns: ['user_id', 'created_at'],
    reason: 'Consulta de atividades por usuário e data',
    priority: 'medium'
  },
  {
    name: 'idx_activity_logs_entity',
    table: 'activity_logs',
    columns: ['entity_type', 'entity_id'],
    reason: 'Consulta de logs por entidade específica',
    priority: 'medium'
  },
  
  // Setores
  {
    name: 'idx_sectors_municipality',
    table: 'sectors',
    columns: ['municipality_id'],
    reason: 'Listagem de setores por município',
    priority: 'high'
  },
  
  // Locais
  {
    name: 'idx_locals_sector',
    table: 'locals',
    columns: ['sector_id'],
    reason: 'Listagem de locais por setor',
    priority: 'high'
  },
  
  // Transferências
  {
    name: 'idx_transfers_from_sector_status',
    table: 'transfers',
    columns: ['from_sector_id', 'status'],
    reason: 'Consulta de transferências por setor origem',
    priority: 'medium'
  },
  {
    name: 'idx_transfers_to_sector_status',
    table: 'transfers',
    columns: ['to_sector_id', 'status'],
    reason: 'Consulta de transferências por setor destino',
    priority: 'medium'
  },
  
  // Inventários
  {
    name: 'idx_inventories_municipality_status',
    table: 'inventories',
    columns: ['municipality_id', 'status'],
    reason: 'Consulta de inventários por município e status',
    priority: 'medium'
  },
  
  // Imóveis
  {
    name: 'idx_imoveis_municipality',
    table: 'imoveis',
    columns: ['municipality_id'],
    reason: 'Listagem de imóveis por município',
    priority: 'medium'
  },
  {
    name: 'idx_imoveis_setor',
    table: 'imoveis',
    columns: ['setor'],
    reason: 'Filtro de imóveis por setor',
    priority: 'medium'
  }
]

// Verificar se um índice já existe
const indexExists = async (indexName) => {
  try {
    const result = await getRows(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname = $1 AND schemaname = 'public'
    `, [indexName])
    
    return result.length > 0
  } catch (error) {
    logError(`Erro ao verificar existência do índice ${indexName}`, error)
    return false
  }
}

// Verificar se uma tabela existe
const tableExists = async (tableName) => {
  try {
    const result = await getRows(`
      SELECT tablename 
      FROM pg_tables 
      WHERE tablename = $1 AND schemaname = 'public'
    `, [tableName])
    
    return result.length > 0
  } catch (error) {
    logError(`Erro ao verificar existência da tabela ${tableName}`, error)
    return false
  }
}

// Criar um índice específico
const createIndex = async (indexConfig) => {
  const startTime = Date.now()
  
  try {
    // Verificar se a tabela existe
    if (!(await tableExists(indexConfig.table))) {
      logWarning(`Tabela ${indexConfig.table} não existe - pulando índice ${indexConfig.name}`)
      return { success: false, reason: 'table_not_exists', skipped: true }
    }
    
    // Verificar se o índice já existe
    if (await indexExists(indexConfig.name)) {
      logInfo(`Índice ${indexConfig.name} já existe - pulando`)
      return { success: true, reason: 'already_exists', skipped: true }
    }
    
    // Construir SQL do índice
    let sql = 'CREATE INDEX'
    
    if (indexConfig.unique) {
      sql = 'CREATE UNIQUE INDEX'
    }
    
    sql += ' CONCURRENTLY ' + indexConfig.name + ' ON ' + indexConfig.table
    
    if (indexConfig.type === 'gin') {
      sql += ` USING gin (${indexConfig.transform || indexConfig.columns.join(', ')})`
    } else {
      sql += ` (${indexConfig.columns.join(', ')})`
    }
    
    logInfo(`Criando índice: ${indexConfig.name}`, {
      table: indexConfig.table,
      columns: indexConfig.columns,
      reason: indexConfig.reason,
      sql: sql
    })
    
    await query(sql)
    
    const duration = Date.now() - startTime
    
    logPerformance(`Index Created: ${indexConfig.name}`, duration, {
      table: indexConfig.table,
      columns: indexConfig.columns.join(', '),
      priority: indexConfig.priority
    })
    
    return { success: true, duration, sql }
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(`Erro ao criar índice ${indexConfig.name}`, error, {
      table: indexConfig.table,
      columns: indexConfig.columns,
      duration,
      sql: error.sql || 'N/A'
    })
    
    return { success: false, error: error.message, duration }
  }
}

// Criar todos os índices essenciais
export const createEssentialIndexes = async () => {
  const startTime = Date.now()
  
  try {
    logInfo('🚀 Iniciando criação de índices essenciais para performance')
    
    const results = {
      total: ESSENTIAL_INDEXES.length,
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    }
    
    for (const indexConfig of ESSENTIAL_INDEXES) {
      logInfo(`Processando índice: ${indexConfig.name}`, {
        priority: indexConfig.priority,
        table: indexConfig.table
      })
      
      const result = await createIndex(indexConfig)
      
      results.details.push({
        name: indexConfig.name,
        table: indexConfig.table,
        columns: indexConfig.columns,
        priority: indexConfig.priority,
        reason: indexConfig.reason,
        ...result
      })
      
      if (result.success) {
        if (result.skipped) {
          results.skipped++
        } else {
          results.created++
        }
      } else {
        results.failed++
      }
      
      // Pequena pausa entre criações para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const totalDuration = Date.now() - startTime
    
    logPerformance('Essential Indexes Creation Complete', totalDuration, {
      type: 'INDEX_OPTIMIZATION',
      total: results.total,
      created: results.created,
      skipped: results.skipped,
      failed: results.failed
    })
    
    return results
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('Erro durante criação de índices essenciais', error, { duration })
    throw error
  }
}

// Remover índices não utilizados (cuidado!)
export const removeUnusedIndexes = async (dryRun = true) => {
  try {
    logInfo('Analisando índices não utilizados...', { dryRun })
    
    const unusedIndexes = await getRows(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexname NOT LIKE '%_pkey'  -- Não remover chaves primárias
        AND indexname NOT LIKE '%_unique%' -- Cuidado com índices únicos
      ORDER BY pg_relation_size(indexname::regclass) DESC
    `)
    
    if (unusedIndexes.length === 0) {
      logInfo('Nenhum índice não utilizado encontrado')
      return { removed: 0, indexes: [] }
    }
    
    logWarning(`Encontrados ${unusedIndexes.length} índices não utilizados`, {
      indexes: unusedIndexes.map(idx => ({
        name: idx.indexname,
        table: idx.tablename,
        size: idx.size
      }))
    })
    
    if (dryRun) {
      logInfo('Modo dry-run ativado - nenhum índice será removido')
      return { removed: 0, indexes: unusedIndexes, dryRun: true }
    }
    
    // Se não for dry-run, remover os índices (CUIDADO!)
    const removed = []
    for (const idx of unusedIndexes) {
      try {
        await query(`DROP INDEX CONCURRENTLY ${idx.indexname}`)
        removed.push(idx)
        logInfo(`Índice removido: ${idx.indexname}`, { table: idx.tablename, size: idx.size })
      } catch (error) {
        logError(`Erro ao remover índice ${idx.indexname}`, error)
      }
    }
    
    return { removed: removed.length, indexes: removed }
    
  } catch (error) {
    logError('Erro ao analisar/remover índices não utilizados', error)
    return { removed: 0, indexes: [], error: error.message }
  }
}

// Executar VACUUM e ANALYZE nas tabelas que precisam
export const performTableMaintenance = async () => {
  try {
    logInfo('Executando manutenção das tabelas...')
    
    // Obter tabelas que precisam de manutenção
    const tables = await getRows(`
      SELECT 
        tablename,
        n_dead_tup,
        n_live_tup,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
        AND (
          n_dead_tup::float / GREATEST(n_live_tup + n_dead_tup, 1) > 0.1  -- Mais de 10% tuplas mortas
          OR last_analyze IS NULL 
          OR last_autoanalyze IS NULL
          OR last_analyze < NOW() - INTERVAL '7 days'
        )
      ORDER BY n_dead_tup DESC
    `)
    
    if (tables.length === 0) {
      logInfo('Nenhuma tabela precisa de manutenção')
      return { maintained: 0, tables: [] }
    }
    
    logInfo(`${tables.length} tabelas precisam de manutenção`)
    
    const maintained = []
    
    for (const table of tables) {
      try {
        const startTime = Date.now()
        
        // ANALYZE é mais seguro e rápido
        await query(`ANALYZE ${table.tablename}`)
        
        const duration = Date.now() - startTime
        
        logPerformance(`Table Analyzed: ${table.tablename}`, duration, {
          deadTuples: table.n_dead_tup,
          liveTuples: table.n_live_tup
        })
        
        maintained.push({
          table: table.tablename,
          action: 'ANALYZE',
          duration
        })
        
      } catch (error) {
        logError(`Erro ao fazer manutenção da tabela ${table.tablename}`, error)
      }
    }
    
    return { maintained: maintained.length, tables: maintained }
    
  } catch (error) {
    logError('Erro durante manutenção das tabelas', error)
    return { maintained: 0, tables: [], error: error.message }
  }
}

// Executar otimização completa
export const runCompleteOptimization = async (options = {}) => {
  const startTime = Date.now()
  const { removeUnused = false, performMaintenance = true } = options
  
  try {
    logInfo('🔧 Iniciando otimização completa do banco de dados')
    
    const results = {
      timestamp: new Date().toISOString(),
      indexCreation: null,
      unusedIndexes: null,
      tableMaintenance: null,
      totalDuration: 0
    }
    
    // 1. Criar índices essenciais
    logInfo('Etapa 1: Criando índices essenciais...')
    results.indexCreation = await createEssentialIndexes()
    
    // 2. Analisar índices não utilizados
    logInfo('Etapa 2: Analisando índices não utilizados...')
    results.unusedIndexes = await removeUnusedIndexes(!removeUnused) // dry-run por padrão
    
    // 3. Manutenção das tabelas
    if (performMaintenance) {
      logInfo('Etapa 3: Executando manutenção das tabelas...')
      results.tableMaintenance = await performTableMaintenance()
    }
    
    results.totalDuration = Date.now() - startTime
    
    logPerformance('Database Optimization Complete', results.totalDuration, {
      type: 'DATABASE_OPTIMIZATION',
      indexesCreated: results.indexCreation?.created || 0,
      indexesSkipped: results.indexCreation?.skipped || 0,
      indexesFailed: results.indexCreation?.failed || 0,
      unusedIndexesFound: results.unusedIndexes?.indexes?.length || 0,
      tablesMaintenanced: results.tableMaintenance?.maintained || 0
    })
    
    return results
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('Erro durante otimização completa', error, { duration })
    throw error
  }
}

export default {
  createEssentialIndexes,
  removeUnusedIndexes,
  performTableMaintenance,
  runCompleteOptimization,
  ESSENTIAL_INDEXES
}
