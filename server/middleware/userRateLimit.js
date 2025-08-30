import { rateLimit } from 'express-rate-limit';

// Rate limiting por usuário autenticado
export const userRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: req => {
    // Usuários admin têm limite maior
    if (req.user && req.user.role === 'admin') {
      return 1000; // 1000 requests por 15 min
    }
    // Usuários normais
    if (req.user && req.user.role === 'user') {
      return 500; // 500 requests por 15 min
    }
    // Usuários não autenticados
    return 100; // 100 requests por 15 min
  },
  message: {
    error: 'Limite de requisições excedido para este usuário',
    code: 'USER_RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil((15 * 60) / 1000), // 15 minutos em segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    // Usar ID do usuário se autenticado, senão IP
    return req.user ? req.user.id : req.ip;
  },
  skip: req => {
    // Pular rate limiting para health checks
    return req.path === '/api/health' || req.path === '/api/public/health';
  },
});

// Rate limiting específico para operações críticas
export const criticalOperationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 operações críticas por 5 min
  message: {
    error: 'Muitas operações críticas. Tente novamente em 5 minutos.',
    code: 'CRITICAL_OPERATION_LIMIT_EXCEEDED',
  },
  keyGenerator: req => (req.user ? req.user.id : req.ip),
  skip: req => req.user && req.user.role === 'admin',
});

// Rate limiting para uploads
export const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Máximo 50 uploads por hora
  message: {
    error: 'Limite de uploads excedido. Tente novamente em 1 hora.',
    code: 'UPLOAD_LIMIT_EXCEEDED',
  },
  keyGenerator: req => (req.user ? req.user.id : req.ip),
});
