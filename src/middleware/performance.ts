import { Request, Response, NextFunction } from 'express';
import { logInfo, logWarning } from '@/utils/logger';
import { queryOptimizer } from '@/services/performance/queryOptimizer';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  queryCount: number;
  cacheHits: number;
  cacheMisses: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>();
  private slowRequestThreshold = 2000; // 2 segundos
  private highQueryThreshold = 10; // 10 queries por requisição

  /**
   * Middleware para monitorar performance das requisições
   */
  monitorRequest(req: Request, res: Response, next: NextFunction): void {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Inicializar métricas
    const metrics: PerformanceMetrics = {
      requestId,
      method: req.method,
      url: req.url,
      startTime,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id,
      queryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    this.metrics.set(requestId, metrics);

    // Adicionar requestId ao objeto req para uso posterior
    (req as any).requestId = requestId;

    // Interceptar finalização da resposta
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      metrics.endTime = endTime;
      metrics.duration = duration;
      metrics.statusCode = res.statusCode;

      // Registrar métricas
      this.recordMetrics(metrics);

      // Alertar sobre requisições lentas
      if (duration > this.slowRequestThreshold) {
        logWarning('Requisição lenta detectada', {
          requestId,
          method: metrics.method,
          url: metrics.url,
          duration,
          statusCode: metrics.statusCode,
          queryCount: metrics.queryCount,
        });
      }

      // Alertar sobre muitas queries
      if (metrics.queryCount > this.highQueryThreshold) {
        logWarning('Muitas queries em uma requisição', {
          requestId,
          method: metrics.method,
          url: metrics.url,
          queryCount: metrics.queryCount,
        });
      }

      // Chamar método original
      return originalEnd.apply(this, args);
    }.bind(this);

    next();
  }

  /**
   * Middleware para monitorar queries de banco de dados
   */
  monitorDatabaseQuery(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req as any).requestId;
    if (!requestId) {
      return next();
    }

    const metrics = this.metrics.get(requestId);
    if (!metrics) {
      return next();
    }

    // Interceptar queries de banco (se disponível)
    const originalQuery = (req as any).db?.query;
    if (originalQuery) {
      (req as any).db.query = async function (
        this: any,
        sql: string,
        params: any[] = []
      ) {
        const queryStartTime = Date.now();

        try {
          // Analisar query antes da execução
          const optimization = queryOptimizer.analyzeQuery(sql, params);
          if (optimization) {
            logInfo('Otimização de query sugerida', {
              requestId,
              improvements: optimization.improvements,
              estimatedTimeReduction: optimization.estimatedTimeReduction,
            });
          }

          // Executar query
          const result = await originalQuery.call(this, sql, params);

          const queryEndTime = Date.now();
          const executionTime = queryEndTime - queryStartTime;

          // Registrar execução da query
          queryOptimizer.recordQueryExecution(
            sql,
            executionTime,
            this.extractTableName(sql),
            this.extractOperation(sql),
            result.rowCount,
            false // TODO: Implementar detecção de cache
          );

          // Atualizar métricas da requisição
          metrics.queryCount++;

          return result;
        } catch (error) {
          const queryEndTime = Date.now();
          const executionTime = queryEndTime - queryStartTime;

          // Registrar query com erro
          queryOptimizer.recordQueryExecution(
            sql,
            executionTime,
            this.extractTableName(sql),
            this.extractOperation(sql),
            undefined,
            false
          );

          throw error;
        }
      };
    }

    next();
  }

  /**
   * Middleware para monitorar cache
   */
  monitorCache(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req as any).requestId;
    if (!requestId) {
      return next();
    }

    const metrics = this.metrics.get(requestId);
    if (!metrics) {
      return next();
    }

    // Interceptar operações de cache (se disponível)
    const originalCacheGet = (req as any).cache?.get;
    if (originalCacheGet) {
      (req as any).cache.get = async function (this: any, key: string) {
        const result = await originalCacheGet.call(this, key);

        if (result !== null) {
          metrics.cacheHits++;
        } else {
          metrics.cacheMisses++;
        }

        return result;
      };
    }

    next();
  }

  /**
   * Gera relatório de performance
   */
  generatePerformanceReport(): {
    totalRequests: number;
    averageResponseTime: number;
    slowRequests: PerformanceMetrics[];
    topEndpoints: Array<{ url: string; count: number; avgTime: number }>;
    cacheStats: { hits: number; misses: number; hitRate: number };
    queryStats: { totalQueries: number; avgQueriesPerRequest: number };
  } {
    const allMetrics = Array.from(this.metrics.values());
    const completedMetrics = allMetrics.filter(m => m.duration !== undefined);

    if (completedMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: [],
        topEndpoints: [],
        cacheStats: { hits: 0, misses: 0, hitRate: 0 },
        queryStats: { totalQueries: 0, avgQueriesPerRequest: 0 },
      };
    }

    // Calcular estatísticas por endpoint
    const endpointStats = new Map<
      string,
      { count: number; totalTime: number }
    >();
    for (const metric of completedMetrics) {
      const stats = endpointStats.get(metric.url) || { count: 0, totalTime: 0 };
      stats.count++;
      stats.totalTime += metric.duration!;
      endpointStats.set(metric.url, stats);
    }

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([url, stats]) => ({
        url,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Calcular estatísticas de cache
    const totalCacheHits = completedMetrics.reduce(
      (sum, m) => sum + m.cacheHits,
      0
    );
    const totalCacheMisses = completedMetrics.reduce(
      (sum, m) => sum + m.cacheMisses,
      0
    );
    const totalCacheRequests = totalCacheHits + totalCacheMisses;
    const cacheHitRate =
      totalCacheRequests > 0 ? (totalCacheHits / totalCacheRequests) * 100 : 0;

    // Calcular estatísticas de queries
    const totalQueries = completedMetrics.reduce(
      (sum, m) => sum + m.queryCount,
      0
    );
    const avgQueriesPerRequest =
      completedMetrics.length > 0 ? totalQueries / completedMetrics.length : 0;

    return {
      totalRequests: completedMetrics.length,
      averageResponseTime:
        completedMetrics.reduce((sum, m) => sum + m.duration!, 0) /
        completedMetrics.length,
      slowRequests: completedMetrics.filter(
        m => m.duration! > this.slowRequestThreshold
      ),
      topEndpoints,
      cacheStats: {
        hits: totalCacheHits,
        misses: totalCacheMisses,
        hitRate: cacheHitRate,
      },
      queryStats: {
        totalQueries,
        avgQueriesPerRequest,
      },
    };
  }

  /**
   * Registra métricas de uma requisição
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    // Manter apenas as últimas 1000 métricas
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    // Log de métricas para requisições importantes
    if (
      metrics.duration! > this.slowRequestThreshold ||
      metrics.queryCount > this.highQueryThreshold
    ) {
      logInfo('Métricas de performance', {
        requestId: metrics.requestId,
        method: metrics.method,
        url: metrics.url,
        duration: metrics.duration,
        statusCode: metrics.statusCode,
        queryCount: metrics.queryCount,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
      });
    }
  }

  /**
   * Gera ID único para requisição
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extrai nome da tabela de uma query SQL
   */
  private extractTableName(sql: string): string {
    const match =
      sql.match(/FROM\s+(\w+)/i) ||
      sql.match(/UPDATE\s+(\w+)/i) ||
      sql.match(/INSERT\s+INTO\s+(\w+)/i) ||
      sql.match(/DELETE\s+FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Extrai operação de uma query SQL
   */
  private extractOperation(
    sql: string
  ): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const upperSql = sql.toUpperCase().trim();
    if (upperSql.startsWith('SELECT')) return 'SELECT';
    if (upperSql.startsWith('INSERT')) return 'INSERT';
    if (upperSql.startsWith('UPDATE')) return 'UPDATE';
    if (upperSql.startsWith('DELETE')) return 'DELETE';
    return 'SELECT';
  }

  /**
   * Limpa métricas antigas
   */
  cleanup(): void {
    const cutoffTime = Date.now() - 60 * 60 * 1000; // 1 hora

    for (const [requestId, metrics] of this.metrics.entries()) {
      if (metrics.startTime < cutoffTime) {
        this.metrics.delete(requestId);
      }
    }
  }
}

// Instância singleton
export const performanceMonitor = new PerformanceMonitor();

// Limpar métricas antigas periodicamente
setInterval(() => performanceMonitor.cleanup(), 30 * 60 * 1000); // 30 minutos

export default PerformanceMonitor;
