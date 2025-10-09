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

export default router

