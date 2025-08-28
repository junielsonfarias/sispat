import { EventEmitter } from 'events';
import { advancedCache } from './advancedCache';
import { cacheInvalidationService } from './cacheInvalidationService';
import { reportCache } from './reportCache';

export interface CacheAlert {
  id: string;
  type: 'performance' | 'memory' | 'error' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'performance' | 'memory' | 'error' | 'maintenance';
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration?: number; // tempo em ms que a condição deve persistir
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: Array<{
    type:
      | 'notification'
      | 'auto_invalidate'
      | 'auto_cleanup'
      | 'email'
      | 'webhook';
    parameters: Record<string, any>;
  }>;
  cooldown: number; // tempo em ms antes de poder disparar novamente
  lastTriggered?: Date;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  lastAlert?: Date;
}

class CacheAlertSystem extends EventEmitter {
  private alerts: Map<string, CacheAlert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private readonly MONITORING_INTERVAL = 30000; // 30 segundos
  private readonly MAX_ALERTS_HISTORY = 1000;

  constructor() {
    super();
    this.setupDefaultRules();
  }

  /**
   * Configura regras padrão de alerta
   */
  private setupDefaultRules(): void {
    // Alerta para hit rate baixo
    this.addRule({
      id: 'low-hit-rate',
      name: 'Hit Rate Baixo',
      description: 'Alerta quando o hit rate total cai abaixo de 70%',
      enabled: true,
      type: 'performance',
      conditions: {
        metric: 'total_hit_rate',
        operator: 'lt',
        threshold: 0.7,
        duration: 60000, // 1 minuto
      },
      severity: 'medium',
      actions: [
        {
          type: 'notification',
          parameters: {
            message:
              'Hit rate do cache está baixo. Considere revisar estratégias de cache.',
          },
        },
      ],
      cooldown: 300000, // 5 minutos
    });

    // Alerta para uso alto de memória Redis
    this.addRule({
      id: 'high-redis-memory',
      name: 'Uso Alto de Memória Redis',
      description: 'Alerta quando o Redis usa mais de 200MB',
      enabled: true,
      type: 'memory',
      conditions: {
        metric: 'redis_memory_usage',
        operator: 'gt',
        threshold: 200, // MB
        duration: 30000, // 30 segundos
      },
      severity: 'high',
      actions: [
        {
          type: 'notification',
          parameters: {
            message:
              'Redis está usando muita memória. Considere limpeza automática.',
          },
        },
        {
          type: 'auto_cleanup',
          parameters: {
            pattern: 'expired:*',
            maxAge: 3600000, // 1 hora
          },
        },
      ],
      cooldown: 600000, // 10 minutos
    });

    // Alerta para hit rate crítico do Redis
    this.addRule({
      id: 'critical-redis-hit-rate',
      name: 'Hit Rate Crítico do Redis',
      description: 'Alerta crítico quando hit rate do Redis cai abaixo de 50%',
      enabled: true,
      type: 'performance',
      conditions: {
        metric: 'redis_hit_rate',
        operator: 'lt',
        threshold: 0.5,
        duration: 120000, // 2 minutos
      },
      severity: 'critical',
      actions: [
        {
          type: 'notification',
          parameters: {
            message: 'Hit rate do Redis está criticamente baixo!',
          },
        },
        {
          type: 'webhook',
          parameters: {
            url: '/api/alerts/cache-critical',
            method: 'POST',
          },
        },
      ],
      cooldown: 300000, // 5 minutos
    });

    // Alerta para muitos erros de invalidação
    this.addRule({
      id: 'invalidation-errors',
      name: 'Erros de Invalidação Frequentes',
      description:
        'Alerta quando há mais de 5 erros de invalidação em 10 minutos',
      enabled: true,
      type: 'error',
      conditions: {
        metric: 'invalidation_errors_count',
        operator: 'gt',
        threshold: 5,
        duration: 600000, // 10 minutos
      },
      severity: 'high',
      actions: [
        {
          type: 'notification',
          parameters: {
            message: 'Muitos erros no sistema de invalidação de cache.',
          },
        },
      ],
      cooldown: 900000, // 15 minutos
    });

    // Alerta para limpeza de manutenção
    this.addRule({
      id: 'maintenance-cleanup',
      name: 'Limpeza de Manutenção Necessária',
      description: 'Sugere limpeza quando há muitas entradas antigas no cache',
      enabled: true,
      type: 'maintenance',
      conditions: {
        metric: 'old_entries_count',
        operator: 'gt',
        threshold: 1000,
        duration: 3600000, // 1 hora
      },
      severity: 'low',
      actions: [
        {
          type: 'notification',
          parameters: {
            message: 'Considere executar limpeza de manutenção no cache.',
          },
        },
      ],
      cooldown: 86400000, // 24 horas
    });
  }

  /**
   * Inicia o monitoramento de alertas
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkAlerts();
    }, this.MONITORING_INTERVAL);

    console.log('Sistema de alertas de cache iniciado');
  }

  /**
   * Para o monitoramento de alertas
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Sistema de alertas de cache parado');
  }

  /**
   * Verifica condições de alerta
   */
  private async checkAlerts(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();

      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        // Verificar cooldown
        if (
          rule.lastTriggered &&
          Date.now() - rule.lastTriggered.getTime() < rule.cooldown
        ) {
          continue;
        }

        const shouldTrigger = await this.evaluateRule(rule, metrics);

        if (shouldTrigger) {
          await this.triggerAlert(rule, metrics);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar alertas de cache:', error);
    }
  }

  /**
   * Coleta métricas do sistema de cache
   */
  private async collectMetrics(): Promise<Record<string, any>> {
    const cacheStats = await advancedCache.getStats();
    const invalidationStats = cacheInvalidationService.getStats();
    const reportStats = await reportCache.getReportCacheStats();

    return {
      total_hit_rate: cacheStats.total.hitRate,
      redis_hit_rate: cacheStats.redis.hitRate,
      memory_hit_rate: cacheStats.memory.hitRate,
      redis_memory_usage: cacheStats.redis.memoryUsage,
      memory_cache_size: cacheStats.memory.size,
      total_hits: cacheStats.total.hits,
      total_misses: cacheStats.total.misses,
      invalidation_errors_count: invalidationStats.errors.length,
      total_invalidations: invalidationStats.totalInvalidations,
      report_cache_size: reportStats.totalReports,
      old_entries_count: this.estimateOldEntries(cacheStats),
      timestamp: Date.now(),
    };
  }

  /**
   * Estima número de entradas antigas no cache
   */
  private estimateOldEntries(stats: any): number {
    // Lógica simplificada - em produção seria mais sofisticada
    const totalEntries = stats.total.hits + stats.total.misses;
    return Math.floor(totalEntries * 0.1); // Assume 10% são entradas antigas
  }

  /**
   * Avalia se uma regra deve ser disparada
   */
  private async evaluateRule(
    rule: AlertRule,
    metrics: Record<string, any>
  ): Promise<boolean> {
    const metricValue = metrics[rule.conditions.metric];

    if (metricValue === undefined) return false;

    const { operator, threshold } = rule.conditions;
    let conditionMet = false;

    switch (operator) {
      case 'gt':
        conditionMet = metricValue > threshold;
        break;
      case 'gte':
        conditionMet = metricValue >= threshold;
        break;
      case 'lt':
        conditionMet = metricValue < threshold;
        break;
      case 'lte':
        conditionMet = metricValue <= threshold;
        break;
      case 'eq':
        conditionMet = metricValue === threshold;
        break;
    }

    // Se tem duração, verificar se a condição persiste
    if (conditionMet && rule.conditions.duration) {
      // Implementar verificação de duração se necessário
      // Por simplicidade, assumindo que a condição é imediata
      return true;
    }

    return conditionMet;
  }

  /**
   * Dispara um alerta
   */
  private async triggerAlert(
    rule: AlertRule,
    metrics: Record<string, any>
  ): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;

    const alert: CacheAlert = {
      id: alertId,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, metrics),
      timestamp: new Date(),
      data: {
        rule: rule.id,
        metrics,
        conditions: rule.conditions,
      },
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    // Executar ações
    for (const action of rule.actions) {
      await this.executeAlertAction(action, alert, metrics);
    }

    // Emitir evento
    this.emit('alert', alert);

    // Limitar histórico
    this.limitAlertsHistory();

    console.log(`Alerta disparado: ${alert.title} (${alert.severity})`);
  }

  /**
   * Gera mensagem personalizada do alerta
   */
  private generateAlertMessage(
    rule: AlertRule,
    metrics: Record<string, any>
  ): string {
    const metricValue = metrics[rule.conditions.metric];
    const { threshold } = rule.conditions;

    let baseMessage = rule.description;

    // Personalizar mensagem baseada na métrica
    switch (rule.conditions.metric) {
      case 'total_hit_rate':
        baseMessage += ` Valor atual: ${(metricValue * 100).toFixed(1)}%`;
        break;
      case 'redis_memory_usage':
        baseMessage += ` Uso atual: ${metricValue.toFixed(1)}MB`;
        break;
      case 'invalidation_errors_count':
        baseMessage += ` Erros recentes: ${metricValue}`;
        break;
      default:
        baseMessage += ` Valor: ${metricValue}, Limite: ${threshold}`;
    }

    return baseMessage;
  }

  /**
   * Executa ação de alerta
   */
  private async executeAlertAction(
    action: { type: string; parameters: Record<string, any> },
    alert: CacheAlert,
    metrics: Record<string, any>
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'notification':
          // Emitir notificação (pode ser integrada com sistema de notificações)
          console.log(`📢 Alerta: ${action.parameters.message}`);
          break;

        case 'auto_invalidate': {
          const tags = action.parameters.tags as string[];
          if (tags) {
            await advancedCache.invalidateByTags(tags);
            console.log(`🗑️ Auto-invalidação executada: ${tags.join(', ')}`);
          }
          break;
        }

        case 'auto_cleanup': {
          const pattern = action.parameters.pattern as string;
          if (pattern) {
            await advancedCache.invalidateByPattern(pattern);
            console.log(`🧹 Limpeza automática executada: ${pattern}`);
          }
          break;
        }

        case 'email':
          // Integrar com serviço de email
          console.log(`📧 Email seria enviado: ${alert.title}`);
          break;

        case 'webhook': {
          // Chamar webhook
          const url = action.parameters.url as string;
          console.log(`🔗 Webhook seria chamado: ${url}`);
          break;
        }

        default:
          console.warn(`Tipo de ação desconhecido: ${action.type}`);
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action.type}:`, error);
    }
  }

  /**
   * Adiciona nova regra de alerta
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`Regra de alerta adicionada: ${rule.name}`);
  }

  /**
   * Remove regra de alerta
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Atualiza regra de alerta
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Habilita/desabilita regra
   */
  toggleRule(ruleId: string, enabled?: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
    return true;
  }

  /**
   * Reconhece um alerta
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    return true;
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    return true;
  }

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts(): CacheAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtém todos os alertas
   */
  getAllAlerts(): CacheAlert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Obtém alertas por severidade
   */
  getAlertsBySeverity(severity: string): CacheAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.severity === severity)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtém todas as regras
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Obtém regra específica
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Obtém estatísticas de alertas
   */
  getStats(): AlertStats {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(alert => !alert.resolvedAt);
    const acknowledgedAlerts = allAlerts.filter(alert => alert.acknowledged);
    const resolvedAlerts = allAlerts.filter(alert => alert.resolvedAt);

    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};

    allAlerts.forEach(alert => {
      alertsBySeverity[alert.severity] =
        (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    // Calcular tempo médio de resolução
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedAlerts.forEach(alert => {
      if (alert.resolvedAt) {
        totalResolutionTime +=
          alert.resolvedAt.getTime() - alert.timestamp.getTime();
        resolvedCount++;
      }
    });

    const averageResolutionTime =
      resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      alertsBySeverity,
      alertsByType,
      acknowledgedAlerts: acknowledgedAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      averageResolutionTime,
      lastAlert: allAlerts.length > 0 ? allAlerts[0].timestamp : undefined,
    };
  }

  /**
   * Limita o histórico de alertas
   */
  private limitAlertsHistory(): void {
    const alerts = Array.from(this.alerts.entries()).sort(
      ([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    if (alerts.length > this.MAX_ALERTS_HISTORY) {
      const toRemove = alerts.slice(this.MAX_ALERTS_HISTORY);
      toRemove.forEach(([id]) => this.alerts.delete(id));
    }
  }

  /**
   * Força verificação de alertas (para testes)
   */
  async forceCheck(): Promise<void> {
    await this.checkAlerts();
  }
}

// Instância singleton
export const cacheAlertSystem = new CacheAlertSystem();
export default CacheAlertSystem;
