/**
 * Rotas administrativas para gerenciamento de cache
 */

import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { cacheManager } from '../services/cache-manager.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

/**
 * GET /api/cache-admin/stats
 * Obter estatísticas do cache
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = cacheManager.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Erro ao obter estatísticas do cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/cache-admin/clear
 * Limpar todo o cache
 */
router.post('/clear', requireAdmin, async (req, res) => {
  try {
    await cacheManager.flush();
    logInfo('Cache limpo por administrador', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Cache limpo com sucesso',
    });
  } catch (error) {
    logError('Erro ao limpar cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/cache-admin/invalidate
 * Invalidar cache por tipo
 */
router.post('/invalidate', requireAdmin, async (req, res) => {
  try {
    const { type, municipalityId, userId } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de cache é obrigatório',
      });
    }

    await cacheManager.invalidate(type, municipalityId, userId);
    logInfo('Cache invalidado por administrador', {
      type,
      municipalityId,
      userId,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: `Cache do tipo '${type}' invalidado com sucesso`,
    });
  } catch (error) {
    logError('Erro ao invalidar cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/cache-admin/key/:key
 * Obter valor específico do cache
 */
router.get('/key/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await cacheManager.get(key);

    res.json({
      success: true,
      key,
      value,
      found: value !== null,
    });
  } catch (error) {
    logError('Erro ao obter chave do cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * DELETE /api/cache-admin/key/:key
 * Remover chave específica do cache
 */
router.delete('/key/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    await cacheManager.delete(key);

    logInfo('Chave de cache removida por administrador', {
      key,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: `Chave '${key}' removida com sucesso`,
    });
  } catch (error) {
    logError('Erro ao remover chave do cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/cache-admin/warm-up
 * Pré-aquecer cache com dados frequentes
 */
router.post('/warm-up', requireAdmin, async (req, res) => {
  try {
    const { municipalityId } = req.body;
    const startTime = Date.now();

    // Importar função de aquecimento
    const { warmUpCache } = await import('../services/cache-warmup.js');

    await warmUpCache(municipalityId || req.user.municipality_id);

    const duration = Date.now() - startTime;
    logInfo('Cache aquecido por administrador', {
      municipalityId,
      duration,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Cache aquecido com sucesso',
      duration: `${duration}ms`,
    });
  } catch (error) {
    logError('Erro ao aquecer cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/cache-admin/health
 * Verificar saúde do sistema de cache
 */
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const stats = cacheManager.getStats();
    const health = {
      status: 'healthy',
      redis: cacheManager.isRedisAvailable,
      cacheType: stats.cacheType,
      hitRate: parseFloat(stats.hitRate),
      memorySize: stats.memorySize,
      errors: stats.errors,
      timestamp: new Date().toISOString(),
    };

    // Determinar status baseado nas métricas
    if (stats.errors > 10) {
      health.status = 'degraded';
    }

    if (parseFloat(stats.hitRate) < 30 && stats.hits + stats.misses > 100) {
      health.status = 'degraded';
    }

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    logError('Erro ao verificar saúde do cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/cache-admin/reset-stats
 * Resetar estatísticas do cache
 */
router.post('/reset-stats', requireAdmin, async (req, res) => {
  try {
    cacheManager.clearStats();
    logInfo('Estatísticas do cache resetadas por administrador', {
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Estatísticas resetadas com sucesso',
    });
  } catch (error) {
    logError('Erro ao resetar estatísticas do cache', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
