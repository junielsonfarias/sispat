import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../services/redis-client.js';
import { logError, logInfo, logSecurity, logWarning } from '../utils/logger.js';

/**
 * Sistema de Rate Limiting Avançado
 * - Diferentes limites para diferentes endpoints
 * - Whitelist de IPs confiáveis
 * - Fallback para memória se Redis não estiver disponível
 * - Logs de segurança para tentativas bloqueadas
 */

// Configurações de rate limiting
const RATE_LIMIT_CONFIGS = {
  // Geral - para rotas não especificadas
  general: {
    points: 100, // Número de requests
    duration: 60, // Por minuto
    blockDuration: 60, // Bloquear por 1 minuto
  },

  // Login - mais restritivo
  auth: {
    points: 5, // 5 tentativas
    duration: 60, // Por minuto
    blockDuration: 300, // Bloquear por 5 minutos
  },

  // APIs críticas (patrimônios, transferências)
  critical: {
    points: 30, // 30 requests
    duration: 60, // Por minuto
    blockDuration: 120, // Bloquear por 2 minutos
  },

  // Upload de arquivos
  upload: {
    points: 10, // 10 uploads
    duration: 300, // Por 5 minutos
    blockDuration: 600, // Bloquear por 10 minutos
  },

  // Relatórios
  reports: {
    points: 5, // 5 relatórios
    duration: 300, // Por 5 minutos
    blockDuration: 600, // Bloquear por 10 minutos
  },

  // APIs públicas (health check, etc)
  public: {
    points: 200, // 200 requests
    duration: 60, // Por minuto
    blockDuration: 30, // Bloquear por 30 segundos
  },
};

// IPs na whitelist (não sofrem rate limiting)
const WHITELIST_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  // Adicionar IPs de servidores internos, monitoramento, etc.
  ...(process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || []),
]);

/**
 * Classe principal do Rate Limiter
 */
class AdvancedRateLimiter {
  constructor() {
    this.limiters = new Map();
    this.memoryFallback = new Map();
    this.initialized = false;
  }

  /**
   * Inicializar rate limiters
   */
  async initialize() {
    if (this.initialized) return;

    try {
      let redisAvailable = false;
      let client = null;

      // Tentar conectar Redis apenas se configurado
      if (
        process.env.REDIS_URL &&
        process.env.REDIS_URL !== 'redis://localhost:6379'
      ) {
        try {
          client = await redisClient.getClient();
          redisAvailable = client && redisClient.isAvailable();
        } catch (error) {
          logWarning('Redis não disponível, usando fallback de memória', {
            error: error.message,
          });
        }
      }

      // Criar rate limiters para cada configuração
      for (const [name, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
        let limiter;

        if (redisAvailable && client) {
          // Usar Redis se disponível
          limiter = new RateLimiterRedis({
            storeClient: client,
            keyPrefix: `rl_${name}`,
            points: config.points,
            duration: config.duration,
            blockDuration: config.blockDuration,
            execEvenly: true, // Distribuir requests uniformemente
          });

          logInfo(`Rate limiter ${name} configurado com Redis`, config);
        } else {
          // Fallback para memória (sempre funciona)
          limiter = new RateLimiterMemory({
            keyPrefix: `rl_${name}`,
            points: config.points,
            duration: config.duration,
            blockDuration: config.blockDuration,
          });

          logInfo(`Rate limiter ${name} configurado com memória`, config);
        }

        this.limiters.set(name, limiter);
      }

      this.initialized = true;
      logInfo('✅ Sistema de rate limiting inicializado', {
        limiters: Array.from(this.limiters.keys()),
        redisAvailable,
        whitelistIPs: Array.from(WHITELIST_IPS),
        mode: redisAvailable ? 'Redis' : 'Memory',
      });
    } catch (error) {
      logError('Erro ao inicializar rate limiter', error);

      // Fallback final - inicializar apenas com memória
      logWarning(
        'Inicializando rate limiter apenas com memória como fallback final'
      );

      for (const [name, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
        const limiter = new RateLimiterMemory({
          keyPrefix: `rl_${name}`,
          points: config.points,
          duration: config.duration,
          blockDuration: config.blockDuration,
        });
        this.limiters.set(name, limiter);
      }

      this.initialized = true;
      logInfo(
        'Rate limiting inicializado em modo de emergência (apenas memória)'
      );
    }
  }

  /**
   * Verificar se IP está na whitelist
   */
  isWhitelisted(ip) {
    return (
      WHITELIST_IPS.has(ip) || WHITELIST_IPS.has(ip.replace(/^::ffff:/, ''))
    ); // IPv4 mapeado em IPv6
  }

  /**
   * Obter IP real do cliente
   */
  getClientIP(req) {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      '127.0.0.1'
    );
  }

  /**
   * Determinar tipo de rate limiting baseado na rota
   */
  getLimiterType(req) {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Health checks e rotas públicas
    if (path.includes('/health') || path.includes('/debug/info')) {
      return 'public';
    }

    // Autenticação (mais restritivo)
    if (path.includes('/api/auth')) {
      return 'auth';
    }

    // Upload de arquivos
    if (
      path.includes('/api/uploads') ||
      (method === 'POST' &&
        req.headers['content-type']?.includes('multipart/form-data'))
    ) {
      return 'upload';
    }

    // Relatórios (muito restritivo)
    if (
      path.includes('/api/reports') ||
      path.includes('/export') ||
      path.includes('/report')
    ) {
      return 'reports';
    }

    // APIs críticas (patrimônios, transferências, usuários)
    if (
      path.includes('/api/patrimonios') ||
      path.includes('/api/transfers') ||
      path.includes('/api/users') ||
      path.includes('/api/backup-enhanced') ||
      path.includes('/api/database')
    ) {
      return 'critical';
    }

    // Geral para outras rotas
    return 'general';
  }

  /**
   * Middleware principal de rate limiting
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Inicializar se necessário
        if (!this.initialized) {
          await this.initialize();
        }

        const clientIP = this.getClientIP(req);

        // Verificar whitelist
        if (this.isWhitelisted(clientIP)) {
          return next();
        }

        const limiterType = this.getLimiterType(req);
        const limiter = this.limiters.get(limiterType);

        if (!limiter) {
          logWarning('Rate limiter não encontrado para tipo', {
            type: limiterType,
          });
          return next();
        }

        // Criar chave única por IP
        const key = `${clientIP}`;

        try {
          // Tentar consumir um ponto
          const result = await limiter.consume(key);

          // Adicionar headers informativos
          res.set({
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS[limiterType].points,
            'X-RateLimit-Remaining': result.remainingPoints,
            'X-RateLimit-Reset': new Date(
              Date.now() + result.msBeforeNext
            ).toISOString(),
          });

          return next();
        } catch (rateLimiterRes) {
          // Rate limit excedido
          const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;

          // Log de segurança
          logSecurity('Rate limit exceeded', 'warn', {
            ip: clientIP,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            limiterType,
            blockedFor: `${secs}s`,
            totalHits: rateLimiterRes.totalHits,
            remainingPoints: rateLimiterRes.remainingPoints,
          });

          res.set({
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS[limiterType].points,
            'X-RateLimit-Remaining': rateLimiterRes.remainingPoints || 0,
            'X-RateLimit-Reset': new Date(
              Date.now() + rateLimiterRes.msBeforeNext
            ).toISOString(),
            'Retry-After': secs,
          });

          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message:
                'Muitas requisições. Tente novamente em alguns segundos.',
              retryAfter: secs,
              type: limiterType,
            },
          });
        }
      } catch (error) {
        logError('Erro no middleware de rate limiting', error, {
          ip: this.getClientIP(req),
          path: req.path,
        });

        // Em caso de erro, permitir a requisição para não quebrar o sistema
        return next();
      }
    };
  }

  /**
   * Middleware específico para diferentes tipos
   */
  authLimiter() {
    return this.createSpecificLimiter('auth');
  }

  criticalLimiter() {
    return this.createSpecificLimiter('critical');
  }

  uploadLimiter() {
    return this.createSpecificLimiter('upload');
  }

  reportsLimiter() {
    return this.createSpecificLimiter('reports');
  }

  /**
   * Criar middleware específico para um tipo
   */
  createSpecificLimiter(type) {
    return async (req, res, next) => {
      // Forçar o tipo específico
      req._rateLimiterType = type;
      return this.middleware()(req, res, next);
    };
  }

  /**
   * Resetar rate limit para um IP (função administrativa)
   */
  async resetIP(ip, type = 'all') {
    try {
      if (type === 'all') {
        // Resetar todos os tipos para o IP
        for (const [limiterName, limiter] of this.limiters) {
          await limiter.delete(ip);
        }
        logInfo('Rate limit resetado para IP', { ip, type: 'all' });
      } else {
        // Resetar tipo específico
        const limiter = this.limiters.get(type);
        if (limiter) {
          await limiter.delete(ip);
          logInfo('Rate limit resetado para IP', { ip, type });
        }
      }
    } catch (error) {
      logError('Erro ao resetar rate limit', error, { ip, type });
    }
  }

  /**
   * Obter estatísticas de rate limiting para um IP
   */
  async getStats(ip) {
    const stats = {};

    try {
      for (const [type, limiter] of this.limiters) {
        try {
          const result = await limiter.get(ip);
          stats[type] = {
            totalHits: result?.totalHits || 0,
            remainingPoints:
              result?.remainingPoints || RATE_LIMIT_CONFIGS[type].points,
            msBeforeNext: result?.msBeforeNext || 0,
            isBlocked:
              (result?.remainingPoints || RATE_LIMIT_CONFIGS[type].points) <= 0,
          };
        } catch (error) {
          stats[type] = { error: error.message };
        }
      }
    } catch (error) {
      logError('Erro ao obter estatísticas de rate limit', error, { ip });
    }

    return stats;
  }

  /**
   * Adicionar IP à whitelist dinamicamente
   */
  addToWhitelist(ip) {
    WHITELIST_IPS.add(ip);
    logInfo('IP adicionado à whitelist', { ip });
  }

  /**
   * Remover IP da whitelist
   */
  removeFromWhitelist(ip) {
    WHITELIST_IPS.delete(ip);
    logInfo('IP removido da whitelist', { ip });
  }
}

// Instância singleton
export const rateLimiter = new AdvancedRateLimiter();

// Middleware principal
export const rateLimitMiddleware = rateLimiter.middleware();

// Middlewares específicos
export const authRateLimit = rateLimiter.authLimiter();
export const criticalRateLimit = rateLimiter.criticalLimiter();
export const uploadRateLimit = rateLimiter.uploadLimiter();
export const reportsRateLimit = rateLimiter.reportsLimiter();

export default rateLimiter;
