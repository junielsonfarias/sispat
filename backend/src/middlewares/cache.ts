/**
 * Middleware de Cache Redis
 * 
 * Aplica cache automático em rotas GET
 */

import { Request, Response, NextFunction } from 'express'
import { redisCache, CacheUtils } from '../config/redis'

export interface CacheOptions {
  ttl?: number // Time to live em segundos
  keyGenerator?: (req: Request) => string
  skipCache?: (req: Request) => boolean
  invalidateOn?: string[] // Métodos que invalidam o cache
}

/**
 * Middleware de cache genérico
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutos por padrão
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    invalidateOn = ['POST', 'PUT', 'PATCH', 'DELETE']
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Verificar se deve pular cache
    if (skipCache(req)) {
      return next()
    }

    const cacheKey = keyGenerator(req)
    
    try {
      // Tentar obter do cache
      const cached = await redisCache.get(cacheKey)
      
      if (cached) {
        console.log(`✅ Cache hit: ${cacheKey}`)
        return res.json(cached)
      }
      
      // Interceptar resposta para cachear
      const originalJson = res.json
      res.json = function(data: any) {
        // Cachear apenas se não houver erro
        if (res.statusCode === 200) {
          redisCache.set(cacheKey, data, ttl)
          console.log(`💾 Cache set: ${cacheKey} (TTL: ${ttl}s)`)
        }
        
        return originalJson.call(this, data)
      }
      
      next()
    } catch (error) {
      console.error('Erro no middleware de cache:', error)
      next()
    }
  }
}

/**
 * Gerador de chave padrão
 */
function defaultKeyGenerator(req: Request): string {
  const baseKey = req.originalUrl
  const queryString = JSON.stringify(req.query)
  const userInfo = req.user ? `:user:${req.user.userId}` : ''
  
  return `${baseKey}${userInfo}:${Buffer.from(queryString).toString('base64')}`
}

/**
 * Middleware específico para patrimônios
 */
export function patrimoniosCacheMiddleware() {
  return cacheMiddleware({
    ttl: 300, // 5 minutos
    keyGenerator: (req) => {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        sectorId: req.query.sectorId,
        tipo: req.query.tipo,
        page: req.query.page,
        limit: req.query.limit,
        orderBy: req.query.orderBy,
        orderDirection: req.query.orderDirection
      }
      
      return CacheUtils.getPatrimoniosKey(filters)
    },
    skipCache: (req) => {
      // Pular cache se for busca muito específica
      return req.query.search && (req.query.search as string).length < 3
    }
  })
}

/**
 * Middleware específico para imóveis
 */
export function imoveisCacheMiddleware() {
  return cacheMiddleware({
    ttl: 300, // 5 minutos
    keyGenerator: (req) => {
      const filters = {
        search: req.query.search,
        sectorId: req.query.sectorId,
        page: req.query.page,
        limit: req.query.limit
      }
      
      return CacheUtils.getImoveisKey(filters)
    }
  })
}

/**
 * Middleware específico para transferências
 */
export function transferenciasCacheMiddleware() {
  return cacheMiddleware({
    ttl: 180, // 3 minutos (dados mais dinâmicos)
    keyGenerator: (req) => {
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      }
      
      return CacheUtils.getTransferenciasKey(filters)
    }
  })
}

/**
 * Middleware específico para documentos
 */
export function documentosCacheMiddleware() {
  return cacheMiddleware({
    ttl: 600, // 10 minutos (documentos mudam menos)
    keyGenerator: (req) => {
      const filters = {
        search: req.query.search,
        tipo: req.query.tipo,
        categoria: req.query.categoria,
        isPublic: req.query.isPublic,
        page: req.query.page,
        limit: req.query.limit
      }
      
      return CacheUtils.getDocumentosKey(filters)
    }
  })
}

/**
 * Middleware específico para dashboard
 */
export function dashboardCacheMiddleware() {
  return cacheMiddleware({
    ttl: 120, // 2 minutos (dashboard muda frequentemente)
    keyGenerator: (req) => {
      return CacheUtils.getDashboardKey(
        req.user?.userId || 'anonymous',
        req.user?.municipalityId || 'unknown'
      )
    },
    skipCache: (req) => {
      // Pular cache se for refresh forçado
      return req.query.refresh === 'true'
    }
  })
}

/**
 * Middleware para invalidar cache
 */
export function cacheInvalidationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Interceptar resposta para invalidar cache
    const originalJson = res.json
    res.json = function(data: any) {
      // Invalidar cache apenas se operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateRelevantCache(req)
      }
      
      return originalJson.call(this, data)
    }
    
    next()
  }
}

/**
 * Invalidar cache relevante baseado na rota
 */
async function invalidateRelevantCache(req: Request) {
  try {
    const path = req.route?.path || req.path
    
    if (path.includes('/patrimonios')) {
      await CacheUtils.invalidatePatrimonios()
      console.log('🗑️ Cache de patrimônios invalidado')
    }
    
    if (path.includes('/imoveis')) {
      await CacheUtils.invalidateImoveis()
      console.log('🗑️ Cache de imóveis invalidado')
    }
    
    if (path.includes('/transferencias')) {
      await CacheUtils.invalidateTransferencias()
      console.log('🗑️ Cache de transferências invalidado')
    }
    
    if (path.includes('/documentos')) {
      await CacheUtils.invalidateDocumentos()
      console.log('🗑️ Cache de documentos invalidado')
    }
    
    if (path.includes('/dashboard') || path === '/') {
      await CacheUtils.invalidateDashboard(req.user?.municipalityId || 'unknown')
      console.log('🗑️ Cache de dashboard invalidado')
    }
    
  } catch (error) {
    console.error('Erro ao invalidar cache:', error)
  }
}

/**
 * Middleware para estatísticas de cache
 */
export function cacheStatsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/cache/stats') {
      try {
        const stats = await redisCache.getStats()
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erro ao obter estatísticas do cache'
        })
      }
    } else {
      next()
    }
  }
}

/**
 * Middleware para limpar cache
 */
export function cacheClearMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/cache/clear' && req.method === 'POST') {
      try {
        const { pattern } = req.body
        
        if (pattern) {
          await redisCache.deletePattern(pattern)
          res.json({
            success: true,
            message: `Cache limpo para padrão: ${pattern}`
          })
        } else {
          await CacheUtils.invalidateAll()
          res.json({
            success: true,
            message: 'Todo o cache foi limpo'
          })
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erro ao limpar cache'
        })
      }
    } else {
      next()
    }
  }
}