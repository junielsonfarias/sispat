import * as Sentry from '@sentry/react'

export const initSentry = () => {
  // Só inicializar em produção ou se DSN estiver configurado
  const dsn = import.meta.env.VITE_SENTRY_DSN
  
  if (!dsn) {
    console.info('🔍 Sentry: DSN não configurado. Error tracking desabilitado.')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Ignore common errors
    ignoreErrors: [
      'Network Error',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'cancelled',
      'AbortError',
    ],
    
    // Release tracking
    release: `sispat@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,
    
    // Before send hook para sanitizar dados sensíveis
    beforeSend(event, hint) {
      // Remover dados sensíveis
      if (event.request) {
        delete event.request.cookies
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.authorization
        }
      }
      
      // Log apenas em development
      if (import.meta.env.MODE === 'development') {
        console.error('Sentry Event:', event)
        console.error('Original Error:', hint.originalException)
      }
      
      return event
    },
  })

  console.info('✅ Sentry inicializado com sucesso!')
}

// Helper para capturar erros manualmente
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('custom', context)
  }
  Sentry.captureException(error)
}

// Helper para capturar mensagens
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level)
}

// Helper para adicionar breadcrumbs
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

// Helper para set user context
export const setUserContext = (user: { id: string; email: string; name: string; role: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  })
}

// Helper para limpar user context
export const clearUserContext = () => {
  Sentry.setUser(null)
}

export default Sentry

