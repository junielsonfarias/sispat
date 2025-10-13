import Redis from 'ioredis'
import { logInfo, logError } from './logger'

/**
 * Configuração Redis com funcionalidades avançadas
 */

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_DB = parseInt(process.env.REDIS_DB || '0')

// Cliente Redis
export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
})

redis.on('connect', () => {
  logInfo('✅ Redis conectado', { host: REDIS_HOST, port: REDIS_PORT })
})

redis.on('error', (err: Error) => {
  logError('❌ Redis error', err)
})

/**
 * Cache Helper com TTL automático
 */
export class CacheManager {
  private prefix: string

  constructor(prefix: string = 'sispat') {
    this.prefix = prefix
  }

  /**
   * Obter chave com prefixo
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  /**
   * Definir cache
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      await redis.setex(this.getKey(key), ttlSeconds, serialized)
      return true
    } catch (error) {
      logError('Erro ao definir cache', error as Error, { key })
      return false
    }
  }

  /**
   * Obter cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(this.getKey(key))
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      logError('Erro ao obter cache', error as Error, { key })
      return null
    }
  }

  /**
   * Deletar cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redis.del(this.getKey(key))
      return true
    } catch (error) {
      logError('Erro ao deletar cache', error as Error, { key })
      return false
    }
  }

  /**
   * Deletar por padrão
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(this.getKey(pattern))
      if (keys.length === 0) return 0

      await redis.del(...keys)
      return keys.length
    } catch (error) {
      logError('Erro ao deletar por padrão', error as Error, { pattern })
      return 0
    }
  }

  /**
   * Verificar se existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(this.getKey(key))
      return result === 1
    } catch (error) {
      return false
    }
  }

  /**
   * Incrementar contador
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await redis.incrby(this.getKey(key), by)
    } catch (error) {
      logError('Erro ao incrementar', error as Error, { key })
      return 0
    }
  }

  /**
   * Definir TTL
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await redis.expire(this.getKey(key), ttlSeconds)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Obter ou definir (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Tentar obter do cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Não está no cache, buscar da fonte
    const value = await factory()

    // Salvar no cache
    await this.set(key, value, ttlSeconds)

    return value
  }
}

// Instância global
export const cache = new CacheManager('sispat')

/**
 * Middleware de cache para Express
 */
export function cacheMiddleware(ttlSeconds: number = 300) {
  return async (req: any, res: any, next: any) => {
    // Apenas GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const key = `route:${req.originalUrl}`

    try {
      const cached = await cache.get(key)
      if (cached) {
        return res.json(cached)
      }

      // Override res.json para cachear a resposta
      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        cache.set(key, body, ttlSeconds).catch(console.error)
        return originalJson(body)
      }

      next()
    } catch (error) {
      next()
    }
  }
}

/**
 * Helpers para invalidação de cache
 */
export const CacheInvalidation = {
  // Invalida cache de patrimônios
  patrimonios: async () => {
    await cache.deletePattern('patrimonios:*')
    await cache.deletePattern('route:/api/patrimonios*')
  },

  // Invalida cache de imóveis
  imoveis: async () => {
    await cache.deletePattern('imoveis:*')
    await cache.deletePattern('route:/api/imoveis*')
  },

  // Invalida cache de transferências
  transferencias: async () => {
    await cache.deletePattern('transferencias:*')
    await cache.deletePattern('route:/api/transferencias*')
  },

  // Invalida cache de documentos
  documentos: async () => {
    await cache.deletePattern('documentos:*')
    await cache.deletePattern('route:/api/documentos*')
  },

  // Invalida cache de usuários
  users: async () => {
    await cache.deletePattern('users:*')
    await cache.deletePattern('route:/api/users*')
  },

  // Invalida tudo
  all: async () => {
    await cache.deletePattern('*')
  },
}

/**
 * Estatísticas do cache
 */
export async function getCacheStats(): Promise<{
  keys: number
  memory: string
  hits: number
  misses: number
}> {
  try {
    const info = await redis.info('stats')
    const memory = await redis.info('memory')

    // Parse info
    const stats = {
      keys: await redis.dbsize(),
      memory: memory.match(/used_memory_human:(.+)/)?.[1] || 'N/A',
      hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0'),
      misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0'),
    }

    return stats
  } catch (error) {
    return { keys: 0, memory: 'N/A', hits: 0, misses: 0 }
  }
}

