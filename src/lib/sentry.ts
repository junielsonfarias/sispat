/**
 * Configuração do Sentry para Error Tracking
 * 
 * Para habilitar:
 * 1. Criar conta em https://sentry.io
 * 2. Adicionar VITE_SENTRY_DSN no .env
 * 3. Descomentar import no main.tsx
 */

// Descomentar após instalar @sentry/react
/*
import * as Sentry from '@sentry/react'

export const initSentry = () => {
  // Apenas em produção
  if (import.meta.env.MODE !== 'production') {
    console.log('🔍 Sentry: Desabilitado em desenvolvimento')
    return
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.warn('⚠️ Sentry DSN não configurado')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance
    tracesSampleRate: 1.0, // 100% das transações (ajustar em prod para 0.1)
    
    // Session Replay
    replaysSessionSampleRate: 0.1,  // 10% das sessões
    replaysOnErrorSampleRate: 1.0,  // 100% quando há erro

    // Filtros
    beforeSend(event, hint) {
      // Filtrar erros conhecidos/esperados
      if (event.exception) {
        const error = hint.originalException as Error
        
        // Ignorar erros de rede temporários
        if (error?.message?.includes('Network Error')) {
          return null
        }
        
        // Ignorar erros de autenticação (esperados)
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          return null
        }
      }
      
      return event
    },

    // Contexto adicional
    beforeBreadcrumb(breadcrumb) {
      // Adicionar informações úteis
      if (breadcrumb.category === 'xhr') {
        // Logs de requisições HTTP
        return breadcrumb
      }
      return breadcrumb
    },
  })

  console.log('✅ Sentry inicializado com sucesso')
}

// Error Boundary customizado com Sentry
export const SentryErrorBoundary = Sentry.ErrorBoundary

// Capture manual de erros
export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  })
}

// Capture de mensagem
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level)
}

// Set user context
export const setSentryUser = (user: { id: string; email: string; name: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })
}

// Clear user context (logout)
export const clearSentryUser = () => {
  Sentry.setUser(null)
}
*/

// Fallbacks para quando Sentry não está instalado
export const initSentry = () => {
  console.log('🔍 Sentry: Não configurado (instale @sentry/react para habilitar)')
}

export const captureError = (error: Error, context?: Record<string, any>) => {
  console.error('❌ Error captured:', error, context)
}

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  console.log(`📝 [${level}]`, message)
}

export const setSentryUser = (user: any) => {
  console.log('👤 User set:', user.email)
}

export const clearSentryUser = () => {
  console.log('👤 User cleared')
}

