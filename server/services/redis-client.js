import { createClient } from 'redis'
import { logError, logInfo, logWarning } from '../utils/logger.js'

/**
 * Cliente Redis singleton para cache e rate limiting
 */
class RedisClient {
  constructor() {
    this.client = null
    this.isConnected = false
    this.retryCount = 0
    this.maxRetries = 5
  }

  /**
   * Conectar ao Redis
   */
  async connect() {
    if (this.isConnected) {
      return this.client
    }

    try {
      // Configurar cliente Redis
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      
      this.client = createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logError('Redis connection refused')
          }
          
          if (options.total_retry_time > 1000 * 60 * 60) {
            logError('Redis retry time exhausted')
            return new Error('Retry time exhausted')
          }
          
          if (options.attempt > 10) {
            logError('Redis max retry attempts reached')
            return undefined
          }
          
          // Retry after
          return Math.min(options.attempt * 100, 3000)
        }
      })

      // Event listeners
      this.client.on('error', (err) => {
        logError('Redis Client Error', err)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        logInfo('Redis Client conectado')
        this.isConnected = true
        this.retryCount = 0
      })

      this.client.on('disconnect', () => {
        logWarning('Redis Client desconectado')
        this.isConnected = false
      })

      this.client.on('reconnecting', () => {
        logInfo('Redis Client reconectando...')
      })

      // Conectar
      await this.client.connect()
      
      // Testar conexão
      await this.client.ping()
      
      logInfo('✅ Redis conectado com sucesso', {
        url: redisUrl,
        status: 'connected'
      })

      return this.client

    } catch (error) {
      this.retryCount++
      logError('Erro ao conectar com Redis', error, {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      })

      if (this.retryCount < this.maxRetries) {
        logInfo(`Tentando reconectar em 5 segundos... (${this.retryCount}/${this.maxRetries})`)
        setTimeout(() => this.connect(), 5000)
      } else {
        logError('Máximo de tentativas de conexão Redis atingido - funcionando sem cache')
      }

      return null
    }
  }

  /**
   * Obter cliente Redis (conecta se necessário)
   */
  async getClient() {
    if (!this.isConnected || !this.client) {
      return await this.connect()
    }
    return this.client
  }

  /**
   * Verificar se Redis está disponível
   */
  isAvailable() {
    return this.isConnected && this.client
  }

  /**
   * Desconectar Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect()
        logInfo('Redis desconectado')
      } catch (error) {
        logError('Erro ao desconectar Redis', error)
      }
    }
  }

  /**
   * Executar comando Redis com fallback
   */
  async execute(command, ...args) {
    try {
      const client = await this.getClient()
      if (!client) {
        return null // Fallback silencioso
      }

      return await client[command](...args)
    } catch (error) {
      logError(`Erro ao executar comando Redis: ${command}`, error)
      return null // Fallback silencioso
    }
  }

  /**
   * Set com TTL
   */
  async set(key, value, ttl = 3600) {
    return await this.execute('setEx', key, ttl, JSON.stringify(value))
  }

  /**
   * Get
   */
  async get(key) {
    try {
      const result = await this.execute('get', key)
      return result ? JSON.parse(result) : null
    } catch (error) {
      logError('Erro ao fazer parse do valor Redis', error, { key })
      return null
    }
  }

  /**
   * Delete
   */
  async del(key) {
    return await this.execute('del', key)
  }

  /**
   * Increment
   */
  async incr(key) {
    return await this.execute('incr', key)
  }

  /**
   * Expire
   */
  async expire(key, seconds) {
    return await this.execute('expire', key, seconds)
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    return await this.execute('exists', key)
  }
}

// Instância singleton
export const redisClient = new RedisClient()

// Conectar automaticamente na inicialização APENAS se Redis estiver configurado
if (process.env.NODE_ENV !== 'test' && process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
  redisClient.connect().catch(error => {
    logWarning('Redis não disponível - funcionando sem cache', { error: error.message })
  })
} else {
  logInfo('Redis desabilitado - usando fallback de memória para rate limiting')
}

export default redisClient
