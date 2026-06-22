/**
 * Configuração mínima do Sentry para o backend.
 *
 * - Se `SENTRY_DSN` estiver vazio, todas as funções são no-op.
 * - Sanitiza dados sensíveis antes de enviar (Authorization, cookies, password, token).
 * - Inicializado em `index.ts` ANTES de outros middlewares.
 */
import * as Sentry from '@sentry/node';
import type { NextFunction, Request, Response } from 'express';
import { logInfo } from './logger';

const isEnabled = (): boolean => Boolean(process.env.SENTRY_DSN);

export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    // Log apenas em dev — em produção sem DSN é silencioso para não poluir
    if (process.env.NODE_ENV !== 'production') {
      console.info('🔍 Sentry: SENTRY_DSN não configurado, error tracking desabilitado.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: `sispat-backend@${process.env.APP_VERSION || '2.1.0'}`,

    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.Authorization;
        }
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        if ('password' in data) delete data.password;
        if ('token' in data) delete data.token;
        if ('refreshToken' in data) delete data.refreshToken;
      }
      return event;
    },
  });

  logInfo('✅ Sentry inicializado');
};

/**
 * Middleware de erro para Express — chama Sentry e propaga.
 * Se Sentry desabilitado, vira passthrough.
 */
export const sentryErrorHandler = (
  err: Error,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (isEnabled()) {
    Sentry.captureException(err);
  }
  next(err);
};

export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  if (!isEnabled()) return;
  if (context) Sentry.setContext('custom', context);
  Sentry.captureException(error);
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
): void => {
  if (!isEnabled()) return;
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): void => {
  if (!isEnabled()) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
  Sentry.setTag('role', user.role);
};

export default Sentry;
