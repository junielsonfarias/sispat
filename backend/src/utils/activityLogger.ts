import { Request } from 'express'
import { prisma } from '../index'

/**
 * Helper para registrar atividades com IP tracking
 */
export async function logActivity(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req.clientIP || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    })
  } catch (error) {
    console.error('❌ Erro ao registrar activity log:', error)
    // Não lançar erro para não interromper o fluxo principal
  }
}

/**
 * Helper para buscar logs por IP
 */
export async function getActivityLogsByIP(
  ip: string,
  limit: number = 100
): Promise<any[]> {
  return prisma.activityLog.findMany({
    where: { ipAddress: ip },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Helper para detectar atividades suspeitas de um IP
 */
export async function detectSuspiciousActivity(ip: string): Promise<{
  isSuspicious: boolean
  reason?: string
  count?: number
}> {
  // Verificar múltiplas tentativas de login falhas
  const failedLogins = await prisma.activityLog.count({
    where: {
      ipAddress: ip,
      action: 'LOGIN_FAILED',
      createdAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000), // Últimos 15 minutos
      },
    },
  })

  if (failedLogins >= 5) {
    return {
      isSuspicious: true,
      reason: 'Múltiplas tentativas de login falhas',
      count: failedLogins,
    }
  }

  // Verificar múltiplas ações em curto período (possível bot)
  const recentActions = await prisma.activityLog.count({
    where: {
      ipAddress: ip,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000), // Últimos 5 minutos
      },
    },
  })

  if (recentActions >= 100) {
    return {
      isSuspicious: true,
      reason: 'Atividade excessiva (possível bot)',
      count: recentActions,
    }
  }

  return { isSuspicious: false }
}

