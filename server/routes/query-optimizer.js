/**
 * Rotas para Otimização de Queries
 */

import express from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { queryOptimizer } from '../services/query-optimizer.js'
import { logError, logInfo } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)

/**
 * GET /api/query-optimizer/stats
 * Obter estatísticas de queries
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = queryOptimizer.getQueryStats()
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logError('Erro ao obter estatísticas de queries', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

/**
 * POST /api/query-optimizer/analyze
 * Analisar query específica
 */
router.post('/analyze', requireAdmin, async (req, res) => {
  try {
    const { sql, params = [] } = req.body
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query é obrigatório'
      })
    }
    
    const analysis = await queryOptimizer.suggestOptimizations(sql, params)
    
    logInfo('Query analyzed by admin', { 
      adminId: req.user.id,
      executionTime: analysis.executionTime,
      suggestionsCount: analysis.suggestions.length
    })
    
    res.json({
      success: true,
      analysis
    })
  } catch (error) {
    logError('Erro ao analisar query', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao analisar query',
      details: error.message
    })
  }
})

/**
 * GET /api/query-optimizer/slow-queries
 * Obter queries lentas
 */
router.get('/slow-queries', requireAdmin, async (req, res) => {
  try {
    const slowQueries = await queryOptimizer.analyzeSlowQueries()
    
    res.json({
      success: true,
      slowQueries,
      threshold: queryOptimizer.slowQueryThreshold,
      count: slowQueries.length
    })
  } catch (error) {
    logError('Erro ao obter queries lentas', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

/**
 * POST /api/query-optimizer/system-analysis
 * Executar análise completa do sistema
 */
router.post('/system-analysis', requireAdmin, async (req, res) => {
  try {
    const startTime = Date.now()
    
    const analysisResults = await queryOptimizer.runSystemAnalysis()
    
    const duration = Date.now() - startTime
    
    logInfo('System analysis completed by admin', {
      adminId: req.user.id,
      duration,
      queriesAnalyzed: analysisResults.length
    })
    
    res.json({
      success: true,
      analysis: analysisResults,
      duration,
      summary: {
        queriesAnalyzed: analysisResults.length,
        avgExecutionTime: analysisResults.reduce((sum, r) => sum + r.executionTime, 0) / analysisResults.length,
        totalSuggestions: analysisResults.reduce((sum, r) => sum + r.suggestions.length, 0)
      }
    })
  } catch (error) {
    logError('Erro na análise do sistema', error)
    res.status(500).json({
      success: false,
      error: 'Erro na análise do sistema'
    })
  }
})

/**
 * POST /api/query-optimizer/clear-stats
 * Limpar estatísticas de queries
 */
router.post('/clear-stats', requireAdmin, async (req, res) => {
  try {
    queryOptimizer.clearStats()
    
    logInfo('Query statistics cleared by admin', {
      adminId: req.user.id
    })
    
    res.json({
      success: true,
      message: 'Estatísticas limpas com sucesso'
    })
  } catch (error) {
    logError('Erro ao limpar estatísticas', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

/**
 * GET /api/query-optimizer/recommendations
 * Obter recomendações de otimização
 */
router.get('/recommendations', requireAdmin, async (req, res) => {
  try {
    const stats = queryOptimizer.getQueryStats()
    const recommendations = []
    
    // Analisar queries lentas e gerar recomendações
    for (const slowQuery of stats.slowQueries) {
      if (slowQuery.avgTime > 200) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          query: slowQuery.sql,
          issue: `Query execution time: ${slowQuery.avgTime.toFixed(2)}ms`,
          recommendation: 'Consider adding database indexes or optimizing WHERE clauses',
          impact: 'High - affects user experience',
          executions: slowQuery.count
        })
      }
    }
    
    // Recomendações baseadas no volume de queries
    if (stats.summary.totalExecutions > 10000) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        issue: `High query volume: ${stats.summary.totalExecutions} executions`,
        recommendation: 'Implement query result caching for frequently accessed data',
        impact: 'Medium - reduces database load'
      })
    }
    
    // Recomendações baseadas na porcentagem de queries lentas
    const slowPercentage = parseFloat(stats.summary.slowQueriesPercentage)
    if (slowPercentage > 20) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        issue: `${slowPercentage}% of queries are slow`,
        recommendation: 'Review database schema and add missing indexes',
        impact: 'High - significant performance improvement'
      })
    }
    
    res.json({
      success: true,
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        mediumPriority: recommendations.filter(r => r.priority === 'medium').length
      }
    })
  } catch (error) {
    logError('Erro ao gerar recomendações', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

/**
 * POST /api/query-optimizer/explain
 * Executar EXPLAIN em uma query
 */
router.post('/explain', requireAdmin, async (req, res) => {
  try {
    const { sql, params = [], analyze = false } = req.body
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query é obrigatório'
      })
    }
    
    const result = await queryOptimizer.executeWithAnalysis(sql, params, {
      explain: !analyze,
      analyze: analyze
    })
    
    logInfo('EXPLAIN executed by admin', {
      adminId: req.user.id,
      analyze,
      executionTime: result.executionTime
    })
    
    res.json({
      success: true,
      executionPlan: result.executionPlan,
      executionTime: result.executionTime,
      rowCount: result.rowCount,
      analyzed: analyze
    })
  } catch (error) {
    logError('Erro ao executar EXPLAIN', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao executar EXPLAIN',
      details: error.message
    })
  }
})

export default router
