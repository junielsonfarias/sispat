/**
 * Rotas para métricas de performance
 */

import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
import {
  getPerformanceMetrics,
  getSlowQueries,
  getPerformanceHealth,
} from '../controllers/performanceController';

const router = Router();

/**
 * Todas as rotas requerem autenticação
 */
router.use(authenticateToken);

/**
 * @route GET /api/performance/metrics
 * @desc Obter métricas de performance do sistema
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/metrics', authorize('admin', 'supervisor', 'superuser'), getPerformanceMetrics);

/**
 * @route GET /api/performance/slow-queries
 * @desc Obter informações sobre queries lentas
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/slow-queries', authorize('admin', 'supervisor', 'superuser'), getSlowQueries);

/**
 * @route GET /api/performance/health
 * @desc Health check com métricas de performance
 * @access Private (Admin/Supervisor/Superuser)
 */
router.get('/health', authorize('admin', 'supervisor', 'superuser'), getPerformanceHealth);

export default router;

