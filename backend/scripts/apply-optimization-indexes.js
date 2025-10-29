#!/usr/bin/env node

/**
 * Script para aplicar índices de otimização no banco de dados
 * 
 * Uso: node scripts/apply-optimization-indexes.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const optimizationIndexes = [
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

async function applyOptimizationIndexes() {
  console.log('🚀 Aplicando índices de otimização...')
  
  let successCount = 0
  let errorCount = 0
  
  for (const indexQuery of optimizationIndexes) {
    try {
      await prisma.$executeRawUnsafe(indexQuery)
      const indexName = indexQuery.split(' ')[5]
      console.log(`✅ Índice aplicado: ${indexName}`)
      successCount++
    } catch (error) {
      const indexName = indexQuery.split(' ')[5]
      console.error(`❌ Erro ao aplicar índice ${indexName}:`, error.message)
      errorCount++
    }
  }
  
  console.log(`\n📊 Resumo:`)
  console.log(`✅ Sucessos: ${successCount}`)
  console.log(`❌ Erros: ${errorCount}`)
  console.log(`📈 Total: ${optimizationIndexes.length}`)
  
  if (errorCount === 0) {
    console.log('\n🎉 Todos os índices foram aplicados com sucesso!')
  } else {
    console.log('\n⚠️ Alguns índices falharam. Verifique os erros acima.')
  }
}

async function analyzePerformance() {
  console.log('\n📊 Analisando performance das queries...')
  
  try {
    // Verificar se pg_stat_statements está habilitado
    const statsEnabled = await prisma.$queryRaw`
      SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    `
    
    if (statsEnabled.length === 0) {
      console.log('⚠️ pg_stat_statements não está habilitado. Execute:')
      console.log('   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;')
      return
    }
    
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
    
    console.log('🐌 Queries mais lentas:')
    console.table(slowQueries)
    
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
    
    if (unusedIndexes.length > 0) {
      console.log('\n📊 Índices não utilizados:')
      console.table(unusedIndexes)
    } else {
      console.log('\n✅ Todos os índices estão sendo utilizados!')
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar performance:', error.message)
  }
}

async function main() {
  try {
    await applyOptimizationIndexes()
    await analyzePerformance()
  } catch (error) {
    console.error('❌ Erro geral:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { applyOptimizationIndexes, analyzePerformance }
