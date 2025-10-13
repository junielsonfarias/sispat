/**
 * Middleware de cache Redis para endpoints
 * v2.1.0
 */

import { Request, Response, NextFunction } from 'express'
import { CacheManager } from '../config/redis.enhanced'
import { logInfo, logDebug } from '../config/logger'

const cacheManager = new CacheManager()

/**
 * Middleware para cachear respostas GET
 */
export const cacheResponse = (strategy: 'STATIC' | 'NORMAL' | 'DYNAMIC' = 'NORMAL') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Apenas cachear GET requests
    if (req.method !== 'GET') {
      next()
      return
    }

    const cacheKey = `api:${req.path}:${JSON.stringify(req.query)}`

    try {
      // Tentar buscar do cache
      const cachedData = await cacheManager.get(cacheKey)
      
      if (cachedData) {
        logDebug('Cache HIT', { key: cacheKey })
        res.setHeader('X-Cache', 'HIT')
        res.json(cachedData)
        return
      }

      logDebug('Cache MISS', { key: cacheKey })
      res.setHeader('X-Cache', 'MISS')

      // Interceptar res.json para cachear a resposta
      const originalJson = res.json.bind(res)
      
      res.json = function(body: any) {
        // Cachear apenas respostas de sucesso
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Obter TTL da estratégia
          const strategies = {
            STATIC: 24 * 60 * 60,  // 24h
            NORMAL: 60 * 60,       // 1h
            DYNAMIC: 5 * 60,       // 5min
          }
          const ttl = strategies[strategy]
          cacheManager.set(cacheKey, body, ttl).catch((err) => {
            logInfo('Erro ao salvar no cache (não crítico)', { error: err.message })
          })
        }
        return originalJson(body)
      }

      next()
    } catch (error) {
      // Se Redis falhar, continuar sem cache
      logInfo('Redis indisponível, continuando sem cache', { error: (error as Error).message })
      next()
    }
  }
}

/**
 * Middleware para invalidar cache após mutations
 */
export const invalidateCache = (pattern: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Interceptar res.json para invalidar após sucesso
    const originalJson = res.json.bind(res)
    
    res.json = function(body: any) {
      // Invalidar apenas se operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.deletePattern(pattern).catch((err) => {
          logInfo('Erro ao invalidar cache (não crítico)', { error: err.message })
        })
      }
      return originalJson(body)
    }

    next()
  }
}

