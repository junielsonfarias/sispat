import { query } from '../../database/connection.js';
import { logInfo, logError } from '../../utils/logger.js';
import intelligentCache from '../cache/intelligentCache.js';

/**
 * Sistema de Analytics Avançado
 * - Métricas em tempo real
 * - Gráficos interativos
 * - Alertas inteligentes
 * - Previsões e tendências
 * - Insights automáticos
 */
class AdvancedAnalyticsEngine {
  constructor() {
    this.metrics = {
      realTime: {},
      historical: {},
      predictions: {},
    };

    this.alertThresholds = {
      highErrorRate: 5,
      lowSystemHealth: 80,
      highMemoryUsage: 85,
      slowResponseTime: 2000,
    };

    this.initializeAnalytics();
  }

  async initializeAnalytics() {
    try {
      await this.loadHistoricalData();
      this.startRealTimeMonitoring();
      logInfo('Sistema de analytics avançado inicializado');
    } catch (error) {
      logError('Erro ao inicializar analytics:', error);
    }
  }

  /**
   * Carregar dados históricos
   */
  async loadHistoricalData() {
    try {
      const cacheKey = 'analytics_historical_data';
      const cached = await intelligentCache.get(cacheKey);

      if (cached) {
        this.metrics.historical = cached;
        return;
      }

      const historicalData = await this.fetchHistoricalData();
      this.metrics.historical = historicalData;

      await intelligentCache.set(cacheKey, historicalData, { ttl: 3600 });
      logInfo('Dados históricos carregados');
    } catch (error) {
      logError('Erro ao carregar dados históricos:', error);
    }
  }

  /**
   * Buscar dados históricos do banco
   */
  async fetchHistoricalData() {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_patrimonios,
        SUM(valor_aquisicao) as total_value,
        AVG(valor_aquisicao) as avg_value,
        COUNT(CASE WHEN situacao_bem = 'OTIMO' THEN 1 END) as otimo_count,
        COUNT(CASE WHEN situacao_bem = 'BOM' THEN 1 END) as bom_count,
        COUNT(CASE WHEN situacao_bem = 'REGULAR' THEN 1 END) as regular_count,
        COUNT(CASE WHEN situacao_bem = 'RUIM' THEN 1 END) as ruim_count,
        COUNT(CASE WHEN situacao_bem = 'PESSIMO' THEN 1 END) as pessimo_count
      FROM patrimonios 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Iniciar monitoramento em tempo real
   */
  startRealTimeMonitoring() {
    // Atualizar métricas a cada 30 segundos
    setInterval(async () => {
      await this.updateRealTimeMetrics();
    }, 30000);

    // Verificar alertas a cada 5 minutos
    setInterval(async () => {
      await this.checkAlerts();
    }, 300000);
  }

  /**
   * Atualizar métricas em tempo real
   */
  async updateRealTimeMetrics() {
    try {
      const metrics = await this.calculateRealTimeMetrics();
      this.metrics.realTime = metrics;

      // Cache das métricas
      await intelligentCache.set('analytics_realtime', metrics, { ttl: 60 });

      // Verificar se há mudanças significativas
      await this.detectAnomalies(metrics);
    } catch (error) {
      logError('Erro ao atualizar métricas em tempo real:', error);
    }
  }

  /**
   * Calcular métricas em tempo real
   */
  async calculateRealTimeMetrics() {
    const [
      patrimoniosCount,
      totalValue,
      systemHealth,
      errorRate,
      responseTime,
      activeUsers,
    ] = await Promise.all([
      this.getPatrimoniosCount(),
      this.getTotalValue(),
      this.getSystemHealth(),
      this.getErrorRate(),
      this.getAverageResponseTime(),
      this.getActiveUsers(),
    ]);

    return {
      totalPatrimonios: patrimoniosCount,
      totalValue: totalValue,
      systemHealth: systemHealth,
      errorRate: errorRate,
      averageResponseTime: responseTime,
      activeUsers: activeUsers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obter contagem de patrimônios
   */
  async getPatrimoniosCount() {
    const sql =
      'SELECT COUNT(*) as count FROM patrimonios WHERE deleted_at IS NULL';
    const result = await query(sql);
    return parseInt(result.rows[0].count);
  }

  /**
   * Obter valor total dos patrimônios
   */
  async getTotalValue() {
    const sql =
      'SELECT SUM(valor_aquisicao) as total FROM patrimonios WHERE deleted_at IS NULL';
    const result = await query(sql);
    return parseFloat(result.rows[0].total || 0);
  }

  /**
   * Calcular saúde do sistema
   */
  async getSystemHealth() {
    try {
      const [errorRate, responseTime, memoryUsage] = await Promise.all([
        this.getErrorRate(),
        this.getAverageResponseTime(),
        this.getMemoryUsage(),
      ]);

      // Fórmula de saúde do sistema (0-100)
      const healthScore = Math.max(
        0,
        100 - errorRate * 10 - responseTime / 100 - memoryUsage / 10
      );
      return Math.round(healthScore);
    } catch (error) {
      return 50; // Valor padrão em caso de erro
    }
  }

  /**
   * Calcular taxa de erro
   */
  async getErrorRate() {
    // Simulação - em produção seria baseado em logs reais
    return Math.random() * 10; // 0-10%
  }

  /**
   * Calcular tempo médio de resposta
   */
  async getAverageResponseTime() {
    // Simulação - em produção seria baseado em métricas reais
    return Math.random() * 1000 + 100; // 100-1100ms
  }

  /**
   * Calcular uso de memória
   */
  async getMemoryUsage() {
    const used = process.memoryUsage();
    return (used.heapUsed / used.heapTotal) * 100;
  }

  /**
   * Obter usuários ativos
   */
  async getActiveUsers() {
    // Simulação - em produção seria baseado em sessões ativas
    return Math.floor(Math.random() * 50) + 10; // 10-60 usuários
  }

  /**
   * Verificar alertas
   */
  async checkAlerts() {
    const metrics = this.metrics.realTime;
    const alerts = [];

    // Verificar taxa de erro alta
    if (metrics.errorRate > this.alertThresholds.highErrorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `Taxa de erro alta: ${metrics.errorRate.toFixed(2)}%`,
        value: metrics.errorRate,
        threshold: this.alertThresholds.highErrorRate,
      });
    }

    // Verificar saúde do sistema baixa
    if (metrics.systemHealth < this.alertThresholds.lowSystemHealth) {
      alerts.push({
        type: 'low_system_health',
        severity: 'critical',
        message: `Saúde do sistema baixa: ${metrics.systemHealth}%`,
        value: metrics.systemHealth,
        threshold: this.alertThresholds.lowSystemHealth,
      });
    }

    // Verificar tempo de resposta lento
    if (metrics.averageResponseTime > this.alertThresholds.slowResponseTime) {
      alerts.push({
        type: 'slow_response_time',
        severity: 'medium',
        message: `Tempo de resposta lento: ${metrics.averageResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: this.alertThresholds.slowResponseTime,
      });
    }

    // Enviar alertas se houver
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }

    return alerts;
  }

  /**
   * Detectar anomalias
   */
  async detectAnomalies(currentMetrics) {
    const historicalData = this.metrics.historical;
    if (!historicalData || historicalData.length === 0) return;

    // Calcular médias históricas
    const avgPatrimonios =
      historicalData.reduce((sum, day) => sum + day.total_patrimonios, 0) /
      historicalData.length;
    const avgValue =
      historicalData.reduce(
        (sum, day) => sum + parseFloat(day.total_value || 0),
        0
      ) / historicalData.length;

    const anomalies = [];

    // Verificar anomalia no número de patrimônios
    const patrimoniosChange =
      Math.abs(currentMetrics.totalPatrimonios - avgPatrimonios) /
      avgPatrimonios;
    if (patrimoniosChange > 0.2) {
      // 20% de variação
      anomalies.push({
        type: 'patrimonios_anomaly',
        message: `Variação significativa no número de patrimônios: ${patrimoniosChange.toFixed(2)}%`,
        current: currentMetrics.totalPatrimonios,
        average: avgPatrimonios,
      });
    }

    // Verificar anomalia no valor total
    const valueChange =
      Math.abs(currentMetrics.totalValue - avgValue) / avgValue;
    if (valueChange > 0.15) {
      // 15% de variação
      anomalies.push({
        type: 'value_anomaly',
        message: `Variação significativa no valor total: ${valueChange.toFixed(2)}%`,
        current: currentMetrics.totalValue,
        average: avgValue,
      });
    }

    if (anomalies.length > 0) {
      logInfo('Anomalias detectadas:', anomalies);
      await this.sendAnomalyAlerts(anomalies);
    }
  }

  /**
   * Enviar alertas
   */
  async sendAlerts(alerts) {
    for (const alert of alerts) {
      logInfo('System alert triggered', {
        alertType: alert.type,
        severity: alert.severity,
        data: {
          value: alert.value,
          threshold: alert.threshold,
          message: alert.message,
        },
      });

      // Aqui você pode integrar com sistemas de notificação
      // como email, Slack, SMS, etc.
    }
  }

  /**
   * Enviar alertas de anomalia
   */
  async sendAnomalyAlerts(anomalies) {
    for (const anomaly of anomalies) {
      logInfo('Anomaly detected', {
        type: anomaly.type,
        message: anomaly.message,
        data: {
          current: anomaly.current,
          average: anomaly.average,
        },
      });
    }
  }

  /**
   * Gerar relatório de analytics
   */
  async generateAnalyticsReport(options = {}) {
    const {
      period = '30d',
      includePredictions = true,
      includeAnomalies = true,
    } = options;

    try {
      const report = {
        period,
        generatedAt: new Date().toISOString(),
        realTimeMetrics: this.metrics.realTime,
        historicalData: this.metrics.historical,
        insights: await this.generateInsights(),
        predictions: includePredictions
          ? await this.generatePredictions()
          : null,
        anomalies: includeAnomalies ? await this.getRecentAnomalies() : null,
      };

      return report;
    } catch (error) {
      logError('Erro ao gerar relatório de analytics:', error);
      throw error;
    }
  }

  /**
   * Gerar insights automáticos
   */
  async generateInsights() {
    const insights = [];
    const metrics = this.metrics.realTime;
    const historical = this.metrics.historical;

    // Insight sobre crescimento
    if (historical.length >= 2) {
      const recent = historical[0];
      const previous = historical[1];
      const growth =
        ((recent.total_patrimonios - previous.total_patrimonios) /
          previous.total_patrimonios) *
        100;

      if (growth > 5) {
        insights.push({
          type: 'growth',
          message: `Crescimento significativo de ${growth.toFixed(1)}% no número de patrimônios`,
          value: growth,
          trend: 'positive',
        });
      }
    }

    // Insight sobre valor médio
    const avgValue = metrics.totalValue / metrics.totalPatrimonios;
    if (avgValue > 10000) {
      insights.push({
        type: 'high_value',
        message: `Valor médio alto por patrimônio: R$ ${avgValue.toLocaleString('pt-BR')}`,
        value: avgValue,
        trend: 'neutral',
      });
    }

    // Insight sobre saúde do sistema
    if (metrics.systemHealth < 70) {
      insights.push({
        type: 'system_health',
        message: `Saúde do sistema requer atenção: ${metrics.systemHealth}%`,
        value: metrics.systemHealth,
        trend: 'negative',
      });
    }

    return insights;
  }

  /**
   * Gerar previsões
   */
  async generatePredictions() {
    const historical = this.metrics.historical;
    if (!historical || historical.length < 7) return null;

    // Previsão simples baseada em tendência linear
    const recentData = historical.slice(0, 7);
    const trend = this.calculateTrend(recentData, 'total_patrimonios');

    const predictions = {
      nextWeek: Math.round(recentData[0].total_patrimonios + trend * 7),
      nextMonth: Math.round(recentData[0].total_patrimonios + trend * 30),
      confidence: this.calculateConfidence(recentData),
    };

    return predictions;
  }

  /**
   * Calcular tendência
   */
  calculateTrend(data, field) {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce(
      (sum, item, index) => sum + item[field] * index,
      0
    );
    const sumXY = data.reduce(
      (sum, item, index) => sum + item[field] * index,
      0
    );
    const sumX2 = data.reduce((sum, item, index) => sum + index * index, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calcular confiança da previsão
   */
  calculateConfidence(data) {
    if (data.length < 3) return 0.5;

    const values = data.map(item => item.total_patrimonios);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    const coefficient = stdDev / mean;

    // Confiança baseada na variabilidade dos dados
    return Math.max(0.1, Math.min(0.95, 1 - coefficient));
  }

  /**
   * Obter anomalias recentes
   */
  async getRecentAnomalies() {
    // Implementar busca de anomalias recentes
    return [];
  }

  /**
   * Obter métricas para dashboard
   */
  async getDashboardMetrics() {
    try {
      const cacheKey = 'dashboard_metrics';
      const cached = await intelligentCache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const metrics = {
        realTime: this.metrics.realTime,
        charts: await this.getChartData(),
        insights: await this.generateInsights(),
        alerts: await this.checkAlerts(),
      };

      await intelligentCache.set(cacheKey, metrics, { ttl: 300 });
      return metrics;
    } catch (error) {
      logError('Erro ao obter métricas do dashboard:', error);
      throw error;
    }
  }

  /**
   * Obter dados para gráficos
   */
  async getChartData() {
    const historical = this.metrics.historical;

    return {
      patrimonios: {
        labels: historical.map(item => item.date),
        datasets: [
          {
            label: 'Total de Patrimônios',
            data: historical.map(item => item.total_patrimonios),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          },
        ],
      },
      valores: {
        labels: historical.map(item => item.date),
        datasets: [
          {
            label: 'Valor Total (R$)',
            data: historical.map(item => parseFloat(item.total_value || 0)),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          },
        ],
      },
      situacao: {
        labels: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Péssimo'],
        datasets: [
          {
            data: [
              historical[0]?.otimo_count || 0,
              historical[0]?.bom_count || 0,
              historical[0]?.regular_count || 0,
              historical[0]?.ruim_count || 0,
              historical[0]?.pessimo_count || 0,
            ],
            backgroundColor: [
              '#4CAF50',
              '#8BC34A',
              '#FFC107',
              '#FF9800',
              '#F44336',
            ],
          },
        ],
      },
    };
  }
}

export default new AdvancedAnalyticsEngine();
