/**
 * Configuração do Sentry para o frontend.
 *
 * Estratégia: dynamic import de `@sentry/react`. Se o pacote não estiver
 * instalado (cold dev environment), funções viram no-op em vez de quebrar
 * o build.
 *
 * Para ativar em produção:
 * 1. `pnpm add @sentry/react`
 * 2. Criar projeto em https://sentry.io e copiar o DSN
 * 3. Setar `VITE_SENTRY_DSN` em `.env.production`
 * 4. `pnpm run build` — initSentry detectará o pacote e ativará
 *
 * Em desenvolvimento (MODE !== 'production'), Sentry fica desligado mesmo
 * com DSN definido — evita poluir o projeto com erros locais.
 */
import { logger } from '@/lib/logger'

type SentryUser = { id: string; email: string; name: string }
type SentryLevel = 'info' | 'warning' | 'error'

// Cliente Sentry carregado dinamicamente, ou null se indisponível.
let sentryClient: typeof import('@sentry/react') | null = null

const isProd = import.meta.env.MODE === 'production'
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

/**
 * Inicializa Sentry se: ambiente prod + DSN configurado + pacote instalado.
 * Caso contrário, é no-op silencioso.
 */
export const initSentry = async (): Promise<void> => {
  if (!isProd) {
    logger.debug('Sentry: desabilitado em desenvolvimento')
    return
  }
  if (!dsn) {
    logger.debug('Sentry: VITE_SENTRY_DSN não configurado')
    return
  }
  try {
    // Pacote opcional. O especificador fica numa variável de propósito: import
    // dinâmico com string não-literal não é estaticamente analisável, então o
    // Vite/Rollup não tenta resolvê-lo em dev/build (evita "Failed to resolve
    // import @sentry/react"). Se não estiver instalado, lança e cai no catch.
    const sentryPkg = '@sentry/react'
    const mod = (await import(/* @vite-ignore */ sentryPkg)) as typeof import('@sentry/react')
    sentryClient = mod
    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        mod.browserTracingIntegration(),
        mod.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        const error = hint?.originalException as Error | undefined
        // Filtra erros esperados (não são bugs)
        if (error?.message?.includes('Network Error')) return null
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) return null
        return event
      },
    })
    logger.info('✅ Sentry frontend inicializado')
  } catch (err) {
    // Pacote não instalado ou falha de init — silencioso
    logger.debug('Sentry: não disponível (instale @sentry/react para habilitar)')
  }
}

export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  if (sentryClient) {
    sentryClient.captureException(error, context ? { extra: context } : undefined)
  } else {
    logger.error('❌ Error captured:', error, context as Record<string, unknown>)
  }
}

export const captureMessage = (message: string, level: SentryLevel = 'info'): void => {
  if (sentryClient) {
    sentryClient.captureMessage(message, level)
  } else {
    logger.debug(`[${level}] ${message}`)
  }
}

export const setSentryUser = (user: SentryUser): void => {
  if (sentryClient) {
    sentryClient.setUser({ id: user.id, email: user.email, username: user.name })
  } else {
    logger.debug('User set', { email: user.email })
  }
}

export const clearSentryUser = (): void => {
  if (sentryClient) {
    sentryClient.setUser(null)
  } else {
    logger.debug('User cleared')
  }
}
