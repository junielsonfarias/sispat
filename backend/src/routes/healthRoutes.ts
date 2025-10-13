import { Router } from 'express'
import {
  healthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
} from '../controllers/healthController'

const router = Router()

// Health checks (sem autenticação para monitoramento externo)
router.get('/', healthCheck)
router.get('/detailed', detailedHealthCheck)
router.get('/ready', readinessCheck)
router.get('/live', livenessCheck)

// ⭐ v2.1.0: Endpoint de métricas avançadas
// TEMPORARIAMENTE DESABILITADO PARA DEBUG
router.get('/metrics', async (req, res) => {
  res.json({
    message: 'Endpoint de métricas temporariamente desabilitado (em desenvolvimento)',
    status: 'ok'
  })
  // try {
  //   const { healthMonitor } = await import('../utils/health-monitor')
  //   const { databaseCircuit, externalAPICircuit, fileSystemCircuit } = await import('../utils/circuit-breaker')
  //   
  //   const current = healthMonitor.getCurrentMetrics()
  //   const stats = healthMonitor.getStats(60) // Última hora
  //   
  //   res.json({
  //     current,
  //     stats,
  //     circuits: {
  //       database: databaseCircuit.getState(),
  //       externalAPI: externalAPICircuit.getState(),
  //       filesystem: fileSystemCircuit.getState(),
  //     },
  //     history: healthMonitor.getMetricsHistory(15), // Últimos 15 minutos
  //   })
  // } catch (error) {
  //   console.error('Erro ao obter métricas:', error)
  //   res.status(500).json({ error: 'Erro ao obter métricas' })
  // }
})

export default router

