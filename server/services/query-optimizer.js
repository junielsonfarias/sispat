/**
 * Serviço de Otimização de Queries
 */

import { getRows } from '../database/connection.js'
import { logError, logInfo, logPerformance, logWarning } from '../utils/logger.js'

class QueryOptimizer {
  constructor() {
    this.slowQueryThreshold = 100 // ms
    this.slowQueries = new Map()
    this.queryStats = new Map()
  }

  /**
   * Executar query com análise de performance
   */
  async executeWithAnalysis(sql, params = [], options = {}) {
    const { analyze = false, explain = false, trackStats = true } = options
    const startTime = Date.now()
    
    try {
      let result
      let executionPlan = null
      
      // Executar EXPLAIN ANALYZE se solicitado
      if (analyze) {
        const analyzeQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`
        const planResult = await getRows(analyzeQuery, params)
        executionPlan = planResult[0]['QUERY PLAN'][0]
        
        logInfo('Query execution plan', {
          sql: sql.substring(0, 200),
          executionTime: executionPlan['Execution Time'],
          planningTime: executionPlan['Planning Time'],
          totalTime: executionPlan['Execution Time'] + executionPlan['Planning Time']
        })
      }
      
      // Executar EXPLAIN se solicitado
      if (explain && !analyze) {
        const explainQuery = `EXPLAIN (FORMAT JSON) ${sql}`
        const planResult = await getRows(explainQuery, params)
        executionPlan = planResult[0]['QUERY PLAN'][0]
      }
      
      // Executar query real
      result = await getRows(sql, params)
      
      const duration = Date.now() - startTime
      
      // Rastrear estatísticas
      if (trackStats) {
        this.trackQueryStats(sql, duration, result.length)
      }
      
      // Log de performance
      logPerformance(`Query executed`, duration, {
        rowCount: result.length,
        slow: duration > this.slowQueryThreshold,
        sql: sql.substring(0, 100)
      })
      
      return {
        data: result,
        executionTime: duration,
        executionPlan,
        rowCount: result.length
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      logError('Query execution failed', error, {
        sql: sql.substring(0, 200),
        duration
      })
      throw error
    }
  }

  /**
   * Rastrear estatísticas de queries
   */
  trackQueryStats(sql, duration, rowCount) {
    const queryKey = this.normalizeQuery(sql)
    
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        sql: sql.substring(0, 200),
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        totalRows: 0,
        avgRows: 0
      })
    }
    
    const stats = this.queryStats.get(queryKey)
    stats.count++
    stats.totalTime += duration
    stats.avgTime = stats.totalTime / stats.count
    stats.minTime = Math.min(stats.minTime, duration)
    stats.maxTime = Math.max(stats.maxTime, duration)
    stats.totalRows += rowCount
    stats.avgRows = stats.totalRows / stats.count
    
    // Marcar como query lenta se necessário
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.set(queryKey, {
        ...stats,
        lastSlowExecution: new Date(),
        slowExecutions: (this.slowQueries.get(queryKey)?.slowExecutions || 0) + 1
      })
    }
  }

  /**
   * Normalizar query para agrupamento
   */
  normalizeQuery(sql) {
    return sql
      .replace(/\$\d+/g, '?') // Substituir parâmetros
      .replace(/\s+/g, ' ') // Normalizar espaços
      .replace(/\d+/g, 'N') // Substituir números
      .trim()
      .toLowerCase()
  }

  /**
   * Analisar queries lentas
   */
  async analyzeSlowQueries() {
    const slowQueries = Array.from(this.slowQueries.entries())
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => b.avgTime - a.avgTime)
    
    logWarning('Slow queries detected', {
      count: slowQueries.length,
      threshold: this.slowQueryThreshold
    })
    
    for (const slowQuery of slowQueries.slice(0, 5)) {
      logWarning('Slow query analysis', {
        sql: slowQuery.sql,
        avgTime: slowQuery.avgTime,
        maxTime: slowQuery.maxTime,
        executions: slowQuery.count,
        slowExecutions: slowQuery.slowExecutions
      })
    }
    
    return slowQueries
  }

  /**
   * Obter estatísticas de queries
   */
  getQueryStats() {
    const allStats = Array.from(this.queryStats.entries())
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => b.totalTime - a.totalTime)
    
    const slowQueriesCount = this.slowQueries.size
    const totalQueries = this.queryStats.size
    const totalExecutions = allStats.reduce((sum, stat) => sum + stat.count, 0)
    
    return {
      summary: {
        totalQueries,
        totalExecutions,
        slowQueriesCount,
        slowQueriesPercentage: totalQueries > 0 ? (slowQueriesCount / totalQueries * 100).toFixed(2) : 0
      },
      topQueriesByTime: allStats.slice(0, 10),
      slowQueries: Array.from(this.slowQueries.values()).slice(0, 10)
    }
  }

  /**
   * Limpar estatísticas
   */
  clearStats() {
    this.queryStats.clear()
    this.slowQueries.clear()
    logInfo('Query statistics cleared')
  }

  /**
   * Sugerir otimizações para query
   */
  async suggestOptimizations(sql, params = []) {
    try {
      const result = await this.executeWithAnalysis(sql, params, { analyze: true })
      const plan = result.executionPlan
      
      const suggestions = []
      
      // Analisar plano de execução
      if (plan) {
        this.analyzePlan(plan.Plan, suggestions)
      }
      
      // Verificar tempo de execução
      if (result.executionTime > this.slowQueryThreshold) {
        suggestions.push({
          type: 'performance',
          severity: 'high',
          message: `Query execution time (${result.executionTime}ms) exceeds threshold (${this.slowQueryThreshold}ms)`,
          recommendation: 'Consider adding indexes or optimizing WHERE clauses'
        })
      }
      
      // Verificar número de linhas retornadas
      if (result.rowCount > 1000) {
        suggestions.push({
          type: 'pagination',
          severity: 'medium',
          message: `Query returns ${result.rowCount} rows`,
          recommendation: 'Consider implementing pagination to limit result set'
        })
      }
      
      return {
        executionTime: result.executionTime,
        rowCount: result.rowCount,
        suggestions,
        executionPlan: plan
      }
      
    } catch (error) {
      logError('Failed to analyze query', error)
      throw error
    }
  }

  /**
   * Analisar plano de execução recursivamente
   */
  analyzePlan(planNode, suggestions) {
    // Verificar Seq Scan em tabelas grandes
    if (planNode['Node Type'] === 'Seq Scan' && planNode['Plan Rows'] > 1000) {
      suggestions.push({
        type: 'index',
        severity: 'high',
        message: `Sequential scan on table ${planNode['Relation Name']} (${planNode['Plan Rows']} rows)`,
        recommendation: `Consider adding index on columns used in WHERE clause`
      })
    }
    
    // Verificar Nested Loop com muitas iterações
    if (planNode['Node Type'] === 'Nested Loop' && planNode['Plan Rows'] > 10000) {
      suggestions.push({
        type: 'join',
        severity: 'high',
        message: `Nested loop with high row count (${planNode['Plan Rows']})`,
        recommendation: 'Consider using Hash Join or Merge Join instead'
      })
    }
    
    // Verificar Sort operations custosas
    if (planNode['Node Type'] === 'Sort' && planNode['Plan Rows'] > 10000) {
      suggestions.push({
        type: 'sort',
        severity: 'medium',
        message: `Large sort operation (${planNode['Plan Rows']} rows)`,
        recommendation: 'Consider adding index on ORDER BY columns'
      })
    }
    
    // Analisar nós filhos recursivamente
    if (planNode.Plans) {
      planNode.Plans.forEach(childPlan => {
        this.analyzePlan(childPlan, suggestions)
      })
    }
  }

  /**
   * Executar análise automática de queries do sistema
   */
  async runSystemAnalysis() {
    logInfo('Starting system query analysis')
    
    const commonQueries = [
      // Query de patrimônios
      `SELECT p.*, s.name as setor_name, l.name as local_name 
       FROM patrimonios p 
       LEFT JOIN sectors s ON p.sector_id = s.id 
       LEFT JOIN locals l ON p.local_id = l.id 
       WHERE p.municipality_id = $1 
       ORDER BY p.created_at DESC`,
       
      // Query de usuários
      `SELECT u.*, m.name as municipality_name 
       FROM users u 
       LEFT JOIN municipalities m ON u.municipality_id = m.id 
       WHERE u.municipality_id = $1`,
       
      // Query de setores
      `SELECT s.*, p.name as parent_name 
       FROM sectors s 
       LEFT JOIN sectors p ON s.parent_id = p.id 
       WHERE s.municipality_id = $1`,
       
      // Query de relatórios
      `SELECT COUNT(*) as total, 
              SUM(valor_aquisicao) as valor_total,
              AVG(valor_aquisicao) as valor_medio
       FROM patrimonios 
       WHERE municipality_id = $1 
       AND created_at >= $2`
    ]
    
    const analysisResults = []
    
    for (const sql of commonQueries) {
      try {
        const analysis = await this.suggestOptimizations(sql, ['test-municipality-id', '2024-01-01'])
        analysisResults.push({
          sql: sql.substring(0, 100),
          ...analysis
        })
      } catch (error) {
        logError('Failed to analyze query', error, { sql: sql.substring(0, 100) })
      }
    }
    
    logInfo('System query analysis completed', {
      queriesAnalyzed: analysisResults.length,
      avgExecutionTime: analysisResults.reduce((sum, r) => sum + r.executionTime, 0) / analysisResults.length
    })
    
    return analysisResults
  }
}

// Instância singleton
export const queryOptimizer = new QueryOptimizer()

// Wrapper para executar queries com otimização automática
export async function executeOptimizedQuery(sql, params = [], options = {}) {
  return await queryOptimizer.executeWithAnalysis(sql, params, options)
}

// Middleware para análise automática de queries
export function queryAnalysisMiddleware(req, res, next) {
  const originalQuery = res.locals.query || req.query
  
  // Adicionar flag para análise se solicitado
  if (req.query.analyze === 'true') {
    res.locals.analyzeQuery = true
  }
  
  next()
}

export default queryOptimizer
