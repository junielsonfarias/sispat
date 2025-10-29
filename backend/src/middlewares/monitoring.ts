import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { metricsCollector } from '../config/metrics';

// Interface para métricas
interface Metrics {
  requests: number;
  errors: number;
  responseTime: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

// Armazenamento de métricas
let metrics: Metrics = {
  requests: 0,
  errors: 0,
  responseTime: 0,
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage()
};

// Histórico de métricas (últimas 100 medições)
const metricsHistory: Metrics[] = [];

// Middleware de monitoramento
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startCpu = process.cpuUsage();
  
  // Incrementar contador de requests
  metrics.requests++;
  
  // Interceptar resposta
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = performance.now();
    const endCpu = process.cpuUsage(startCpu);
    
    // Calcular tempo de resposta
    const responseTime = endTime - startTime;
    metrics.responseTime = responseTime;
    
    // Atualizar métricas
    metrics.uptime = process.uptime();
    metrics.memoryUsage = process.memoryUsage();
    metrics.cpuUsage = endCpu;
    
    // Incrementar contador de erros se necessário
    if (res.statusCode >= 400) {
      metrics.errors++;
    }
    
    // Adicionar ao histórico
    metricsHistory.push({ ...metrics });
    
    // Manter apenas últimas 100 medições
    if (metricsHistory.length > 100) {
      metricsHistory.shift();
    }
    
    // Integrar com sistema de métricas
    metricsCollector.incrementMetric('total_requests', 1, 300).catch(console.error);
    
    if (res.statusCode >= 400) {
      metricsCollector.incrementMetric('error_requests', 1, 300).catch(console.error);
    }
    
    // Atualizar tempo médio de resposta
    metricsCollector.setMetric('avg_response_time', responseTime, 300).catch(console.error);
    
    // Log de performance
    if (responseTime > 1000) { // Log requests lentos (>1s)
      console.warn(`[PERFORMANCE] Slow request: ${req.method} ${req.originalUrl} - ${responseTime.toFixed(2)}ms`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Endpoint de métricas
export const getMetrics = (req: Request, res: Response) => {
  const currentMetrics = {
    ...metrics,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  
  // Calcular estatísticas do histórico
  const avgResponseTime = metricsHistory.length > 0 
    ? metricsHistory.reduce((sum, m) => sum + m.responseTime, 0) / metricsHistory.length 
    : 0;
  
  const errorRate = metrics.requests > 0 
    ? (metrics.errors / metrics.requests) * 100 
    : 0;
  
  const stats = {
    current: currentMetrics,
    statistics: {
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerMinute: metricsHistory.length > 0 
        ? Math.round((metrics.requests / (currentMetrics.uptime / 60)) * 100) / 100 
        : 0,
      totalRequests: metrics.requests,
      totalErrors: metrics.errors
    },
    history: metricsHistory.slice(-10) // Últimas 10 medições
  };
  
  res.json(stats);
};

// Endpoint de health check detalhado
export const healthCheck = (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    cpu: {
      user: process.cpuUsage().user,
      system: process.cpuUsage().system
    },
    requests: {
      total: metrics.requests,
      errors: metrics.errors,
      errorRate: metrics.requests > 0 ? Math.round((metrics.errors / metrics.requests) * 100 * 100) / 100 : 0
    }
  };
  
  // Verificar se está saudável
  const memoryUsagePercent = (health.memory.used / health.memory.total) * 100;
  const errorRate = health.requests.errorRate;
  
  if (memoryUsagePercent > 90 || errorRate > 10) {
    health.status = 'unhealthy';
    res.status(503);
  }
  
  res.json(health);
};

// Middleware de logging estruturado
export const structuredLogging = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log da requisição
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.userId || 'anonymous',
    userRole: req.user?.role || 'anonymous'
  };
  
  console.log(`[REQUEST] ${JSON.stringify(logData)}`);
  
  // Interceptar resposta para log
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    const responseLog = {
      ...logData,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || '0'
    };
    
    console.log(`[RESPONSE] ${JSON.stringify(responseLog)}`);
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware de alertas
export const alertingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Verificar uso de memória
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (memoryUsagePercent > 85) {
    console.error(`[ALERT] High memory usage: ${memoryUsagePercent.toFixed(2)}%`);
  }
  
  // Verificar taxa de erro
  const errorRate = metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0;
  if (errorRate > 5) {
    console.error(`[ALERT] High error rate: ${errorRate.toFixed(2)}%`);
  }
  
  next();
};

// Função para resetar métricas
export const resetMetrics = () => {
  metrics = {
    requests: 0,
    errors: 0,
    responseTime: 0,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  metricsHistory.length = 0;
  console.log('[MONITORING] Metrics reset');
};

// Função para obter estatísticas de performance
export const getPerformanceStats = () => {
  return {
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    requests: metrics.requests,
    errors: metrics.errors,
    averageResponseTime: metricsHistory.length > 0 
      ? metricsHistory.reduce((sum, m) => sum + m.responseTime, 0) / metricsHistory.length 
      : 0
  };
};
