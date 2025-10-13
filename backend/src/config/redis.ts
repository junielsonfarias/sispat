/**
 * Configuração do Redis para cache e sessões
 * 
 * Para habilitar:
 * 1. Instalar Redis: npm install ioredis
 * 2. Iniciar Redis: docker run -d -p 6379:6379 redis:alpine
 * 3. Adicionar REDIS_URL no .env
 * 4. Descomentar código abaixo
 */

// Descomentar após instalar ioredis
/*
import Redis from 'ioredis'
import { logInfo, logError } from './logger'

// Configuração do Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
}

// Cliente Redis
export const redis = new Redis(redisConfig)

// Event listeners
redis.on('connect', () => {
  logInfo('Redis connected successfully')
})

redis.on('error', (error) => {
  logError('Redis connection error', error)
})

redis.on('ready', () => {
  logInfo('Redis is ready to accept commands')
})

// ============================================
// CACHE FUNCTIONS
// ============================================

export const cache = {
  // Get com fallback
  async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      
      if (cached) {
        return JSON.parse(cached) as T
      }
      
      if (fallback) {
        const data = await fallback()
        await this.set(key, data, 300) // Cache 5 minutos
        return data
      }
      
      return null
    } catch (error) {
      logError('Cache get error', error as Error)
      return fallback ? await fallback() : null
    }
  },

  // Set com TTL
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logError('Cache set error', error as Error)
    }
  },

  // Delete
  async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      logError('Cache delete error', error as Error)
    }
  },

  // Delete pattern
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      logError('Cache delete pattern error', error as Error)
    }
  },

  // Exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      return false
    }
  },
}

// ============================================
// SESSION CACHE
// ============================================

export const sessionCache = {
  // Salvar sessão
  async save(userId: string, token: string, ttl: number = 86400): Promise<void> {
    await cache.set(`session:${userId}`, token, ttl)
  },

  // Validar sessão
  async validate(userId: string, token: string): Promise<boolean> {
    const cached = await cache.get<string>(`session:${userId}`)
    return cached === token
  },

  // Invalidar sessão
  async invalidate(userId: string): Promise<void> {
    await cache.del(`session:${userId}`)
  },

  // Invalidar todas as sessões do usuário
  async invalidateAll(userId: string): Promise<void> {
    await cache.delPattern(`session:${userId}*`)
  },
}

// ============================================
// QUERY CACHE
// ============================================

export const queryCache = {
  // Cache de patrimonios
  patrimonios: {
    key: (filters?: any) => `patrimonios:${JSON.stringify(filters || {})}`,
    ttl: 5 * 60, // 5 minutos
    
    async get(filters?: any) {
      return cache.get(this.key(filters))
    },
    
    async set(data: any, filters?: any) {
      return cache.set(this.key(filters), data, this.ttl)
    },
    
    async invalidate() {
      return cache.delPattern('patrimonios:*')
    },
  },

  // Cache de setores (raramente mudam)
  sectors: {
    key: 'sectors:all',
    ttl: 30 * 60, // 30 minutos
    
    async get() {
      return cache.get(this.key)
    },
    
    async set(data: any) {
      return cache.set(this.key, data, this.ttl)
    },
    
    async invalidate() {
      return cache.del(this.key)
    },
  },

  // Cache de usuários
  users: {
    key: (id?: string) => id ? `user:${id}` : 'users:all',
    ttl: 10 * 60, // 10 minutos
    
    async get(id?: string) {
      return cache.get(this.key(id))
    },
    
    async set(data: any, id?: string) {
      return cache.set(this.key(id), data, this.ttl)
    },
    
    async invalidate(id?: string) {
      if (id) {
        return cache.del(this.key(id))
      }
      return cache.delPattern('user:*')
    },
  },
}

// ============================================
// RATE LIMITING CACHE
// ============================================

export const rateLimitCache = {
  // Incrementar contador
  async increment(key: string, windowMs: number): Promise<number> {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.pexpire(key, windowMs)
    }
    return count
  },

  // Verificar se atingiu limite
  async isLimited(key: string, max: number, windowMs: number): Promise<boolean> {
    const count = await this.increment(key, windowMs)
    return count > max
  },
}

export default redis
*/

// Fallback quando Redis não está configurado
export const redis = {
  get: async (key: string) => null,
  set: async (key: string, value: any) => {},
  del: async (key: string) => {},
  exists: async (key: string) => false,
}

export const cache = {
  get: async (key: string) => null,
  set: async (key: string, value: any, ttl?: number) => {},
  del: async (key: string) => {},
  delPattern: async (pattern: string) => {},
  exists: async (key: string) => false,
}

export const sessionCache = {
  save: async (userId: string, token: string, ttl?: number) => {},
  validate: async (userId: string, token: string) => false,
  invalidate: async (userId: string) => {},
  invalidateAll: async (userId: string) => {},
}

export const queryCache = {
  patrimonios: {
    get: async (filters?: any) => null,
    set: async (data: any, filters?: any) => {},
    invalidate: async () => {},
  },
  sectors: {
    get: async () => null,
    set: async (data: any) => {},
    invalidate: async () => {},
  },
}

export const rateLimitCache = {
  increment: async (key: string, windowMs: number) => 0,
  isLimited: async (key: string, max: number, windowMs: number) => false,
}

console.log('ℹ️ Redis: Modo fallback (instale ioredis e configure para habilitar)')

export default redis

