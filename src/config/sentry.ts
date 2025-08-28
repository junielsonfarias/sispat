import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import { APP_CONFIG } from './app'

// Configuração do Sentry para error tracking
export function initSentry() {
  // Só inicializar em produção ou se a DSN estiver configurada
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      
      // Configurações de performance
      tracesSampleRate: 0.1, // 10% das transações
      
      // Configurações de erro
      beforeSend(event) {
        // Filtrar erros de rede que não são críticos
        if (event.exception) {
          const exception = event.exception.values?.[0]
          if (exception?.type === 'NetworkError' && exception.value?.includes('Failed to fetch')) {
            return null // Não enviar erros de rede
          }
        }
        return event
      },
      
      // Configurações de ambiente
      environment: import.meta.env.MODE,
      release: APP_CONFIG.version,
      
      // Configurações de contexto
      initialScope: {
        tags: {
          app: APP_CONFIG.name,
          version: APP_CONFIG.version,
        },
      },
    })
    
    console.log('🔍 Sentry inicializado para error tracking')
  } else {
    console.log('🔍 Sentry não configurado (modo desenvolvimento ou DSN não fornecida)')
  }
}

// Função para capturar erros manualmente
export function captureError(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    console.error('Erro capturado:', error, context)
  }
}

// Função para capturar mensagens
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }
}

// Função para adicionar contexto do usuário
export function setUserContext(user: { id: string; email: string; role: string }) {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  }
}

// Função para limpar contexto do usuário
export function clearUserContext() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(null)
  }
}
