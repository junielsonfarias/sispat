import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { Express } from 'express'

export const initSentry = (app: Express) => {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    console.info('🔍 Sentry: DSN não configurado. Error tracking desabilitado.')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    
    // Performance Monitoring
    integrations: [
      nodeProfilingIntegration(),
    ],
    
    // Performance
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: `sispat-backend@${process.env.APP_VERSION || '2.0.0'}`,
    
    // Before send hook para sanitizar dados sensíveis
    beforeSend(event, hint) {
      // Remover dados sensíveis
      if (event.request) {
        delete event.request.cookies
        if (event.request.headers) {
          delete event.request.headers.authorization
          delete event.request.headers.Authorization
        }
      }
      
      // Remover dados sensíveis do corpo da requisição
      if (event.request?.data) {
        const data = event.request.data as any
        if (data.password) delete data.password
        if (data.token) delete data.token
      }
      
      // Log apenas em development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Event:', event)
        console.error('Original Error:', hint.originalException)
      }
      
      return event
    },
  })

  // Request handler deve ser o primeiro middleware
  // Note: Na versão nova do Sentry, o express integration é automático
  // Não é necessário usar Handlers manualmente

  console.info('✅ Sentry inicializado com sucesso!')
}

// Error handler deve ser usado APÓS todas as rotas
// Retorna uma função para garantir que Sentry está inicializado
export const getSentryErrorHandler = () => {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    // Se Sentry não configurado, retorna middleware dummy
    return (err: any, req: any, res: any, next: any) => {
      next(err)
    }
  }
  // Error handler simplificado - Sentry captura automaticamente erros não tratados
  return (err: any, req: any, res: any, next: any) => {
    Sentry.captureException(err)
    next(err)
  }
}

// Helper para capturar erros manualmente
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (!process.env.SENTRY_DSN) return
  
  if (context) {
    Sentry.setContext('custom', context)
  }
  Sentry.captureException(error)
}

// Helper para capturar mensagens
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!process.env.SENTRY_DSN) return
  
  Sentry.captureMessage(message, level)
}

// Helper para set user context
export const setUserContext = (user: { id: string; email: string; name: string; role: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })
  Sentry.setTag('role', user.role)
}

export default Sentry

