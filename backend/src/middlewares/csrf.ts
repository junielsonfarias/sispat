import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAMES } from '../utils/auth-cookies';
import { logWarn } from '../config/logger';

/**
 * CSRF protection via double-submit cookie.
 *
 * Aplica-se a métodos mutáveis (POST/PUT/PATCH/DELETE) em rotas /api/*
 * exceto endpoints de autenticação inicial (`/auth/login`, `/auth/refresh`,
 * `/auth/forgot-password`, `/auth/reset-password`) que ou precedem a sessão
 * ou usam token próprio.
 *
 * Validação:
 *   1. Lê `csrf_token` do cookie (set por setAuthCookies / issueCsrfToken)
 *   2. Lê `X-CSRF-Token` do header
 *   3. Compara — devem ser idênticos
 *
 * Se o request usa apenas header `Authorization: Bearer ...` (sem cookie de
 * sessão — ex: cliente máquina), o CSRF é dispensado.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/validate-reset-token',
  '/api/auth/csrf',
];

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Métodos seguros não precisam de proteção CSRF
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Endpoints de auth iniciais isentos
  if (EXEMPT_PATHS.some((p) => req.path === p)) {
    next();
    return;
  }

  // Se não há cookie de sessão, assumimos cliente máquina via Bearer — pula CSRF.
  // O auth middleware ainda exige token válido.
  const accessCookie = req.cookies?.[COOKIE_NAMES.ACCESS];
  if (!accessCookie) {
    next();
    return;
  }

  // Cliente com cookie de sessão → exigir double-submit do CSRF token
  const cookieToken = req.cookies?.[COOKIE_NAMES.CSRF];
  const headerToken = (req.headers['x-csrf-token'] as string | undefined) ?? '';

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logWarn('🚫 CSRF token ausente ou inválido', {
      path: req.path,
      method: req.method,
      hasCookie: Boolean(cookieToken),
      hasHeader: Boolean(headerToken),
    });
    res.status(403).json({ error: 'CSRF token ausente ou inválido' });
    return;
  }

  next();
};
