import { Request, Response, NextFunction } from 'express'
import { cache } from '../config/redis'
import { logInfo } from '../config/logger'

/**
 * Middleware de cache para rotas GET
 * 
 * Uso:
 * router.get('/api/sectors', cacheMiddleware(600), sectorsController.list)
 */
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Gerar key de cache baseada na rota e query params
    const cacheKey = `cache:${req.method}:${req.originalUrl}`

    try {
      // Tentar buscar do cache
      const cached = await cache.get(cacheKey)

      if (cached) {
        logInfo(`Cache HIT: ${cacheKey}`)
        return res.json(cached)
      }

      logInfo(`Cache MISS: ${cacheKey}`)

      // Interceptar res.json para salvar no cache
      const originalJson = res.json.bind(res)
      res.json = function (data: any) {
        // Salvar no cache de forma assíncrona
        cache.set(cacheKey, data, ttl).catch((error) => {
          console.error('Erro ao salvar no cache:', error)
        })
        
        return originalJson(data)
      }

      next()
    } catch (error) {
      // Se erro no cache, continuar sem cache
      console.error('Erro no middleware de cache:', error)
      next()
    }
  }
}

/**
 * Middleware para invalidar cache após mutações
 */
export const invalidateCacheMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Interceptar res.json
    const originalJson = res.json.bind(res)
    
    res.json = function (data: any) {
      // Após resposta bem sucedida, invalidar cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cache.delPattern(pattern).catch((error) => {
            console.error(`Erro ao invalidar cache ${pattern}:`, error)
          })
        })
      }
      
      return originalJson(data)
    }

    next()
  }
}

/**
 * Cache específico para endpoints
 */
export const cacheStrategies = {
  // Dados que mudam raramente - cache longo
  static: cacheMiddleware(30 * 60),      // 30 minutos
  
  // Dados normais - cache médio
  normal: cacheMiddleware(5 * 60),       // 5 minutos
  
  // Dados que mudam frequentemente - cache curto
  dynamic: cacheMiddleware(1 * 60),      // 1 minuto
  
  // Dados em tempo real - sem cache
  realtime: (req: Request, res: Response, next: NextFunction) => next(),
}

/**
 * Exemplos de uso:
 * 
 * // Cache estático (30min)
 * router.get('/api/sectors', cacheStrategies.static, sectorsController.list)
 * 
 * // Cache normal (5min)
 * router.get('/api/patrimonios', cacheStrategies.normal, patrimonioController.list)
 * 
 * // Cache dinâmico (1min)
 * router.get('/api/dashboard/stats', cacheStrategies.dynamic, dashboardController.stats)
 * 
 * // Sem cache
 * router.get('/api/notifications', cacheStrategies.realtime, notificationsController.list)
 * 
 * // Invalidar cache após mutação
 * router.post('/api/patrimonios', 
 *   invalidateCacheMiddleware(['cache:*patrimonios*']),
 *   patrimonioController.create
 * )
 */

