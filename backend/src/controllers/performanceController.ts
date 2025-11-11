/**
 * Controller para métricas de performance
 */

import { Request, Response } from 'express';
import { metricsCollector } from '../config/metrics';
import { getDatabaseStats } from '../config/database';
import { logError } from '../config/logger';

/**
 * GET /api/performance/metrics
 * Retorna métricas de performance do sistema
 */
export const getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const systemMetrics = await metricsCollector.getCurrentSystemMetrics();
    const applicationMetrics = await metricsCollector.getCurrentApplicationMetrics();
    const dbStats = await getDatabaseStats();

    res.json({
      timestamp: Date.now(),
      system: systemMetrics,
      application: applicationMetrics,
      database: {
        connectionTime: dbStats.connectionTime,
        queryTime: dbStats.queryTime,
        activeConnections: dbStats.activeConnections,
      },
    });
  } catch (error) {
    logError('Erro ao obter métricas de performance', error);
    res.status(500).json({ error: 'Erro ao obter métricas' });
  }
};

/**
 * GET /api/performance/slow-queries
 * Retorna informações sobre queries lentas
 */
export const getSlowQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obter métricas do banco de dados
    const dbStats = await getDatabaseStats();
    
    res.json({
      slowQueries: dbStats.slowQueries || 0,
      averageQueryTime: dbStats.averageQueryTime || 0,
      totalQueries: dbStats.totalQueries || 0,
      recommendations: dbStats.recommendations || [],
    });
  } catch (error) {
    logError('Erro ao obter informações de queries lentas', error);
    res.status(500).json({ error: 'Erro ao obter informações' });
  }
};

/**
 * GET /api/performance/health
 * Health check com métricas de performance
 */
export const getPerformanceHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const systemMetrics = await metricsCollector.getCurrentSystemMetrics();
    const dbStats = await getDatabaseStats();

    if (!systemMetrics) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Métricas não disponíveis',
      });
      return;
    }

    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      checks: {
        memory: systemMetrics.memory.percentage < 90 ? 'ok' : 'warning',
        cpu: systemMetrics.cpu.usage < 80 ? 'ok' : 'warning',
        database: dbStats.connectionTime < 1000 ? 'ok' : 'warning',
        redis: systemMetrics.redis.connected ? 'ok' : 'warning',
      },
      metrics: {
        memoryUsage: systemMetrics.memory.percentage,
        cpuUsage: systemMetrics.cpu.usage,
        databaseConnectionTime: dbStats.connectionTime,
        uptime: systemMetrics.uptime,
      },
    };

    // Determinar status geral
    const hasWarning = Object.values(health.checks).some(status => status === 'warning');
    const hasError = Object.values(health.checks).some(status => status === 'error');
    
    if (hasError) {
      health.status = 'unhealthy';
    } else if (hasWarning) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logError('Erro ao verificar health de performance', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Erro ao verificar health',
    });
  }
};

