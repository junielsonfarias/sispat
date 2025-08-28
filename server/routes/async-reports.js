/**
 * Rotas para Relatórios Assíncronos
 */

import express from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { reportQueue } from '../services/report-queue.js'
import { logError, logInfo } from '../utils/logger.js'
import { paginationMiddleware } from '../utils/pagination.js'
import { getRows } from '../database/connection.js'

const router = express.Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)

/**
 * POST /api/async-reports/generate
 * Solicitar geração de relatório assíncrono
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      type,
      parameters = {},
      priority = 2
    } = req.body

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de relatório é obrigatório'
      })
    }

    // Verificar se o usuário pode gerar este tipo de relatório
    if (!canGenerateReport(type, req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Não autorizado a gerar este tipo de relatório'
      })
    }

    const job = await reportQueue.addJob({
      type,
      userId: req.user.id,
      municipalityId: req.user.municipality_id,
      parameters,
      priority
    })

    logInfo('Report generation requested', {
      jobId: job.id,
      type,
      userId: req.user.id
    })

    res.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at
      },
      message: 'Relatório adicionado à fila de processamento'
    })
  } catch (error) {
    logError('Failed to generate report', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao solicitar geração de relatório'
    })
  }
})

/**
 * GET /api/async-reports/jobs
 * Listar jobs do usuário
 */
router.get('/jobs', paginationMiddleware, async (req, res) => {
  try {
    const { limit, cursor } = req.pagination
    const { status } = req.query

    const jobs = await reportQueue.getUserJobs(req.user.id, {
      limit,
      offset: cursor ? parseInt(cursor) : 0,
      status
    })

    res.json({
      success: true,
      data: jobs,
      meta: {
        count: jobs.length,
        hasMore: jobs.length === limit
      }
    })
  } catch (error) {
    logError('Failed to get user jobs', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar jobs'
    })
  }
})

/**
 * GET /api/async-reports/jobs/:jobId
 * Obter detalhes de um job específico
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    
    const job = await reportQueue.getJob(jobId)
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job não encontrado'
      })
    }

    // Verificar se o usuário pode ver este job
    if (job.user_id !== req.user.id && !['admin', 'superuser'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Não autorizado'
      })
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        parameters: job.parameters,
        result: job.result,
        errorMessage: job.error_message,
        retryCount: job.retry_count,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
        expiresAt: job.expires_at
      }
    })
  } catch (error) {
    logError('Failed to get job details', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes do job'
    })
  }
})

/**
 * POST /api/async-reports/jobs/:jobId/cancel
 * Cancelar job
 */
router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params
    
    await reportQueue.cancelJob(jobId, req.user.id)
    
    logInfo('Job cancelled by user', {
      jobId,
      userId: req.user.id
    })

    res.json({
      success: true,
      message: 'Job cancelado com sucesso'
    })
  } catch (error) {
    logError('Failed to cancel job', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Erro ao cancelar job'
    })
  }
})

/**
 * GET /api/async-reports/jobs/:jobId/download
 * Download do resultado do relatório
 */
router.get('/jobs/:jobId/download', async (req, res) => {
  try {
    const { jobId } = req.params
    const { format = 'json' } = req.query
    
    const job = await reportQueue.getJob(jobId)
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job não encontrado'
      })
    }

    if (job.user_id !== req.user.id && !['admin', 'superuser'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Não autorizado'
      })
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Relatório ainda não foi concluído'
      })
    }

    const result = job.result

    // Configurar headers baseado no formato
    if (format === 'csv' && result.csvData) {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="report-${jobId}.csv"`)
      res.send(result.csvData)
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="report-${jobId}.json"`)
      res.json(result)
    } else {
      res.status(400).json({
        success: false,
        error: 'Formato não suportado'
      })
    }
  } catch (error) {
    logError('Failed to download report', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer download do relatório'
    })
  }
})

/**
 * GET /api/async-reports/types
 * Listar tipos de relatórios disponíveis
 */
router.get('/types', (req, res) => {
  const availableTypes = getAvailableReportTypes(req.user.role)
  
  res.json({
    success: true,
    types: availableTypes
  })
})

/**
 * GET /api/async-reports/queue/stats
 * Estatísticas da fila (apenas para admins)
 */
router.get('/queue/stats', requireAdmin, (req, res) => {
  try {
    const stats = reportQueue.getQueueStats()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    logError('Failed to get queue stats', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas da fila'
    })
  }
})

/**
 * GET /api/async-reports/admin/jobs
 * Listar todos os jobs (apenas para admins)
 */
router.get('/admin/jobs', requireAdmin, paginationMiddleware, async (req, res) => {
  try {
    const { limit, cursor } = req.pagination
    const { status, type, userId } = req.query

    let whereClause = ''
    const params = []
    let paramIndex = 1

    if (status) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (type) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (userId) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} user_id = $${paramIndex}`
      params.push(userId)
      paramIndex++
    }

    // Filtrar por município se não for superuser
    if (req.user.role !== 'superuser') {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} municipality_id = $${paramIndex}`
      params.push(req.user.municipality_id)
      paramIndex++
    }

    const jobs = await getRows(`
      SELECT 
        rj.*,
        u.name as user_name,
        u.email as user_email
      FROM report_jobs rj
      LEFT JOIN users u ON rj.user_id = u.id
      ${whereClause}
      ORDER BY rj.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, cursor ? parseInt(cursor) : 0])

    res.json({
      success: true,
      data: jobs,
      meta: {
        count: jobs.length,
        hasMore: jobs.length === limit
      }
    })
  } catch (error) {
    logError('Failed to get admin jobs', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar jobs administrativos'
    })
  }
})

/**
 * POST /api/async-reports/admin/cleanup
 * Limpar jobs expirados (apenas para admins)
 */
router.post('/admin/cleanup', requireAdmin, async (req, res) => {
  try {
    const count = await reportQueue.cleanupExpiredJobs()
    
    logInfo('Manual cleanup performed by admin', {
      adminId: req.user.id,
      count
    })

    res.json({
      success: true,
      message: `${count} jobs expirados removidos`,
      count
    })
  } catch (error) {
    logError('Failed to cleanup expired jobs', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar jobs expirados'
    })
  }
})

/**
 * Verificar se o usuário pode gerar determinado tipo de relatório
 */
function canGenerateReport(type, userRole) {
  const permissions = {
    patrimony_summary: ['usuario', 'supervisor', 'admin', 'superuser'],
    depreciation_report: ['supervisor', 'admin', 'superuser'],
    transfer_history: ['supervisor', 'admin', 'superuser'],
    inventory_report: ['usuario', 'supervisor', 'admin', 'superuser'],
    export_data: ['admin', 'superuser'],
    custom_report: ['admin', 'superuser']
  }

  return permissions[type]?.includes(userRole) || false
}

/**
 * Obter tipos de relatórios disponíveis para o role
 */
function getAvailableReportTypes(userRole) {
  const allTypes = [
    {
      id: 'patrimony_summary',
      name: 'Resumo de Patrimônios',
      description: 'Relatório consolidado de patrimônios por setor, tipo e situação',
      estimatedTime: '2-5 minutos',
      parameters: [
        { name: 'sectorId', type: 'string', optional: true, description: 'ID do setor específico' },
        { name: 'dateFrom', type: 'date', optional: true, description: 'Data inicial' },
        { name: 'dateTo', type: 'date', optional: true, description: 'Data final' }
      ]
    },
    {
      id: 'depreciation_report',
      name: 'Relatório de Depreciação',
      description: 'Cálculo de depreciação acumulada e valor atual dos patrimônios',
      estimatedTime: '3-7 minutos',
      parameters: [
        { name: 'year', type: 'number', optional: true, description: 'Ano de referência' }
      ]
    },
    {
      id: 'transfer_history',
      name: 'Histórico de Transferências',
      description: 'Relatório detalhado de todas as transferências em um período',
      estimatedTime: '1-3 minutos',
      parameters: [
        { name: 'dateFrom', type: 'date', required: true, description: 'Data inicial' },
        { name: 'dateTo', type: 'date', required: true, description: 'Data final' }
      ]
    },
    {
      id: 'inventory_report',
      name: 'Relatório de Inventário',
      description: 'Status detalhado de um inventário específico',
      estimatedTime: '1-2 minutos',
      parameters: [
        { name: 'inventoryId', type: 'string', required: true, description: 'ID do inventário' }
      ]
    },
    {
      id: 'export_data',
      name: 'Exportação de Dados',
      description: 'Exportação completa de dados em formato JSON ou CSV',
      estimatedTime: '5-15 minutos',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Tipo de dados (patrimonios, users)' },
        { name: 'format', type: 'string', optional: true, description: 'Formato (json, csv)' }
      ]
    },
    {
      id: 'custom_report',
      name: 'Relatório Customizado',
      description: 'Relatório personalizado com parâmetros específicos',
      estimatedTime: '5-20 minutos',
      parameters: [
        { name: 'query', type: 'object', required: true, description: 'Configurações do relatório' }
      ]
    }
  ]

  return allTypes.filter(type => canGenerateReport(type.id, userRole))
}

export default router
