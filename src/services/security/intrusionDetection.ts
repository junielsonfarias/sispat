import { logWarning, logError } from '@/utils/logger';

export interface IntrusionEvent {
  id: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  eventType: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'sql_injection' | 'xss_attempt' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  blocked: boolean;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  priority: number;
  cooldown: number; // em segundos
}

export interface SecurityCondition {
  type: 'ip_whitelist' | 'ip_blacklist' | 'rate_limit' | 'pattern_match' | 'user_agent' | 'geolocation' | 'time_window';
  parameters: Record<string, any>;
}

export interface SecurityAction {
  type: 'block' | 'log' | 'alert' | 'captcha' | 'rate_limit' | 'redirect';
  parameters: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  timestamp: number;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  events: IntrusionEvent[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

class IntrusionDetectionSystem {
  private events = new Map<string, IntrusionEvent[]>();
  private alerts = new Map<string, SecurityAlert>();
  private rules: SecurityRule[] = [];
  private blockedIPs = new Set<string>();
  private rateLimitCounters = new Map<string, { count: number; resetTime: number }>();
  private whitelistedIPs = new Set<string>();
  private blacklistedIPs = new Set<string>();

  constructor() {
    this.initializeDefaultRules();
    this.startPeriodicCleanup();
  }

  /**
   * Registra um evento de segurança
   */
  recordEvent(event: Omit<IntrusionEvent, 'id' | 'timestamp'>): string {
    const eventId = this.generateEventId();
    const fullEvent: IntrusionEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
    };

    // Armazenar evento
    if (!this.events.has(event.ipAddress)) {
      this.events.set(event.ipAddress, []);
    }
    this.events.get(event.ipAddress)!.push(fullEvent);

    // Avaliar regras de segurança
    const triggeredRules = this.evaluateRules(fullEvent);
    
    // Executar ações das regras
    for (const rule of triggeredRules) {
      this.executeRuleActions(rule, fullEvent);
    }

    // Verificar se deve criar alerta
    this.checkForAlerts(event.ipAddress);

    return eventId;
  }

  /**
   * Verifica se um IP está bloqueado
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Verifica se uma requisição deve ser permitida
   */
  shouldAllowRequest(
    ipAddress: string,
    userAgent: string,
    userId?: string,
    sessionId?: string
  ): { allowed: boolean; reason?: string; action?: string } {
    // Verificar IPs bloqueados
    if (this.blockedIPs.has(ipAddress)) {
      return {
        allowed: false,
        reason: 'IP bloqueado por atividade suspeita',
        action: 'block',
      };
    }

    // Verificar rate limiting
    const rateLimitResult = this.checkRateLimit(ipAddress);
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        reason: 'Limite de taxa excedido',
        action: 'rate_limit',
      };
    }

    // Verificar padrões suspeitos
    const suspiciousPatterns = this.detectSuspiciousPatterns(userAgent, ipAddress);
    if (suspiciousPatterns.length > 0) {
      this.recordEvent({
        ipAddress,
        userAgent,
        userId: userId || '',
        sessionId: sessionId || '',
        eventType: 'suspicious_activity',
        severity: 'medium',
        description: `Atividade suspeita detectada: ${suspiciousPatterns.join(', ')}`,
        metadata: { patterns: suspiciousPatterns },
        blocked: false,
      });

      return {
        allowed: true,
        reason: 'Atividade suspeita detectada, monitorando',
        action: 'monitor',
      };
    }

    return { allowed: true };
  }

  /**
   * Adiciona uma regra de segurança
   */
  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority); // Prioridade mais alta primeiro
  }

  /**
   * Remove uma regra de segurança
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Obtém alertas de segurança
   */
  getAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    acknowledged?: boolean
  ): SecurityAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Reconhece um alerta
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats(): {
    totalEvents: number;
    totalAlerts: number;
    blockedIPs: number;
    activeAlerts: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
  } {
    const allEvents = Array.from(this.events.values()).flat();
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of allEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    return {
      totalEvents: allEvents.length,
      totalAlerts: this.alerts.size,
      blockedIPs: this.blockedIPs.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged).length,
      eventsByType,
      eventsBySeverity,
    };
  }

  /**
   * Inicializa regras padrão de segurança
   */
  private initializeDefaultRules(): void {
    // Regra 1: Rate limiting para tentativas de login
    this.addRule({
      id: 'rate_limit_login',
      name: 'Rate Limiting - Login',
      description: 'Bloqueia IPs com muitas tentativas de login falhadas',
      enabled: true,
      priority: 100,
      cooldown: 300, // 5 minutos
      conditions: [
        {
          type: 'rate_limit',
          parameters: {
            eventType: 'failed_login',
            maxEvents: 5,
            timeWindow: 300, // 5 minutos
          },
        },
      ],
      actions: [
        {
          type: 'block',
          parameters: {
            duration: 1800, // 30 minutos
          },
        },
        {
          type: 'alert',
          parameters: {
            severity: 'high',
          },
        },
      ],
    });

    // Regra 2: Detecção de SQL Injection
    this.addRule({
      id: 'sql_injection_detection',
      name: 'SQL Injection Detection',
      description: 'Detecta tentativas de SQL injection',
      enabled: true,
      priority: 90,
      cooldown: 60,
      conditions: [
        {
          type: 'pattern_match',
          parameters: {
            patterns: [
              /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
              /(\b(or|and)\s+\d+\s*=\s*\d+)/i,
              /(\b(union|select).*from)/i,
              /(\b(union|select).*where)/i,
            ],
          },
        },
      ],
      actions: [
        {
          type: 'block',
          parameters: {
            duration: 3600, // 1 hora
          },
        },
        {
          type: 'alert',
          parameters: {
            severity: 'critical',
          },
        },
      ],
    });

    // Regra 3: Detecção de XSS
    this.addRule({
      id: 'xss_detection',
      name: 'XSS Detection',
      description: 'Detecta tentativas de XSS',
      enabled: true,
      priority: 85,
      cooldown: 60,
      conditions: [
        {
          type: 'pattern_match',
          parameters: {
            patterns: [
              /<script[^>]*>/i,
              /javascript:/i,
              /on\w+\s*=/i,
              /<iframe[^>]*>/i,
              /<object[^>]*>/i,
            ],
          },
        },
      ],
      actions: [
        {
          type: 'block',
          parameters: {
            duration: 1800, // 30 minutos
          },
        },
        {
          type: 'alert',
          parameters: {
            severity: 'high',
          },
        },
      ],
    });

    // Regra 4: User Agents suspeitos
    this.addRule({
      id: 'suspicious_user_agent',
      name: 'Suspicious User Agent',
      description: 'Detecta user agents suspeitos ou vazios',
      enabled: true,
      priority: 70,
      cooldown: 300,
      conditions: [
        {
          type: 'user_agent',
          parameters: {
            suspiciousPatterns: [
              /^$/,
              /^(curl|wget|python|java|bot|crawler)/i,
              /(sqlmap|nikto|nmap|metasploit)/i,
            ],
          },
        },
      ],
      actions: [
        {
          type: 'log',
          parameters: {},
        },
        {
          type: 'alert',
          parameters: {
            severity: 'medium',
          },
        },
      ],
    });
  }

  /**
   * Avalia regras contra um evento
   */
  private evaluateRules(event: IntrusionEvent): SecurityRule[] {
    const triggeredRules: SecurityRule[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Verificar cooldown
      const lastTrigger = this.getLastRuleTrigger(rule.id, event.ipAddress);
      if (lastTrigger && Date.now() - lastTrigger < rule.cooldown * 1000) {
        continue;
      }

      // Verificar condições
      if (this.evaluateRuleConditions(rule, event)) {
        triggeredRules.push(rule);
        this.recordRuleTrigger(rule.id, event.ipAddress);
      }
    }

    return triggeredRules;
  }

  /**
   * Avalia condições de uma regra
   */
  private evaluateRuleConditions(rule: SecurityRule, event: IntrusionEvent): boolean {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Avalia uma condição específica
   */
  private evaluateCondition(condition: SecurityCondition, event: IntrusionEvent): boolean {
    switch (condition.type) {
      case 'ip_whitelist':
        return this.whitelistedIPs.has(event.ipAddress);

      case 'ip_blacklist':
        return this.blacklistedIPs.has(event.ipAddress);

      case 'rate_limit':
        return this.checkRateLimitCondition(condition.parameters, event);

      case 'pattern_match':
        return this.checkPatternMatchCondition(condition.parameters, event);

      case 'user_agent':
        return this.checkUserAgentCondition(condition.parameters, event);

      case 'time_window':
        return this.checkTimeWindowCondition(condition.parameters, event);

      default:
        return false;
    }
  }

  /**
   * Verifica condição de rate limit
   */
  private checkRateLimitCondition(parameters: any, event: IntrusionEvent): boolean {
    const { eventType, maxEvents, timeWindow } = parameters;
    const cutoffTime = Date.now() - timeWindow * 1000;

    const events = this.events.get(event.ipAddress) || [];
    const recentEvents = events.filter(
      e => e.eventType === eventType && e.timestamp > cutoffTime
    );

    return recentEvents.length >= maxEvents;
  }

  /**
   * Verifica condição de padrão
   */
  private checkPatternMatchCondition(parameters: any, event: IntrusionEvent): boolean {
    const { patterns } = parameters;
    const textToCheck = `${event.description} ${event.userAgent}`;

    for (const pattern of patterns) {
      if (pattern.test(textToCheck)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica condição de user agent
   */
  private checkUserAgentCondition(parameters: any, event: IntrusionEvent): boolean {
    const { suspiciousPatterns } = parameters;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(event.userAgent)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica condição de janela de tempo
   */
  private checkTimeWindowCondition(parameters: any, event: IntrusionEvent): boolean {
    const { startHour, endHour } = parameters;
    const eventHour = new Date(event.timestamp).getHours();
    return eventHour >= startHour && eventHour <= endHour;
  }

  /**
   * Executa ações de uma regra
   */
  private executeRuleActions(rule: SecurityRule, event: IntrusionEvent): void {
    for (const action of rule.actions) {
      this.executeAction(action, event, rule);
    }
  }

  /**
   * Executa uma ação específica
   */
  private executeAction(action: SecurityAction, event: IntrusionEvent, rule: SecurityRule): void {
    switch (action.type) {
      case 'block':
        this.blockIP(event.ipAddress, action.parameters['duration'] || 3600);
        break;

      case 'log':
        logWarning(`Regra de segurança acionada: ${rule.name}`, {
          ruleId: rule.id,
          eventId: event.id,
          ipAddress: event.ipAddress,
          severity: event.severity,
        });
        break;

      case 'alert':
        this.createAlert(rule, event, action.parameters['severity'] || 'medium');
        break;

      case 'rate_limit':
        this.applyRateLimit(event.ipAddress, action.parameters);
        break;

      case 'redirect':
        // Implementar redirecionamento se necessário
        break;

      case 'captcha':
        // Implementar captcha se necessário
        break;
    }
  }

  /**
   * Bloqueia um IP
   */
  private blockIP(ipAddress: string, durationSeconds: number): void {
    this.blockedIPs.add(ipAddress);
    
    // Remover bloqueio após o tempo especificado
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
    }, durationSeconds * 1000);

    logWarning(`IP bloqueado: ${ipAddress}`, {
      duration: durationSeconds,
      reason: 'Regra de segurança acionada',
    });
  }

  /**
   * Cria um alerta de segurança
   */
  private createAlert(rule: SecurityRule, event: IntrusionEvent, severity: string): void {
    const alertId = this.generateAlertId();
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: Date.now(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: severity as any,
      description: `Regra "${rule.name}" acionada para IP ${event.ipAddress}`,
      events: [event],
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);

    logWarning(`Alerta de segurança criado: ${rule.name}`, {
      alertId,
      ruleId: rule.id,
      ipAddress: event.ipAddress,
      severity,
    });
  }

  /**
   * Verifica rate limiting
   */
  private checkRateLimit(ipAddress: string): { allowed: boolean; remaining: number } {
    const counter = this.rateLimitCounters.get(ipAddress);
    const now = Date.now();

    if (!counter || now > counter.resetTime) {
      // Reset counter
      this.rateLimitCounters.set(ipAddress, {
        count: 1,
        resetTime: now + 60000, // 1 minuto
      });
      return { allowed: true, remaining: 99 };
    }

    if (counter.count >= 100) { // 100 requests por minuto
      return { allowed: false, remaining: 0 };
    }

    counter.count++;
    return { allowed: true, remaining: 100 - counter.count };
  }

  /**
   * Aplica rate limiting
   */
  private applyRateLimit(ipAddress: string, parameters: any): void {
    const { maxRequests, timeWindow } = parameters;
    const resetTime = Date.now() + (timeWindow || 60000);

    this.rateLimitCounters.set(ipAddress, {
      count: maxRequests || 100,
      resetTime,
    });
  }

  /**
   * Detecta padrões suspeitos
   */
  private detectSuspiciousPatterns(userAgent: string, ipAddress: string): string[] {
    const patterns: string[] = [];

    // User agent vazio ou suspeito
    if (!userAgent || userAgent.trim() === '') {
      patterns.push('User agent vazio');
    }

    // User agents conhecidos de bots maliciosos
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /metasploit/i,
      /curl/i,
      /wget/i,
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        patterns.push(`User agent suspeito: ${userAgent}`);
        break;
      }
    }

    return patterns;
  }

  /**
   * Verifica se deve criar alertas
   */
  private checkForAlerts(ipAddress: string): void {
    const events = this.events.get(ipAddress) || [];
    const recentEvents = events.filter(e => Date.now() - e.timestamp < 3600000); // 1 hora

    // Criar alerta se houver muitos eventos recentes
    if (recentEvents.length >= 10) {
      const alertId = this.generateAlertId();
      const alert: SecurityAlert = {
        id: alertId,
        timestamp: Date.now(),
        ruleId: 'high_activity',
        ruleName: 'Alta Atividade',
        severity: 'medium',
        description: `Alta atividade detectada para IP ${ipAddress}: ${recentEvents.length} eventos em 1 hora`,
        events: recentEvents,
        acknowledged: false,
      };

      this.alerts.set(alertId, alert);
    }
  }

  /**
   * Gera ID único para evento
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID único para alerta
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém último trigger de uma regra
   */
  private getLastRuleTrigger(ruleId: string, ipAddress: string): number | null {
    // Implementação simplificada - em produção usar cache/banco
    return null;
  }

  /**
   * Registra trigger de uma regra
   */
  private recordRuleTrigger(ruleId: string, ipAddress: string): void {
    // Implementação simplificada - em produção usar cache/banco
  }

  /**
   * Inicia limpeza periódica
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hora
  }

  /**
   * Limpa dados antigos
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

    // Limpar eventos antigos
    for (const [ipAddress, events] of this.events.entries()) {
      const filteredEvents = events.filter(e => e.timestamp > cutoffTime);
      if (filteredEvents.length === 0) {
        this.events.delete(ipAddress);
      } else {
        this.events.set(ipAddress, filteredEvents);
      }
    }

    // Limpar alertas antigos (mais de 7 dias)
    const alertCutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < alertCutoffTime) {
        this.alerts.delete(alertId);
      }
    }

    // Limpar contadores de rate limit antigos
    const now = Date.now();
    for (const [ipAddress, counter] of this.rateLimitCounters.entries()) {
      if (now > counter.resetTime) {
        this.rateLimitCounters.delete(ipAddress);
      }
    }
  }
}

// Instância singleton
export const intrusionDetection = new IntrusionDetectionSystem();

export default IntrusionDetectionSystem;
