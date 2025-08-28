import express from 'express'
import { authenticateToken, requireSuperuser } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { runCompleteAnalysis } from '../database/analyze-performance.js'
import { runCompleteOptimization } from '../database/optimize-indexes.js'
import { logInfo, logWarning } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação a todas as rotas
router.use(authenticateToken)

// Rota para análise de performance (somente leitura)
router.get('/analyze', requireSuperuser, asyncHandler(async (req, res) => {
  logInfo('Database performance analysis requested', {
    userId: req.user.id,
    userRole: req.user.role
  })
  
  const analysis = await runCompleteAnalysis()
  
  res.json({
    success: true,
    message: 'Análise de performance concluída',
    data: analysis,
    recommendations: generateRecommendations(analysis)
  })
}))

// Rota para otimização (executa mudanças)
router.post('/optimize', requireSuperuser, asyncHandler(async (req, res) => {
  const { removeUnused = false, performMaintenance = true } = req.body
  
  logWarning('Database optimization requested', {
    userId: req.user.id,
    userRole: req.user.role,
    removeUnused,
    performMaintenance
  })
  
  const optimization = await runCompleteOptimization({
    removeUnused,
    performMaintenance
  })
  
  res.json({
    success: true,
    message: 'Otimização do banco de dados concluída',
    data: optimization,
    summary: generateOptimizationSummary(optimization)
  })
}))

// Rota para estatísticas rápidas
router.get('/stats', requireSuperuser, asyncHandler(async (req, res) => {
  const { getRows } = await import('../database/connection.js')
  
  // Estatísticas básicas das tabelas principais
  const tableStats = await getRows(`
    SELECT 
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      n_live_tup as rows
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND tablename IN ('patrimonios', 'users', 'activity_logs', 'transfers', 'inventories')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  `)
  
  // Contagem de índices
  const indexCount = await getRows(`
    SELECT COUNT(*) as count
    FROM pg_indexes 
    WHERE schemaname = 'public'
      AND indexname NOT LIKE 'pg_%'
  `)
  
  res.json({
    success: true,
    data: {
      tableStats,
      totalCustomIndexes: parseInt(indexCount[0].count),
      timestamp: new Date().toISOString()
    }
  })
}))

// Função para gerar recomendações baseadas na análise
function generateRecommendations(analysis) {
  const recommendations = []
  
  // Recomendações baseadas em queries lentas
  if (analysis.slowQueries?.length > 0) {
    recommendations.push({
      type: 'slow_queries',
      severity: 'high',
      message: `${analysis.slowQueries.length} queries lentas detectadas`,
      action: 'Considere otimizar as queries mais frequentes ou criar índices específicos'
    })
  }
  
  // Recomendações baseadas em índices não utilizados
  if (analysis.indexUsage?.unusedIndexes?.length > 0) {
    recommendations.push({
      type: 'unused_indexes',
      severity: 'medium',
      message: `${analysis.indexUsage.unusedIndexes.length} índices não utilizados encontrados`,
      action: 'Considere remover índices não utilizados para economizar espaço'
    })
  }
  
  // Recomendações baseadas em tabelas que precisam de manutenção
  if (analysis.tableStats?.needMaintenance?.length > 0) {
    recommendations.push({
      type: 'table_maintenance',
      severity: 'medium',
      message: `${analysis.tableStats.needMaintenance.length} tabelas precisam de manutenção`,
      action: 'Execute VACUUM/ANALYZE nas tabelas indicadas'
    })
  }
  
  // Recomendações baseadas em novos índices sugeridos
  if (analysis.indexSuggestions?.length > 0) {
    recommendations.push({
      type: 'new_indexes',
      severity: 'medium',
      message: `${analysis.indexSuggestions.length} novos índices recomendados`,
      action: 'Considere criar os índices sugeridos para melhorar a performance'
    })
  }
  
  return recommendations
}

// Função para gerar resumo da otimização
function generateOptimizationSummary(optimization) {
  const summary = {
    indexesCreated: optimization.indexCreation?.created || 0,
    indexesSkipped: optimization.indexCreation?.skipped || 0,
    indexesFailed: optimization.indexCreation?.failed || 0,
    unusedIndexesFound: optimization.unusedIndexes?.indexes?.length || 0,
    tablesMaintenanced: optimization.tableMaintenance?.maintained || 0,
    totalDuration: optimization.totalDuration,
    recommendations: []
  }
  
  if (summary.indexesCreated > 0) {
    summary.recommendations.push(
      `✅ ${summary.indexesCreated} novos índices criados com sucesso`
    )
  }
  
  if (summary.indexesFailed > 0) {
    summary.recommendations.push(
      `⚠️ ${summary.indexesFailed} índices falharam ao ser criados - verifique os logs`
    )
  }
  
  if (summary.unusedIndexesFound > 0) {
    summary.recommendations.push(
      `🔍 ${summary.unusedIndexesFound} índices não utilizados encontrados - considere removê-los`
    )
  }
  
  if (summary.tablesMaintenanced > 0) {
    summary.recommendations.push(
      `🧹 ${summary.tablesMaintenanced} tabelas receberam manutenção (ANALYZE)`
    )
  }
  
  return summary
}

export default router
