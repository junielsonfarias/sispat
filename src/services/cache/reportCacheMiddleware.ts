import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { reportCache, ReportMetadata } from './reportCache';

export interface ReportCacheMiddlewareOptions {
  reportType: 'pdf' | 'excel' | 'csv' | 'dashboard' | 'aggregated';
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  metadataExtractor?: (req: Request) => Partial<ReportMetadata>;
  condition?: (req: Request) => boolean;
  skipCache?: (req: Request) => boolean;
  onCacheHit?: (req: Request, data: any) => void;
  onCacheMiss?: (req: Request) => void;
  invalidateOnMutation?: boolean;
}

/**
 * Middleware genérico para cache de relatórios
 */
export function reportCacheMiddleware(options: ReportCacheMiddlewareOptions) {
  const {
    reportType,
    ttl,
    keyGenerator = (req) => `${reportType}:${req.originalUrl}:${JSON.stringify(req.query)}`,
    metadataExtractor = (req) => ({
      type: reportType,
      title: `${reportType} Report`,
      filters: req.query as Record<string, any>,
      parameters: req.body || {}
    }),
    condition = () => true,
    skipCache = () => false,
    onCacheHit,
    onCacheMiss,
    invalidateOnMutation = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!condition(req) || skipCache(req)) {
      return next();
    }

    const userId = (req as any).user?.id;
    const reportId = keyGenerator(req);

    try {
      // Para métodos GET, tentar buscar do cache
      if (req.method === 'GET') {
        let cachedData: any = null;

        switch (reportType) {
          case 'dashboard':
            cachedData = await reportCache.getDashboardData(userId, req.query as Record<string, any>);
            break;
          case 'pdf':
            cachedData = await reportCache.getPdfReport(reportId, userId, req.query as Record<string, any>);
            break;
          case 'excel':
          case 'csv':
            cachedData = await reportCache.getExport(reportType, reportId, userId, req.query as Record<string, any>);
            break;
          case 'aggregated':
            cachedData = await reportCache.getAggregatedQuery(reportId, req.query as Record<string, any>, userId);
            break;
        }

        if (cachedData) {
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Type', reportType);
          res.setHeader('X-Cache-Key', reportId);
          
          onCacheHit?.(req, cachedData);

          // Para PDFs e exportações, retornar como buffer
          if ((reportType === 'pdf' || reportType === 'excel' || reportType === 'csv') && cachedData.buffer) {
            const contentType = reportType === 'pdf' ? 'application/pdf' : 
                               reportType === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                               'text/csv';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${reportId}.${reportType}"`);
            return res.send(cachedData.buffer);
          }

          return res.json(cachedData);
        }

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Type', reportType);
        onCacheMiss?.(req);
      }

      // Interceptar resposta para armazenar no cache
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Armazenar no cache de forma assíncrona
          setImmediate(async () => {
            try {
              const metadata = metadataExtractor(req);
              
              switch (reportType) {
                case 'dashboard':
                  await reportCache.setDashboardData(data, userId, req.query as Record<string, any>);
                  break;
                case 'aggregated':
                  await reportCache.setAggregatedQuery(reportId, data, req.query as Record<string, any>, userId, ttl);
                  break;
              }
            } catch (error) {
              console.error('Erro ao armazenar no cache de relatórios:', error);
            }
          });
        }

        return originalJson(data);
      };

      res.send = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300 && 
            (reportType === 'pdf' || reportType === 'excel' || reportType === 'csv')) {
          
          // Armazenar buffer no cache
          setImmediate(async () => {
            try {
              const metadata = metadataExtractor(req);
              const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
              
              if (reportType === 'pdf') {
                await reportCache.setPdfReport(reportId, buffer, metadata, userId, req.query as Record<string, any>);
              } else {
                await reportCache.setExport(reportType, reportId, buffer, metadata, userId, req.query as Record<string, any>);
              }
            } catch (error) {
              console.error('Erro ao armazenar arquivo no cache:', error);
            }
          });
        }

        return originalSend(data);
      };

      // Para métodos de mutação, invalidar cache relacionado
      if (invalidateOnMutation && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        res.on('finish', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(async () => {
              try {
                await reportCache.invalidateReportsOnDataChange(['patrimonio'], userId);
              } catch (error) {
                console.error('Erro ao invalidar cache após mutação:', error);
              }
            });
          }
        });
      }

    } catch (error) {
      console.error('Erro no middleware de cache de relatórios:', error);
      res.setHeader('X-Cache', 'ERROR');
    }

    next();
  };
}

/**
 * Middleware específico para cache de dashboard
 */
export const dashboardCacheMiddleware = reportCacheMiddleware({
  reportType: 'dashboard',
  ttl: 300, // 5 minutos
  keyGenerator: (req) => `dashboard:${req.originalUrl}:${JSON.stringify(req.query)}`,
  metadataExtractor: (req) => ({
    type: 'dashboard',
    title: 'Dashboard Data',
    filters: req.query as Record<string, any>,
    parameters: {}
  })
});

/**
 * Middleware específico para cache de relatórios PDF
 */
export const pdfReportCacheMiddleware = reportCacheMiddleware({
  reportType: 'pdf',
  ttl: 3600, // 1 hora
  keyGenerator: (req) => `pdf:${req.params.reportType || 'general'}:${uuidv4()}`,
  metadataExtractor: (req) => ({
    type: 'pdf',
    title: req.params.reportType || 'PDF Report',
    filters: req.query as Record<string, any>,
    parameters: req.body || {}
  })
});

/**
 * Middleware específico para cache de exportações Excel
 */
export const excelExportCacheMiddleware = reportCacheMiddleware({
  reportType: 'excel',
  ttl: 1800, // 30 minutos
  keyGenerator: (req) => `excel:${req.params.exportType || 'general'}:${uuidv4()}`,
  metadataExtractor: (req) => ({
    type: 'excel',
    title: req.params.exportType || 'Excel Export',
    filters: req.query as Record<string, any>,
    parameters: req.body || {}
  })
});

/**
 * Middleware específico para cache de exportações CSV
 */
export const csvExportCacheMiddleware = reportCacheMiddleware({
  reportType: 'csv',
  ttl: 1800, // 30 minutos
  keyGenerator: (req) => `csv:${req.params.exportType || 'general'}:${uuidv4()}`,
  metadataExtractor: (req) => ({
    type: 'csv',
    title: req.params.exportType || 'CSV Export',
    filters: req.query as Record<string, any>,
    parameters: req.body || {}
  })
});

/**
 * Middleware para cache de consultas agregadas
 */
export const aggregatedQueryCacheMiddleware = reportCacheMiddleware({
  reportType: 'aggregated',
  ttl: 600, // 10 minutos
  keyGenerator: (req) => `aggregated:${req.params.queryType || 'general'}:${JSON.stringify(req.query)}`,
  metadataExtractor: (req) => ({
    type: 'aggregated',
    title: req.params.queryType || 'Aggregated Query',
    filters: req.query as Record<string, any>,
    parameters: req.body || {}
  })
});

/**
 * Middleware para limpeza manual de cache de relatórios
 */
export function reportCacheClearMiddleware(reportTypes?: string[]) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      let totalCleared = 0;

      if (reportTypes && reportTypes.length > 0) {
        // Limpar tipos específicos
        for (const type of reportTypes) {
          totalCleared += await reportCache.invalidateReportsOnDataChange([type], userId);
        }
      } else {
        // Limpar todos os relatórios
        totalCleared = await reportCache.cleanupExpiredReports();
      }

      res.json({
        message: `Cache de relatórios limpo: ${totalCleared} entradas removidas`,
        types: reportTypes || ['all'],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao limpar cache de relatórios:', error);
      res.status(500).json({ error: 'Erro ao limpar cache de relatórios' });
    }
  };
}

/**
 * Middleware para estatísticas de cache de relatórios
 */
export function reportCacheStatsMiddleware() {
  return async (req: Request, res: Response) => {
    try {
      const stats = await reportCache.getReportCacheStats();
      
      res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de cache de relatórios:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  };
}

/**
 * Middleware para pré-geração de relatórios
 */
export function reportPreGenerationMiddleware(
  reportConfigs: Array<{
    type: 'pdf' | 'excel' | 'csv' | 'dashboard';
    id: string;
    generator: (req: Request) => Promise<Buffer | any>;
    metadata?: Partial<ReportMetadata>;
  }>
) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      
      const configs = reportConfigs.map(config => ({
        ...config,
        generator: () => config.generator(req),
        userId
      }));

      const result = await reportCache.preGenerateReports(configs);

      res.json({
        message: `Pré-geração concluída: ${result.success} sucessos, ${result.failed} falhas`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro na pré-geração de relatórios:', error);
      res.status(500).json({ error: 'Erro na pré-geração de relatórios' });
    }
  };
}
