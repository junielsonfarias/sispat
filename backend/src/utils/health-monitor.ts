import { prisma } from '../config/database'
import { captureMessage } from '../config/sentry'
import { logError } from '../config/logger'

/**
 * Métricas de saúde da aplicação
 */
export interface HealthMetrics {
  timestamp: Date
  memoryUsageMB: number
  cpuUsagePercent: number
  dbResponseTimeMs: number
  uptime: number
  activeRequests: number
  errorRate: number
}

/**
 * Thresholds para alertas
 */
interface AlertThresholds {
  memoryUsageMB: number
  cpuUsagePercent: number
  dbResponseTimeMs: number
  errorRatePercent: number
}

/**
 * Monitor de saúde da aplicação
 * 
 * Coleta métricas periodicamente e alerta quando thresholds são excedidos.
 */
export class HealthMonitor {
  private metrics: HealthMetrics[] = []
  private maxMetricsHistory = 1000
  private requestCount = 0
  private errorCount = 0
  private activeRequests = 0
  
  private thresholds: AlertThresholds = {
    memoryUsageMB: 400,         // 400MB
    cpuUsagePercent: 80,        // 80%
    dbResponseTimeMs: 1000,     // 1 segundo
    errorRatePercent: 5,        // 5%
  }
  
  constructor(
    private monitoringIntervalMs = 60000 // 1 minuto
  ) {}
  
  /**
   * Coletar métricas atuais
   */
  async collectMetrics(): Promise<HealthMetrics> {
    // Memória
    const memory = process.memoryUsage()
    const memoryUsageMB = memory.heapUsed / 1024 / 1024
    
    // CPU (estimativa básica)
    const cpuUsage = process.cpuUsage()
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 // Converter para %
    
    // Database response time
    let dbResponseTimeMs = 0
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbResponseTimeMs = Date.now() - dbStart
    } catch (error) {
      dbResponseTimeMs = -1 // Indica erro
      logError('❌ Database health check falhou', error as Error)
    }
    
    // Error rate
    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0
    
    return {
      timestamp: new Date(),
      memoryUsageMB,
      cpuUsagePercent: cpuPercent,
      dbResponseTimeMs,
      uptime: process.uptime(),
      activeRequests: this.activeRequests,
      errorRate,
    }
  }
  
  /**
   * Verificar saúde e alertar se necessário
   */
  async checkHealth(): Promise<void> {
    try {
      const metrics = await this.collectMetrics()
      
      // Adicionar às métricas históricas
      this.metrics.push(metrics)
      
      // Manter apenas últimas N métricas
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory)
      }
      
      // Verificar thresholds e alertar
      this.checkThresholds(metrics)
      
      // Log periódico (a cada 5 minutos)
      const shouldLog = Math.floor(Date.now() / 300000) !== Math.floor((Date.now() - this.monitoringIntervalMs) / 300000)
      if (shouldLog) {
        console.log('📊 Health Metrics:', {
          memory: `${metrics.memoryUsageMB.toFixed(2)}MB`,
          dbResponseTime: `${metrics.dbResponseTimeMs}ms`,
          uptime: formatUptime(metrics.uptime),
          errorRate: `${metrics.errorRate.toFixed(2)}%`,
        })
      }
      
    } catch (error) {
      console.error('❌ Erro ao coletar métricas de saúde:', error)
    }
  }
  
  /**
   * Verificar thresholds e enviar alertas
   */
  private checkThresholds(metrics: HealthMetrics): void {
    // Memória alta
    if (metrics.memoryUsageMB > this.thresholds.memoryUsageMB) {
      const message = `⚠️ Uso de memória alto: ${metrics.memoryUsageMB.toFixed(2)}MB (threshold: ${this.thresholds.memoryUsageMB}MB)`
      console.warn(message)
      
      // Alerta crítico se muito alto
      if (metrics.memoryUsageMB > this.thresholds.memoryUsageMB * 1.2) {
        captureMessage(message, 'error')
      } else {
        captureMessage(message, 'warning')
      }
    }
    
    // Database lento
    if (metrics.dbResponseTimeMs > this.thresholds.dbResponseTimeMs) {
      const message = `⚠️ Database lento: ${metrics.dbResponseTimeMs}ms (threshold: ${this.thresholds.dbResponseTimeMs}ms)`
      console.warn(message)
      
      // Alerta crítico se muito lento
      if (metrics.dbResponseTimeMs > this.thresholds.dbResponseTimeMs * 2) {
        captureMessage(message, 'error')
      } else {
        captureMessage(message, 'warning')
      }
    }
    
    // Database offline
    if (metrics.dbResponseTimeMs === -1) {
      const message = '🚨 Database OFFLINE!'
      console.error(message)
      captureMessage(message, 'fatal')
    }
    
    // Taxa de erro alta
    if (metrics.errorRate > this.thresholds.errorRatePercent) {
      const message = `⚠️ Taxa de erro alta: ${metrics.errorRate.toFixed(2)}% (threshold: ${this.thresholds.errorRatePercent}%)`
      console.warn(message)
      captureMessage(message, 'warning')
    }
  }
  
  /**
   * Iniciar monitoramento periódico
   */
  start(): void {
    console.log(`📊 Health Monitoring iniciado (intervalo: ${this.monitoringIntervalMs}ms)`)
    
    // Check imediato
    this.checkHealth()
    
    // Checks periódicos
    setInterval(() => {
      this.checkHealth()
    }, this.monitoringIntervalMs)
  }
  
  /**
   * Incrementar contador de requests
   */
  incrementRequestCount(): void {
    this.requestCount++
  }
  
  /**
   * Incrementar contador de erros
   */
  incrementErrorCount(): void {
    this.errorCount++
  }
  
  /**
   * Incrementar requests ativos
   */
  incrementActiveRequests(): void {
    this.activeRequests++
  }
  
  /**
   * Decrementar requests ativos
   */
  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1)
  }
  
  /**
   * Obter métricas atuais
   */
  getCurrentMetrics(): HealthMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }
  
  /**
   * Obter histórico de métricas
   */
  getMetricsHistory(limitMinutes?: number): HealthMetrics[] {
    if (!limitMinutes) {
      return this.metrics
    }
    
    const cutoffTime = Date.now() - (limitMinutes * 60 * 1000)
    return this.metrics.filter(m => m.timestamp.getTime() > cutoffTime)
  }
  
  /**
   * Obter estatísticas agregadas
   */
  getStats(limitMinutes = 60): {
    avgMemoryMB: number
    avgDbResponseMs: number
    avgErrorRate: number
    maxMemoryMB: number
    maxDbResponseMs: number
  } {
    const recentMetrics = this.getMetricsHistory(limitMinutes)
    
    if (recentMetrics.length === 0) {
      return {
        avgMemoryMB: 0,
        avgDbResponseMs: 0,
        avgErrorRate: 0,
        maxMemoryMB: 0,
        maxDbResponseMs: 0,
      }
    }
    
    const sum = recentMetrics.reduce(
      (acc, m) => ({
        memory: acc.memory + m.memoryUsageMB,
        dbResponse: acc.dbResponse + (m.dbResponseTimeMs > 0 ? m.dbResponseTimeMs : 0),
        errorRate: acc.errorRate + m.errorRate,
      }),
      { memory: 0, dbResponse: 0, errorRate: 0 }
    )
    
    return {
      avgMemoryMB: sum.memory / recentMetrics.length,
      avgDbResponseMs: sum.dbResponse / recentMetrics.length,
      avgErrorRate: sum.errorRate / recentMetrics.length,
      maxMemoryMB: Math.max(...recentMetrics.map(m => m.memoryUsageMB)),
      maxDbResponseMs: Math.max(...recentMetrics.map(m => m.dbResponseTimeMs)),
    }
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor()

/**
 * Middleware para tracking de requests
 */
export const healthMonitorMiddleware = (req: any, res: any, next: any) => {
  healthMonitor.incrementRequestCount()
  healthMonitor.incrementActiveRequests()
  
  // Decrementar quando response finalizar
  res.on('finish', () => {
    healthMonitor.decrementActiveRequests()
    
    // Incrementar erros se status 5xx
    if (res.statusCode >= 500) {
      healthMonitor.incrementErrorCount()
    }
  })
  
  next()
}

/**
 * Formatar uptime em formato legível
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

