export interface SecurityEvent {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  eventType: SecurityEventType
  severity: SecuritySeverity
  description: string
  metadata?: Record<string, any>
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

export type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'login_brute_force'
  | 'password_change'
  | 'password_reset'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'suspicious_location'
  | 'unusual_activity'
  | 'data_access'
  | 'data_modification'
  | 'privilege_escalation'
  | 'unauthorized_access'
  | 'session_hijack'
  | 'xss_attempt'
  | 'csrf_attempt'
  | 'sql_injection'
  | 'file_upload_malicious'
  | 'rate_limit_exceeded'
  | 'security_policy_violation'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityAuditConfig {
  enableRealTimeAlerts: boolean
  enableEmailNotifications: boolean
  enableSlackNotifications: boolean
  maxLoginAttempts: number
  lockoutDuration: number
  suspiciousLocationDetection: boolean
  unusualActivityDetection: boolean
  dataAccessMonitoring: boolean
  retentionDays: number
}

export interface SecurityMetrics {
  totalEvents: number
  eventsLast24h: number
  eventsLast7d: number
  eventsByType: Record<SecurityEventType, number>
  eventsBySeverity: Record<SecuritySeverity, number>
  topRiskyUsers: Array<{
    userId: string
    userName: string
    riskScore: number
    recentEvents: number
  }>
  topRiskyIPs: Array<{
    ipAddress: string
    riskScore: number
    recentEvents: number
    location?: string
  }>
}

export interface RiskAssessment {
  userId: string
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: Array<{
    factor: string
    weight: number
    description: string
  }>
  recommendations: string[]
}

class SecurityAuditService {
  private config: SecurityAuditConfig
  private events: SecurityEvent[] = []
  private userSessions: Map<string, Set<string>> = new Map()
  private loginAttempts: Map<string, number> = new Map()
  private lockedAccounts: Set<string> = new Set()

  constructor(config: SecurityAuditConfig) {
    this.config = config
    this.startCleanupTimer()
  }

  /**
   * Registra um evento de segurança
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    description: string,
    context: {
      userId?: string
      sessionId?: string
      ipAddress: string
      userAgent: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity,
      description,
      resolved: false,
      ...context
    }

    this.events.push(event)

    // Processa o evento para detecção de padrões suspeitos
    await this.processEvent(event)

    // Envia alertas se necessário
    if (severity === 'high' || severity === 'critical') {
      await this.sendAlert(event)
    }

    // Salva no backend (simular)
    await this.persistEvent(event)
  }

  /**
   * Monitora tentativas de login
   */
  async monitorLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const key = `${userId}:${ipAddress}`
    
    if (success) {
      // Reset contador em caso de sucesso
      this.loginAttempts.delete(key)
      this.lockedAccounts.delete(userId)
      
      await this.logSecurityEvent(
        'login_success',
        'low',
        `Login bem-sucedido para usuário ${userId}`,
        { userId, ipAddress, userAgent }
      )

      // Verifica localização suspeita
      await this.checkSuspiciousLocation(userId, ipAddress, userAgent)
      
      return { allowed: true }
    } else {
      // Incrementa contador de tentativas
      const attempts = (this.loginAttempts.get(key) || 0) + 1
      this.loginAttempts.set(key, attempts)

      await this.logSecurityEvent(
        'login_failed',
        attempts > 3 ? 'medium' : 'low',
        `Tentativa de login falhada para usuário ${userId} (tentativa ${attempts})`,
        { userId, ipAddress, userAgent, metadata: { attempts } }
      )

      // Verifica se deve bloquear
      if (attempts >= this.config.maxLoginAttempts) {
        this.lockedAccounts.add(userId)
        
        await this.logSecurityEvent(
          'login_brute_force',
          'high',
          `Possível ataque de força bruta detectado para usuário ${userId}`,
          { userId, ipAddress, userAgent, metadata: { attempts } }
        )

        // Agenda desbloqueio
        setTimeout(() => {
          this.lockedAccounts.delete(userId)
          this.loginAttempts.delete(key)
        }, this.config.lockoutDuration)

        return { 
          allowed: false, 
          reason: `Conta temporariamente bloqueada devido a múltiplas tentativas de login falhadas. Tente novamente em ${this.config.lockoutDuration / 1000 / 60} minutos.`
        }
      }

      return { allowed: true }
    }
  }

  /**
   * Verifica se um usuário está bloqueado
   */
  isUserLocked(userId: string): boolean {
    return this.lockedAccounts.has(userId)
  }

  /**
   * Monitora acesso a dados sensíveis
   */
  async monitorDataAccess(
    userId: string,
    dataType: string,
    operation: 'read' | 'create' | 'update' | 'delete',
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const severity = operation === 'delete' ? 'medium' : 'low'
    
    await this.logSecurityEvent(
      'data_access',
      severity,
      `Usuário ${userId} realizou operação ${operation} em ${dataType}`,
      { userId, ipAddress, userAgent, metadata: { dataType, operation, ...metadata } }
    )
  }

  /**
   * Calcula métricas de segurança
   */
  getSecurityMetrics(): SecurityMetrics {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const eventsLast24h = this.events.filter(e => e.timestamp >= last24h).length
    const eventsLast7d = this.events.filter(e => e.timestamp >= last7d).length

    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1
      return acc
    }, {} as Record<SecurityEventType, number>)

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      return acc
    }, {} as Record<SecuritySeverity, number>)

    // Calcula usuários mais arriscados
    const userRisks = this.calculateUserRisks()
    const topRiskyUsers = Array.from(userRisks.entries())
      .map(([userId, risk]) => ({
        userId,
        userName: `User ${userId}`, // Em produção, buscar nome real
        riskScore: risk.riskScore,
        recentEvents: this.events.filter(e => 
          e.userId === userId && 
          e.timestamp >= last7d
        ).length
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)

    // Calcula IPs mais arriscados
    const ipRisks = this.calculateIPRisks()
    const topRiskyIPs = Array.from(ipRisks.entries())
      .map(([ip, risk]) => ({
        ipAddress: ip,
        riskScore: risk,
        recentEvents: this.events.filter(e => 
          e.ipAddress === ip && 
          e.timestamp >= last7d
        ).length
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)

    return {
      totalEvents: this.events.length,
      eventsLast24h,
      eventsLast7d,
      eventsByType,
      eventsBySeverity,
      topRiskyUsers,
      topRiskyIPs
    }
  }

  /**
   * Avalia o risco de um usuário
   */
  assessUserRisk(userId: string): RiskAssessment {
    const userEvents = this.events.filter(e => e.userId === userId)
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentEvents = userEvents.filter(e => e.timestamp >= last30d)

    const factors: Array<{ factor: string; weight: number; description: string }> = []
    let riskScore = 0

    // Fator: Eventos de alta severidade
    const highSeverityEvents = recentEvents.filter(e => e.severity === 'high' || e.severity === 'critical')
    if (highSeverityEvents.length > 0) {
      const weight = Math.min(highSeverityEvents.length * 20, 40)
      factors.push({
        factor: 'Eventos de alta severidade',
        weight,
        description: `${highSeverityEvents.length} eventos críticos nos últimos 30 dias`
      })
      riskScore += weight
    }

    // Fator: Tentativas de login falhadas
    const failedLogins = recentEvents.filter(e => e.eventType === 'login_failed')
    if (failedLogins.length > 5) {
      const weight = Math.min(failedLogins.length * 2, 20)
      factors.push({
        factor: 'Tentativas de login falhadas',
        weight,
        description: `${failedLogins.length} tentativas de login falhadas`
      })
      riskScore += weight
    }

    // Fator: Múltiplos IPs
    const uniqueIPs = new Set(recentEvents.map(e => e.ipAddress)).size
    if (uniqueIPs > 5) {
      const weight = Math.min(uniqueIPs * 3, 25)
      factors.push({
        factor: 'Múltiplos endereços IP',
        weight,
        description: `Acesso de ${uniqueIPs} endereços IP diferentes`
      })
      riskScore += weight
    }

    // Determina nível de risco
    let riskLevel: RiskAssessment['riskLevel']
    if (riskScore < 20) riskLevel = 'low'
    else if (riskScore < 40) riskLevel = 'medium'
    else if (riskScore < 70) riskLevel = 'high'
    else riskLevel = 'critical'

    // Gera recomendações
    const recommendations: string[] = []
    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Ativar autenticação de dois fatores')
      recommendations.push('Revisar acessos recentes')
      recommendations.push('Alterar senha imediatamente')
    }
    if (uniqueIPs > 3) {
      recommendations.push('Verificar dispositivos autorizados')
    }
    if (failedLogins.length > 3) {
      recommendations.push('Investigar tentativas de acesso não autorizadas')
    }

    return {
      userId,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      factors,
      recommendations
    }
  }

  // Métodos privados
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async processEvent(event: SecurityEvent): Promise<void> {
    // Detecta padrões suspeitos baseado no tipo de evento
    switch (event.eventType) {
      case 'login_failed':
        await this.detectBruteForce(event)
        break
      case 'data_access':
        await this.detectUnusualDataAccess(event)
        break
      // Adicionar mais detecções conforme necessário
    }
  }

  private async detectBruteForce(event: SecurityEvent): Promise<void> {
    if (!event.userId) return

    const recentFailures = this.events.filter(e => 
      e.userId === event.userId &&
      e.eventType === 'login_failed' &&
      e.timestamp >= new Date(Date.now() - 10 * 60 * 1000) // últimos 10 minutos
    )

    if (recentFailures.length >= 5) {
      await this.logSecurityEvent(
        'login_brute_force',
        'high',
        `Possível ataque de força bruta detectado para usuário ${event.userId}`,
        {
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: { failureCount: recentFailures.length }
        }
      )
    }
  }

  private async detectUnusualDataAccess(event: SecurityEvent): Promise<void> {
    // Implementar detecção de acesso incomum a dados
    // Por exemplo, acesso fora do horário normal, volumes altos, etc.
  }

  private async checkSuspiciousLocation(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    if (!this.config.suspiciousLocationDetection) return

    // Simular verificação de localização
    // Em produção, usar serviço de geolocalização
    const isNewLocation = Math.random() > 0.9 // 10% chance de ser nova localização

    if (isNewLocation) {
      await this.logSecurityEvent(
        'suspicious_location',
        'medium',
        `Login de localização suspeita para usuário ${userId}`,
        { userId, ipAddress, userAgent }
      )
    }
  }

  private calculateUserRisks(): Map<string, RiskAssessment> {
    const risks = new Map<string, RiskAssessment>()
    const userIds = new Set(this.events.map(e => e.userId).filter(Boolean))

    userIds.forEach(userId => {
      if (userId) {
        risks.set(userId, this.assessUserRisk(userId))
      }
    })

    return risks
  }

  private calculateIPRisks(): Map<string, number> {
    const risks = new Map<string, number>()
    const ips = new Set(this.events.map(e => e.ipAddress))

    ips.forEach(ip => {
      const ipEvents = this.events.filter(e => e.ipAddress === ip)
      const highSeverityEvents = ipEvents.filter(e => e.severity === 'high' || e.severity === 'critical')
      const riskScore = highSeverityEvents.length * 10 + ipEvents.length
      risks.set(ip, riskScore)
    })

    return risks
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    // Implementar envio de alertas (email, Slack, etc.)
    console.log(`🚨 ALERTA DE SEGURANÇA: ${event.description}`)
  }

  private async persistEvent(event: SecurityEvent): Promise<void> {
    // Em produção, salvar no banco de dados
    // await database.securityEvents.create(event)
  }

  private startCleanupTimer(): void {
    // Limpa eventos antigos periodicamente
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)
      this.events = this.events.filter(e => e.timestamp >= cutoff)
    }, 24 * 60 * 60 * 1000) // A cada 24 horas
  }
}

// Configuração padrão
export const DEFAULT_SECURITY_CONFIG: SecurityAuditConfig = {
  enableRealTimeAlerts: true,
  enableEmailNotifications: true,
  enableSlackNotifications: false,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutos
  suspiciousLocationDetection: true,
  unusualActivityDetection: true,
  dataAccessMonitoring: true,
  retentionDays: 90
}

// Instância singleton
export const securityAuditService = new SecurityAuditService(DEFAULT_SECURITY_CONFIG)

export default SecurityAuditService
