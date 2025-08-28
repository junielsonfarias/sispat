import {
  dbQueryDuration,
  dbConnectionsActive,
  dbQueriesTotal,
  recordCustomMetric,
  DatabaseMetrics,
} from './performanceMetrics';

export interface QueryLog {
  id: string;
  query: string;
  duration: number;
  timestamp: number;
  parameters?: any[];
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  status: 'success' | 'error';
  error?: string;
  rowsAffected?: number;
  executionPlan?: any;
}

export interface SlowQueryAlert {
  id: string;
  query: string;
  duration: number;
  threshold: number;
  timestamp: number;
  frequency: number;
  table?: string;
  suggestions?: string[];
}

export interface DatabaseConnection {
  id: string;
  state: 'idle' | 'active' | 'waiting';
  startTime: number;
  lastQuery?: string;
  queries: number;
}

// Configurações do monitoramento
export interface DatabaseMonitoringConfig {
  slowQueryThreshold: number; // ms
  logAllQueries: boolean;
  maxLogSize: number;
  alertFrequencyThreshold: number; // quantas vezes uma query lenta deve aparecer para alertar
  enableExecutionPlan: boolean;
  connectionPoolMonitoring: boolean;
}

const DEFAULT_CONFIG: DatabaseMonitoringConfig = {
  slowQueryThreshold: 1000, // 1 segundo
  logAllQueries: false, // só queries lentas por padrão
  maxLogSize: 1000,
  alertFrequencyThreshold: 3,
  enableExecutionPlan: false, // requer privilégios especiais
  connectionPoolMonitoring: true,
};

// Classe principal para monitoramento de banco
export class DatabaseMonitor {
  private config: DatabaseMonitoringConfig;
  private queryLogs: QueryLog[] = [];
  private slowQueryAlerts: Map<string, SlowQueryAlert> = new Map();
  private connections: Map<string, DatabaseConnection> = new Map();
  private queryStats: Map<
    string,
    { count: number; totalDuration: number; errors: number }
  > = new Map();

  constructor(config: Partial<DatabaseMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicCleanup();
  }

  // Interceptar e monitorar query
  public async monitorQuery<T>(
    query: string,
    parameters: any[] = [],
    executor: () => Promise<T>,
    connectionId?: string
  ): Promise<T> {
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    const operation = this.extractOperation(query);
    const table = this.extractTableName(query);

    // Atualizar conexão ativa
    if (connectionId) {
      this.updateConnectionState(connectionId, 'active', query);
    }

    // Incrementar métricas
    dbConnectionsActive.inc();

    try {
      // Executar query
      const result = await executor();
      const duration = Date.now() - startTime;

      // Criar log da query
      const queryLog: QueryLog = {
        id: queryId,
        query: this.sanitizeQuery(query),
        duration,
        timestamp: startTime,
        parameters: this.sanitizeParameters(parameters),
        table,
        operation,
        status: 'success',
        rowsAffected: this.extractRowsAffected(result),
      };

      // Registrar métricas Prometheus
      dbQueryDuration.observe(
        { operation: operation.toLowerCase(), table: table || 'unknown' },
        duration / 1000
      );
      dbQueriesTotal.inc({
        operation: operation.toLowerCase(),
        table: table || 'unknown',
        status: 'success',
      });

      // Registrar métricas internas
      recordCustomMetric('db_query_duration', duration, {
        operation,
        table: table || 'unknown',
        query_id: queryId,
      });

      // Processar query
      this.processQuery(queryLog);

      // Atualizar estatísticas
      this.updateQueryStats(query, duration, false);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      // Criar log de erro
      const queryLog: QueryLog = {
        id: queryId,
        query: this.sanitizeQuery(query),
        duration,
        timestamp: startTime,
        parameters: this.sanitizeParameters(parameters),
        table,
        operation,
        status: 'error',
        error: errorMessage,
      };

      // Registrar métricas de erro
      dbQueriesTotal.inc({
        operation: operation.toLowerCase(),
        table: table || 'unknown',
        status: 'error',
      });
      recordCustomMetric('db_query_error', 1, {
        operation,
        table: table || 'unknown',
        error_type: this.categorizeError(errorMessage),
      });

      // Processar query com erro
      this.processQuery(queryLog);

      // Atualizar estatísticas
      this.updateQueryStats(query, duration, true);

      throw error;
    } finally {
      // Decrementar conexões ativas
      dbConnectionsActive.dec();

      // Atualizar conexão para idle
      if (connectionId) {
        this.updateConnectionState(connectionId, 'idle');
      }
    }
  }

  // Processar query após execução
  private processQuery(queryLog: QueryLog): void {
    // Adicionar ao log se necessário
    if (
      this.config.logAllQueries ||
      queryLog.duration > this.config.slowQueryThreshold
    ) {
      this.addQueryLog(queryLog);
    }

    // Verificar se é query lenta
    if (queryLog.duration > this.config.slowQueryThreshold) {
      this.handleSlowQuery(queryLog);
    }

    // Log detalhado para queries muito lentas
    if (queryLog.duration > this.config.slowQueryThreshold * 2) {
      console.warn('Very slow query detected:', {
        duration: `${queryLog.duration}ms`,
        query: `${queryLog.query.substring(0, 100)}...`,
        table: queryLog.table,
        operation: queryLog.operation,
        timestamp: new Date(queryLog.timestamp).toISOString(),
      });
    }
  }

  // Lidar com query lenta
  private handleSlowQuery(queryLog: QueryLog): void {
    const queryHash = this.hashQuery(queryLog.query);
    const existingAlert = this.slowQueryAlerts.get(queryHash);

    if (existingAlert) {
      // Incrementar frequência
      existingAlert.frequency++;
      existingAlert.timestamp = queryLog.timestamp;

      // Alertar se atingiu o threshold
      if (existingAlert.frequency >= this.config.alertFrequencyThreshold) {
        this.triggerSlowQueryAlert(existingAlert);
      }
    } else {
      // Criar novo alerta
      const alert: SlowQueryAlert = {
        id: this.generateAlertId(),
        query: queryLog.query,
        duration: queryLog.duration,
        threshold: this.config.slowQueryThreshold,
        timestamp: queryLog.timestamp,
        frequency: 1,
        table: queryLog.table,
        suggestions: this.generateOptimizationSuggestions(queryLog),
      };

      this.slowQueryAlerts.set(queryHash, alert);
    }

    // Registrar métrica de query lenta
    recordCustomMetric('db_slow_query_detected', 1, {
      table: queryLog.table || 'unknown',
      operation: queryLog.operation,
      duration_range: this.getDurationRange(queryLog.duration),
    });
  }

  // Gerar sugestões de otimização
  private generateOptimizationSuggestions(queryLog: QueryLog): string[] {
    const suggestions: string[] = [];
    const query = queryLog.query.toUpperCase();

    // Sugestões básicas baseadas na query
    if (query.includes('SELECT *')) {
      suggestions.push(
        'Evite SELECT *, especifique apenas as colunas necessárias'
      );
    }

    if (query.includes('WHERE') && !query.includes('INDEX')) {
      suggestions.push(
        'Considere adicionar índices nas colunas da cláusula WHERE'
      );
    }

    if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
      suggestions.push('Considere adicionar LIMIT para queries com ORDER BY');
    }

    if (query.includes('JOIN') && query.split('JOIN').length > 3) {
      suggestions.push(
        'Muitos JOINs podem impactar performance, considere desnormalização'
      );
    }

    if (queryLog.duration > 5000) {
      suggestions.push(
        'Query muito lenta (>5s), considere dividir em queries menores'
      );
    }

    if (query.includes('LIKE') && query.includes("'%")) {
      suggestions.push(
        'LIKE com % no início impede uso de índices, considere full-text search'
      );
    }

    return suggestions;
  }

  // Atualizar estado da conexão
  private updateConnectionState(
    connectionId: string,
    state: DatabaseConnection['state'],
    lastQuery?: string
  ): void {
    if (!this.config.connectionPoolMonitoring) return;

    const connection = this.connections.get(connectionId);

    if (connection) {
      connection.state = state;
      connection.lastQuery = lastQuery || connection.lastQuery;
      if (state === 'active') {
        connection.queries++;
      }
    } else {
      this.connections.set(connectionId, {
        id: connectionId,
        state,
        startTime: Date.now(),
        lastQuery,
        queries: 1,
      });
    }

    // Atualizar métricas de conexão
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.state === 'active'
    ).length;

    dbConnectionsActive.set(activeConnections);
  }

  // Adicionar query ao log
  private addQueryLog(queryLog: QueryLog): void {
    this.queryLogs.push(queryLog);

    // Manter tamanho do log
    if (this.queryLogs.length > this.config.maxLogSize) {
      this.queryLogs = this.queryLogs.slice(-this.config.maxLogSize);
    }
  }

  // Atualizar estatísticas da query
  private updateQueryStats(
    query: string,
    duration: number,
    isError: boolean
  ): void {
    const queryHash = this.hashQuery(query);
    const stats = this.queryStats.get(queryHash);

    if (stats) {
      stats.count++;
      stats.totalDuration += duration;
      if (isError) stats.errors++;
    } else {
      this.queryStats.set(queryHash, {
        count: 1,
        totalDuration: duration,
        errors: isError ? 1 : 0,
      });
    }
  }

  // Disparar alerta de query lenta
  private triggerSlowQueryAlert(alert: SlowQueryAlert): void {
    console.warn('🚨 SLOW QUERY ALERT:', {
      query: `${alert.query.substring(0, 200)}...`,
      averageDuration: `${alert.duration}ms`,
      frequency: `${alert.frequency} occurrences`,
      table: alert.table,
      suggestions: alert.suggestions,
    });

    // Em produção, enviar para sistema de alertas
    if (process.env.NODE_ENV === 'production') {
      // this.sendSlowQueryNotification(alert);
    }
  }

  // Obter métricas do banco
  public async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const recentQueries = this.queryLogs.filter(
      log => log.timestamp > Date.now() - 5 * 60 * 1000 // últimos 5 minutos
    );

    const totalDuration = recentQueries.reduce(
      (sum, log) => sum + log.duration,
      0
    );
    const averageQueryTime =
      recentQueries.length > 0 ? totalDuration / recentQueries.length : 0;

    const slowQueries = recentQueries.filter(
      log => log.duration > this.config.slowQueryThreshold
    ).length;

    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.state === 'active'
    ).length;

    return {
      averageQueryTime,
      slowQueries,
      activeConnections,
      totalQueries: recentQueries.length,
    };
  }

  // Obter queries mais lentas
  public getSlowQueries(limit: number = 10): QueryLog[] {
    return [...this.queryLogs]
      .filter(log => log.duration > this.config.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Obter estatísticas por tabela
  public getTableStats(): Array<{
    table: string;
    queryCount: number;
    avgDuration: number;
    errorRate: number;
    slowQueries: number;
  }> {
    const tableStats = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        errors: number;
        slowQueries: number;
      }
    >();

    this.queryLogs.forEach(log => {
      const table = log.table || 'unknown';
      const stats = tableStats.get(table) || {
        count: 0,
        totalDuration: 0,
        errors: 0,
        slowQueries: 0,
      };

      stats.count++;
      stats.totalDuration += log.duration;
      if (log.status === 'error') stats.errors++;
      if (log.duration > this.config.slowQueryThreshold) stats.slowQueries++;

      tableStats.set(table, stats);
    });

    return Array.from(tableStats.entries())
      .map(([table, stats]) => ({
        table,
        queryCount: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        errorRate: (stats.errors / stats.count) * 100,
        slowQueries: stats.slowQueries,
      }))
      .sort((a, b) => b.queryCount - a.queryCount);
  }

  // Obter alertas ativos
  public getActiveAlerts(): SlowQueryAlert[] {
    return Array.from(this.slowQueryAlerts.values())
      .filter(alert => alert.frequency >= this.config.alertFrequencyThreshold)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Limpar dados antigos
  private startPeriodicCleanup(): void {
    setInterval(
      () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 horas

        // Limpar logs antigos
        this.queryLogs = this.queryLogs.filter(log => log.timestamp > cutoff);

        // Limpar alertas antigos
        this.slowQueryAlerts.forEach((alert, key) => {
          if (alert.timestamp < cutoff) {
            this.slowQueryAlerts.delete(key);
          }
        });

        // Limpar conexões inativas há mais de 1 hora
        const connectionCutoff = Date.now() - 60 * 60 * 1000;
        this.connections.forEach((conn, id) => {
          if (conn.state === 'idle' && conn.startTime < connectionCutoff) {
            this.connections.delete(id);
          }
        });

        console.log('Database monitoring cleanup completed');
      },
      60 * 60 * 1000
    ); // Executar a cada hora
  }

  // Métodos auxiliares
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractOperation(query: string): QueryLog['operation'] {
    const upperQuery = query.trim().toUpperCase();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private extractTableName(query: string): string | undefined {
    const upperQuery = query.toUpperCase();
    let match: RegExpMatchArray | null = null;

    if (upperQuery.includes('FROM ')) {
      match = upperQuery.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    } else if (upperQuery.includes('INTO ')) {
      match = upperQuery.match(/INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    } else if (upperQuery.includes('UPDATE ')) {
      match = upperQuery.match(/UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    }

    return match ? match[1].toLowerCase() : undefined;
  }

  private sanitizeQuery(query: string): string {
    // Remover dados sensíveis da query para log
    return query
      .replace(/\b\d{11,}\b/g, '[CPF/CNPJ]') // CPF/CNPJ
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]') // Email
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Cartão
      .substring(0, 500); // Limitar tamanho
  }

  private sanitizeParameters(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return `${param.substring(0, 100)}...`;
      }
      return param;
    });
  }

  private extractRowsAffected(result: any): number | undefined {
    if (result && typeof result === 'object') {
      return result.rowCount || result.affectedRows || result.changes;
    }
    return undefined;
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('connection')) return 'connection';
    if (message.includes('syntax')) return 'syntax';
    if (message.includes('constraint')) return 'constraint';
    if (message.includes('permission') || message.includes('access'))
      return 'permission';

    return 'other';
  }

  private hashQuery(query: string): string {
    // Hash simples para agrupar queries similares
    return query
      .replace(/\d+/g, '?') // Substituir números por placeholder
      .replace(/'[^']*'/g, '?') // Substituir strings por placeholder
      .replace(/\s+/g, ' ') // Normalizar espaços
      .trim()
      .toLowerCase();
  }

  private getDurationRange(duration: number): string {
    if (duration < 100) return '0-100ms';
    if (duration < 500) return '100-500ms';
    if (duration < 1000) return '500ms-1s';
    if (duration < 5000) return '1-5s';
    if (duration < 10000) return '5-10s';
    return '10s+';
  }
}

// Instância global do monitor de banco
export const databaseMonitor = new DatabaseMonitor();

// Wrapper para facilitar o uso
export async function monitoredQuery<T>(
  query: string,
  executor: () => Promise<T>,
  parameters?: any[],
  connectionId?: string
): Promise<T> {
  return databaseMonitor.monitorQuery(
    query,
    parameters || [],
    executor,
    connectionId
  );
}

// Configurar threshold de query lenta
export function setSlowQueryThreshold(thresholdMs: number): void {
  (databaseMonitor as any).config.slowQueryThreshold = thresholdMs;
}
