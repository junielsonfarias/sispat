import { query, getRows } from './connection.js'

/**
 * Função para criar índices de performance
 */
export async function createPerformanceIndexes() {
  try {
    console.log('🔧 Criando índices de performance...')
    
    const indexes = [
      // Índices para patrimonios
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_municipality ON patrimonios(municipality_id)',
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_setor ON patrimonios(setor_responsavel)',
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_status ON patrimonios(status)',
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_tipo ON patrimonios(tipo)',
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_data_aquisicao ON patrimonios(data_aquisicao)',
      'CREATE INDEX IF NOT EXISTS idx_patrimonios_numero ON patrimonios(numero_patrimonio)',
      
      // Índices para users
      'CREATE INDEX IF NOT EXISTS idx_users_municipality ON users(municipality_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      
      // Índices para sectors
      'CREATE INDEX IF NOT EXISTS idx_sectors_municipality ON sectors(municipality_id)',
      'CREATE INDEX IF NOT EXISTS idx_sectors_parent ON sectors(parent_id)',
      
      // Índices para locals
      'CREATE INDEX IF NOT EXISTS idx_locals_sector ON locals(sector_id)',
      'CREATE INDEX IF NOT EXISTS idx_locals_municipality ON locals(municipality_id)',
      
      // Índices para imoveis
      'CREATE INDEX IF NOT EXISTS idx_imoveis_municipality ON imoveis(municipality_id)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo_imovel)',
      
      // Índices para activity_logs
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
      
      // Índices para transfers
      'CREATE INDEX IF NOT EXISTS idx_transfers_patrimonio ON transfers(patrimonio_id)',
      'CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status)',
      'CREATE INDEX IF NOT EXISTS idx_transfers_data ON transfers(data_transferencia)',
      
      // Índices para manutencao_tasks
      'CREATE INDEX IF NOT EXISTS idx_manutencao_patrimonio ON manutencao_tasks(patrimonio_id)',
      'CREATE INDEX IF NOT EXISTS idx_manutencao_status ON manutencao_tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_manutencao_data ON manutencao_tasks(data_inicio)',
      
      // Índices para inventories
      'CREATE INDEX IF NOT EXISTS idx_inventories_municipality ON inventories(municipality_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status)',
      'CREATE INDEX IF NOT EXISTS idx_inventories_data ON inventories(data_inicio)'
    ]
    
    let createdCount = 0
    let skippedCount = 0
    
    for (const indexQuery of indexes) {
      try {
        await query(indexQuery)
        createdCount++
        console.log(`✅ Índice criado: ${indexQuery.split('idx_')[1].split(' ')[0]}`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          skippedCount++
          console.log(`⏭️ Índice já existe: ${indexQuery.split('idx_')[1].split(' ')[0]}`)
        } else {
          console.error(`❌ Erro ao criar índice: ${error.message}`)
        }
      }
    }
    
    console.log(`✅ Otimização concluída: ${createdCount} índices criados, ${skippedCount} já existiam`)
    
    return {
      success: true,
      created: createdCount,
      skipped: skippedCount,
      total: indexes.length
    }
    
  } catch (error) {
    console.error('❌ Erro na otimização:', error)
    throw error
  }
}

/**
 * Função para analisar performance das queries
 */
export async function analyzeQueryPerformance() {
  try {
    console.log('📊 Analisando performance das queries...')
    
    const analysis = {
      timestamp: new Date().toISOString(),
      slowQueries: [],
      recommendations: [],
      statistics: {}
    }
    
    // Verificar estatísticas das tabelas
    const tableStats = await getRows(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `)
    
    analysis.statistics.tableStats = tableStats
    
    // Verificar índices existentes
    const indexes = await getRows(`
      SELECT 
        t.tablename,
        i.indexname,
        i.indexdef
      FROM pg_indexes i
      JOIN pg_tables t ON i.tablename = t.tablename
      WHERE i.schemaname = 'public'
      ORDER BY t.tablename, i.indexname
    `)
    
    analysis.statistics.indexes = indexes
    
    // Verificar tamanho das tabelas
    const tableSizes = await getRows(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `)
    
    analysis.statistics.tableSizes = tableSizes
    
    // Gerar recomendações
    const recommendations = []
    
    // Verificar tabelas sem índices
    const tablesWithoutIndexes = tableSizes.filter(table => 
      !indexes.some(index => index.tablename === table.tablename)
    )
    
    if (tablesWithoutIndexes.length > 0) {
      recommendations.push({
        type: 'missing_indexes',
        message: `Tabelas sem índices: ${tablesWithoutIndexes.map(t => t.tablename).join(', ')}`,
        priority: 'high'
      })
    }
    
    // Verificar tabelas grandes
    const largeTables = tableSizes.filter(table => table.size_bytes > 1000000) // > 1MB
    if (largeTables.length > 0) {
      recommendations.push({
        type: 'large_tables',
        message: `Tabelas grandes detectadas: ${largeTables.map(t => `${t.tablename} (${t.size})`).join(', ')}`,
        priority: 'medium'
      })
    }
    
    analysis.recommendations = recommendations
    
    console.log('✅ Análise de performance concluída')
    
    return analysis
    
  } catch (error) {
    console.error('❌ Erro na análise de performance:', error)
    throw error
  }
}

/**
 * Função para otimizar queries específicas
 */
export async function optimizeSpecificQueries() {
  try {
    console.log('🔧 Otimizando queries específicas...')
    
    const optimizations = []
    
    // Otimizar query de patrimônios por município
    const patrimonioQuery = `
      SELECT 
        p.*,
        l.name as local_name,
        s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `
    
    // Verificar se existe índice composto
    const compositeIndex = await query(`
      CREATE INDEX IF NOT EXISTS idx_patrimonios_municipality_local_sector 
      ON patrimonios(municipality_id, local_id)
    `)
    
    optimizations.push({
      query: 'patrimonios_by_municipality',
      optimization: 'Índice composto criado para municipality_id + local_id',
      impact: 'high'
    })
    
    // Otimizar query de relatórios
    const reportIndex = await query(`
      CREATE INDEX IF NOT EXISTS idx_patrimonios_status_tipo_municipality 
      ON patrimonios(status, tipo, municipality_id)
    `)
    
    optimizations.push({
      query: 'reports_by_status_type',
      optimization: 'Índice composto criado para status + tipo + municipality_id',
      impact: 'high'
    })
    
    console.log('✅ Otimizações específicas concluídas')
    
    return {
      success: true,
      optimizations
    }
    
  } catch (error) {
    console.error('❌ Erro na otimização específica:', error)
    throw error
  }
}

/**
 * Função para limpar dados antigos
 */
export async function cleanupOldData() {
  try {
    console.log('🧹 Limpando dados antigos...')
    
    const cleanupResults = []
    
    // Limpar logs de atividade antigos (mais de 1 ano)
    const oldActivityLogs = await query(`
      DELETE FROM activity_logs 
      WHERE timestamp < NOW() - INTERVAL '1 year'
      RETURNING COUNT(*) as deleted_count
    `)
    
    if (oldActivityLogs.rows[0].deleted_count > 0) {
      cleanupResults.push({
        table: 'activity_logs',
        deleted: parseInt(oldActivityLogs.rows[0].deleted_count),
        criteria: 'Logs mais antigos que 1 ano'
      })
    }
    
    // Limpar backups antigos (manter apenas os últimos 10)
    const backupCount = await query('SELECT COUNT(*) as count FROM pg_stat_user_tables WHERE tablename = \'backups\'')
    
    if (parseInt(backupCount.rows[0].count) > 10) {
      const oldBackups = await query(`
        DELETE FROM backups 
        WHERE id NOT IN (
          SELECT id FROM backups 
          ORDER BY created_at DESC 
          LIMIT 10
        )
        RETURNING COUNT(*) as deleted_count
      `)
      
      if (oldBackups.rows[0].deleted_count > 0) {
        cleanupResults.push({
          table: 'backups',
          deleted: parseInt(oldBackups.rows[0].deleted_count),
          criteria: 'Backups antigos (mantidos apenas os últimos 10)'
        })
      }
    }
    
    // Vacuum e Analyze
    await query('VACUUM ANALYZE')
    
    console.log('✅ Limpeza de dados concluída')
    
    return {
      success: true,
      cleanupResults,
      message: 'Dados antigos removidos e banco otimizado'
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza de dados:', error)
    throw error
  }
}

/**
 * Função para obter estatísticas de performance
 */
export async function getPerformanceStats() {
  try {
    console.log('📊 Obtendo estatísticas de performance...')
    
    const stats = {
      timestamp: new Date().toISOString(),
      database: {},
      tables: {},
      indexes: {},
      recommendations: []
    }
    
    // Estatísticas do banco
    const dbStats = await getRows(`
      SELECT 
        datname,
        numbackends,
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        tup_returned,
        tup_fetched,
        tup_inserted,
        tup_updated,
        tup_deleted
      FROM pg_stat_database 
      WHERE datname = current_database()
    `)
    
    stats.database = dbStats[0] || {}
    
    // Estatísticas das tabelas
    const tableStats = await getRows(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `)
    
    stats.tables = tableStats
    
    // Estatísticas dos índices
    const indexStats = await getRows(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `)
    
    stats.indexes = indexStats
    
    // Calcular hit ratio
    const hitRatio = stats.database.blks_hit && stats.database.blks_read 
      ? (stats.database.blks_hit / (stats.database.blks_hit + stats.database.blks_read) * 100).toFixed(2)
      : 0
    
    stats.database.hitRatio = `${hitRatio}%`
    
    // Gerar recomendações baseadas nas estatísticas
    if (parseFloat(hitRatio) < 90) {
      stats.recommendations.push({
        type: 'cache',
        message: 'Hit ratio baixo. Considere aumentar o cache do PostgreSQL.',
        priority: 'high'
      })
    }
    
    const unusedIndexes = indexStats.filter(index => index.idx_scan === 0)
    if (unusedIndexes.length > 0) {
      stats.recommendations.push({
        type: 'unused_indexes',
        message: `Índices não utilizados: ${unusedIndexes.map(i => i.indexname).join(', ')}`,
        priority: 'medium'
      })
    }
    
    console.log('✅ Estatísticas de performance obtidas')
    
    return stats
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    throw error
  }
}
