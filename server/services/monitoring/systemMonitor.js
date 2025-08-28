import { query } from '../../database/connection.js';
import { logInfo, logWarn } from '../../utils/logger.js';

class SystemMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      errors: 0,
      responseTime: [],
      databaseConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    
    this.alerts = [];
    this.thresholds = {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2 segundos
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.7 // 70%
    };
    
    this.startMonitoring();
  }

  // Registrar chamada de API
  recordApiCall(responseTime, success = true) {
    this.metrics.apiCalls++;
    this.metrics.responseTime.push(responseTime);
    
    if (!success) {
      this.metrics.errors++;
    }

    // Manter apenas os últimos 100 tempos de resposta
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }

    this.checkThresholds();
  }

  // Verificar limiares e gerar alertas
  checkThresholds() {
    const errorRate = this.metrics.errors / this.metrics.apiCalls;
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    // Verificar taxa de erro
    if (errorRate > this.thresholds.errorRate) {
      this.createAlert('HIGH_ERROR_RATE', `Taxa de erro alta: ${(errorRate * 100).toFixed(2)}%`);
    }

    // Verificar tempo de resposta
    if (avgResponseTime > this.thresholds.responseTime) {
      this.createAlert('SLOW_RESPONSE', `Tempo de resposta lento: ${avgResponseTime.toFixed(2)}ms`);
    }

    // Verificar uso de memória
    const memUsage = process.memoryUsage();
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    this.metrics.memoryUsage = memUsagePercent;

    if (memUsagePercent > this.thresholds.memoryUsage) {
      this.createAlert('HIGH_MEMORY_USAGE', `Uso de memória alto: ${(memUsagePercent * 100).toFixed(2)}%`);
    }
  }

  // Criar alerta
  createAlert(type, message) {
    const alert = {
      id: `alert_${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(type),
      acknowledged: false
    };

    this.alerts.push(alert);
    logWarn(`Alerta do sistema: ${message}`, { alert });
    
    // Em produção, enviar notificação por email/Slack
    this.sendNotification(alert);
  }

  // Determinar severidade do alerta
  getSeverity(type) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'high',
      'SLOW_RESPONSE': 'medium',
      'HIGH_MEMORY_USAGE': 'high',
      'DATABASE_CONNECTION': 'critical'
    };
    
    return severityMap[type] || 'low';
  }

  // Enviar notificação (simulado)
  sendNotification(alert) {
    // Em produção, implementar envio de email/Slack
    logInfo('Notificação enviada:', { alert });
  }

  // Verificar saúde do banco de dados
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      this.metrics.databaseConnections++;
      
      if (responseTime > 1000) {
        this.createAlert('SLOW_DATABASE', `Query lenta: ${responseTime}ms`);
      }
      
      return { healthy: true, responseTime };
    } catch (error) {
      this.createAlert('DATABASE_CONNECTION', `Erro de conexão com banco: ${error.message}`);
      return { healthy: false, error: error.message };
    }
  }

  // Verificar saúde geral do sistema
  async getSystemHealth() {
    const dbHealth = await this.checkDatabaseHealth();
    const errorRate = this.metrics.apiCalls > 0 ? this.metrics.errors / this.metrics.apiCalls : 0;
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    const healthScore = this.calculateHealthScore(errorRate, avgResponseTime, dbHealth.healthy);

    return {
      status: healthScore > 0.8 ? 'healthy' : healthScore > 0.6 ? 'warning' : 'critical',
      score: healthScore,
      metrics: {
        ...this.metrics,
        errorRate,
        avgResponseTime
      },
      database: dbHealth,
      alerts: this.alerts.filter(a => !a.acknowledged),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Calcular score de saúde do sistema
  calculateHealthScore(errorRate, avgResponseTime, dbHealthy) {
    let score = 1.0;

    // Penalizar por taxa de erro
    score -= errorRate * 0.5;

    // Penalizar por tempo de resposta lento
    if (avgResponseTime > 1000) {
      score -= 0.2;
    } else if (avgResponseTime > 500) {
      score -= 0.1;
    }

    // Penalizar por problemas de banco
    if (!dbHealthy) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Iniciar monitoramento contínuo
  startMonitoring() {
    // Verificar saúde a cada 30 segundos
    setInterval(async () => {
      await this.checkDatabaseHealth();
    }, 30000);

    // Limpar alertas antigos a cada hora
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.alerts = this.alerts.filter(alert => 
        new Date(alert.timestamp) > oneHourAgo || !alert.acknowledged
      );
    }, 60 * 60 * 1000);

    logInfo('Sistema de monitoramento iniciado');
  }

  // Obter métricas
  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.apiCalls > 0 ? this.metrics.errors / this.metrics.apiCalls : 0,
      avgResponseTime: this.metrics.responseTime.length > 0 
        ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
        : 0
    };
  }

  // Reconhecer alerta
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logInfo(`Alerta reconhecido: ${alertId}`);
    }
  }

  // Limpar métricas
  clearMetrics() {
    this.metrics = {
      apiCalls: 0,
      errors: 0,
      responseTime: [],
      databaseConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    logInfo('Métricas limpas');
  }
}

export default new SystemMonitor();
