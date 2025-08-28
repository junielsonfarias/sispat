import { NextFunction, Request, Response } from 'express';
import {
    httpRequestDuration,
    httpRequestsActive,
    httpRequestsTotal,
    recordCustomMetric
} from './performanceMetrics';

export interface PerformanceMiddlewareOptions {
  includeMethod?: boolean;
  includeStatusCode?: boolean;
  includeRoute?: boolean;
  customLabels?: (req: Request, res: Response) => Record<string, string>;
}

// Middleware principal de performance
export function performanceMiddleware(options: PerformanceMiddlewareOptions = {}) {
  const {
    includeMethod = true,
    includeStatusCode = true,
    includeRoute = true,
    customLabels
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime();
    
    // Incrementar requisições ativas
    httpRequestsActive.inc();

    // Interceptar o fim da resposta
    const originalEnd = res.end;
    res.end = function(this: Response, ...args: any[]) {
      // Calcular tempo de resposta
      const duration = Date.now() - startTime;
      const hrDuration = process.hrtime(startHrTime);
      const durationSeconds = hrDuration[0] + hrDuration[1] / 1e9;

      // Preparar labels
      const labels: Record<string, string> = {};
      
      if (includeMethod) labels.method = req.method;
      if (includeStatusCode) labels.status_code = res.statusCode.toString();
      if (includeRoute) labels.route = req.route?.path || req.path;

      // Adicionar labels customizados
      if (customLabels) {
        Object.assign(labels, customLabels(req, res));
      }

      // Registrar métricas Prometheus
      httpRequestDuration.observe(labels, durationSeconds);
      httpRequestsTotal.inc(labels);
      httpRequestsActive.dec();

      // Registrar no monitor interno
      recordCustomMetric('http_response_time', duration, labels);
      
      // Registrar erro se status >= 400
      if (res.statusCode >= 400) {
        recordCustomMetric('http_error', 1, {
          ...labels,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
        });
      }

      // Chamar método original
      originalEnd.apply(this, args);
    };

    next();
  };
}

// Middleware específico para APIs
export function apiPerformanceMiddleware() {
  return performanceMiddleware({
    includeMethod: true,
    includeStatusCode: true,
    includeRoute: true,
    customLabels: (req, res) => ({
      api_version: req.headers['api-version'] as string || 'v1',
      user_type: (req as any).user?.tipo || 'anonymous'
    })
  });
}

// Middleware para monitoramento de erros
export function errorTrackingMiddleware() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Registrar erro
    recordCustomMetric('application_error', 1, {
      error_type: error.name,
      error_message: error.message,
      route: req.path,
      method: req.method,
      stack_trace: error.stack?.split('\n')[0] || 'unknown'
    });

    // Log do erro
    console.error('Application Error:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    next(error);
  };
}

// Middleware para monitoramento de queries lentas
export function slowQueryMiddleware(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalQuery = (req as any).db?.query;
    
    if (originalQuery) {
      (req as any).db.query = async function(...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalQuery.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Registrar query
          recordCustomMetric('db_query_time', duration, {
            query_type: args[0]?.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
            table: extractTableName(args[0]) || 'unknown'
          });
          
          // Registrar query lenta
          if (duration > thresholdMs) {
            recordCustomMetric('db_slow_query', 1, {
              duration: duration.toString(),
              query: args[0]?.substring(0, 100) || 'unknown',
              table: extractTableName(args[0]) || 'unknown'
            });
            
            console.warn('Slow Query Detected:', {
              duration: `${duration}ms`,
              query: args[0],
              timestamp: new Date().toISOString()
            });
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Registrar erro de query
          recordCustomMetric('db_query_error', 1, {
            error_type: (error as Error).name,
            query_type: args[0]?.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
            table: extractTableName(args[0]) || 'unknown'
          });
          
          throw error;
        }
      };
    }
    
    next();
  };
}

// Função auxiliar para extrair nome da tabela da query
function extractTableName(query: string): string | null {
  if (!query) return null;
  
  const upperQuery = query.toUpperCase();
  let match: RegExpMatchArray | null = null;
  
  // Tentar diferentes padrões SQL
  if (upperQuery.includes('FROM ')) {
    match = upperQuery.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  } else if (upperQuery.includes('INTO ')) {
    match = upperQuery.match(/INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  } else if (upperQuery.includes('UPDATE ')) {
    match = upperQuery.match(/UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  } else if (upperQuery.includes('DELETE ')) {
    match = upperQuery.match(/DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  }
  
  return match ? match[1].toLowerCase() : null;
}

// Middleware para health check
export function healthCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health' || req.path === '/ping') {
      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };
      
      recordCustomMetric('health_check', 1, {
        status: 'ok'
      });
      
      res.json(healthData);
      return;
    }
    
    next();
  };
}

// Middleware para CORS com métricas
export function corsWithMetrics() {
  return (req: Request, res: Response, next: NextFunction) => {
    const {origin} = req.headers;
    
    // Registrar origem da requisição
    if (origin) {
      recordCustomMetric('cors_request', 1, {
        origin,
        method: req.method
      });
    }
    
    // Configurar CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  };
}
