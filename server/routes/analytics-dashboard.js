/**
 * Rotas para Dashboard de Analytics em Tempo Real
 */

import express from 'express'
import { authenticateToken, requireAdmin, requireSupervisor } from '../middleware/auth.js'
import { analyticsEngine } from '../services/analytics-engine.js'
import { logError, logInfo } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)

/**
 * GET /api/analytics/dashboard
 * Obter dados do dashboard principal
 */
router.get('/dashboard', requireSupervisor, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query
    
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const dashboardData = analyticsEngine.getDashboardData(municipalityId, timeRange)

    res.json({
      success: true,
      data: dashboardData,
      timeRange,
      municipalityId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logError('Failed to get dashboard data', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do dashboard'
    })
  }
})

/**
 * GET /api/analytics/metrics/:type
 * Obter métricas específicas por tipo
 */
router.get('/metrics/:type', requireSupervisor, async (req, res) => {
  try {
    const { type } = req.params
    const { timeRange = '1h' } = req.query
    
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const metrics = analyticsEngine.getMetrics(type, municipalityId, timeRange)

    res.json({
      success: true,
      type,
      metrics,
      timeRange,
      count: metrics.length
    })
  } catch (error) {
    logError('Failed to get metrics', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar métricas'
    })
  }
})

/**
 * GET /api/analytics/kpis
 * Obter KPIs principais
 */
router.get('/kpis', requireSupervisor, async (req, res) => {
  try {
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const kpis = await calculateKPIs(municipalityId)

    res.json({
      success: true,
      kpis,
      municipalityId,
      calculatedAt: new Date().toISOString()
    })
  } catch (error) {
    logError('Failed to calculate KPIs', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular KPIs'
    })
  }
})

/**
 * GET /api/analytics/alerts
 * Obter alertas ativos
 */
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    const { acknowledged = 'false' } = req.query
    
    const alerts = Array.from(analyticsEngine.alerts.values())
      .filter(alert => {
        if (acknowledged === 'true') return alert.acknowledged
        if (acknowledged === 'false') return !alert.acknowledged
        return true // 'all'
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    res.json({
      success: true,
      alerts,
      count: alerts.length
    })
  } catch (error) {
    logError('Failed to get alerts', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alertas'
    })
  }
})

/**
 * POST /api/analytics/alerts/:alertId/acknowledge
 * Reconhecer alerta
 */
router.post('/alerts/:alertId/acknowledge', requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params
    
    const acknowledged = analyticsEngine.acknowledgeAlert(alertId, req.user.id)
    
    if (acknowledged) {
      logInfo('Alert acknowledged by admin', {
        alertId,
        adminId: req.user.id
      })

      res.json({
        success: true,
        message: 'Alerta reconhecido com sucesso'
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      })
    }
  } catch (error) {
    logError('Failed to acknowledge alert', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao reconhecer alerta'
    })
  }
})

/**
 * GET /api/analytics/system-health
 * Obter saúde geral do sistema
 */
router.get('/system-health', requireAdmin, async (req, res) => {
  try {
    const systemHealth = analyticsEngine.getMetrics('system_health', null, '1h')
    const performanceMetrics = analyticsEngine.getMetrics('performance_metrics', null, '1h')
    
    const latest = systemHealth.length > 0 ? systemHealth[systemHealth.length - 1] : null
    const latestPerf = performanceMetrics.length > 0 ? performanceMetrics[performanceMetrics.length - 1] : null

    const health = {
      overall: latest ? latest.value : 0,
      details: latest ? latest.metadata : {},
      performance: latestPerf ? latestPerf.metadata : {},
      status: latest ? getHealthStatus(latest.value) : 'unknown',
      lastUpdate: latest ? latest.timestamp : null
    }

    res.json({
      success: true,
      health
    })
  } catch (error) {
    logError('Failed to get system health', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar saúde do sistema'
    })
  }
})

/**
 * GET /api/analytics/real-time-stats
 * Obter estatísticas em tempo real
 */
router.get('/real-time-stats', requireSupervisor, async (req, res) => {
  try {
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const stats = await getRealTimeStats(municipalityId)

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logError('Failed to get real-time stats', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas em tempo real'
    })
  }
})

/**
 * GET /api/analytics/trends
 * Obter análise de tendências
 */
router.get('/trends', requireSupervisor, async (req, res) => {
  try {
    const { period = '7d' } = req.query
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const trends = await analyzeTrends(municipalityId, period)

    res.json({
      success: true,
      trends,
      period
    })
  } catch (error) {
    logError('Failed to analyze trends', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao analisar tendências'
    })
  }
})

/**
 * GET /api/analytics/export
 * Exportar dados de analytics
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { 
      type = 'all', 
      format = 'json', 
      timeRange = '24h' 
    } = req.query
    
    const municipalityId = req.user.role === 'superuser' 
      ? req.query.municipality_id 
      : req.user.municipality_id

    const exportData = await exportAnalyticsData(type, municipalityId, timeRange)

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"')
      res.send(convertToCSV(exportData))
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.json"')
      res.json(exportData)
    }

    logInfo('Analytics data exported', {
      type,
      format,
      timeRange,
      userId: req.user.id
    })
  } catch (error) {
    logError('Failed to export analytics data', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar dados'
    })
  }
})

/**
 * GET /api/analytics/stats
 * Obter estatísticas do motor de analytics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = analyticsEngine.getStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    logError('Failed to get analytics stats', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas'
    })
  }
})

/**
 * POST /api/analytics/custom-metric
 * Registrar métrica customizada
 */
router.post('/custom-metric', requireAdmin, async (req, res) => {
  try {
    const {
      type,
      value,
      metadata = {}
    } = req.body

    if (!type || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e valor são obrigatórios'
      })
    }

    await analyticsEngine.recordMetric(
      `custom_${type}`,
      value,
      req.user.municipality_id,
      { ...metadata, createdBy: req.user.id }
    )

    logInfo('Custom metric recorded', {
      type,
      value,
      userId: req.user.id
    })

    res.json({
      success: true,
      message: 'Métrica customizada registrada com sucesso'
    })
  } catch (error) {
    logError('Failed to record custom metric', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar métrica customizada'
    })
  }
})

/**
 * Calcular KPIs principais
 */
async function calculateKPIs(municipalityId) {
  try {
    // KPIs de patrimônios
    const patrimonyMetrics = analyticsEngine.getMetrics('patrimony_stats', municipalityId, '24h')
    const latestPatrimony = patrimonyMetrics.length > 0 
      ? patrimonyMetrics[patrimonyMetrics.length - 1] 
      : null

    // KPIs de usuários
    const userMetrics = analyticsEngine.getMetrics('user_activity', municipalityId, '24h')
    const latestUsers = userMetrics.length > 0 
      ? userMetrics[userMetrics.length - 1] 
      : null

    // KPIs de transferências
    const transferMetrics = analyticsEngine.getMetrics('transfer_activity', municipalityId, '24h')
    const latestTransfers = transferMetrics.length > 0 
      ? transferMetrics[transferMetrics.length - 1] 
      : null

    return {
      patrimony: {
        total: latestPatrimony?.metadata.total || 0,
        active: latestPatrimony?.metadata.active || 0,
        newToday: latestPatrimony?.metadata.newToday || 0,
        totalValue: latestPatrimony?.metadata.totalValue || 0,
        trend: analyticsEngine.calculateTrend(patrimonyMetrics.map(m => m.value))
      },
      users: {
        activityRate: latestUsers?.value || 0,
        activeUsers: latestUsers?.metadata.activeUsers || 0,
        totalUsers: latestUsers?.metadata.totalUsers || 0,
        trend: analyticsEngine.calculateTrend(userMetrics.map(m => m.value))
      },
      transfers: {
        today: latestTransfers?.metadata.today || 0,
        week: latestTransfers?.metadata.week || 0,
        pending: latestTransfers?.metadata.pending || 0,
        trend: analyticsEngine.calculateTrend(transferMetrics.map(m => m.value))
      }
    }
  } catch (error) {
    logError('Failed to calculate KPIs', error)
    throw error
  }
}

/**
 * Obter estatísticas em tempo real
 */
async function getRealTimeStats(municipalityId) {
  // Simular dados em tempo real
  return {
    onlineUsers: Math.floor(Math.random() * 50) + 10,
    activeProcesses: Math.floor(Math.random() * 20) + 5,
    systemLoad: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    requestsPerMinute: Math.floor(Math.random() * 1000) + 200,
    responseTime: Math.floor(Math.random() * 500) + 100,
    errorRate: Math.random() * 2,
    cacheHitRate: 85 + Math.random() * 10
  }
}

/**
 * Analisar tendências
 */
async function analyzeTrends(municipalityId, period) {
  const trends = {}

  const metricTypes = ['patrimony_stats', 'user_activity', 'transfer_activity', 'system_health']

  for (const type of metricTypes) {
    const metrics = analyticsEngine.getMetrics(type, municipalityId, period)
    
    if (metrics.length > 1) {
      const values = metrics.map(m => m.value)
      const trend = analyticsEngine.calculateTrend(values)
      
      const first = values[0]
      const last = values[values.length - 1]
      const change = first !== 0 ? ((last - first) / first) * 100 : 0

      trends[type] = {
        direction: trend,
        change: change.toFixed(2),
        dataPoints: metrics.length,
        timeSpan: period
      }
    }
  }

  return trends
}

/**
 * Exportar dados de analytics
 */
async function exportAnalyticsData(type, municipalityId, timeRange) {
  const exportData = {
    exportedAt: new Date().toISOString(),
    type,
    municipalityId,
    timeRange,
    data: {}
  }

  if (type === 'all') {
    // Exportar todos os tipos de métricas
    const metricTypes = Object.values(analyticsEngine.metricTypes)
    
    for (const metricType of metricTypes) {
      const metrics = analyticsEngine.getMetrics(metricType, municipalityId, timeRange)
      exportData.data[metricType] = metrics
    }
  } else {
    // Exportar tipo específico
    const metrics = analyticsEngine.getMetrics(type, municipalityId, timeRange)
    exportData.data[type] = metrics
  }

  return exportData
}

/**
 * Converter dados para CSV
 */
function convertToCSV(data) {
  const rows = []
  
  // Header
  rows.push('Timestamp,Type,Value,Metadata')
  
  // Data rows
  Object.entries(data.data).forEach(([type, metrics]) => {
    metrics.forEach(metric => {
      rows.push([
        metric.timestamp,
        type,
        metric.value,
        JSON.stringify(metric.metadata)
      ].join(','))
    })
  })
  
  return rows.join('\n')
}

/**
 * Obter status da saúde baseado no valor
 */
function getHealthStatus(value) {
  if (value >= 90) return 'excellent'
  if (value >= 80) return 'good'
  if (value >= 60) return 'fair'
  if (value >= 40) return 'poor'
  return 'critical'
}

export default router
