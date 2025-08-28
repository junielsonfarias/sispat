import express from 'express'
import { authenticateToken, requireSuperuser } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { rateLimiter } from '../middleware/rate-limiter.js'
import { logInfo, logWarning } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação a todas as rotas
router.use(authenticateToken)
router.use(requireSuperuser) // Apenas superusers podem gerenciar rate limiting

// GET /rate-limit-admin/stats/:ip - Obter estatísticas de rate limiting para um IP
router.get('/stats/:ip', asyncHandler(async (req, res) => {
  const { ip } = req.params
  
  logInfo('Consultando estatísticas de rate limit', {
    userId: req.user.id,
    targetIP: ip
  })
  
  const stats = await rateLimiter.getStats(ip)
  
  res.json({
    success: true,
    data: {
      ip,
      stats,
      timestamp: new Date().toISOString()
    }
  })
}))

// POST /rate-limit-admin/reset/:ip - Resetar rate limit para um IP
router.post('/reset/:ip', asyncHandler(async (req, res) => {
  const { ip } = req.params
  const { type = 'all' } = req.body
  
  logWarning('Reset de rate limit solicitado', {
    userId: req.user.id,
    targetIP: ip,
    type
  })
  
  await rateLimiter.resetIP(ip, type)
  
  res.json({
    success: true,
    message: `Rate limit resetado para IP ${ip}`,
    data: {
      ip,
      type,
      resetBy: req.user.id,
      timestamp: new Date().toISOString()
    }
  })
}))

// POST /rate-limit-admin/whitelist/add - Adicionar IP à whitelist
router.post('/whitelist/add', asyncHandler(async (req, res) => {
  const { ip, reason } = req.body
  
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'IP é obrigatório'
    })
  }
  
  logWarning('IP adicionado à whitelist', {
    userId: req.user.id,
    ip,
    reason
  })
  
  rateLimiter.addToWhitelist(ip)
  
  res.json({
    success: true,
    message: `IP ${ip} adicionado à whitelist`,
    data: {
      ip,
      reason,
      addedBy: req.user.id,
      timestamp: new Date().toISOString()
    }
  })
}))

// POST /rate-limit-admin/whitelist/remove - Remover IP da whitelist
router.post('/whitelist/remove', asyncHandler(async (req, res) => {
  const { ip, reason } = req.body
  
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'IP é obrigatório'
    })
  }
  
  logWarning('IP removido da whitelist', {
    userId: req.user.id,
    ip,
    reason
  })
  
  rateLimiter.removeFromWhitelist(ip)
  
  res.json({
    success: true,
    message: `IP ${ip} removido da whitelist`,
    data: {
      ip,
      reason,
      removedBy: req.user.id,
      timestamp: new Date().toISOString()
    }
  })
}))

// GET /rate-limit-admin/config - Obter configuração atual de rate limiting
router.get('/config', asyncHandler(async (req, res) => {
  const config = {
    limits: {
      general: { points: 100, duration: 60, blockDuration: 60 },
      auth: { points: 5, duration: 60, blockDuration: 300 },
      critical: { points: 30, duration: 60, blockDuration: 120 },
      upload: { points: 10, duration: 300, blockDuration: 600 },
      reports: { points: 5, duration: 300, blockDuration: 600 },
      public: { points: 200, duration: 60, blockDuration: 30 }
    },
    features: {
      redisEnabled: rateLimiter.limiters.size > 0,
      whitelistEnabled: true,
      securityLogging: true
    },
    status: {
      initialized: rateLimiter.initialized,
      limitersCount: rateLimiter.limiters.size
    }
  }
  
  res.json({
    success: true,
    data: config
  })
}))

// GET /rate-limit-admin/blocked-ips - Obter lista de IPs atualmente bloqueados
router.get('/blocked-ips', asyncHandler(async (req, res) => {
  // Esta é uma implementação simplificada
  // Em produção, você poderia manter uma lista de IPs bloqueados no Redis
  
  const blockedIPs = []
  
  // TODO: Implementar consulta real de IPs bloqueados no Redis
  // Por enquanto, retornar estrutura vazia
  
  res.json({
    success: true,
    data: {
      blockedIPs,
      total: blockedIPs.length,
      timestamp: new Date().toISOString()
    }
  })
}))

// GET /rate-limit-admin/recent-blocks - Obter bloqueios recentes
router.get('/recent-blocks', asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query
  
  // Esta seria uma implementação mais complexa que requereria
  // armazenar histórico de bloqueios no Redis ou banco de dados
  
  const recentBlocks = []
  
  // TODO: Implementar consulta de bloqueios recentes
  // Por enquanto, retornar estrutura vazia
  
  res.json({
    success: true,
    data: {
      recentBlocks,
      total: recentBlocks.length,
      limit: parseInt(limit),
      timestamp: new Date().toISOString()
    }
  })
}))

// POST /rate-limit-admin/test - Testar rate limiting (para debugging)
router.post('/test', asyncHandler(async (req, res) => {
  const { ip, type = 'general' } = req.body
  
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'IP é obrigatório para teste'
    })
  }
  
  logInfo('Teste de rate limit solicitado', {
    userId: req.user.id,
    testIP: ip,
    type
  })
  
  const stats = await rateLimiter.getStats(ip)
  
  res.json({
    success: true,
    message: 'Teste de rate limit executado',
    data: {
      ip,
      type,
      stats: stats[type] || {},
      testedBy: req.user.id,
      timestamp: new Date().toISOString()
    }
  })
}))

export default router
