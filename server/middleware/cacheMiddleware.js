/**
 * Middleware de Cache para rotas
 */

import { cacheManager } from '../services/cache-manager.js';
import { logError, logInfo, logPerformance } from '../utils/logger.js';

/**
 * Middleware de cache para GET requests
 */
export const cacheMiddleware = (ttlType = 'temp', keyGenerator = null) => {
  return async (req, res, next) => {
    // Só aplicar cache para GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Gerar chave de cache
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : generateDefaultCacheKey(req);

      const startTime = Date.now();

      // Tentar obter do cache
      const cachedData = await cacheManager.get(cacheKey);

      if (cachedData) {
        const duration = Date.now() - startTime;
        logPerformance(`Cache middleware HIT: ${cacheKey}`, duration);

        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - interceptar a resposta
      const originalJson = res.json;
      res.json = function (data) {
        // Armazenar no cache se a resposta foi bem-sucedida
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheManager
            .set(cacheKey, data, ttlType)
            .catch(error =>
              logError('Erro ao armazenar cache via middleware', error)
            );
        }

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        // Chamar o método original
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logError('Erro no middleware de cache', error);
      next();
    }
  };
};

/**
 * Middleware específico para rotas de patrimônios
 */
export const patrimoniosCacheMiddleware = cacheMiddleware(
  'patrimonios',
  req => {
    const municipalityId = req.user?.municipality_id;
    const query = req.query;
    const filters =
      Object.keys(query).length > 0 ? JSON.stringify(query) : 'all';

    return cacheManager.generateKey(
      'patrimonios',
      filters,
      null,
      municipalityId
    );
  }
);

/**
 * Middleware específico para rotas de setores
 */
export const sectorsCacheMiddleware = cacheMiddleware('sectors', req => {
  const municipalityId = req.user?.municipality_id || req.params.municipalityId;
  return cacheManager.generateKey('sectors', 'all', null, municipalityId);
});

/**
 * Middleware específico para rotas de usuários
 */
export const usersCacheMiddleware = cacheMiddleware('users', req => {
  const municipalityId = req.user?.municipality_id || req.params.municipalityId;
  const userId = req.params.userId || 'all';

  return cacheManager.generateKey('users', userId, null, municipalityId);
});

/**
 * Middleware específico para rotas de imóveis
 */
export const imoveisCacheMiddleware = cacheMiddleware('imoveis', req => {
  const municipalityId = req.user?.municipality_id;
  const query = req.query;
  const filters = Object.keys(query).length > 0 ? JSON.stringify(query) : 'all';

  return cacheManager.generateKey('imoveis', filters, null, municipalityId);
});

/**
 * Middleware específico para rotas de relatórios
 */
export const reportsCacheMiddleware = cacheMiddleware('reports', req => {
  const municipalityId = req.user?.municipality_id;
  const reportType = req.params.type || 'generic';
  const query = req.query;
  const filters = Object.keys(query).length > 0 ? JSON.stringify(query) : 'all';

  return cacheManager.generateKey(
    'reports',
    `${reportType}:${filters}`,
    null,
    municipalityId
  );
});

/**
 * Middleware para invalidar cache após operações de escrita
 */
export const cacheInvalidationMiddleware = invalidationType => {
  return (req, res, next) => {
    // Interceptar resposta para invalidar cache após sucesso
    const originalJson = res.json;

    res.json = function (data) {
      // Invalidar cache se a operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache(invalidationType, req).catch(error =>
          logError('Erro ao invalidar cache via middleware', error)
        );
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware específico para invalidar cache de patrimônios
 */
export const invalidatePatrimoniosCache =
  cacheInvalidationMiddleware('patrimonios');

/**
 * Middleware específico para invalidar cache de setores
 */
export const invalidateSectorsCache = cacheInvalidationMiddleware('sectors');

/**
 * Middleware específico para invalidar cache de usuários
 */
export const invalidateUsersCache = cacheInvalidationMiddleware('users');

/**
 * Middleware específico para invalidar cache de imóveis
 */
export const invalidateImoveisCache = cacheInvalidationMiddleware('imoveis');

/**
 * Função para gerar chave de cache padrão
 */
function generateDefaultCacheKey(req) {
  const path = req.route?.path || req.path;
  const municipalityId = req.user?.municipality_id;
  const userId = req.user?.id;
  const query = req.query;

  let key = `route:${path}`;

  if (Object.keys(query).length > 0) {
    key += `:${JSON.stringify(query)}`;
  }

  return cacheManager.generateKey('route', key, userId, municipalityId);
}

/**
 * Função para invalidar cache por tipo
 */
async function invalidateCache(type, req) {
  const municipalityId = req.user?.municipality_id;
  const userId = req.user?.id;

  try {
    switch (type) {
      case 'patrimonios':
        await cacheManager.invalidate('patrimonios', municipalityId);
        await cacheManager.invalidate('reports', municipalityId); // Relatórios dependem de patrimônios
        logInfo('Cache invalidated: patrimonios', { municipalityId });
        break;

      case 'sectors':
        await cacheManager.invalidate('sectors', municipalityId);
        await cacheManager.invalidate('patrimonios', municipalityId); // Patrimônios dependem de setores
        logInfo('Cache invalidated: sectors', { municipalityId });
        break;

      case 'users':
        await cacheManager.invalidate('users', municipalityId);
        logInfo('Cache invalidated: users', { municipalityId });
        break;

      case 'imoveis':
        await cacheManager.invalidate('imoveis', municipalityId);
        await cacheManager.invalidate('reports', municipalityId); // Relatórios dependem de imóveis
        logInfo('Cache invalidated: imoveis', { municipalityId });
        break;

      case 'settings':
        await cacheManager.invalidate('settings', municipalityId);
        logInfo('Cache invalidated: settings', { municipalityId });
        break;

      default:
        logError(`Tipo de invalidação desconhecido: ${type}`);
    }
  } catch (error) {
    logError(`Erro ao invalidar cache: ${type}`, error);
  }
}

/**
 * Middleware para adicionar headers de cache
 */
export const cacheHeadersMiddleware = (maxAge = 300) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', generateETag(req));
    }
    next();
  };
};

/**
 * Gerar ETag simples baseado na URL e query
 */
function generateETag(req) {
  const content = req.originalUrl + JSON.stringify(req.user?.id || 'anonymous');
  return Buffer.from(content).toString('base64');
}

/**
 * Middleware para estatísticas de cache
 */
export const cacheStatsMiddleware = (req, res, next) => {
  req.cacheStats = cacheManager.getStats();
  next();
};
