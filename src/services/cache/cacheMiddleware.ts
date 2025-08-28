import { NextFunction, Request, Response } from 'express';
import { advancedCache } from './advancedCache';

export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  tags?: string[] | ((req: Request) => string[]);
  skipCache?: (req: Request) => boolean;
  onlySuccessful?: boolean;
  useRedis?: boolean;
  useMemory?: boolean;
  compression?: boolean;
}

export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutos padrão
    keyGenerator = req => `api:${req.method}:${req.originalUrl}`,
    condition = () => true,
    tags = [],
    skipCache = () => false,
    onlySuccessful = true,
    useRedis = true,
    useMemory = true,
    compression = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Pular cache se solicitado
    if (skipCache(req) || !condition(req, res)) {
      return next();
    }

    // Gerar chave do cache
    const cacheKey = keyGenerator(req);

    // Gerar tags
    const cacheTags = typeof tags === 'function' ? tags(req) : tags;

    try {
      // Tentar buscar no cache
      const cachedData = await advancedCache.get(cacheKey, {
        useRedis,
        useMemory,
        tags: cacheTags,
      });

      if (cachedData) {
        // Cache hit - retornar dados em cache
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - interceptar resposta
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Interceptar o método json para capturar a resposta
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        // Armazenar no cache apenas se for uma resposta bem-sucedida
        if (
          !onlySuccessful ||
          (res.statusCode >= 200 && res.statusCode < 300)
        ) {
          advancedCache
            .set(cacheKey, data, {
              ttl,
              useRedis,
              useMemory,
              tags: cacheTags,
              compression,
            })
            .catch(error => {
              console.error('Erro ao armazenar no cache:', error);
            });
        }

        return originalJson(data);
      };
    } catch (error) {
      console.error('Erro no middleware de cache:', error);
      res.setHeader('X-Cache', 'ERROR');
    }

    next();
  };
}

// Middleware específico para diferentes tipos de dados
export const patrimonioCache = cacheMiddleware({
  ttl: 600, // 10 minutos
  keyGenerator: req => `patrimonio:${req.method}:${req.originalUrl}`,
  tags: ['patrimonio'],
  condition: req => req.method === 'GET',
});

export const userCache = cacheMiddleware({
  ttl: 300, // 5 minutos
  keyGenerator: req => `user:${req.method}:${req.originalUrl}`,
  tags: ['user'],
  condition: req => req.method === 'GET',
});

export const reportCache = cacheMiddleware({
  ttl: 1800, // 30 minutos
  keyGenerator: req => `report:${req.method}:${req.originalUrl}`,
  tags: ['report'],
  condition: req => req.method === 'GET',
  compression: true, // Relatórios podem ser grandes
});

export const dashboardCache = cacheMiddleware({
  ttl: 180, // 3 minutos
  keyGenerator: req => `dashboard:${req.method}:${req.originalUrl}`,
  tags: ['dashboard'],
  condition: req => req.method === 'GET',
});

// Middleware para invalidar cache baseado em mudanças
export function cacheInvalidationMiddleware(
  tags: string[] | ((req: Request) => string[])
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Interceptar resposta para invalidar cache após mudanças
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      // Invalidar cache apenas para operações bem-sucedidas que modificam dados
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
        res.statusCode >= 200 &&
        res.statusCode < 300
      ) {
        const invalidationTags = typeof tags === 'function' ? tags(req) : tags;

        advancedCache.invalidateByTags(invalidationTags).catch(error => {
          console.error('Erro ao invalidar cache:', error);
        });
      }

      return originalJson(data);
    };

    next();
  };
}

// Middleware para limpeza de cache
export function cacheClearMiddleware(pattern?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (pattern) {
        const cleared = await advancedCache.invalidateByPattern(pattern);
        res.json({
          message: `Cache limpo: ${cleared} entradas removidas`,
          pattern,
        });
      } else {
        await advancedCache.clear();
        res.json({ message: 'Todo o cache foi limpo' });
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({ error: 'Erro ao limpar cache' });
    }
  };
}

// Middleware para estatísticas de cache
export function cacheStatsMiddleware() {
  return async (req: Request, res: Response) => {
    try {
      const stats = await advancedCache.getStats();
      const metrics = advancedCache.getMetrics();

      res.json({
        stats,
        metrics: metrics.slice(0, 50), // Limitar para não sobrecarregar
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  };
}

// Middleware para aquecimento de cache
export function cacheWarmupMiddleware(
  warmupConfig: Array<{
    key: string;
    fetcher: () => Promise<any>;
    options?: any;
  }>
) {
  return async (req: Request, res: Response) => {
    try {
      await advancedCache.warmup(warmupConfig);
      res.json({
        message: `Cache aquecido: ${warmupConfig.length} entradas processadas`,
      });
    } catch (error) {
      console.error('Erro ao aquecer cache:', error);
      res.status(500).json({ error: 'Erro ao aquecer cache' });
    }
  };
}
