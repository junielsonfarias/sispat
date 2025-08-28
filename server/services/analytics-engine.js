/**
 * Motor de Analytics em Tempo Real
 */

import { EventEmitter } from 'events'
import { getRow, getRows, query } from '../database/connection.js'
import { logError, logInfo } from '../utils/logger.js'
import { websocketServer } from './websocket-server.js'

class AnalyticsEngine extends EventEmitter {
  constructor() {
    super()
    this.metrics = new Map()
    this.alerts = new Map()
    this.subscribers = new Map()
    this.updateInterval = 30000 // 30 segundos
    this.historyRetention = 24 * 60 * 60 * 1000 // 24 horas
    
    this.metricTypes = {
      SYSTEM_HEALTH: 'system_health',
      USER_ACTIVITY: 'user_activity',
      PATRIMONY_STATS: 'patrimony_stats',
      TRANSFER_ACTIVITY: 'transfer_activity',
      INVENTORY_PROGRESS: 'inventory_progress',
      REPORT_GENERATION: 'report_generation',
      ERROR_RATES: 'error_rates',
      PERFORMANCE_METRICS: 'performance_metrics'
    }

    this.alertThresholds = {
      high_error_rate: { threshold: 5, window: 300000 }, // 5 erros em 5 min
      low_system_health: { threshold: 80, operator: 'lt' }, // < 80%
      high_response_time: { threshold: 2000, window: 300000 }, // > 2s por 5 min
      unusual_activity: { threshold: 100, window: 3600000 } // 100% aumento em 1h
    }

    this.initialize()
  }

  /**
   * Inicializar motor de analytics
   */
  async initialize() {
    try {
      await this.createMetricsTable()
      await this.loadHistoricalData()
      this.startMetricsCollection()
      this.startAlertMonitoring()
      
      logInfo('Analytics Engine initialized', {
        updateInterval: this.updateInterval,
        retentionPeriod: this.historyRetention
      })
    } catch (error) {
      logError('Failed to initialize Analytics Engine', error)
    }
  }

  /**
   * Criar tabela de métricas
   */
  async createMetricsTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        value NUMERIC NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type_timestamp 
      ON analytics_metrics(type, timestamp DESC)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_metrics_municipality_id 
      ON analytics_metrics(municipality_id)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_metrics_timestamp 
      ON analytics_metrics(timestamp DESC)
    `)
  }

  /**
   * Carregar dados históricos
   */
  async loadHistoricalData() {
    try {
      const cutoff = new Date(Date.now() - this.historyRetention)
      
      const historicalData = await getRows(`
        SELECT type, municipality_id, timestamp, value, metadata
        FROM analytics_metrics
        WHERE timestamp >= $1
        ORDER BY timestamp DESC
      `, [cutoff])

      // Organizar dados por tipo e município
      for (const record of historicalData) {
        const key = `${record.type}:${record.municipality_id || 'global'}`
        if (!this.metrics.has(key)) {
          this.metrics.set(key, [])
        }
        this.metrics.get(key).push({
          timestamp: record.timestamp,
          value: parseFloat(record.value),
          metadata: record.metadata
        })
      }

      logInfo('Historical analytics data loaded', {
        records: historicalData.length,
        types: new Set(historicalData.map(r => r.type)).size
      })
    } catch (error) {
      logError('Failed to load historical data', error)
    }
  }

  /**
   * Iniciar coleta de métricas
   */
  startMetricsCollection() {
    // Coletar métricas principais
    setInterval(async () => {
      try {
        await Promise.all([
          this.collectSystemHealthMetrics(),
          this.collectUserActivityMetrics(),
          this.collectPatrimonyMetrics(),
          this.collectTransferMetrics(),
          this.collectPerformanceMetrics()
        ])
      } catch (error) {
        logError('Error collecting metrics', error)
      }
    }, this.updateInterval)

    // Limpar dados antigos
    setInterval(async () => {
      await this.cleanupOldMetrics()
    }, 60 * 60 * 1000) // A cada hora
  }

  /**
   * Coletar métricas de saúde do sistema
   */
  async collectSystemHealthMetrics() {
    try {
      // CPU e memória (simulados - em produção usar bibliotecas como 'os')
      const systemHealth = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100
      }

      // WebSocket connections
      const wsStats = websocketServer.getStats()
      
      // Database connections (simulado)
      const dbHealth = Math.random() * 100

      const overallHealth = (systemHealth.cpu + systemHealth.memory + systemHealth.disk + dbHealth) / 4

      await this.recordMetric(this.metricTypes.SYSTEM_HEALTH, overallHealth, null, {
        cpu: systemHealth.cpu,
        memory: systemHealth.memory,
        disk: systemHealth.disk,
        database: dbHealth,
        websocket: wsStats
      })

    } catch (error) {
      logError('Failed to collect system health metrics', error)
    }
  }

  /**
   * Coletar métricas de atividade de usuários
   */
  async collectUserActivityMetrics() {
    try {
      const municipalities = await getRows('SELECT id FROM municipalities')
      
      for (const municipality of municipalities) {
        // Usuários ativos nas últimas 24h
        const activeUsers = await getRow(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM activity_logs
          WHERE municipality_id = $1
            AND created_at >= NOW() - INTERVAL '24 hours'
        `, [municipality.id])

        // Total de usuários
        const totalUsers = await getRow(`
          SELECT COUNT(*) as count
          FROM users
          WHERE municipality_id = $1
        `, [municipality.id])

        const activityRate = totalUsers.count > 0 
          ? (activeUsers.count / totalUsers.count) * 100 
          : 0

        await this.recordMetric(
          this.metricTypes.USER_ACTIVITY, 
          activityRate, 
          municipality.id,
          {
            activeUsers: parseInt(activeUsers.count),
            totalUsers: parseInt(totalUsers.count)
          }
        )
      }
    } catch (error) {
      logError('Failed to collect user activity metrics', error)
    }
  }

  /**
   * Coletar métricas de patrimônios
   */
  async collectPatrimonyMetrics() {
    try {
      const municipalities = await getRows('SELECT id FROM municipalities')
      
      for (const municipality of municipalities) {
        const stats = await getRow(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'ativo' THEN 1 END) as active,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
            SUM(valor_aquisicao) as total_value,
            AVG(valor_aquisicao) as avg_value
          FROM patrimonios
          WHERE municipality_id = $1
        `, [municipality.id])

        await this.recordMetric(
          this.metricTypes.PATRIMONY_STATS,
          parseInt(stats.total),
          municipality.id,
          {
            total: parseInt(stats.total),
            active: parseInt(stats.active),
            newToday: parseInt(stats.new_today),
            totalValue: parseFloat(stats.total_value) || 0,
            avgValue: parseFloat(stats.avg_value) || 0
          }
        )
      }
    } catch (error) {
      logError('Failed to collect patrimony metrics', error)
    }
  }

  /**
   * Coletar métricas de transferências
   */
  async collectTransferMetrics() {
    try {
      const municipalities = await getRows('SELECT id FROM municipalities')
      
      for (const municipality of municipalities) {
        // Check if transfers table has status column
        const hasStatusColumn = await getRow(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transfers' AND column_name = 'status'
          ) as has_status
        `)
        
        let transfers
        if (hasStatusColumn.has_status) {
          transfers = await getRow(`
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM transfers
            WHERE municipality_id = $1
          `, [municipality.id])
        } else {
          transfers = await getRow(`
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week,
              0 as pending
            FROM transfers
            WHERE municipality_id = $1
          `, [municipality.id])
        }

        await this.recordMetric(
          this.metricTypes.TRANSFER_ACTIVITY,
          parseInt(transfers.today),
          municipality.id,
          {
            total: parseInt(transfers.total),
            today: parseInt(transfers.today),
            week: parseInt(transfers.week),
            pending: parseInt(transfers.pending)
          }
        )
      }
    } catch (error) {
      logError('Failed to collect transfer metrics', error)
    }
  }

  /**
   * Coletar métricas de performance
   */
  async collectPerformanceMetrics() {
    try {
      // Simular métricas de performance (em produção, coletar dados reais)
      const responseTime = Math.random() * 1000 + 100 // 100-1100ms
      const throughput = Math.random() * 1000 + 500   // 500-1500 req/min
      const errorRate = Math.random() * 5              // 0-5%

      await this.recordMetric(this.metricTypes.PERFORMANCE_METRICS, responseTime, null, {
        responseTime,
        throughput,
        errorRate,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logError('Failed to collect performance metrics', error)
    }
  }

  /**
   * Registrar métrica
   */
  async recordMetric(type, value, municipalityId = null, metadata = {}) {
    try {
      // Salvar no banco
      await query(`
        INSERT INTO analytics_metrics (type, municipality_id, value, metadata)
        VALUES ($1, $2, $3, $4)
      `, [type, municipalityId, value, JSON.stringify(metadata)])

      // Adicionar à memória
      const key = `${type}:${municipalityId || 'global'}`
      if (!this.metrics.has(key)) {
        this.metrics.set(key, [])
      }

      const metrics = this.metrics.get(key)
      metrics.push({
        timestamp: new Date(),
        value,
        metadata
      })

      // Manter apenas dados recentes na memória
      const cutoff = new Date(Date.now() - this.historyRetention)
      this.metrics.set(key, metrics.filter(m => m.timestamp >= cutoff))

      // Emitir evento para subscribers
      this.emit('metric-updated', {
        type,
        municipalityId,
        value,
        metadata,
        timestamp: new Date()
      })

      // Notificar via WebSocket
      this.broadcastMetricUpdate(type, municipalityId, value, metadata)

    } catch (error) {
      logError('Failed to record metric', error)
    }
  }

  /**
   * Broadcast de atualização via WebSocket
   */
  broadcastMetricUpdate(type, municipalityId, value, metadata) {
    const update = {
      type: 'analytics_update',
      metricType: type,
      municipalityId,
      value,
      metadata,
      timestamp: new Date().toISOString()
    }

    if (municipalityId) {
      // Enviar para usuários do município específico
      websocketServer.sendNotificationToMunicipality(municipalityId, update)
    } else {
      // Enviar para admins e superusers
      websocketServer.sendNotificationToRole('admin', update)
      websocketServer.sendNotificationToRole('superuser', update)
    }
  }

  /**
   * Monitoramento de alertas
   */
  startAlertMonitoring() {
    setInterval(() => {
      this.checkAlerts()
    }, 60000) // Verificar a cada minuto
  }

  /**
   * Verificar alertas
   */
  async checkAlerts() {
    try {
      await Promise.all([
        this.checkErrorRateAlert(),
        this.checkSystemHealthAlert(),
        this.checkPerformanceAlert(),
        this.checkActivityAlert()
      ])
    } catch (error) {
      logError('Error checking alerts', error)
    }
  }

  /**
   * Verificar alerta de taxa de erro
   */
  async checkErrorRateAlert() {
    const config = this.alertThresholds.high_error_rate
    const cutoff = new Date(Date.now() - config.window)

    // Simular verificação de taxa de erro
    const errorRate = Math.random() * 10
    
    if (errorRate > config.threshold) {
      await this.triggerAlert('high_error_rate', {
        value: errorRate,
        threshold: config.threshold,
        message: `Taxa de erro alta: ${errorRate.toFixed(2)}%`
      })
    }
  }

  /**
   * Verificar alerta de saúde do sistema
   */
  async checkSystemHealthAlert() {
    const config = this.alertThresholds.low_system_health
    const key = `${this.metricTypes.SYSTEM_HEALTH}:global`
    const metrics = this.metrics.get(key) || []
    
    if (metrics.length > 0) {
      const latest = metrics[metrics.length - 1]
      if (latest.value < config.threshold) {
        await this.triggerAlert('low_system_health', {
          value: latest.value,
          threshold: config.threshold,
          message: `Saúde do sistema baixa: ${latest.value.toFixed(1)}%`
        })
      }
    }
  }

  /**
   * Verificar alerta de performance
   */
  async checkPerformanceAlert() {
    const config = this.alertThresholds.high_response_time
    const key = `${this.metricTypes.PERFORMANCE_METRICS}:global`
    const metrics = this.metrics.get(key) || []
    
    const recentMetrics = metrics.filter(m => 
      m.timestamp >= new Date(Date.now() - config.window)
    )

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + (m.metadata.responseTime || 0), 0) / recentMetrics.length
      : 0

    if (avgResponseTime > config.threshold) {
      await this.triggerAlert('high_response_time', {
        value: avgResponseTime,
        threshold: config.threshold,
        message: `Tempo de resposta alto: ${avgResponseTime.toFixed(0)}ms`
      })
    }
  }

  /**
   * Verificar alerta de atividade incomum
   */
  async checkActivityAlert() {
    // Implementar lógica de detecção de atividade incomum
    // Por exemplo, comparar atividade atual com média histórica
  }

  /**
   * Disparar alerta
   */
  async triggerAlert(alertType, data) {
    const alertId = `${alertType}-${Date.now()}`
    
    const alert = {
      id: alertId,
      type: alertType,
      severity: this.getAlertSeverity(alertType),
      data,
      timestamp: new Date(),
      acknowledged: false
    }

    this.alerts.set(alertId, alert)

    // Emitir evento
    this.emit('alert-triggered', alert)

    // Notificar via WebSocket
    websocketServer.sendNotificationToRole('admin', {
      type: 'system_alert',
      alert
    })

    websocketServer.sendNotificationToRole('superuser', {
      type: 'system_alert',
      alert
    })

    logInfo('System alert triggered', {
      alertType,
      severity: alert.severity,
      data
    })
  }

  /**
   * Obter severidade do alerta
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      high_error_rate: 'high',
      low_system_health: 'critical',
      high_response_time: 'medium',
      unusual_activity: 'medium'
    }

    return severityMap[alertType] || 'low'
  }

  /**
   * Obter métricas por tipo
   */
  getMetrics(type, municipalityId = null, timeRange = '1h') {
    const key = `${type}:${municipalityId || 'global'}`
    const metrics = this.metrics.get(key) || []
    
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }

    const cutoff = new Date(Date.now() - (timeRanges[timeRange] || timeRanges['1h']))
    
    return metrics.filter(m => m.timestamp >= cutoff)
  }

  /**
   * Obter dashboard de métricas
   */
  getDashboardData(municipalityId = null, timeRange = '24h') {
    const dashboard = {}

    // Métricas principais
    Object.values(this.metricTypes).forEach(type => {
      const metrics = this.getMetrics(type, municipalityId, timeRange)
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1]
        const values = metrics.map(m => m.value)
        
        dashboard[type] = {
          current: latest.value,
          metadata: latest.metadata,
          trend: this.calculateTrend(values),
          history: metrics.slice(-50) // Últimos 50 pontos
        }
      }
    })

    // Alertas ativos
    dashboard.alerts = Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp)

    return dashboard
  }

  /**
   * Calcular tendência
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable'
    
    const recent = values.slice(-10) // Últimos 10 valores
    const older = values.slice(-20, -10) // 10 valores anteriores
    
    if (recent.length === 0 || older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }

  /**
   * Reconhecer alerta
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedBy = userId
      alert.acknowledgedAt = new Date()
      
      logInfo('Alert acknowledged', {
        alertId,
        userId,
        alertType: alert.type
      })
      
      return true
    }
    return false
  }

  /**
   * Limpar métricas antigas
   */
  async cleanupOldMetrics() {
    try {
      const cutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // 7 dias
      
      const result = await query(`
        DELETE FROM analytics_metrics 
        WHERE created_at < $1
      `, [cutoff])

      if (result.rowCount > 0) {
        logInfo('Old analytics metrics cleaned up', {
          count: result.rowCount
        })
      }

      // Limpar alertas antigos
      const oldAlerts = Array.from(this.alerts.entries())
        .filter(([_, alert]) => alert.timestamp < cutoff)
        .map(([id]) => id)

      oldAlerts.forEach(id => this.alerts.delete(id))

      if (oldAlerts.length > 0) {
        logInfo('Old alerts cleaned up', {
          count: oldAlerts.length
        })
      }

    } catch (error) {
      logError('Failed to cleanup old metrics', error)
    }
  }

  /**
   * Obter estatísticas gerais
   */
  getStats() {
    return {
      metricsTypes: Object.keys(this.metricTypes).length,
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged).length,
      totalAlerts: this.alerts.size,
      subscribers: this.subscribers.size,
      uptime: process.uptime()
    }
  }
}

// Instância singleton
export const analyticsEngine = new AnalyticsEngine()

export default analyticsEngine
