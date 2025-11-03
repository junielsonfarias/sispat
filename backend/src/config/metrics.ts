/**
 * Sistema de Métricas em Tempo Real para SISPAT 2.0
 * 
 * Este arquivo contém a coleta, armazenamento e exposição de métricas
 * do sistema em tempo real
 */

import { getRedis } from './redis'
import { prisma } from './database'
import { logInfo, logError } from './logger'

export interface MetricData {
  timestamp: number
  value: number
  labels?: Record<string, string>
}

export interface SystemMetrics {
  timestamp: number
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
    heapUsed: number
    heapTotal: number
  }
  database: {
    connections: number
    queries: number
    slowQueries: number
    errors: number
  }
  api: {
    requests: number
    errors: number
    avgResponseTime: number
    rateLimitHits: number
  }
  redis: {
    connected: boolean
    memory: number
    keys: number
    hitRate: number
  }
  uptime: number
}

export interface ApplicationMetrics {
  users: {
    total: number
    active: number
    newToday: number
  }
  patrimonios: {
    total: number
    active: number
    baixados: number
    newToday: number
  }
  imoveis: {
    total: number
    newToday: number
  }
  transfers: {
    pending: number
    completed: number
    rejected: number
  }
  documents: {
    total: number
    newToday: number
    totalSize: number
  }
}

// Classe principal do sistema de métricas
export class MetricsCollector {
  private redis = getRedis()
  private metricsHistory: SystemMetrics[] = []
  private maxHistorySize = 1000 // Manter últimas 1000 medições

  constructor() {
    this.startCollection()
  }

  /**
   * Iniciar coleta de métricas
   */
  private startCollection() {
    // Coletar métricas a cada 10 segundos
    setInterval(() => {
      this.collectSystemMetrics().catch(error => {
        logError('Erro ao coletar métricas do sistema', { error })
      })
    }, 10000)

    // Coletar métricas da aplicação a cada 30 segundos
    setInterval(() => {
      this.collectApplicationMetrics().catch(error => {
        logError('Erro ao coletar métricas da aplicação', { error })
      })
    }, 30000)
  }

  /**
   * Coletar métricas do sistema
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now()
    
    // Métricas de CPU
    const cpuUsage = process.cpuUsage()
    const loadAverage = process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg()

    // Métricas de memória
    const memoryUsage = process.memoryUsage()
    const totalMemory = require('os').totalmem()
    const freeMemory = require('os').freemem()
    const usedMemory = totalMemory - freeMemory

    // Métricas do banco de dados
    const dbMetrics = await this.getDatabaseMetrics()

    // Métricas da API
    const apiMetrics = await this.getApiMetrics()

    // Métricas do Redis
    const redisMetrics = await this.getRedisMetrics()

    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      },
      database: dbMetrics,
      api: apiMetrics,
      redis: redisMetrics,
      uptime: process.uptime()
    }

    // Armazenar no histórico
    this.metricsHistory.push(metrics)
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift()
    }

    // Armazenar no Redis para acesso em tempo real
    await this.storeMetricsInRedis(metrics)

    return metrics
  }

  /**
   * Coletar métricas da aplicação
   */
  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Métricas de usuários
      const [totalUsers, activeUsers, newUsersToday] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ 
          where: { 
            createdAt: { gte: today } 
          } 
        })
      ])

      // Métricas de patrimônios
      const [totalPatrimonios, activePatrimonios, baixadosPatrimonios, newPatrimoniosToday] = await Promise.all([
        prisma.patrimonio.count(),
        prisma.patrimonio.count({ where: { status: { not: 'baixado' } } }),
        prisma.patrimonio.count({ where: { status: 'baixado' } }),
        prisma.patrimonio.count({ 
          where: { 
            createdAt: { gte: today } 
          } 
        })
      ])

      // Métricas de imóveis
      const [totalImoveis, newImoveisToday] = await Promise.all([
        prisma.imovel.count(),
        prisma.imovel.count({ 
          where: { 
            createdAt: { gte: today } 
          } 
        })
      ])

      // Métricas de transferências
      const [pendingTransfers, completedTransfers, rejectedTransfers] = await Promise.all([
        prisma.transferencia.count({ where: { status: 'pendente' } }),
        prisma.transferencia.count({ where: { status: 'aprovada' } }),
        prisma.transferencia.count({ where: { status: 'rejeitada' } })
      ])

      // Métricas de documentos (tolerante à ausência da tabela)
      let totalDocuments = 0
      let newDocumentsToday = 0
      let documentsTotalSize = 0

      try {
        // Verificar se a tabela existe para evitar logs de erro do Prisma
        const check: Array<{ regclass: string | null }> = await prisma.$queryRawUnsafe(
          "SELECT to_regclass('public.documentos_gerais') as regclass"
        )
        const tableExists = Array.isArray(check) && check[0] && check[0].regclass

        if (tableExists) {
          const [docsTotal, docsNewToday, docsSizeAgg] = await Promise.all([
            prisma.documentoGeral.count(),
            prisma.documentoGeral.count({
              where: {
                createdAt: { gte: today }
              }
            }),
            prisma.documentoGeral.aggregate({ _sum: { fileSize: true } })
          ])

          totalDocuments = docsTotal
          newDocumentsToday = docsNewToday
          documentsTotalSize = (docsSizeAgg as any)?._sum?.fileSize || 0
        } else {
          logInfo('Tabela documentos_gerais não encontrada; métricas de documentos desativadas temporariamente')
        }
      } catch (error) {
        // Qualquer erro silencioso em dev
        logInfo('Métricas de documentos indisponíveis (erro ao verificar/consultar)', { error: (error as any)?.message })
      }

      const metrics: ApplicationMetrics = {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday
        },
        patrimonios: {
          total: totalPatrimonios,
          active: activePatrimonios,
          baixados: baixadosPatrimonios,
          newToday: newPatrimoniosToday
        },
        imoveis: {
          total: totalImoveis,
          newToday: newImoveisToday
        },
        transfers: {
          pending: pendingTransfers,
          completed: completedTransfers,
          rejected: rejectedTransfers
        },
        documents: {
          total: totalDocuments,
          newToday: newDocumentsToday,
          totalSize: documentsTotalSize
        }
      }

      // Armazenar no Redis (se disponível)
      if (this.redis && this.redis.status === 'ready') {
        try {
          await this.redis.setex('metrics:application', 60, JSON.stringify(metrics))
        } catch (error) {
          // Silenciosamente ignorar erros de Redis
        }
      }

      return metrics
    } catch (error) {
      logError('Erro ao coletar métricas da aplicação', { error })
      throw error
    }
  }

  /**
   * Obter métricas do banco de dados
   */
  private async getDatabaseMetrics(): Promise<any> {
    try {
      // Simular métricas do banco (em produção, usar ferramentas específicas)
      return {
        connections: Math.floor(Math.random() * 10) + 5,
        queries: Math.floor(Math.random() * 100) + 50,
        slowQueries: Math.floor(Math.random() * 5),
        errors: Math.floor(Math.random() * 3)
      }
    } catch (error) {
      return {
        connections: 0,
        queries: 0,
        slowQueries: 0,
        errors: 1
      }
    }
  }

  /**
   * Obter métricas da API
   */
  private async getApiMetrics(): Promise<any> {
    try {
      let requests = '0'
      let errors = '0'
      let responseTime = '0'
      let rateLimitHits = '0'
      
      if (this.redis && this.redis.status === 'ready') {
        try {
          requests = await this.redis.get('metrics:total_requests:5') || '0'
          errors = await this.redis.get('metrics:error_requests:5') || '0'
          responseTime = await this.redis.get('metrics:avg_response_time:5') || '0'
          rateLimitHits = await this.redis.get('metrics:rate_limit_hits:5') || '0'
        } catch (error) {
          // Silenciosamente ignorar erros
        }
      }

      return {
        requests: parseInt(requests),
        errors: parseInt(errors),
        avgResponseTime: parseFloat(responseTime),
        rateLimitHits: parseInt(rateLimitHits)
      }
    } catch (error) {
      return {
        requests: 0,
        errors: 0,
        avgResponseTime: 0,
        rateLimitHits: 0
      }
    }
  }

  /**
   * Obter métricas do Redis
   */
  private async getRedisMetrics(): Promise<any> {
    if (!this.redis || this.redis.status !== 'ready') {
      return {
        connected: false,
        memory: null,
        keys: 0
      }
    }
    
    try {
      const info = await this.redis.info('memory')
      const keys = await this.redis.dbsize()
      
      // Calcular hit rate (simulado)
      const hits = await this.redis.get('metrics:cache_hits:5') || '0'
      const misses = await this.redis.get('metrics:cache_misses:5') || '0'
      const total = parseInt(hits) + parseInt(misses)
      const hitRate = total > 0 ? (parseInt(hits) / total) * 100 : 0

      return {
        connected: true,
        memory: parseInt(info.split('\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0'),
        keys,
        hitRate
      }
    } catch (error) {
      return {
        connected: false,
        memory: 0,
        keys: 0,
        hitRate: 0
      }
    }
  }

  /**
   * Armazenar métricas no Redis
   */
  private async storeMetricsInRedis(metrics: SystemMetrics): Promise<void> {
    // Armazenar em memória sempre
    this.metricsHistory.push(metrics)
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift()
    }
    
    if (!this.redis || this.redis.status !== 'ready') {
      return
    }
    
    try {
      await this.redis.setex('metrics:system:latest', 60, JSON.stringify(metrics))
      await this.redis.lpush('metrics:system:history', JSON.stringify(metrics))
      await this.redis.ltrim('metrics:system:history', 0, 99) // Manter últimas 100
    } catch (error) {
      logError('Erro ao armazenar métricas no Redis', { error })
    }
  }

  /**
   * Obter métricas atuais do sistema
   */
  async getCurrentSystemMetrics(): Promise<SystemMetrics | null> {
    if (!this.redis || this.redis.status !== 'ready') {
      // Retornar última métrica da memória se Redis não disponível
      return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null
    }
    
    try {
      const cached = await this.redis.get('metrics:system:latest')
      return cached ? JSON.parse(cached) : (this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null)
    } catch (error) {
      logError('Erro ao obter métricas atuais', { error })
      return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null
    }
  }

  /**
   * Obter métricas atuais da aplicação
   */
  async getCurrentApplicationMetrics(): Promise<ApplicationMetrics | null> {
    if (!this.redis || this.redis.status !== 'ready') {
      return null
    }
    
    try {
      const cached = await this.redis.get('metrics:application')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logError('Erro ao obter métricas da aplicação', { error })
      return null
    }
  }

  /**
   * Obter histórico de métricas
   */
  async getMetricsHistory(limit: number = 100): Promise<SystemMetrics[]> {
    if (!this.redis || this.redis.status !== 'ready') {
      return this.metricsHistory.slice(-limit)
    }
    
    try {
      const history = await this.redis.lrange('metrics:system:history', 0, limit - 1)
      return history.map(item => JSON.parse(item))
    } catch (error) {
      logError('Erro ao obter histórico de métricas', { error })
      return this.metricsHistory.slice(-limit)
    }
  }

  /**
   * Obter estatísticas resumidas
   */
  async getMetricsSummary(): Promise<any> {
    const system = await this.getCurrentSystemMetrics()
    const application = await this.getCurrentApplicationMetrics()
    const history = await this.getMetricsHistory(10)

    if (!system || !application) {
      return null
    }

    // Calcular tendências
    const cpuTrend = this.calculateTrend(history.map(m => m.cpu.usage))
    const memoryTrend = this.calculateTrend(history.map(m => m.memory.percentage))
    const responseTimeTrend = this.calculateTrend(history.map(m => m.api.avgResponseTime))

    return {
      system: {
        ...system,
        trends: {
          cpu: cpuTrend,
          memory: memoryTrend,
          responseTime: responseTimeTrend
        }
      },
      application,
      health: this.calculateHealthScore(system, application),
      timestamp: Date.now()
    }
  }

  /**
   * Calcular tendência de uma série de valores
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable'
    
    const first = values[0]
    const last = values[values.length - 1]
    const change = ((last - first) / first) * 100
    
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }

  /**
   * Calcular score de saúde do sistema
   */
  private calculateHealthScore(system: SystemMetrics, application: ApplicationMetrics): number {
    let score = 100

    // Penalizar por uso alto de memória
    if (system.memory.percentage > 90) score -= 30
    else if (system.memory.percentage > 80) score -= 15
    else if (system.memory.percentage > 70) score -= 5

    // Penalizar por tempo de resposta alto
    if (system.api.avgResponseTime > 5000) score -= 25
    else if (system.api.avgResponseTime > 2000) score -= 10
    else if (system.api.avgResponseTime > 1000) score -= 5

    // Penalizar por taxa de erro alta
    const errorRate = system.api.requests > 0 ? (system.api.errors / system.api.requests) * 100 : 0
    if (errorRate > 10) score -= 20
    else if (errorRate > 5) score -= 10
    else if (errorRate > 1) score -= 5

    // Penalizar por problemas de conexão
    if (!system.redis.connected) score -= 15

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Incrementar contador de métrica
   */
  async incrementMetric(metric: string, value: number = 1, ttl: number = 300): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') {
      return
    }
    
    try {
      const key = `metrics:${metric}:5` // 5 minutos
      await this.redis.incrby(key, value)
      await this.redis.expire(key, ttl)
    } catch (error) {
      logError('Erro ao incrementar métrica', { metric, error })
    }
  }

  /**
   * Definir valor de métrica
   */
  async setMetric(metric: string, value: number, ttl: number = 300): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') {
      return
    }
    
    try {
      const key = `metrics:${metric}:5`
      await this.redis.setex(key, ttl, value.toString())
    } catch (error) {
      logError('Erro ao definir métrica', { metric, error })
    }
  }
}

// Instância singleton
export const metricsCollector = new MetricsCollector()

export default metricsCollector
