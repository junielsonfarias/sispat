import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from 'prom-client';

// Configurar coleta de métricas padrão
collectDefaultMetrics({
  // timeout: 5000, // Comentado temporariamente
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

// Métricas HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestsActive = new Gauge({
  name: 'http_requests_active',
  help: 'Número de requisições HTTP ativas',
});

// Métricas de banco de dados
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duração das queries do banco em segundos',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Conexões ativas do banco de dados',
});

export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total de queries executadas',
  labelNames: ['operation', 'table', 'status'],
});

// Métricas de aplicação
export const applicationErrors = new Counter({
  name: 'application_errors_total',
  help: 'Total de erros da aplicação',
  labelNames: ['type', 'component'],
});

export const memoryUsage = new Gauge({
  name: 'application_memory_usage_bytes',
  help: 'Uso de memória da aplicação em bytes',
  labelNames: ['type'],
});

// Métricas de negócio
export const patrimonioOperations = new Counter({
  name: 'patrimonio_operations_total',
  help: 'Total de operações de patrimônio',
  labelNames: ['operation', 'status'],
});

export const activeUsers = new Gauge({
  name: 'active_users_current',
  help: 'Usuários ativos no momento',
});

// Interface para métricas de performance
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface APIMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  activeRequests: number;
  totalRequests: number;
}

export interface DatabaseMetrics {
  averageQueryTime: number;
  slowQueries: number;
  activeConnections: number;
  totalQueries: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  uptime: number;
}

// Classe principal para coleta de métricas
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Manter apenas as últimas 1000 métricas

  // Adicionar métrica
  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Manter apenas as métricas mais recentes
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Obter métricas por nome
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) return this.metrics;
    return this.metrics.filter(m => m.name === name);
  }

  // Obter métricas dos últimos N minutos
  getRecentMetrics(minutes: number): PerformanceMetric[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Calcular estatísticas
  calculateStats(metrics: PerformanceMetric[]): {
    avg: number;
    min: number;
    max: number;
    count: number;
    p95: number;
    p99: number;
  } {
    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, p95: 0, p99: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      avg: sum / values.length,
      min: values[0] || 0,
      max: values[values.length - 1] || 0,
      count: values.length,
      p95: values[Math.floor(values.length * 0.95)] || 0,
      p99: values[Math.floor(values.length * 0.99)] || 0,
    };
  }

  // Obter métricas da API
  async getAPIMetrics(): Promise<APIMetrics> {
    const recentMetrics = this.getRecentMetrics(1); // Últimos 1 minuto
    const responseTimeMetrics = recentMetrics.filter(
      m => m.name === 'http_response_time'
    );
    const errorMetrics = recentMetrics.filter(m => m.name === 'http_error');

    const stats = this.calculateStats(responseTimeMetrics);

    return {
      requestsPerSecond: responseTimeMetrics.length / 60,
      averageResponseTime: stats.avg,
      errorRate: errorMetrics.length / Math.max(responseTimeMetrics.length, 1),
      activeRequests: 0, // Será atualizado pelo middleware
      totalRequests: responseTimeMetrics.length,
    };
  }

  // Obter métricas do banco
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const recentMetrics = this.getRecentMetrics(5); // Últimos 5 minutos
    const queryMetrics = recentMetrics.filter(m => m.name === 'db_query_time');
    const slowQueryMetrics = queryMetrics.filter(m => m.value > 1000); // > 1 segundo

    const stats = this.calculateStats(queryMetrics);

    return {
      averageQueryTime: stats.avg,
      slowQueries: slowQueryMetrics.length,
      activeConnections: 0, // Será atualizado pelo pool de conexões
      totalQueries: queryMetrics.length,
    };
  }

  // Limpar métricas antigas
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 horas
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();

// Função para obter todas as métricas do Prometheus
export async function getPrometheusMetrics(): Promise<string> {
  return register.metrics();
}

// Função para resetar todas as métricas
export function resetMetrics(): void {
  register.clear();
}

// Função para registrar métricas customizadas
export function recordCustomMetric(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  performanceMonitor.addMetric({
    name,
    value,
    timestamp: Date.now(),
    labels: labels || {},
  });
}

// Função para atualizar métricas de memória
export function updateMemoryMetrics(): void {
  const usage = process.memoryUsage();

  memoryUsage.set({ type: 'rss' }, usage.rss);
  memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
  memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
  memoryUsage.set({ type: 'external' }, usage.external);

  // Registrar no monitor interno também
  recordCustomMetric('memory_rss', usage.rss);
  recordCustomMetric('memory_heap_used', usage.heapUsed);
  recordCustomMetric('memory_heap_total', usage.heapTotal);
}

// Atualizar métricas de memória a cada 10 segundos
setInterval(updateMemoryMetrics, 10000);
