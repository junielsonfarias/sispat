import type { CookieOptions, Response } from 'express';
import crypto from 'crypto';

/**
 * Helpers para emissão e leitura de cookies de autenticação.
 *
 * Tokens viajam em **cookies HttpOnly** (protegidos contra XSS).
 * Para mitigar CSRF, usamos o padrão **double-submit cookie**:
 *   - `csrf_token` é cookie **não** HttpOnly (legível pelo JS).
 *   - Frontend lê esse cookie e envia o mesmo valor no header `X-CSRF-Token`.
 *   - Backend valida que `req.cookies.csrf_token === req.headers['x-csrf-token']`
 *     em rotas mutáveis (POST/PUT/PATCH/DELETE).
 *
 * O atacante de outro origem não consegue ler o cookie do nosso domínio,
 * então não pode replicar o header — quebra o ataque CSRF.
 */

export const COOKIE_NAMES = {
  ACCESS: 'sispat_access',
  REFRESH: 'sispat_refresh',
  CSRF: 'csrf_token',
} as const;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Configurações base de cookie. `secure: true` requer HTTPS (Nginx termina TLS em prod).
 * `sameSite: 'lax'` permite navegação inicial GET de outros sites mas bloqueia POST cross-site.
 */
const baseCookieOpts = (maxAgeMs: number, httpOnly: boolean): CookieOptions => ({
  httpOnly,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
  maxAge: maxAgeMs,
});

const ACCESS_MAX_AGE = 24 * 60 * 60 * 1000; // 24h (alinhado com JWT_EXPIRES_IN default)
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias (alinhado com JWT_REFRESH_EXPIRES_IN default)

/**
 * Emite cookies de access, refresh e CSRF na resposta.
 * Retorna o csrf token gerado (que pode ser ecoado no body se útil).
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): string => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie(COOKIE_NAMES.ACCESS, accessToken, baseCookieOpts(ACCESS_MAX_AGE, true));
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, baseCookieOpts(REFRESH_MAX_AGE, true));
  // CSRF não pode ser HttpOnly — frontend precisa ler e replicar no header.
  // Maxage idêntico ao access token; se expirar, frontend pede um novo via /api/auth/csrf.
  res.cookie(COOKIE_NAMES.CSRF, csrfToken, baseCookieOpts(ACCESS_MAX_AGE, false));

  return csrfToken;
};

/**
 * Limpa todos os cookies de autenticação (logout).
 */
export const clearAuthCookies = (res: Response): void => {
  const clearOpts: CookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie(COOKIE_NAMES.ACCESS, clearOpts);
  res.clearCookie(COOKIE_NAMES.REFRESH, clearOpts);
  res.clearCookie(COOKIE_NAMES.CSRF, { ...clearOpts, httpOnly: false });
};

/**
 * Gera apenas um novo CSRF token e seta o cookie. Usado pelo endpoint
 * `/api/auth/csrf` que o frontend chama antes de operações mutáveis se
 * o cookie atual estiver ausente/expirado.
 */
export const issueCsrfToken = (res: Response): string => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie(COOKIE_NAMES.CSRF, csrfToken, baseCookieOpts(ACCESS_MAX_AGE, false));
  return csrfToken;
};
