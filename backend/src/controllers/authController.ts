/**
 * authController — camada HTTP de autenticação.
 *
 * Lógica de negócio (geração/rotação de tokens, validação de senha forte,
 * fluxo de reset por email) vive em `services/authService.ts`. Aqui só:
 *  - extrair body/cookies do request
 *  - chamar o service
 *  - mapear erros tipados → status HTTP
 *  - gerenciar cookies HttpOnly (responsabilidade da camada HTTP, não do service)
 *  - registrar ActivityLog (precisa do req para IP/UA)
 *  - responder
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logActivity } from '../utils/activityLogger';
import { logError, logWarn } from '../config/logger';
import {
  clearAuthCookies,
  issueCsrfToken,
  setAuthCookies,
} from '../utils/auth-cookies';
import * as authService from '../services/authService';
import {
  AuthInvalidCredentialsError,
  AuthAccountDisabledError,
  AuthTokenInvalidError,
  AuthTokenExpiredError,
  AuthWeakPasswordError,
  AuthEmailServiceUnavailableError,
} from '../services/authService';

const clientMeta = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

/** Mapeia erros tipados do service para status HTTP. */
const handleServiceError = (res: Response, error: unknown, defaultMessage: string): void => {
  if (error instanceof AuthInvalidCredentialsError) {
    res.status(401).json({ error: error.message });
    return;
  }
  if (error instanceof AuthAccountDisabledError) {
    res.status(403).json({ error: error.message });
    return;
  }
  if (error instanceof AuthTokenExpiredError) {
    res.status(401).json({ error: error.message });
    return;
  }
  if (error instanceof AuthTokenInvalidError) {
    res.status(401).json({ error: error.message });
    return;
  }
  if (error instanceof AuthWeakPasswordError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof AuthEmailServiceUnavailableError) {
    res.status(503).json({ error: error.message });
    return;
  }
  logError(defaultMessage, error);
  res.status(500).json({ error: defaultMessage });
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password, clientMeta(req));

    await logActivity(req, 'LOGIN', 'USER', result.user.id, 'Login realizado com sucesso', result.user.id);

    // Cookies HttpOnly (preferido) + CSRF (cookie legível)
    const csrfToken = setAuthCookies(res, result.token, result.refreshToken);

    res.json({
      message: 'Login realizado com sucesso',
      // Mantém token/refreshToken no body por back-compat com clientes antigos.
      token: result.token,
      refreshToken: result.refreshToken,
      csrfToken,
      user: result.user,
    });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao realizar login');
  }
};

/**
 * GET /api/auth/csrf
 */
export const getCsrfToken = (_req: Request, res: Response): void => {
  const csrfToken = issueCsrfToken(res);
  res.json({ csrfToken });
};

/**
 * POST /api/auth/refresh — rotação de refresh token.
 * Prioriza cookie HttpOnly; cai para body por back-compat.
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const cookieToken = (req as Request & { cookies?: Record<string, string> })
      .cookies?.sispat_refresh;
    const bodyToken = req.body?.refreshToken;
    const token = cookieToken || bodyToken;

    if (!token) {
      res.status(400).json({ error: 'Refresh token não fornecido' });
      return;
    }

    const result = await authService.rotateRefreshToken(token, clientMeta(req));
    const csrfToken = setAuthCookies(res, result.token, result.refreshToken);

    res.json({
      token: result.token,
      refreshToken: result.refreshToken,
      csrfToken,
    });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao processar refresh token');
  }
};

/**
 * GET /api/auth/me
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        responsibleSectors: true,
        municipalityId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        municipality: {
          select: {
            id: true,
            name: true,
            state: true,
            logoUrl: true,
            footerText: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logError('Erro ao buscar usuário', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
};

/**
 * POST /api/auth/logout — revoga refresh token específico ou todos.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      const cookieRefresh = (req as Request & { cookies?: Record<string, string> })
        .cookies?.sispat_refresh;
      const bodyToken = req.body?.refreshToken;
      const allDevices = req.body?.allDevices === true;
      const token = bodyToken || cookieRefresh;

      await authService.revokeRefreshToken(req.user.userId, token, allDevices);

      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'LOGOUT',
          entityType: 'USER',
          entityId: req.user.userId,
          details: allDevices ? 'Logout de todos os dispositivos' : 'Logout realizado',
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    }

    clearAuthCookies(res);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    logError('Erro no logout', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao realizar logout' });
  }
};

/**
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      return;
    }

    await authService.changeUserPassword(req.user.userId, currentPassword, newPassword);

    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'CHANGE_PASSWORD',
        entityType: 'USER',
        entityId: req.user.userId,
        details: 'Senha alterada com sucesso',
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao alterar senha');
  }
};

/**
 * POST /api/auth/forgot-password — resposta sempre neutra (não revela se email existe).
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email é obrigatório' });
      return;
    }

    await authService.requestPasswordReset(email, {
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });

    try {
      // Para auditoria. Pode falhar silenciosamente sem afetar o fluxo.
      await logActivity(
        req,
        'REQUEST_PASSWORD_RESET',
        'User',
        'unknown',
        `Solicitação de reset de senha para ${email}`,
      );
    } catch (logErr) {
      logWarn('⚠️ Erro ao registrar atividade', { error: String(logErr) });
    }

    res.json({
      message: 'Se o email estiver cadastrado, um link de redefinição foi enviado.',
    });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao processar solicitação de reset');
  }
};

/**
 * GET /api/auth/validate-reset-token/:token
 */
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ error: 'Token não fornecido' });
      return;
    }

    const info = await authService.validatePasswordResetToken(token);
    res.json({ valid: true, email: info.email, name: info.name });
  } catch (error) {
    // Token inválido/expirado/conta inativa → 400 (não 401, mantém compat antiga)
    if (
      error instanceof AuthTokenInvalidError ||
      error instanceof AuthAccountDisabledError
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    handleServiceError(res, error, 'Erro ao validar token');
  }
};

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      return;
    }

    const result = await authService.resetUserPassword(token, password);

    try {
      await prisma.activityLog.create({
        data: {
          userId: result.userId,
          action: 'RESET_PASSWORD',
          entityType: 'USER',
          entityId: result.userId,
          details: 'Senha redefinida via token de recuperação',
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (logErr) {
      logWarn('Falha ao registrar atividade de reset', { error: String(logErr) });
    }

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    // Token inválido/expirado/conta inativa → 400 (compat com resposta antiga)
    if (
      error instanceof AuthTokenInvalidError ||
      error instanceof AuthAccountDisabledError
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    handleServiceError(res, error, 'Erro ao resetar senha');
  }
};
