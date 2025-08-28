import express from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import auditService from '../services/audit.js'
import { logError } from '../utils/logger.js'

const router = express.Router()

// Todas as rotas requerem autenticação e privilégios de admin
router.use(authenticateToken)
router.use(requireAdmin)

// GET /api/audit/logs - Listar logs de auditoria
router.get('/logs', async (req, res) => {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      severity,
      category,
      municipalityId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = req.query

    const filters = {
      userId: userId || null,
      action: action || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      severity: severity || null,
      category: category || null,
      municipalityId: municipalityId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy,
      orderDirection: orderDirection.toUpperCase()
    }

    const logs = await auditService.getAuditLogs(filters)

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: logs.length
      }
    })
  } catch (error) {
    logError('Erro ao buscar logs de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/stats - Obter estatísticas de auditoria
router.get('/stats', async (req, res) => {
  try {
    const { municipalityId, startDate, endDate } = req.query

    const filters = {
      municipalityId: municipalityId || null,
      startDate: startDate || null,
      endDate: endDate || null
    }

    const stats = await auditService.getAuditStats(filters)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logError('Erro ao buscar estatísticas de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/export - Exportar logs de auditoria
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Formato não suportado. Use "csv" ou "json"'
      })
    }

    const data = await auditService.exportAuditLogs(format, filters)

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(data)
  } catch (error) {
    logError('Erro ao exportar logs de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// POST /api/audit/cleanup - Limpar logs antigos
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body

    const deletedCount = await auditService.cleanupOldLogs(parseInt(retentionDays))

    res.json({
      success: true,
      message: `Limpeza concluída. ${deletedCount} registros removidos.`,
      deletedCount
    })
  } catch (error) {
    logError('Erro ao limpar logs de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/actions - Listar ações disponíveis
router.get('/actions', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `

    const result = await auditService.pool.query(query)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    logError('Erro ao buscar ações de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/resources - Listar tipos de recursos
router.get('/resources', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT resource_type, COUNT(*) as count
      FROM audit_logs
      GROUP BY resource_type
      ORDER BY count DESC
    `

    const result = await auditService.pool.query(query)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    logError('Erro ao buscar recursos de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/users - Listar usuários com atividade
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
        user_id,
        user_email,
        COUNT(*) as total_actions,
        MAX(created_at) as last_activity,
        COUNT(DISTINCT action) as unique_actions
      FROM audit_logs
      WHERE user_id IS NOT NULL
      GROUP BY user_id, user_email
      ORDER BY total_actions DESC
      LIMIT 50
    `

    const result = await auditService.pool.query(query)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    logError('Erro ao buscar usuários de auditoria', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/security-events - Listar eventos de segurança
router.get('/security-events', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const query = `
      SELECT 
        id, user_id, user_email, action, description, severity,
        ip_address, user_agent, created_at, metadata
      FROM audit_logs
      WHERE category = 'security'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `

    const result = await auditService.pool.query(query, [parseInt(limit), parseInt(offset)])

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    })
  } catch (error) {
    logError('Erro ao buscar eventos de segurança', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// GET /api/audit/activity-summary - Resumo de atividade por período
router.get('/activity-summary', async (req, res) => {
  try {
    const { period = '7d' } = req.query

    let interval
    switch (period) {
      case '1d':
        interval = '1 day'
        break
      case '7d':
        interval = '7 days'
        break
      case '30d':
        interval = '30 days'
        break
      case '90d':
        interval = '90 days'
        break
      default:
        interval = '7 days'
    }

    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity
      FROM audit_logs
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `

    const result = await auditService.pool.query(query)

    res.json({
      success: true,
      data: result.rows,
      period
    })
  } catch (error) {
    logError('Erro ao buscar resumo de atividade', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

export default router
