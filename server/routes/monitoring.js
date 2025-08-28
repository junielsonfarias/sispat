import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import systemMonitor from '../services/monitoring/systemMonitor.js';
import { logInfo } from '../utils/logger.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas de monitoramento
router.use(authenticateToken);

/**
 * @swagger
 * /api/monitoring/health:
 *   get:
 *     summary: Verificar saúde do sistema
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de saúde do sistema
 */
router.get('/health', async (req, res) => {
  try {
    const health = await systemMonitor.getSystemHealth();

    logInfo('Health check realizado', {
      status: health.status,
      score: health.score,
      userId: req.user?.id,
    });

    res.json(health);
  } catch (error) {
    logInfo('Erro no health check', { error: error.message });
    res.status(500).json({
      error: 'Erro ao verificar saúde do sistema',
      code: 'HEALTH_CHECK_ERROR',
    });
  }
});

/**
 * @swagger
 * /api/monitoring/metrics:
 *   get:
 *     summary: Obter métricas do sistema
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do sistema
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = systemMonitor.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter métricas',
      code: 'METRICS_ERROR',
    });
  }
});

/**
 * @swagger
 * /api/monitoring/alerts:
 *   get:
 *     summary: Listar alertas ativos
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas
 */
router.get('/alerts', (req, res) => {
  try {
    const health = systemMonitor.getSystemHealth();

    res.json({
      success: true,
      data: health.alerts,
      count: health.alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter alertas',
      code: 'ALERTS_ERROR',
    });
  }
});

/**
 * @swagger
 * /api/monitoring/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Reconhecer alerta
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerta reconhecido
 */
router.post('/alerts/:alertId/acknowledge', (req, res) => {
  try {
    const { alertId } = req.params;

    systemMonitor.acknowledgeAlert(alertId);

    res.json({
      success: true,
      message: 'Alerta reconhecido com sucesso',
      alertId,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao reconhecer alerta',
      code: 'ACKNOWLEDGE_ERROR',
    });
  }
});

/**
 * @swagger
 * /api/monitoring/metrics/clear:
 *   post:
 *     summary: Limpar métricas
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas limpas
 */
router.post('/metrics/clear', (req, res) => {
  try {
    systemMonitor.clearMetrics();

    res.json({
      success: true,
      message: 'Métricas limpas com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao limpar métricas',
      code: 'CLEAR_METRICS_ERROR',
    });
  }
});

export default router;
