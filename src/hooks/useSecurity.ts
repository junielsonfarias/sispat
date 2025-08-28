import { useEffect, useState } from 'react'
import { httpSecurityService, httpSecurityUtils } from '@/services/httpSecurity'

export interface SecurityStatus {
  isSecureContext: boolean
  httpsEnforced: boolean
  headersApplied: boolean
  cspViolations: number
  lastSecurityCheck: Date
}

export interface SecurityViolation {
  type: 'csp' | 'mixed-content' | 'insecure-request'
  message: string
  source: string
  timestamp: Date
  blocked: boolean
}

/**
 * Hook para gerenciar segurança HTTP no cliente
 */
export const useSecurity = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    isSecureContext: false,
    httpsEnforced: false,
    headersApplied: false,
    cspViolations: 0,
    lastSecurityCheck: new Date()
  })
  
  const [violations, setViolations] = useState<SecurityViolation[]>([])

  useEffect(() => {
    initializeSecurity()
    setupSecurityMonitoring()
  }, [])

  const initializeSecurity = () => {
    // Verifica contexto seguro
    const isSecure = httpSecurityUtils.isSecureContext()
    
    // Força HTTPS se necessário
    if (!isSecure && window.location.hostname !== 'localhost') {
      const httpsUrl = window.location.href.replace(/^http:/, 'https:')
      window.location.replace(httpsUrl)
      return
    }

    // Aplica headers de segurança via meta tags (limitado no cliente)
    applyClientSideSecurityHeaders()

    setSecurityStatus(prev => ({
      ...prev,
      isSecureContext: isSecure,
      httpsEnforced: true,
      headersApplied: true,
      lastSecurityCheck: new Date()
    }))
  }

  const applyClientSideSecurityHeaders = () => {
    // Aplica CSP via meta tag se não estiver definido
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta')
      cspMeta.httpEquiv = 'Content-Security-Policy'
      cspMeta.content = httpSecurityService.generateSecurityHeaders()['Content-Security-Policy']
      document.head.appendChild(cspMeta)
    }

    // Adiciona outras meta tags de segurança
    const securityMetas = [
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
      { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
    ]

    securityMetas.forEach(meta => {
      const existingMeta = document.querySelector(`meta[http-equiv="${meta['http-equiv']}"]`)
      if (!existingMeta) {
        const metaTag = document.createElement('meta')
        metaTag.setAttribute('http-equiv', meta['http-equiv'])
        metaTag.content = meta.content
        document.head.appendChild(metaTag)
      }
    })
  }

  const setupSecurityMonitoring = () => {
    // Monitora violações CSP
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation: SecurityViolation = {
        type: 'csp',
        message: `CSP violation: ${event.violatedDirective}`,
        source: event.sourceFile || event.blockedURI || 'unknown',
        timestamp: new Date(),
        blocked: event.disposition === 'enforce'
      }

      setViolations(prev => [...prev.slice(-99), violation]) // Mantém últimas 100 violações
      setSecurityStatus(prev => ({
        ...prev,
        cspViolations: prev.cspViolations + 1
      }))

      // Log para debugging
      console.warn('CSP Violation:', violation)
    })

    // Monitora conteúdo misto
    if ('SecurityPolicyViolationEvent' in window) {
      window.addEventListener('securitypolicyviolation', (event) => {
        if (event.violatedDirective === 'upgrade-insecure-requests') {
          const violation: SecurityViolation = {
            type: 'mixed-content',
            message: 'Mixed content blocked',
            source: event.blockedURI || 'unknown',
            timestamp: new Date(),
            blocked: true
          }
          
          setViolations(prev => [...prev.slice(-99), violation])
        }
      })
    }
  }

  /**
   * Faz requisição HTTP segura com headers de segurança
   */
  const secureRequest = async (url: string, options: RequestInit = {}) => {
    try {
      // Adiciona token CSRF se necessário
      const csrfToken = httpSecurityUtils.generateCSRFToken()
      
      const secureOptions: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        credentials: 'same-origin', // Inclui cookies apenas para mesmo domínio
      }

      return await httpSecurityUtils.secureRequest(url, secureOptions)
    } catch (error) {
      // Log erro de segurança
      const violation: SecurityViolation = {
        type: 'insecure-request',
        message: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: url,
        timestamp: new Date(),
        blocked: true
      }
      
      setViolations(prev => [...prev.slice(-99), violation])
      throw error
    }
  }

  /**
   * Valida e sanitiza URL de redirecionamento
   */
  const validateRedirect = (url: string, allowedDomains: string[] = []) => {
    return httpSecurityUtils.sanitizeRedirectURL(url, allowedDomains)
  }

  /**
   * Gera nonce para scripts inline
   */
  const generateNonce = () => {
    return httpSecurityService.generateNonce()
  }

  /**
   * Limpa violações antigas
   */
  const clearViolations = () => {
    setViolations([])
    setSecurityStatus(prev => ({
      ...prev,
      cspViolations: 0
    }))
  }

  /**
   * Força verificação de segurança
   */
  const recheckSecurity = () => {
    initializeSecurity()
  }

  return {
    securityStatus,
    violations,
    secureRequest,
    validateRedirect,
    generateNonce,
    clearViolations,
    recheckSecurity,
  }
}

/**
 * Hook para monitorar violações CSP em tempo real
 */
export const useCSPMonitoring = (onViolation?: (violation: SecurityViolation) => void) => {
  const [violations, setViolations] = useState<SecurityViolation[]>([])

  useEffect(() => {
    const handleViolation = (event: SecurityPolicyViolationEvent) => {
      const violation: SecurityViolation = {
        type: 'csp',
        message: `${event.violatedDirective}: ${event.blockedURI}`,
        source: event.sourceFile || 'inline',
        timestamp: new Date(),
        blocked: event.disposition === 'enforce'
      }

      setViolations(prev => [...prev.slice(-49), violation]) // Últimas 50
      
      if (onViolation) {
        onViolation(violation)
      }
    }

    document.addEventListener('securitypolicyviolation', handleViolation)
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleViolation)
    }
  }, [onViolation])

  return { violations, clearViolations: () => setViolations([]) }
}

/**
 * Hook para aplicar headers de segurança em requests
 */
export const useSecureAPI = () => {
  const [csrfToken] = useState(() => httpSecurityUtils.generateCSRFToken())

  const secureGet = async (url: string, options: RequestInit = {}) => {
    return httpSecurityUtils.secureRequest(url, {
      ...options,
      method: 'GET',
      headers: {
        'X-CSRF-Token': csrfToken,
        ...options.headers,
      },
    })
  }

  const securePost = async (url: string, data: any, options: RequestInit = {}) => {
    return httpSecurityUtils.secureRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...options.headers,
      },
      body: JSON.stringify(data),
    })
  }

  const securePut = async (url: string, data: any, options: RequestInit = {}) => {
    return httpSecurityUtils.secureRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...options.headers,
      },
      body: JSON.stringify(data),
    })
  }

  const secureDelete = async (url: string, options: RequestInit = {}) => {
    return httpSecurityUtils.secureRequest(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': csrfToken,
        ...options.headers,
      },
    })
  }

  return {
    csrfToken,
    secureGet,
    securePost,
    securePut,
    secureDelete,
  }
}

export default useSecurity
