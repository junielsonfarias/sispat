import { Router } from 'express'
import { authenticateToken, authorize } from '../middlewares/auth'
import { metricsCollector } from '../config/metrics'
import { alertManager } from '../config/alerts'

const router = Router()

/**
 * Todas as rotas requerem autenticação
 */
router.use(authenticateToken)

/**
 * @route GET /api/metrics/system
 * @desc Obter métricas atuais do sistema
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/system', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const metrics = await metricsCollector.getCurrentSystemMetrics()
    
    if (!metrics) {
      return res.status(404).json({ error: 'Métricas não disponíveis' })
    }

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao obter métricas do sistema:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route GET /api/metrics/application
 * @desc Obter métricas da aplicação
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/application', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const metrics = await metricsCollector.getCurrentApplicationMetrics()
    
    if (!metrics) {
      return res.status(404).json({ error: 'Métricas não disponíveis' })
    }

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao obter métricas da aplicação:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route GET /api/metrics/summary
 * @desc Obter resumo completo das métricas
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/summary', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const summary = await metricsCollector.getMetricsSummary()
    
    if (!summary) {
      return res.status(404).json({ error: 'Resumo não disponível' })
    }

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao obter resumo das métricas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route GET /api/metrics/history
 * @desc Obter histórico de métricas
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/history', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    const history = await metricsCollector.getMetricsHistory(limit)

    res.json({
      success: true,
      data: history,
      count: history.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao obter histórico de métricas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route GET /api/metrics/health
 * @desc Obter status de saúde do sistema
 * @access Private (All authenticated users)
 */
router.get('/health', async (req, res) => {
  try {
    const summary = await metricsCollector.getMetricsSummary()
    
    if (!summary) {
      return res.status(503).json({ 
        status: 'unhealthy',
        message: 'Sistema não está respondendo adequadamente'
      })
    }

    const healthScore = summary.health
    let status = 'healthy'
    
    if (healthScore < 50) status = 'critical'
    else if (healthScore < 70) status = 'warning'
    else if (healthScore < 90) status = 'degraded'

    res.json({
      status,
      score: healthScore,
      timestamp: new Date().toISOString(),
      details: {
        memory: summary.system.memory.percentage,
        responseTime: summary.system.api.avgResponseTime,
        errorRate: summary.system.api.requests > 0 
          ? (summary.system.api.errors / summary.system.api.requests) * 100 
          : 0,
        uptime: summary.system.uptime
      }
    })
  } catch (error) {
    console.error('Erro ao verificar saúde do sistema:', error)
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao verificar saúde do sistema'
    })
  }
})

/**
 * @route GET /api/metrics/alerts
 * @desc Obter alertas ativos
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/alerts', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const alerts = await alertManager.getActiveAlerts()
    const stats = await alertManager.getAlertStats()

    res.json({
      success: true,
      data: {
        active: alerts,
        stats
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao obter alertas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route POST /api/metrics/alerts/:alertId/resolve
 * @desc Resolver alerta específico
 * @access Private (Admin/Supervisor/Superuser)
 */
router.post('/alerts/:alertId/resolve', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const { alertId } = req.params
    
    // Implementar lógica para resolver alerta específico
    // Por enquanto, apenas log
    console.log(`Resolvendo alerta: ${alertId}`)

    res.json({
      success: true,
      message: 'Alerta resolvido com sucesso',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao resolver alerta:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @route GET /api/metrics/export
 * @desc Exportar métricas para análise
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/export', authorize('admin', 'supervisor', 'superuser'), async (req, res) => {
  try {
    const format = req.query.format as string || 'json'
    const hours = parseInt(req.query.hours as string) || 24
    
    const history = await metricsCollector.getMetricsHistory(1000) // Últimas 1000 medições
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    const filteredHistory = history.filter(m => m.timestamp >= cutoff)

    if (format === 'csv') {
      // Gerar CSV
      const csv = generateMetricsCSV(filteredHistory)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv')
      res.send(csv)
    } else {
      // Retornar JSON
      res.json({
        success: true,
        data: filteredHistory,
        count: filteredHistory.length,
        period: `${hours} horas`,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Erro ao exportar métricas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * Gerar CSV das métricas
 */
function generateMetricsCSV(metrics: any[]): string {
  if (metrics.length === 0) return 'timestamp,cpu_usage,memory_percentage,response_time,requests,errors\n'

  const headers = [
    'timestamp',
    'cpu_usage',
    'memory_percentage',
    'response_time',
    'requests',
    'errors',
    'uptime'
  ].join(',')

  const rows = metrics.map(m => [
    new Date(m.timestamp).toISOString(),
    m.cpu.usage.toFixed(2),
    m.memory.percentage.toFixed(2),
    m.api.avgResponseTime.toFixed(2),
    m.api.requests,
    m.api.errors,
    m.uptime.toFixed(2)
  ].join(','))

  return [headers, ...rows].join('\n')
}

export default router
