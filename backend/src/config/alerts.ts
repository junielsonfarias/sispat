/**
 * Sistema de Alertas Automáticos para SISPAT 2.0
 * 
 * Este arquivo contém a configuração e lógica para alertas automáticos
 * de erros críticos, performance e segurança
 */

import { prisma } from './database'
import { getRedis } from './redis'
import nodemailer from 'nodemailer'
import { logError, logWarn, logInfo } from './logger'

export interface AlertConfig {
  id: string
  name: string
  type: 'error' | 'performance' | 'security' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  conditions: AlertCondition[]
  channels: AlertChannel[]
  cooldown: number // em minutos
}

export interface AlertCondition {
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains'
  threshold: number | string
  timeWindow: number // em minutos
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'database' | 'console'
  config: any
}

export interface AlertInstance {
  id: string
  alertId: string
  triggeredAt: Date
  resolvedAt?: Date
  status: 'active' | 'resolved' | 'suppressed'
  data: any
  message: string
}

// Configurações de alertas pré-definidas
export const defaultAlerts: AlertConfig[] = [
  {
    id: 'high_error_rate',
    name: 'Taxa de Erro Alta',
    type: 'error',
    severity: 'high',
    enabled: true,
    conditions: [
      {
        metric: 'error_rate',
        operator: 'gt',
        threshold: 5, // 5% de erro
        timeWindow: 5
      }
    ],
    channels: [
      { type: 'email', config: { recipients: ['admin@sispat.com'] } },
      { type: 'console', config: {} }
    ],
    cooldown: 15
  },
  {
    id: 'slow_response_time',
    name: 'Tempo de Resposta Lento',
    type: 'performance',
    severity: 'medium',
    enabled: true,
    conditions: [
      {
        metric: 'avg_response_time',
        operator: 'gt',
        threshold: 2000, // 2 segundos
        timeWindow: 10
      }
    ],
    channels: [
      { type: 'email', config: { recipients: ['dev@sispat.com'] } },
      { type: 'console', config: {} }
    ],
    cooldown: 30
  },
  {
    id: 'high_memory_usage',
    name: 'Uso Alto de Memória',
    type: 'system',
    severity: 'high',
    enabled: true,
    conditions: [
      {
        metric: 'memory_usage_percent',
        operator: 'gt',
        threshold: 85, // 85% de uso
        timeWindow: 5
      }
    ],
    channels: [
      { type: 'email', config: { recipients: ['admin@sispat.com'] } },
      { type: 'console', config: {} }
    ],
    cooldown: 20
  },
  {
    id: 'database_connection_issues',
    name: 'Problemas de Conexão com Banco',
    type: 'system',
    severity: 'critical',
    enabled: true,
    conditions: [
      {
        metric: 'db_connection_errors',
        operator: 'gt',
        threshold: 3,
        timeWindow: 2
      }
    ],
    channels: [
      { type: 'email', config: { recipients: ['admin@sispat.com', 'dba@sispat.com'] } },
      { type: 'webhook', config: { url: process.env.SLACK_WEBHOOK_URL } },
      { type: 'console', config: {} }
    ],
    cooldown: 5
  },
  {
    id: 'failed_login_attempts',
    name: 'Tentativas de Login Falhadas',
    type: 'security',
    severity: 'medium',
    enabled: true,
    conditions: [
      {
        metric: 'failed_logins',
        operator: 'gt',
        threshold: 10,
        timeWindow: 5
      }
    ],
    channels: [
      { type: 'email', config: { recipients: ['security@sispat.com'] } },
      { type: 'console', config: {} }
    ],
    cooldown: 10
  },
  {
    id: 'api_rate_limit_exceeded',
    name: 'Rate Limit Excedido',
    type: 'security',
    severity: 'low',
    enabled: true,
    conditions: [
      {
        metric: 'rate_limit_hits',
        operator: 'gt',
        threshold: 50,
        timeWindow: 5
      }
    ],
    channels: [
      { type: 'console', config: {} }
    ],
    cooldown: 15
  }
]

// Classe principal do sistema de alertas
export class AlertManager {
  private alerts: Map<string, AlertConfig> = new Map()
  private activeAlerts: Map<string, AlertInstance> = new Map()
  private redis = getRedis()
  private emailTransporter: nodemailer.Transporter

  constructor() {
    this.initializeAlerts()
    this.initializeEmailTransporter()
  }

  private initializeAlerts() {
    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert)
    })
  }

  private initializeEmailTransporter() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  /**
   * Verificar condições de alerta
   */
  async checkAlerts(): Promise<void> {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue

      try {
        const shouldTrigger = await this.evaluateAlertConditions(alert)
        
        if (shouldTrigger) {
          await this.triggerAlert(alert)
        } else {
          await this.resolveAlert(alertId)
        }
      } catch (error) {
        logError('Erro ao verificar alerta', { alertId, error })
      }
    }
  }

  /**
   * Avaliar condições de um alerta
   */
  private async evaluateAlertConditions(alert: AlertConfig): Promise<boolean> {
    for (const condition of alert.conditions) {
      const value = await this.getMetricValue(condition.metric, condition.timeWindow)
      
      if (!this.evaluateCondition(value, condition)) {
        return false
      }
    }
    return true
  }

  /**
   * Obter valor de uma métrica
   */
  private async getMetricValue(metric: string, timeWindow: number): Promise<number> {
    const cacheKey = `metrics:${metric}:${timeWindow}`
    
    try {
      // Tentar obter do Redis primeiro
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        return parseFloat(cached)
      }

      // Calcular métrica baseada no tipo
      let value = 0
      
      switch (metric) {
        case 'error_rate':
          value = await this.calculateErrorRate(timeWindow)
          break
        case 'avg_response_time':
          value = await this.calculateAvgResponseTime(timeWindow)
          break
        case 'memory_usage_percent':
          value = this.getCurrentMemoryUsage()
          break
        case 'db_connection_errors':
          value = await this.getDatabaseConnectionErrors(timeWindow)
          break
        case 'failed_logins':
          value = await this.getFailedLogins(timeWindow)
          break
        case 'rate_limit_hits':
          value = await this.getRateLimitHits(timeWindow)
          break
        default:
          logWarn('Métrica desconhecida', { metric })
          return 0
      }

      // Cachear resultado
      await this.redis.setex(cacheKey, timeWindow * 60, value.toString())
      
      return value
    } catch (error) {
      logError('Erro ao obter métrica', { metric, error })
      return 0
    }
  }

  /**
   * Calcular taxa de erro
   */
  private async calculateErrorRate(timeWindow: number): Promise<number> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000)
    
    const totalRequests = await this.redis.get(`metrics:total_requests:${timeWindow}`) || '0'
    const errorRequests = await this.redis.get(`metrics:error_requests:${timeWindow}`) || '0'
    
    const total = parseInt(totalRequests)
    const errors = parseInt(errorRequests)
    
    return total > 0 ? (errors / total) * 100 : 0
  }

  /**
   * Calcular tempo médio de resposta
   */
  private async calculateAvgResponseTime(timeWindow: number): Promise<number> {
    const cacheKey = `metrics:avg_response_time:${timeWindow}`
    const cached = await this.redis.get(cacheKey)
    
    if (cached) {
      return parseFloat(cached)
    }

    // Simular cálculo baseado em logs ou métricas
    // Em produção, isso viria de um sistema de métricas real
    return Math.random() * 3000 // 0-3 segundos
  }

  /**
   * Obter uso atual de memória
   */
  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage()
    const total = usage.heapTotal + usage.external
    const used = usage.heapUsed + usage.external
    return (used / total) * 100
  }

  /**
   * Obter erros de conexão com banco
   */
  private async getDatabaseConnectionErrors(timeWindow: number): Promise<number> {
    const cacheKey = `metrics:db_errors:${timeWindow}`
    return parseInt(await this.redis.get(cacheKey) || '0')
  }

  /**
   * Obter tentativas de login falhadas
   */
  private async getFailedLogins(timeWindow: number): Promise<number> {
    const cacheKey = `metrics:failed_logins:${timeWindow}`
    return parseInt(await this.redis.get(cacheKey) || '0')
  }

  /**
   * Obter hits de rate limit
   */
  private async getRateLimitHits(timeWindow: number): Promise<number> {
    const cacheKey = `metrics:rate_limit_hits:${timeWindow}`
    return parseInt(await this.redis.get(cacheKey) || '0')
  }

  /**
   * Avaliar condição
   */
  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    const threshold = typeof condition.threshold === 'number' ? condition.threshold : parseFloat(condition.threshold)
    
    switch (condition.operator) {
      case 'gt': return value > threshold
      case 'lt': return value < threshold
      case 'eq': return value === threshold
      case 'gte': return value >= threshold
      case 'lte': return value <= threshold
      default: return false
    }
  }

  /**
   * Disparar alerta
   */
  private async triggerAlert(alert: AlertConfig): Promise<void> {
    const alertKey = `alert:${alert.id}`
    const isActive = await this.redis.exists(alertKey)
    
    if (isActive) return // Alerta já ativo

    const alertInstance: AlertInstance = {
      id: `${alert.id}_${Date.now()}`,
      alertId: alert.id,
      triggeredAt: new Date(),
      status: 'active',
      data: {},
      message: `Alerta ${alert.name} foi disparado`
    }

    // Marcar como ativo no Redis
    await this.redis.setex(alertKey, alert.cooldown * 60, JSON.stringify(alertInstance))
    this.activeAlerts.set(alert.id, alertInstance)

    // Enviar notificações
    await this.sendAlertNotifications(alert, alertInstance)

    logWarn('Alerta disparado', { alertId: alert.id, message: alertInstance.message })
  }

  /**
   * Resolver alerta
   */
  private async resolveAlert(alertId: string): Promise<void> {
    const alertKey = `alert:${alertId}`
    const isActive = await this.redis.exists(alertKey)
    
    if (!isActive) return

    await this.redis.del(alertKey)
    this.activeAlerts.delete(alertId)

    logInfo('Alerta resolvido', { alertId })
  }

  /**
   * Enviar notificações de alerta
   */
  private async sendAlertNotifications(alert: AlertConfig, instance: AlertInstance): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, instance, channel.config)
            break
          case 'webhook':
            await this.sendWebhookAlert(alert, instance, channel.config)
            break
          case 'console':
            this.sendConsoleAlert(alert, instance)
            break
        }
      } catch (error) {
        logError('Erro ao enviar notificação', { channel: channel.type, error })
      }
    }
  }

  /**
   * Enviar alerta por email
   */
  private async sendEmailAlert(alert: AlertConfig, instance: AlertInstance, config: any): Promise<void> {
    if (!this.emailTransporter) return

    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@sispat.com',
      to: config.recipients.join(', '),
      subject: `${severityEmoji[alert.severity]} [SISPAT] ${alert.name}`,
      html: `
        <h2>${alert.name}</h2>
        <p><strong>Severidade:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Disparado em:</strong> ${instance.triggeredAt.toISOString()}</p>
        <p><strong>Mensagem:</strong> ${instance.message}</p>
        <p><strong>Condições:</strong></p>
        <ul>
          ${alert.conditions.map(c => `<li>${c.metric} ${c.operator} ${c.threshold}</li>`).join('')}
        </ul>
        <hr>
        <p><small>Sistema de Alertas SISPAT 2.0</small></p>
      `
    }

    await this.emailTransporter.sendMail(mailOptions)
  }

  /**
   * Enviar alerta via webhook
   */
  private async sendWebhookAlert(alert: AlertConfig, instance: AlertInstance, config: any): Promise<void> {
    if (!config.url) return

    const payload = {
      text: `🚨 *${alert.name}*`,
      attachments: [{
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'Severidade', value: alert.severity, short: true },
          { title: 'Disparado em', value: instance.triggeredAt.toISOString(), short: true },
          { title: 'Mensagem', value: instance.message, short: false }
        ]
      }]
    }

    // Implementar envio via axios ou fetch
    console.log('Webhook alert:', config.url, payload)
  }

  /**
   * Enviar alerta no console
   */
  private sendConsoleAlert(alert: AlertConfig, instance: AlertInstance): void {
    const severityColor = {
      low: '\x1b[33m',    // Yellow
      medium: '\x1b[35m', // Magenta
      high: '\x1b[31m',   // Red
      critical: '\x1b[41m' // Red background
    }

    const reset = '\x1b[0m'
    const color = severityColor[alert.severity]
    
    console.log(`${color}[ALERTA ${alert.severity.toUpperCase()}]${reset} ${alert.name}`)
    console.log(`  Mensagem: ${instance.message}`)
    console.log(`  Disparado em: ${instance.triggeredAt.toISOString()}`)
  }

  /**
   * Obter alertas ativos
   */
  async getActiveAlerts(): Promise<AlertInstance[]> {
    return Array.from(this.activeAlerts.values())
  }

  /**
   * Obter estatísticas de alertas
   */
  async getAlertStats(): Promise<any> {
    const activeCount = this.activeAlerts.size
    const totalAlerts = this.alerts.size
    const enabledAlerts = Array.from(this.alerts.values()).filter(a => a.enabled).length

    return {
      active: activeCount,
      total: totalAlerts,
      enabled: enabledAlerts,
      disabled: totalAlerts - enabledAlerts
    }
  }
}

// Instância singleton
export const alertManager = new AlertManager()

// Iniciar verificação de alertas a cada 30 segundos
setInterval(() => {
  alertManager.checkAlerts().catch(error => {
    logError('Erro no sistema de alertas', { error })
  })
}, 30000)

export default alertManager
