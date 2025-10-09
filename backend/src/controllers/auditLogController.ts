import { Request, Response } from 'express'
import { prisma } from '../index'
import { logInfo, logError } from '../lib/logger'

/**
 * Listar logs de auditoria
 * GET /api/audit-logs
 */
export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query

    const where: any = {}

    // Filtros
    if (action) where.action = action
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    logInfo('Audit logs listed', {
      userId: req.user?.userId,
      count: logs.length,
      filters: where,
    })

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    logError('Failed to list audit logs', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao listar logs de auditoria' })
  }
}

/**
 * Criar log de auditoria
 * POST /api/audit-logs
 */
export const createAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entityType, entityId, details } = req.body

    if (!action) {
      res.status(400).json({ error: 'Action é obrigatório' })
      return
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: details || null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    logInfo('Audit log created', {
      logId: log.id,
      userId: req.user!.userId,
      action,
      entityType,
    })

    res.status(201).json(log)
  } catch (error) {
    logError('Failed to create audit log', error, {
      userId: req.user?.userId,
      action: req.body.action,
    })
    res.status(500).json({ error: 'Erro ao criar log de auditoria' })
  }
}

/**
 * Obter estatísticas de logs de auditoria
 * GET /api/audit-logs/stats
 */
export const getAuditLogStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }

    // Agrupar por ação
    const actionStats = await prisma.activityLog.groupBy({
      by: ['action'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    // Agrupar por usuário
    const userStats = await prisma.activityLog.groupBy({
      by: ['userId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    })

    // Total de logs
    const total = await prisma.activityLog.count({ where })

    // Logs por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    res.json({
      total,
      actionStats: actionStats.map(s => ({
        action: s.action,
        count: s._count.id,
      })),
      userStats: await Promise.all(
        userStats.map(async s => {
          const user = await prisma.user.findUnique({
            where: { id: s.userId },
            select: { name: true, email: true },
          })
          return {
            userId: s.userId,
            userName: user?.name,
            userEmail: user?.email,
            count: s._count.id,
          }
        })
      ),
      dailyStats,
    })
  } catch (error) {
    logError('Failed to get audit log stats', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao obter estatísticas' })
  }
}

/**
 * Deletar logs antigos (manutenção)
 * DELETE /api/audit-logs/cleanup
 */
export const cleanupOldLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 90 } = req.query

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - Number(days))

    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    logInfo('Old audit logs cleaned up', {
      userId: req.user!.userId,
      deletedCount: result.count,
      days,
    })

    res.json({
      message: `${result.count} logs antigos foram removidos`,
      deletedCount: result.count,
      olderThan: cutoffDate,
    })
  } catch (error) {
    logError('Failed to cleanup old logs', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao limpar logs antigos' })
  }
}

