import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { logInfo, logError } from '../config/logger'

/**
 * Health Check simples
 * GET /api/health
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    }

    logInfo('Health Check', health)
    res.status(200).json(health)
  } catch (error) {
    logError('Health Check Failed', error)
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Health Check detalhado com verificação de dependências
 * GET /api/health/detailed
 */
export const detailedHealthCheck = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now()
  
  try {
    // Verificar conexão com banco de dados
    let databaseStatus = 'ok'
    let databaseResponseTime = 0
    
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      databaseResponseTime = Date.now() - dbStart
    } catch (error) {
      databaseStatus = 'error'
      logError('Database Health Check Failed', error)
    }

    // Informações do sistema
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const health = {
      status: databaseStatus === 'ok' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '2.1.0',
      services: {
        database: {
          status: databaseStatus,
          responseTime: `${databaseResponseTime}ms`,
        },
      },
      system: {
        memory: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        },
        cpu: {
          user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
          system: `${(cpuUsage.system / 1000).toFixed(2)}ms`,
        },
        platform: process.platform,
        nodeVersion: process.version,
      },
      responseTime: `${Date.now() - startTime}ms`,
    }

    logInfo('Detailed Health Check', health)
    
    const statusCode = health.status === 'healthy' ? 200 : 503
    res.status(statusCode).json(health)
  } catch (error) {
    logError('Detailed Health Check Failed', error)
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to perform health check',
    })
  }
}

/**
 * Endpoint de prontidão (readiness)
 * GET /api/health/ready
 */
export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verificar se o sistema está pronto para receber requisições
    await prisma.$queryRaw`SELECT 1`
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logError('Readiness Check Failed', error)
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Endpoint de vivacidade (liveness)
 * GET /api/health/live
 */
export const livenessCheck = (req: Request, res: Response): void => {
  // Verificação simples se o processo está rodando
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}

/**
 * Formatar uptime para formato legível
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)

  return parts.join(' ')
}

