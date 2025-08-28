import { securityAuditService } from './securityAudit';

export interface IntrusionRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | ((event: IntrusionEvent) => boolean);
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  timeWindow: number; // em milissegundos
  enabled: boolean;
  actions: IntrusionAction[];
}

export interface IntrusionEvent {
  id: string;
  timestamp: Date;
  type: IntrusionEventType;
  source: string;
  target?: string;
  payload?: any;
  userAgent?: string;
  ipAddress: string;
  userId?: string;
  sessionId?: string;
}

export type IntrusionEventType =
  | 'failed_login'
  | 'brute_force'
  | 'sql_injection'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'directory_traversal'
  | 'command_injection'
  | 'file_upload_malicious'
  | 'rate_limit_exceeded'
  | 'suspicious_user_agent'
  | 'geo_anomaly'
  | 'time_anomaly'
  | 'privilege_escalation'
  | 'data_exfiltration';

export interface IntrusionAction {
  type: 'block_ip' | 'block_user' | 'rate_limit' | 'alert' | 'log' | 'redirect';
  duration?: number;
  parameters?: Record<string, any>;
}

export interface IntrusionAlert {
  id: string;
  timestamp: Date;
  rule: IntrusionRule;
  events: IntrusionEvent[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'false_positive';
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export interface DetectionStats {
  totalEvents: number;
  alertsGenerated: number;
  blockedIPs: number;
  blockedUsers: number;
  falsePositives: number;
  topThreats: Array<{ type: IntrusionEventType; count: number }>;
  topSources: Array<{ ip: string; count: number }>;
}

// Regras padrão de detecção
export const DEFAULT_INTRUSION_RULES: IntrusionRule[] = [
  {
    id: 'brute_force_login',
    name: 'Ataque de Força Bruta - Login',
    description: 'Detecta múltiplas tentativas de login falhadas',
    pattern: event => event.type === 'failed_login',
    severity: 'high',
    threshold: 5,
    timeWindow: 300000, // 5 minutos
    enabled: true,
    actions: [
      { type: 'block_ip', duration: 1800000 }, // 30 minutos
      { type: 'alert' },
      { type: 'log' },
    ],
  },
  {
    id: 'sql_injection',
    name: 'Tentativa de SQL Injection',
    description: 'Detecta padrões de SQL injection nos parâmetros',
    pattern:
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bor\s+1\s*=\s*1|\band\s+1\s*=\s*1)/i,
    severity: 'critical',
    threshold: 1,
    timeWindow: 60000,
    enabled: true,
    actions: [
      { type: 'block_ip', duration: 3600000 }, // 1 hora
      { type: 'alert' },
      { type: 'log' },
    ],
  },
  {
    id: 'xss_attempt',
    name: 'Tentativa de XSS',
    description: 'Detecta tentativas de Cross-Site Scripting',
    pattern:
      /(<script|javascript:|on\w+\s*=|<iframe|<object|eval\s*\(|alert\s*\()/i,
    severity: 'high',
    threshold: 1,
    timeWindow: 60000,
    enabled: true,
    actions: [
      { type: 'block_ip', duration: 1800000 }, // 30 minutos
      { type: 'alert' },
      { type: 'log' },
    ],
  },
  {
    id: 'directory_traversal',
    name: 'Directory Traversal',
    description: 'Detecta tentativas de acesso a diretórios não autorizados',
    pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
    severity: 'medium',
    threshold: 2,
    timeWindow: 300000,
    enabled: true,
    actions: [
      { type: 'block_ip', duration: 900000 }, // 15 minutos
      { type: 'alert' },
      { type: 'log' },
    ],
  },
  {
    id: 'rate_limit_exceeded',
    name: 'Limite de Taxa Excedido',
    description: 'Detecta excesso de requisições por IP',
    pattern: event => event.type === 'rate_limit_exceeded',
    severity: 'medium',
    threshold: 100,
    timeWindow: 60000, // 1 minuto
    enabled: true,
    actions: [
      { type: 'rate_limit', duration: 300000 }, // 5 minutos
      { type: 'log' },
    ],
  },
  {
    id: 'suspicious_user_agent',
    name: 'User Agent Suspeito',
    description: 'Detecta user agents conhecidos por serem maliciosos',
    pattern:
      /(sqlmap|nikto|nmap|masscan|zap|burp|wget|curl.*bot|python-requests)/i,
    severity: 'medium',
    threshold: 1,
    timeWindow: 60000,
    enabled: true,
    actions: [
      { type: 'block_ip', duration: 600000 }, // 10 minutos
      { type: 'alert' },
      { type: 'log' },
    ],
  },
];

class IntrusionDetectionService {
  private rules: Map<string, IntrusionRule> = new Map();
  private events: IntrusionEvent[] = [];
  private alerts: IntrusionAlert[] = [];
  private blockedIPs: Map<string, number> = new Map(); // IP -> expiration timestamp
  private blockedUsers: Map<string, number> = new Map(); // UserID -> expiration timestamp
  private rateLimits: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor() {
    this.initializeRules();
    this.startCleanupTimer();
  }

  /**
   * Registra um evento para análise
   */
  async recordEvent(
    eventData: Omit<IntrusionEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const event: IntrusionEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...eventData,
    };

    this.events.push(event);

    // Analisa o evento contra todas as regras
    await this.analyzeEvent(event);

    // Limita o histórico de eventos
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  /**
   * Verifica se um IP está bloqueado
   */
  isIPBlocked(ip: string): boolean {
    const blockExpiration = this.blockedIPs.get(ip);
    if (!blockExpiration) return false;

    if (Date.now() > blockExpiration) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Verifica se um usuário está bloqueado
   */
  isUserBlocked(userId: string): boolean {
    const blockExpiration = this.blockedUsers.get(userId);
    if (!blockExpiration) return false;

    if (Date.now() > blockExpiration) {
      this.blockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Verifica rate limiting
   */
  checkRateLimit(identifier: string, limit: number, window: number): boolean {
    const now = Date.now();
    const rateLimitData = this.rateLimits.get(identifier);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      this.rateLimits.set(identifier, { count: 1, resetTime: now + window });
      return true;
    }

    if (rateLimitData.count >= limit) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }

  /**
   * Adiciona regra customizada
   */
  addRule(rule: IntrusionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove regra
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Ativa/desativa regra
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Obtém todas as regras
   */
  getRules(): IntrusionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts(): IntrusionAlert[] {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string, resolvedBy: string, notes?: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      if (notes) alert.notes = notes;
    }
  }

  /**
   * Marca alerta como falso positivo
   */
  markFalsePositive(alertId: string, resolvedBy: string, notes?: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'false_positive';
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      if (notes) alert.notes = notes;
    }
  }

  /**
   * Desbloqueia IP
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  /**
   * Desbloqueia usuário
   */
  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
  }

  /**
   * Obtém estatísticas de detecção
   */
  getDetectionStats(): DetectionStats {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    const recentEvents = this.events.filter(
      e => e.timestamp.getTime() > last24h
    );

    // Conta eventos por tipo
    const threatCounts = new Map<IntrusionEventType, number>();
    const sourceCounts = new Map<string, number>();

    recentEvents.forEach(event => {
      threatCounts.set(event.type, (threatCounts.get(event.type) || 0) + 1);
      sourceCounts.set(
        event.ipAddress,
        (sourceCounts.get(event.ipAddress) || 0) + 1
      );
    });

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources = Array.from(sourceCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: recentEvents.length,
      alertsGenerated: this.alerts.filter(a => a.timestamp.getTime() > last24h)
        .length,
      blockedIPs: Array.from(this.blockedIPs.values()).filter(exp => exp > now)
        .length,
      blockedUsers: Array.from(this.blockedUsers.values()).filter(
        exp => exp > now
      ).length,
      falsePositives: this.alerts.filter(
        a => a.status === 'false_positive' && a.timestamp.getTime() > last24h
      ).length,
      topThreats,
      topSources,
    };
  }

  // Métodos privados
  private initializeRules(): void {
    DEFAULT_INTRUSION_RULES.forEach(rule => {
      this.rules.set(rule.id, { ...rule });
    });
  }

  private async analyzeEvent(event: IntrusionEvent): Promise<void> {
    const now = Date.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Verifica se o evento corresponde ao padrão da regra
      let matches = false;

      if (rule.pattern instanceof RegExp) {
        const payload = JSON.stringify(event.payload || '');
        matches =
          rule.pattern.test(payload) ||
          rule.pattern.test(event.source) ||
          rule.pattern.test(event.userAgent || '');
      } else if (typeof rule.pattern === 'function') {
        matches = rule.pattern(event);
      }

      if (!matches) continue;

      // Conta eventos similares na janela de tempo
      const windowStart = now - rule.timeWindow;
      const similarEvents = this.events.filter(
        e =>
          e.timestamp.getTime() > windowStart &&
          e.ipAddress === event.ipAddress &&
          this.eventMatchesRule(e, rule)
      );

      if (similarEvents.length >= rule.threshold) {
        await this.triggerAlert(rule, similarEvents);
      }
    }
  }

  private eventMatchesRule(
    event: IntrusionEvent,
    rule: IntrusionRule
  ): boolean {
    if (rule.pattern instanceof RegExp) {
      const payload = JSON.stringify(event.payload || '');
      return (
        rule.pattern.test(payload) ||
        rule.pattern.test(event.source) ||
        rule.pattern.test(event.userAgent || '')
      );
    } else if (typeof rule.pattern === 'function') {
      return rule.pattern(event);
    }
    return false;
  }

  private async triggerAlert(
    rule: IntrusionRule,
    events: IntrusionEvent[]
  ): Promise<void> {
    const alert: IntrusionAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      rule: { ...rule },
      events: [...events],
      severity: rule.severity,
      status: 'active',
    };

    this.alerts.push(alert);

    // Executa ações da regra
    for (const action of rule.actions) {
      await this.executeAction(action, events[0], alert);
    }

    // Log no sistema de auditoria
    await securityAuditService.logSecurityEvent(
      'unauthorized_access',
      rule.severity,
      `Alerta de intrusão: ${rule.name} - ${events.length} eventos detectados`,
      {
        ipAddress: events[0].ipAddress,
        userAgent: events[0].userAgent || '',
        userId: events[0].userId,
        metadata: {
          ruleId: rule.id,
          alertId: alert.id,
          eventCount: events.length,
        },
      }
    );
  }

  private async executeAction(
    action: IntrusionAction,
    triggerEvent: IntrusionEvent,
    alert: IntrusionAlert
  ): Promise<void> {
    const now = Date.now();

    switch (action.type) {
      case 'block_ip':
        if (action.duration) {
          this.blockedIPs.set(triggerEvent.ipAddress, now + action.duration);
        }
        break;

      case 'block_user':
        if (triggerEvent.userId && action.duration) {
          this.blockedUsers.set(triggerEvent.userId, now + action.duration);
        }
        break;

      case 'rate_limit':
        if (action.duration) {
          this.rateLimits.set(triggerEvent.ipAddress, {
            count: 999999, // Efetivamente bloqueia
            resetTime: now + action.duration,
          });
        }
        break;

      case 'alert':
        // Enviar notificação (email, Slack, etc.)
        console.warn(`🚨 ALERTA DE SEGURANÇA: ${alert.rule.name}`);
        break;

      case 'log':
        console.log(
          `📋 LOG DE SEGURANÇA: ${alert.rule.name} - IP: ${triggerEvent.ipAddress}`
        );
        break;

      case 'redirect':
        // Implementar redirecionamento se necessário
        break;
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTimer(): void {
    // Limpa dados antigos a cada hora
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000; // 24 horas

      // Limpa eventos antigos
      this.events = this.events.filter(e => e.timestamp.getTime() > cutoff);

      // Limpa bloqueios expirados
      for (const [ip, expiration] of this.blockedIPs.entries()) {
        if (now > expiration) {
          this.blockedIPs.delete(ip);
        }
      }

      for (const [userId, expiration] of this.blockedUsers.entries()) {
        if (now > expiration) {
          this.blockedUsers.delete(userId);
        }
      }

      // Limpa rate limits expirados
      for (const [key, data] of this.rateLimits.entries()) {
        if (now > data.resetTime) {
          this.rateLimits.delete(key);
        }
      }
    }, 3600000); // 1 hora
  }
}

// Instância singleton
export const intrusionDetectionService = new IntrusionDetectionService();

export default IntrusionDetectionService;
