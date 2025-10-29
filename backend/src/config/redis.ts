/**
 * Configuração do Redis para Cache
 * 
 * Este arquivo contém a configuração e utilitários para cache Redis
 */

import Redis from 'ioredis'

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db: number
  retryDelayOnFailover: number
  maxRetriesPerRequest: number
  lazyConnect: boolean
  keepAlive: number
  connectTimeout: number
  commandTimeout: number
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
}

// Instância do Redis
let redis: Redis | null = null

/**
 * Inicializar conexão com Redis
 */
export function initializeRedis(): Redis {
  if (redis) {
    return redis
  }

  try {
    redis = new Redis(redisConfig)
    
    redis.on('connect', () => {
      console.log('✅ Redis conectado com sucesso')
    })
    
    redis.on('error', (error) => {
      console.error('❌ Erro no Redis:', error)
    })
    
    redis.on('close', () => {
      console.log('⚠️ Conexão Redis fechada')
    })
    
    redis.on('reconnecting', () => {
      console.log('🔄 Reconectando ao Redis...')
    })
    
    return redis
  } catch (error) {
    console.error('❌ Erro ao inicializar Redis:', error)
    throw error
  }
}

/**
 * Obter instância do Redis
 */
export function getRedis(): Redis {
  if (!redis) {
    return initializeRedis()
  }
  return redis
}

/**
 * Fechar conexão com Redis
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

/**
 * Classe para gerenciar cache Redis
 */
export class RedisCache {
  private redis: Redis
  private defaultTTL: number

  constructor(defaultTTL = 300) { // 5 minutos por padrão
    this.redis = getRedis()
    this.defaultTTL = defaultTTL
  }

  /**
   * Definir valor no cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      const expiration = ttl || this.defaultTTL
      
      await this.redis.setex(key, expiration, serializedValue)
    } catch (error) {
      console.error(`Erro ao definir cache para chave ${key}:`, error)
    }
  }

  /**
   * Obter valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      
      if (!value) {
        return null
      }
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Erro ao obter cache para chave ${key}:`, error)
      return null
    }
  }

  /**
   * Verificar se chave existe no cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Erro ao verificar existência da chave ${key}:`, error)
      return false
    }
  }

  /**
   * Deletar chave do cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error(`Erro ao deletar cache para chave ${key}:`, error)
    }
  }

  /**
   * Deletar múltiplas chaves por padrão
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Erro ao deletar cache por padrão ${pattern}:`, error)
    }
  }

  /**
   * Definir TTL para uma chave
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl)
    } catch (error) {
      console.error(`Erro ao definir TTL para chave ${key}:`, error)
    }
  }

  /**
   * Obter TTL de uma chave
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key)
    } catch (error) {
      console.error(`Erro ao obter TTL para chave ${key}:`, error)
      return -1
    }
  }

  /**
   * Incrementar valor numérico
   */
  async increment(key: string, value = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, value)
    } catch (error) {
      console.error(`Erro ao incrementar chave ${key}:`, error)
      return 0
    }
  }

  /**
   * Decrementar valor numérico
   */
  async decrement(key: string, value = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, value)
    } catch (error) {
      console.error(`Erro ao decrementar chave ${key}:`, error)
      return 0
    }
  }

  /**
   * Obter estatísticas do cache
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory')
      const keyspace = await this.redis.info('keyspace')
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas do Redis:', error)
      return null
    }
  }

  /**
   * Limpar todo o cache
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall()
    } catch (error) {
      console.error('Erro ao limpar cache:', error)
    }
  }

  /**
   * Obter todas as chaves por padrão
   */
  async getKeys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern)
    } catch (error) {
      console.error(`Erro ao obter chaves por padrão ${pattern}:`, error)
      return []
    }
  }
}

// Instância global do cache
export const redisCache = new RedisCache()

/**
 * Utilitários para cache com prefixos
 */
export class CacheUtils {
  private static readonly PREFIXES = {
    PATRIMONIOS: 'patrimonios:',
    IMOVEIS: 'imoveis:',
    TRANSFERENCIAS: 'transferencias:',
    DOCUMENTOS: 'documentos:',
    USERS: 'users:',
    SECTORS: 'sectors:',
    LOCAIS: 'locais:',
    DASHBOARD: 'dashboard:',
    STATS: 'stats:',
  }

  /**
   * Gerar chave de cache para patrimônios
   */
  static getPatrimoniosKey(filters: any): string {
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64')
    return `${this.PREFIXES.PATRIMONIOS}${hash}`
  }

  /**
   * Gerar chave de cache para imóveis
   */
  static getImoveisKey(filters: any): string {
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64')
    return `${this.PREFIXES.IMOVEIS}${hash}`
  }

  /**
   * Gerar chave de cache para transferências
   */
  static getTransferenciasKey(filters: any): string {
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64')
    return `${this.PREFIXES.TRANSFERENCIAS}${hash}`
  }

  /**
   * Gerar chave de cache para documentos
   */
  static getDocumentosKey(filters: any): string {
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64')
    return `${this.PREFIXES.DOCUMENTOS}${hash}`
  }

  /**
   * Gerar chave de cache para dashboard
   */
  static getDashboardKey(userId: string, municipalityId: string): string {
    return `${this.PREFIXES.DASHBOARD}${municipalityId}:${userId}`
  }

  /**
   * Gerar chave de cache para estatísticas
   */
  static getStatsKey(type: string, municipalityId: string): string {
    return `${this.PREFIXES.STATS}${type}:${municipalityId}`
  }

  /**
   * Invalidar cache por prefixo
   */
  static async invalidateByPrefix(prefix: string): Promise<void> {
    await redisCache.deletePattern(`${prefix}*`)
  }

  /**
   * Invalidar cache de patrimônios
   */
  static async invalidatePatrimonios(): Promise<void> {
    await this.invalidateByPrefix(this.PREFIXES.PATRIMONIOS)
  }

  /**
   * Invalidar cache de imóveis
   */
  static async invalidateImoveis(): Promise<void> {
    await this.invalidateByPrefix(this.PREFIXES.IMOVEIS)
  }

  /**
   * Invalidar cache de transferências
   */
  static async invalidateTransferencias(): Promise<void> {
    await this.invalidateByPrefix(this.PREFIXES.TRANSFERENCIAS)
  }

  /**
   * Invalidar cache de documentos
   */
  static async invalidateDocumentos(): Promise<void> {
    await this.invalidateByPrefix(this.PREFIXES.DOCUMENTOS)
  }

  /**
   * Invalidar cache de dashboard
   */
  static async invalidateDashboard(municipalityId: string): Promise<void> {
    await this.invalidateByPrefix(`${this.PREFIXES.DASHBOARD}${municipalityId}`)
  }

  /**
   * Invalidar todo o cache
   */
  static async invalidateAll(): Promise<void> {
    await redisCache.flushAll()
  }
}

/**
 * Middleware para cache automático
 */
export function cacheMiddleware(ttl = 300) {
  return async (req: any, res: any, next: any) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`
    
    try {
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
          console.log(`💾 Cache set: ${cacheKey}`)
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

export default redisCache