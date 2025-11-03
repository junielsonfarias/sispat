import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

// Cliente Redis para rate limiting
// ✅ Usar a mesma instância do Redis configurada no sistema
import { getRedis } from '../config/redis'

const redis = getRedis() // Pode retornar null se Redis não estiver disponível

/**
 * Rate limiter global para toda a API
 * 100 requests por 15 minutos por IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  
  // Usar Redis se disponível, senão memória
  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:global:',
      })
    : undefined,
  
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em alguns minutos.',
    retryAfter: 'Disponível novamente em',
  },
  
  // Não aplicar rate limit em health checks
  skip: (req) => {
    return req.path.startsWith('/api/health') || req.path.startsWith('/health')
  },
  
  // Handler customizado para quando exceder
  handler: (req: any, res) => {
    console.warn(`⚠️ Rate limit exceeded: ${req.ip} → ${req.path}`)
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Você excedeu o limite de requisições. Tente novamente mais tarde.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now() + 60000) / 1000),
    })
  },
})

/**
 * Rate limiter para autenticação (proteção contra brute force)
 * 5 tentativas por 15 minutos
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  
  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:auth:',
      })
    : undefined,
  
  message: {
    error: 'Muitas tentativas de login. Aguarde 15 minutos.',
  },
  
  handler: (req: any, res) => {
    console.error(`🚨 Possível brute force attack: ${req.ip} → ${req.body?.email || 'unknown'}`)
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de login. Por segurança, aguarde 15 minutos.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now() + 900000) / 1000),
    })
  },
})

/**
 * Rate limiter para operações de escrita (POST/PUT/DELETE)
 * 30 requests por minuto
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  
  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:write:',
      })
    : undefined,
  
  message: 'Limite de operações de escrita excedido. Aguarde alguns segundos.',
  
  // Aplicar apenas em métodos de escrita
  skip: (req) => req.method === 'GET',
})

/**
 * Rate limiter para uploads de arquivo
 * 10 uploads por hora
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  
  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:upload:',
      })
    : undefined,
  
  message: 'Limite de uploads excedido. Aguarde antes de enviar mais arquivos.',
})

/**
 * Rate limiter para geração de relatórios/PDFs
 * 20 por hora (operações custosas)
 */
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  
  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:report:',
      })
    : undefined,
  
  message: 'Limite de geração de relatórios excedido. Aguarde alguns minutos.',
})

// Helper para verificar se Redis está disponível
export const isRedisAvailable = (): boolean => {
  return redis !== null && redis.status === 'ready'
}

// Log de status do Redis (eventos já são gerenciados em config/redis.ts)
if (!redis) {
  console.log('ℹ️  Rate limiting usando memória (Redis não disponível)')
}

export default {
  globalRateLimiter,
  authRateLimiter,
  writeRateLimiter,
  uploadRateLimiter,
  reportRateLimiter,
  isRedisAvailable,
}

