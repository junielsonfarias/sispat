import { logInfo, logWarning } from '@/utils/logger';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: number;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  rowsAffected?: number;
  cached: boolean;
}

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  estimatedTimeReduction: number;
}

class QueryOptimizer {
  private queryHistory = new Map<string, QueryMetrics[]>();
  private slowQueryThreshold = 1000; // 1 segundo
  private optimizationCache = new Map<string, QueryOptimization>();

  /**
   * Analisa e otimiza uma query antes da execução
   */
  analyzeQuery(query: string, params: any[] = []): QueryOptimization | null {
    const queryHash = this.hashQuery(query);
    
    // Verificar cache de otimizações
    if (this.optimizationCache.has(queryHash)) {
      return this.optimizationCache.get(queryHash)!;
    }

    const optimization = this.performQueryAnalysis(query, params);
    
    if (optimization) {
      this.optimizationCache.set(queryHash, optimization);
    }

    return optimization;
  }

  /**
   * Registra métricas de execução de uma query
   */
  recordQueryExecution(
    query: string,
    executionTime: number,
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    rowsAffected?: number,
    cached: boolean = false
  ): void {
    const metrics: QueryMetrics = {
      query,
      executionTime,
      timestamp: Date.now(),
      table,
      operation,
      rowsAffected: rowsAffected || 0,
      cached,
    };

    const queryHash = this.hashQuery(query);
    if (!this.queryHistory.has(queryHash)) {
      this.queryHistory.set(queryHash, []);
    }

    this.queryHistory.get(queryHash)!.push(metrics);

    // Alertar sobre queries lentas
    if (executionTime > this.slowQueryThreshold) {
      logWarning('Query lenta detectada', {
        query: query.substring(0, 100) + '...',
        executionTime,
        table,
        operation,
      });
    }

    // Manter apenas as últimas 100 execuções por query
    const history = this.queryHistory.get(queryHash)!;
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Gera relatório de performance das queries
   */
  generatePerformanceReport(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: QueryMetrics[];
    topTables: Array<{ table: string; count: number; avgTime: number }>;
    recommendations: string[];
  } {
    const allMetrics: QueryMetrics[] = [];
    const tableStats = new Map<string, { count: number; totalTime: number }>();

    // Coletar todas as métricas
    for (const history of this.queryHistory.values()) {
      allMetrics.push(...history);
    }

    // Calcular estatísticas por tabela
    for (const metric of allMetrics) {
      const stats = tableStats.get(metric.table) || { count: 0, totalTime: 0 };
      stats.count++;
      stats.totalTime += metric.executionTime;
      tableStats.set(metric.table, stats);
    }

    // Identificar queries lentas
    const slowQueries = allMetrics.filter(m => m.executionTime > this.slowQueryThreshold);

    // Calcular top tabelas
    const topTables = Array.from(tableStats.entries())
      .map(([table, stats]) => ({
        table,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Gerar recomendações
    const recommendations = this.generateRecommendations(allMetrics, topTables);

    return {
      totalQueries: allMetrics.length,
      averageExecutionTime: allMetrics.reduce((sum, m) => sum + m.executionTime, 0) / allMetrics.length,
      slowQueries,
      topTables,
      recommendations,
    };
  }

  /**
   * Otimiza queries SELECT comuns
   */
  private performQueryAnalysis(query: string, params: any[]): QueryOptimization | null {
    const upperQuery = query.toUpperCase().trim();
    const improvements: string[] = [];
    let optimizedQuery = query;
    let estimatedTimeReduction = 0;

    // Verificar se é uma query SELECT
    if (upperQuery.startsWith('SELECT')) {
      // Adicionar LIMIT se não existir
      if (!upperQuery.includes('LIMIT') && !upperQuery.includes('COUNT(')) {
        optimizedQuery += ' LIMIT 1000';
        improvements.push('Adicionado LIMIT 1000 para evitar retorno excessivo de dados');
        estimatedTimeReduction += 20;
      }

      // Verificar se há ORDER BY sem índice
      if (upperQuery.includes('ORDER BY') && !upperQuery.includes('INDEX')) {
        improvements.push('Considerar adicionar índices para campos de ordenação');
        estimatedTimeReduction += 15;
      }

      // Verificar se há WHERE sem índices
      if (upperQuery.includes('WHERE') && !upperQuery.includes('INDEX')) {
        improvements.push('Considerar adicionar índices para campos de filtro');
        estimatedTimeReduction += 25;
      }

      // Verificar se há SELECT *
      if (upperQuery.includes('SELECT *')) {
        improvements.push('Evitar SELECT *, especificar apenas colunas necessárias');
        estimatedTimeReduction += 10;
      }
    }

    // Verificar se é uma query INSERT
    if (upperQuery.startsWith('INSERT')) {
      // Verificar se há múltiplos VALUES
      const valuesCount = (upperQuery.match(/VALUES/g) || []).length;
      if (valuesCount > 1) {
        improvements.push('Considerar usar INSERT em lote para múltiplos registros');
        estimatedTimeReduction += 30;
      }
    }

    // Verificar se é uma query UPDATE
    if (upperQuery.startsWith('UPDATE')) {
      if (!upperQuery.includes('WHERE')) {
        improvements.push('⚠️ ATENÇÃO: UPDATE sem WHERE pode afetar todos os registros');
        estimatedTimeReduction += 50;
      }
    }

    // Verificar se é uma query DELETE
    if (upperQuery.startsWith('DELETE')) {
      if (!upperQuery.includes('WHERE')) {
        improvements.push('⚠️ ATENÇÃO: DELETE sem WHERE pode remover todos os registros');
        estimatedTimeReduction += 50;
      }
    }

    if (improvements.length === 0) {
      return null;
    }

    return {
      originalQuery: query,
      optimizedQuery,
      improvements,
      estimatedTimeReduction: Math.min(estimatedTimeReduction, 80), // Máximo 80% de redução
    };
  }

  /**
   * Gera recomendações baseadas nas métricas
   */
  private generateRecommendations(metrics: QueryMetrics[], topTables: any[]): string[] {
    const recommendations: string[] = [];

    // Analisar queries mais lentas
    const slowQueries = metrics.filter(m => m.executionTime > this.slowQueryThreshold);
    if (slowQueries.length > 0) {
      recommendations.push(`Identificadas ${slowQueries.length} queries lentas (>${this.slowQueryThreshold}ms)`);
    }

    // Analisar tabelas mais acessadas
    const mostAccessedTable = topTables[0];
    if (mostAccessedTable && mostAccessedTable.avgTime > 500) {
      recommendations.push(`Tabela ${mostAccessedTable.table} tem tempo médio alto (${mostAccessedTable.avgTime.toFixed(2)}ms)`);
    }

    // Verificar uso de cache
    const cachedQueries = metrics.filter(m => m.cached).length;
    const totalQueries = metrics.length;
    const cacheUsage = (cachedQueries / totalQueries) * 100;

    if (cacheUsage < 30) {
      recommendations.push('Baixo uso de cache, considerar implementar mais cache');
    }

    // Verificar operações de escrita
    const writeOperations = metrics.filter(m => m.operation !== 'SELECT').length;
    if (writeOperations > totalQueries * 0.3) {
      recommendations.push('Alto volume de operações de escrita, considerar otimizações');
    }

    return recommendations;
  }

  /**
   * Gera hash único para uma query
   */
  private hashQuery(query: string): string {
    return btoa(query).substring(0, 32);
  }

  /**
   * Limpa histórico antigo
   */
  cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

    for (const [queryHash, history] of this.queryHistory.entries()) {
      const filteredHistory = history.filter(m => m.timestamp > cutoffTime);
      if (filteredHistory.length === 0) {
        this.queryHistory.delete(queryHash);
      } else {
        this.queryHistory.set(queryHash, filteredHistory);
      }
    }

    // Limpar cache de otimizações antigo
    this.optimizationCache.clear();
  }
}

// Instância singleton
export const queryOptimizer = new QueryOptimizer();

// Limpar dados antigos periodicamente
setInterval(() => queryOptimizer.cleanup(), 60 * 60 * 1000); // 1 hora

export default QueryOptimizer;
