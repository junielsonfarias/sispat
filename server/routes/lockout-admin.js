import express from 'express'
import { getRows, query } from '../database/connection.js'
import { authenticateToken, requireAdmin, requireSuperuser } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { lockoutManager } from '../services/lockout-manager.js'
import { logInfo, logWarning } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação a todas as rotas
router.use(authenticateToken)

// GET /lockout-admin/stats - Obter estatísticas de lockout
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 hours' } = req.query
  
  // Inicializar se necessário
  if (!lockoutManager.initialized) {
    await lockoutManager.initialize()
  }
  
  const stats = await lockoutManager.getLockoutStats(timeframe)
  
  res.json({
    success: true,
    data: stats
  })
}))

// GET /lockout-admin/locked-users - Listar usuários bloqueados
router.get('/locked-users', requireAdmin, asyncHandler(async (req, res) => {
  const lockedUsers = await getRows(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.login_attempts,
      u.locked_until,
      m.name as municipality_name,
      EXTRACT(EPOCH FROM (u.locked_until - NOW())) * 1000 as remaining_ms
    FROM users u
    LEFT JOIN municipalities m ON u.municipality_id = m.id
    WHERE u.locked_until IS NOT NULL AND u.locked_until > NOW()
    ORDER BY u.locked_until DESC
  `)
  
  const enrichedUsers = lockedUsers.map(user => ({
    ...user,
    remainingTime: user.remaining_ms > 0 ? Math.ceil(user.remaining_ms / 60000) : 0, // minutos
    isExpired: user.remaining_ms <= 0
  }))
  
  res.json({
    success: true,
    data: {
      lockedUsers: enrichedUsers,
      total: enrichedUsers.length
    }
  })
}))

// POST /lockout-admin/unlock/:userId - Desbloquear usuário específico
router.post('/unlock/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { reason = 'admin_unlock' } = req.body
  
  logWarning('Desbloqueio manual solicitado', {
    adminUserId: req.user.id,
    adminEmail: req.user.email,
    targetUserId: userId,
    reason
  })
  
  // Inicializar se necessário
  if (!lockoutManager.initialized) {
    await lockoutManager.initialize()
  }
  
  const result = await lockoutManager.unlockUser(userId, req.user.id, reason)
  
  res.json({
    success: true,
    message: 'Usuário desbloqueado com sucesso',
    data: result
  })
}))

// POST /lockout-admin/unlock-all - Desbloquear todos os usuários
router.post('/unlock-all', requireSuperuser, asyncHandler(async (req, res) => {
  const { reason = 'admin_bulk_unlock' } = req.body
  
  logWarning('Desbloqueio em massa solicitado', {
    adminUserId: req.user.id,
    adminEmail: req.user.email,
    reason
  })
  
  const result = await query(`
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL 
    WHERE locked_until IS NOT NULL AND locked_until > NOW()
    RETURNING id, email, name
  `)
  
  // Log individual para cada usuário desbloqueado
  for (const user of result.rows) {
    logInfo('Usuário desbloqueado em massa', {
      userId: user.id,
      userEmail: user.email,
      adminUserId: req.user.id,
      reason
    })
  }
  
  res.json({
    success: true,
    message: `${result.rowCount} usuários desbloqueados com sucesso`,
    data: {
      unlockedCount: result.rowCount,
      users: result.rows
    }
  })
}))

// GET /lockout-admin/login-attempts - Histórico de tentativas de login
router.get('/login-attempts', requireAdmin, asyncHandler(async (req, res) => {
  const { 
    limit = 100, 
    offset = 0, 
    userId = null, 
    email = null,
    ipAddress = null,
    success = null,
    timeframe = '7 days'
  } = req.query
  
  let whereConditions = [`la.created_at > NOW() - INTERVAL '${timeframe}'`]
  let queryParams = []
  let paramIndex = 1
  
  if (userId) {
    whereConditions.push(`la.user_id = $${paramIndex}`)
    queryParams.push(userId)
    paramIndex++
  }
  
  if (email) {
    whereConditions.push(`la.email ILIKE $${paramIndex}`)
    queryParams.push(`%${email}%`)
    paramIndex++
  }
  
  if (ipAddress) {
    whereConditions.push(`la.ip_address = $${paramIndex}`)
    queryParams.push(ipAddress)
    paramIndex++
  }
  
  if (success !== null) {
    whereConditions.push(`la.success = $${paramIndex}`)
    queryParams.push(success === 'true')
    paramIndex++
  }
  
  // Adicionar limit e offset
  queryParams.push(limit, offset)
  
  const attempts = await getRows(`
    SELECT 
      la.*,
      u.name as user_name,
      m.name as municipality_name
    FROM login_attempts la
    LEFT JOIN users u ON la.user_id = u.id
    LEFT JOIN municipalities m ON la.municipality_id = m.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY la.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, queryParams)
  
  // Contar total
  const totalResult = await getRows(`
    SELECT COUNT(*) as total
    FROM login_attempts la
    WHERE ${whereConditions.join(' AND ')}
  `, queryParams.slice(0, -2)) // Remove limit e offset
  
  const total = parseInt(totalResult[0]?.total || 0)
  
  res.json({
    success: true,
    data: {
      attempts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    }
  })
}))

// GET /lockout-admin/suspicious-activity - Atividades suspeitas
router.get('/suspicious-activity', requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 hours' } = req.query
  
  // IPs com muitas tentativas falhadas
  const suspiciousIPs = await getRows(`
    SELECT 
      ip_address,
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE success = false) as failed_attempts,
      COUNT(DISTINCT email) as unique_emails,
      MIN(created_at) as first_attempt,
      MAX(created_at) as last_attempt
    FROM login_attempts
    WHERE created_at > NOW() - INTERVAL '${timeframe}'
    GROUP BY ip_address
    HAVING COUNT(*) FILTER (WHERE success = false) >= 10
    ORDER BY failed_attempts DESC
    LIMIT 20
  `)
  
  // Emails com muitas tentativas de IPs diferentes
  const suspiciousEmails = await getRows(`
    SELECT 
      email,
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE success = false) as failed_attempts,
      COUNT(DISTINCT ip_address) as unique_ips,
      MIN(created_at) as first_attempt,
      MAX(created_at) as last_attempt
    FROM login_attempts
    WHERE created_at > NOW() - INTERVAL '${timeframe}'
    AND email IS NOT NULL
    GROUP BY email
    HAVING COUNT(DISTINCT ip_address) >= 5
    ORDER BY unique_ips DESC
    LIMIT 20
  `)
  
  // Usuários com múltiplos lockouts
  const repeatedLockouts = await getRows(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      COUNT(*) as lockout_count,
      MAX(la.created_at) as last_lockout
    FROM users u
    JOIN login_attempts la ON u.id = la.user_id
    WHERE la.created_at > NOW() - INTERVAL '${timeframe}'
    AND la.failure_reason = 'invalid_password'
    GROUP BY u.id, u.name, u.email, u.role
    HAVING COUNT(*) >= 15  -- 3 lockouts * 5 tentativas
    ORDER BY lockout_count DESC
    LIMIT 10
  `)
  
  res.json({
    success: true,
    data: {
      timeframe,
      suspiciousIPs,
      suspiciousEmails,
      repeatedLockouts,
      summary: {
        suspiciousIPCount: suspiciousIPs.length,
        suspiciousEmailCount: suspiciousEmails.length,
        repeatedLockoutCount: repeatedLockouts.length
      }
    }
  })
}))

// POST /lockout-admin/reset-attempts/:userId - Reset tentativas de um usuário
router.post('/reset-attempts/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { reason = 'admin_reset' } = req.body
  
  const result = await query(`
    UPDATE users 
    SET login_attempts = 0
    WHERE id = $1 AND login_attempts > 0
    RETURNING id, email, name, login_attempts
  `, [userId])
  
  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado ou não possui tentativas para resetar'
    })
  }
  
  const user = result.rows[0]
  
  logInfo('Tentativas de login resetadas', {
    userId: user.id,
    userEmail: user.email,
    adminUserId: req.user.id,
    reason
  })
  
  res.json({
    success: true,
    message: 'Tentativas de login resetadas com sucesso',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }
  })
}))

// GET /lockout-admin/config - Obter configuração atual
router.get('/config', requireAdmin, asyncHandler(async (req, res) => {
  // Inicializar se necessário
  if (!lockoutManager.initialized) {
    await lockoutManager.initialize()
  }
  
  const config = {
    maxAttempts: lockoutManager.config.maxAttempts,
    lockoutDuration: lockoutManager.config.lockoutDuration / 60000, // em minutos
    cleanupInterval: lockoutManager.config.cleanupInterval,
    suspiciousThreshold: lockoutManager.config.suspiciousThreshold,
    notificationEnabled: lockoutManager.config.notificationEnabled,
    features: {
      automaticUnlock: true,
      suspiciousActivityDetection: true,
      detailedLogging: true,
      adminNotifications: false // TODO: implementar
    }
  }
  
  res.json({
    success: true,
    data: config
  })
}))

export default router
