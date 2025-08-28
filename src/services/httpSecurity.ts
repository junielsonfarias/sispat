export interface SecurityHeaders {
  'Strict-Transport-Security': string
  'Content-Security-Policy': string
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'Cross-Origin-Embedder-Policy': string
  'Cross-Origin-Opener-Policy': string
  'Cross-Origin-Resource-Policy': string
}

export interface CSPDirectives {
  'default-src': string[]
  'script-src': string[]
  'style-src': string[]
  'img-src': string[]
  'font-src': string[]
  'connect-src': string[]
  'media-src': string[]
  'object-src': string[]
  'child-src': string[]
  'worker-src': string[]
  'frame-ancestors': string[]
  'base-uri': string[]
  'form-action': string[]
  'upgrade-insecure-requests': boolean
  'block-all-mixed-content': boolean
}

export interface HTTPSConfig {
  enforceHTTPS: boolean
  hstsMaxAge: number
  hstsIncludeSubdomains: boolean
  hstsPreload: boolean
  redirectHTTPToHTTPS: boolean
  secureHeaders: boolean
}

// Configuração padrão de CSP para o SISPAT
export const DEFAULT_CSP_DIRECTIVES: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para React em desenvolvimento
    "'unsafe-eval'", // Necessário para algumas bibliotecas
    'https://cdn.jsdelivr.net',
    'https://unpkg.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http://localhost:*' // Desenvolvimento
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://api.sispat.gov.br',
    'http://localhost:*', // Desenvolvimento
    'ws://localhost:*', // WebSocket desenvolvimento
    'wss://api.sispat.gov.br'
  ],
  'media-src': ["'self'", 'data:', 'blob:'],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true
}

// Configuração padrão de HTTPS
export const DEFAULT_HTTPS_CONFIG: HTTPSConfig = {
  enforceHTTPS: true,
  hstsMaxAge: 31536000, // 1 ano
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  redirectHTTPToHTTPS: true,
  secureHeaders: true
}

class HTTPSecurityService {
  private config: HTTPSConfig
  private cspDirectives: CSPDirectives

  constructor(config: HTTPSConfig = DEFAULT_HTTPS_CONFIG, csp: CSPDirectives = DEFAULT_CSP_DIRECTIVES) {
    this.config = config
    this.cspDirectives = csp
  }

  /**
   * Gera headers de segurança HTTP
   */
  generateSecurityHeaders(): SecurityHeaders {
    const headers: SecurityHeaders = {
      // HSTS - Força HTTPS
      'Strict-Transport-Security': this.buildHSTSHeader(),
      
      // CSP - Previne XSS e injeção de código
      'Content-Security-Policy': this.buildCSPHeader(),
      
      // Previne MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Previne clickjacking
      'X-Frame-Options': 'DENY',
      
      // Proteção XSS do navegador (legacy)
      'X-XSS-Protection': '1; mode=block',
      
      // Controla informações do referrer
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Controla APIs do navegador
      'Permissions-Policy': this.buildPermissionsPolicyHeader(),
      
      // Cross-Origin Policies
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    }

    return headers
  }

  /**
   * Aplica headers de segurança a uma requisição
   */
  applySecurityHeaders(request: Request): Headers {
    const headers = new Headers(request.headers)
    const securityHeaders = this.generateSecurityHeaders()

    Object.entries(securityHeaders).forEach(([name, value]) => {
      headers.set(name, value)
    })

    return headers
  }

  /**
   * Verifica se uma URL é HTTPS
   */
  isHTTPS(url: string): boolean {
    return url.toLowerCase().startsWith('https://')
  }

  /**
   * Força redirecionamento para HTTPS
   */
  enforceHTTPS(url: string): string {
    if (this.config.enforceHTTPS && !this.isHTTPS(url) && !url.includes('localhost')) {
      return url.replace(/^http:\/\//i, 'https://')
    }
    return url
  }

  /**
   * Valida se uma URL é permitida pelo CSP
   */
  validateCSPSource(url: string, directive: keyof CSPDirectives): boolean {
    const sources = this.cspDirectives[directive]
    if (!Array.isArray(sources)) return false

    // Verifica se a URL corresponde a alguma fonte permitida
    return sources.some(source => {
      if (source === "'self'") {
        return url.startsWith(window.location.origin)
      }
      if (source === "'unsafe-inline'" || source === "'unsafe-eval'") {
        return false // Essas diretivas não se aplicam a URLs
      }
      if (source.startsWith('https://') || source.startsWith('http://')) {
        return url.startsWith(source.replace('*', ''))
      }
      if (source === 'data:' || source === 'blob:') {
        return url.startsWith(source)
      }
      return false
    })
  }

  /**
   * Cria um nonce para scripts inline
   */
  generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }

  /**
   * Adiciona nonce a diretivas CSP
   */
  addNonceToCSP(nonce: string): void {
    this.cspDirectives['script-src'] = [
      ...this.cspDirectives['script-src'].filter(src => !src.startsWith("'nonce-")),
      `'nonce-${nonce}'`
    ]
  }

  /**
   * Valida configuração de segurança
   */
  validateSecurityConfig(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []

    // Verifica HSTS
    if (this.config.hstsMaxAge < 31536000) {
      warnings.push('HSTS max-age deveria ser pelo menos 1 ano (31536000 segundos)')
    }

    // Verifica CSP
    if (this.cspDirectives['script-src'].includes("'unsafe-eval'")) {
      warnings.push("'unsafe-eval' em script-src pode permitir ataques XSS")
    }

    if (this.cspDirectives['script-src'].includes("'unsafe-inline'")) {
      warnings.push("'unsafe-inline' em script-src pode permitir ataques XSS")
    }

    if (!this.cspDirectives['upgrade-insecure-requests']) {
      warnings.push('upgrade-insecure-requests deveria estar habilitado')
    }

    // Verifica frame-ancestors
    if (!this.cspDirectives['frame-ancestors'].includes("'none'") && 
        !this.cspDirectives['frame-ancestors'].includes("'self'")) {
      warnings.push('frame-ancestors deveria ser mais restritivo')
    }

    return {
      valid: warnings.length === 0,
      warnings
    }
  }

  /**
   * Atualiza configuração CSP
   */
  updateCSPDirectives(updates: Partial<CSPDirectives>): void {
    this.cspDirectives = { ...this.cspDirectives, ...updates }
  }

  /**
   * Atualiza configuração HTTPS
   */
  updateHTTPSConfig(updates: Partial<HTTPSConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Gera relatório de segurança
   */
  generateSecurityReport(): {
    httpsConfig: HTTPSConfig
    cspDirectives: CSPDirectives
    securityHeaders: SecurityHeaders
    validation: { valid: boolean; warnings: string[] }
    recommendations: string[]
  } {
    const validation = this.validateSecurityConfig()
    const recommendations = this.generateRecommendations()

    return {
      httpsConfig: this.config,
      cspDirectives: this.cspDirectives,
      securityHeaders: this.generateSecurityHeaders(),
      validation,
      recommendations
    }
  }

  // Métodos privados
  private buildHSTSHeader(): string {
    let hsts = `max-age=${this.config.hstsMaxAge}`
    
    if (this.config.hstsIncludeSubdomains) {
      hsts += '; includeSubDomains'
    }
    
    if (this.config.hstsPreload) {
      hsts += '; preload'
    }
    
    return hsts
  }

  private buildCSPHeader(): string {
    const directives: string[] = []

    Object.entries(this.cspDirectives).forEach(([directive, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          directives.push(directive.replace(/([A-Z])/g, '-$1').toLowerCase())
        }
      } else if (Array.isArray(value) && value.length > 0) {
        const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase()
        directives.push(`${directiveName} ${value.join(' ')}`)
      }
    })

    return directives.join('; ')
  }

  private buildPermissionsPolicyHeader(): string {
    // Política restritiva por padrão
    const permissions = [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ]

    return permissions.join(', ')
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const validation = this.validateSecurityConfig()

    if (validation.warnings.length > 0) {
      recommendations.push('Corrigir avisos de configuração CSP')
    }

    if (!this.config.enforceHTTPS) {
      recommendations.push('Ativar imposição de HTTPS')
    }

    if (this.config.hstsMaxAge < 63072000) { // 2 anos
      recommendations.push('Considerar aumentar HSTS max-age para 2 anos')
    }

    if (this.cspDirectives['script-src'].includes("'unsafe-inline'")) {
      recommendations.push('Implementar nonces ou hashes para scripts inline')
    }

    recommendations.push('Revisar regularmente políticas de segurança')
    recommendations.push('Monitorar relatórios de violação CSP')
    recommendations.push('Testar configurações em ambiente de staging')

    return recommendations
  }
}

// Utilitários para uso em componentes
export const httpSecurityUtils = {
  /**
   * Adiciona headers de segurança a fetch requests
   */
  secureRequest: (url: string, options: RequestInit = {}): Promise<Response> => {
    const securityService = new HTTPSecurityService()
    const secureUrl = securityService.enforceHTTPS(url)
    
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }

    return fetch(secureUrl, secureOptions)
  },

  /**
   * Verifica se o ambiente atual é seguro
   */
  isSecureContext: (): boolean => {
    return window.isSecureContext || window.location.protocol === 'https:'
  },

  /**
   * Sanitiza URLs para evitar open redirects
   */
  sanitizeRedirectURL: (url: string, allowedDomains: string[] = []): string | null => {
    try {
      const parsed = new URL(url, window.location.origin)
      
      // Permite apenas URLs do mesmo domínio ou domínios explicitamente permitidos
      if (parsed.origin === window.location.origin) {
        return parsed.href
      }
      
      if (allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) {
        return parsed.href
      }
      
      return null
    } catch {
      return null
    }
  },

  /**
   * Gera token CSRF
   */
  generateCSRFToken: (): string => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '')
  }
}

// Instância singleton
export const httpSecurityService = new HTTPSecurityService()

export default HTTPSecurityService
