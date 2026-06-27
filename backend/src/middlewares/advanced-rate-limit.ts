import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

// Cliente Redis para rate limiting
// ✅ Usar a mesma instância do Redis configurada no sistema
import { getRedis } from '../config/redis'
import { logInfo, logWarn, logError } from '../config/logger'
import { maskEmail } from '../utils/mask'

const redis = getRedis() // Pode retornar null se Redis não estiver disponível

/**
 * Rate limiter global para toda a API
 * ✅ CORREÇÃO: Desabilitar rate limiting para requisições GET autenticadas
 * (permitir carregamento inicial do frontend sem limites)
 * Manter proteção apenas para requisições não autenticadas e operações de escrita
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // Limite alto para não autenticados (será ignorado para autenticados via skip)
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
  
  // ✅ CORREÇÃO: Não aplicar rate limit em:
  // - Health checks
  // - Rotas públicas
  // - Rotas de autenticação (têm seu próprio rate limiter)
  // - Requisições GET autenticadas (permitir carregamento inicial)
  skip: (req: any) => {
    // Health checks e rotas públicas
    if (req.path.startsWith('/api/health') || 
        req.path.startsWith('/health') ||
        req.path.startsWith('/api/public')) {
      return true
    }
    
    // ✅ CORREÇÃO: Rotas de autenticação têm seu próprio rate limiter
    if (req.path.startsWith('/api/auth')) {
      return true
    }
    
    // Requisições GET autenticadas: SEM rate limiting
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ') && req.method === 'GET') {
      return true
    }
    
    return false
  },
  
  // Handler customizado para quando exceder
  handler: (req: any, res) => {
    logWarn('Rate limit excedido', {
      ip: req.ip,
      method: req.method,
      path: req.path,
    })

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
    logError('Possível brute force attack', undefined, {
      ip: req.ip,
      // email é controlado pelo atacante; mascarar p/ não persistir PII de vítima
      email: maskEmail(req.body?.email) || 'unknown',
    })

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
 * Rate limiter para rotas públicas (`/api/public/*`).
 * Como esses endpoints são acessíveis sem autenticação, são alvo natural
 * de scraping/DDoS. Limita por IP a 120 req/min (suficiente para uso
 * humano normal, restritivo para bots agressivos).
 */
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,

  store: redis
    ? new RedisStore({
        // @ts-expect-error - tipos do RedisStore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:public:',
      })
    : undefined,

  message: {
    error: 'Too Many Requests',
    message: 'Limite de acessos à consulta pública atingido. Aguarde alguns segundos.',
  },

  handler: (req: any, res) => {
    logWarn('Rate limit (público) excedido', {
      ip: req.ip,
      method: req.method,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Limite de acessos à consulta pública atingido.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now() + 60000) / 1000),
    });
  },
});

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
  logInfo('ℹ️  Rate limiting usando memória (Redis não disponível)')
}

export default {
  globalRateLimiter,
  authRateLimiter,
  writeRateLimiter,
  publicRateLimiter,
  uploadRateLimiter,
  reportRateLimiter,
  isRedisAvailable,
}

