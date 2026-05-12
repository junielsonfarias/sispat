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

// O endpoint completo de métricas (com healthMonitor + circuit breakers + histórico)
// vive em '/api/metrics/*' (metricsRoutes.ts). Aqui só mantemos um stub leve
// para compatibilidade com consumidores que apontavam para /api/health/metrics.
router.get('/metrics', (_req, res) => {
  res.status(308).json({
    message: 'Movido para /api/metrics — use o endpoint dedicado',
    redirect: '/api/metrics/summary',
  })
})

export default router

