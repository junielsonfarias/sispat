import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logActivity } from '../utils/activityLogger';
import { emailService } from '../config/email';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import {
  clearAuthCookies,
  issueCsrfToken,
  setAuthCookies,
} from '../utils/auth-cookies';

// ✅ Validar JWT_SECRET obrigatório em produção
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logError('🔴 ERRO CRÍTICO: JWT_SECRET não configurado!');
  logError('Configure a variável de ambiente JWT_SECRET antes de iniciar.');
  process.exit(1);
}
if (
  process.env.NODE_ENV === 'production' &&
  (JWT_SECRET.includes('dev') || JWT_SECRET.includes('test') || JWT_SECRET.length < 32)
) {
  logError('🔴 ERRO CRÍTICO: JWT_SECRET inseguro em produção!', undefined, {
    requirement: 'Use uma chave de 256+ bits (32+ caracteres).',
  });
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Calcula a expiração de um refresh token a partir de JWT_REFRESH_EXPIRES_IN.
 * Aceita formatos "Nd", "Nh", "Nm", "Ns". Default: 7 dias.
 */
const refreshTokenExpiryMs = (): number => {
  const v = JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/i.exec(v);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
};

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Gerar token JWT
 */
const generateToken = (userId: string, email: string, role: string, municipalityId: string): string =>
  jwt.sign({ userId, email, role, municipalityId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

/**
 * Gerar refresh token JWT (apenas o JWT em si — persistência é responsabilidade do caller).
 */
const generateRefreshTokenJwt = (userId: string): string =>
  jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

/**
 * Emite um refresh token e grava seu hash no banco com expiração.
 * Retorna o token em texto claro (para enviar ao cliente).
 */
const issueRefreshToken = async (
  userId: string,
  req: Request,
): Promise<string> => {
  const token = generateRefreshTokenJwt(userId);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + refreshTokenExpiryMs()),
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    },
  });
  return token;
};

/**
 * Login de usuário
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        municipality: {
          select: {
            id: true,
            name: true,
            state: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Conta desativada. Entre em contato com o administrador.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = generateToken(user.id, user.email, user.role, user.municipalityId);
    const refreshToken = await issueRefreshToken(user.id, req);

    await logActivity(req, 'LOGIN', 'USER', user.id, 'Login realizado com sucesso', user.id);

    // Cookies HttpOnly (caminho preferido) + CSRF token (cookie legível)
    const csrfToken = setAuthCookies(res, token, refreshToken);

    res.json({
      message: 'Login realizado com sucesso',
      // Mantemos token/refreshToken no body por back-compat com clientes
      // antigos que usam localStorage. Frontend novo deve preferir os cookies.
      token,
      refreshToken,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        responsibleSectors: user.responsibleSectors,
        municipality: user.municipality,
      },
    });
  } catch (error) {
    logError('Erro no login', error, { email: req.body.email });
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
};

/**
 * GET /api/auth/csrf
 * Emite (ou renova) o cookie CSRF e retorna o valor para o frontend
 * usar em headers de operações mutáveis.
 */
export const getCsrfToken = (_req: Request, res: Response): void => {
  const csrfToken = issueCsrfToken(res);
  res.json({ csrfToken });
};

/**
 * Refresh token — com rotation e revogação do anterior.
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Prioriza cookie HttpOnly; cai para body por back-compat
    const cookieToken = (req as Request & { cookies?: Record<string, string> })
      .cookies?.sispat_refresh;
    const { refreshToken: bodyToken } = req.body ?? {};
    const token = cookieToken || bodyToken;

    if (!token) {
      res.status(400).json({ error: 'Refresh token não fornecido' });
      return;
    }

    // 1) Valida assinatura JWT
    let decoded: { userId: string; type: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Refresh token expirado' });
        return;
      }
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    // 2) Valida persistência: existe, não está revogado, não expirou
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!stored) {
      // Token assinado válido mas não persistido — possível reuso após revogação.
      // Defesa em profundidade: revoga tudo do usuário para forçar reauth.
      logWarn('⚠️ Refresh token não encontrado no banco — possível reuso', {
        userId: decoded.userId,
      });
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    if (stored.revokedAt) {
      logWarn('⚠️ Tentativa de uso de refresh token revogado — revogando todos do usuário', {
        userId: stored.userId,
      });
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      res.status(401).json({ error: 'Token revogado' });
      return;
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      res.status(401).json({ error: 'Refresh token expirado' });
      return;
    }

    // 3) Busca usuário
    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: {
        id: true,
        email: true,
        role: true,
        municipalityId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Usuário não autorizado' });
      return;
    }

    // 4) Rotation: revoga o antigo e emite novo, atomicamente.
    const newJwt = generateRefreshTokenJwt(user.id);
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: hashToken(newJwt),
          userId: user.id,
          expiresAt: new Date(Date.now() + refreshTokenExpiryMs()),
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
        },
      }),
    ]);

    const newToken = generateToken(user.id, user.email, user.role, user.municipalityId);

    // Atualiza cookies (rotation também acontece aqui)
    const csrfToken = setAuthCookies(res, newToken, newJwt);

    res.json({
      token: newToken,
      refreshToken: newJwt,
      csrfToken,
    });
  } catch (error) {
    logError('Erro ao processar refresh token', error);
    res.status(500).json({ error: 'Erro ao processar refresh token' });
  }
};

/**
 * Obter dados do usuário autenticado
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
 * Logout — revoga refresh token (se enviado no body) ou todos do usuário.
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Aceita refreshToken do body (back-compat) OU do cookie HttpOnly
      const cookieRefresh = (req as Request & { cookies?: Record<string, string> })
        .cookies?.sispat_refresh;
      const { refreshToken: bodyToken, allDevices } = req.body ?? {};
      const token = bodyToken || cookieRefresh;

      if (allDevices === true) {
        // Logout global: revoga todos os refresh tokens ativos
        await prisma.refreshToken.updateMany({
          where: { userId: req.user.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } else if (token) {
        // Revoga apenas o refresh token do dispositivo atual
        await prisma.refreshToken
          .updateMany({
            where: {
              tokenHash: hashToken(String(token)),
              userId: req.user.userId,
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          })
          .catch((err) => logWarn('Falha ao revogar refresh token no logout', { error: String(err) }));
      }

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

    // Limpa cookies de autenticação (HttpOnly + CSRF)
    clearAuthCookies(res);

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    logError('Erro no logout', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao realizar logout' });
  }
};

/**
 * Alterar senha
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

    // Política de senha forte (mesma regra de resetPassword)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        error:
          'Senha deve ter ao menos 12 caracteres incluindo: letras maiúsculas, minúsculas, números e símbolos (@$!%*?&)',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha atual incorreta' });
      return;
    }

    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Atualiza senha e revoga todos os refresh tokens (force re-login em todos os dispositivos)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CHANGE_PASSWORD',
        entityType: 'USER',
        entityId: user.id,
        details: 'Senha alterada com sucesso',
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    logError('Erro ao alterar senha', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

/**
 * Solicitar reset de senha
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email é obrigatório' });
      return;
    }

    logDebug('📧 Solicitação de reset de senha', { email });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        municipality: {
          select: {
            name: true,
          },
        },
      },
    });

    // Sempre retornar sucesso por segurança (não revelar se email existe)
    if (!user || !user.isActive) {
      logDebug('📧 Email não encontrado ou usuário inativo', { email });
      res.json({
        message: 'Se o email estiver cadastrado, um link de redefinição foi enviado.',
      });
      return;
    }

    if (!(await emailService.isConfigured())) {
      logError('❌ Serviço de email não configurado');
      res.status(503).json({
        error: 'Serviço de email não configurado. Entre em contato com o administrador.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    logDebug('🔑 Gerando token de reset', {
      userId: user.id,
      email: user.email,
      expiresAt,
    });

    // Invalida tokens anteriores não-usados do mesmo usuário (1 token vivo por vez)
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
      data: { used: true },
    });

    // Persiste o novo token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    });

    const emailSent = await emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken,
      user.municipality.name,
    );

    if (!emailSent) {
      logError('❌ Falha ao enviar email de reset', undefined, { email: user.email });
      // Email falhou — invalida o token recém-criado para não vazar
      await prisma.passwordResetToken.updateMany({
        where: { token: resetToken },
        data: { used: true },
      });
      res.status(500).json({
        error: 'Erro ao enviar email. Tente novamente mais tarde.',
      });
      return;
    }

    logInfo('✅ Email de reset enviado com sucesso', { email: user.email });

    try {
      await logActivity(
        req,
        'REQUEST_PASSWORD_RESET',
        'User',
        user.id,
        `Solicitação de reset de senha enviada para ${user.email}`,
      );
    } catch (logErr) {
      logWarn('⚠️ Erro ao registrar atividade', { error: String(logErr) });
    }

    res.json({
      message: 'Se o email estiver cadastrado, um link de redefinição foi enviado.',
    });
  } catch (error) {
    logError('❌ Erro ao processar solicitação de reset', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Validar token de reset
 * GET /api/auth/validate-reset-token/:token
 */
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ error: 'Token não fornecido' });
      return;
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, name: true, isActive: true },
        },
      },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: 'Token inválido ou expirado' });
      return;
    }

    if (!resetToken.user.isActive) {
      res.status(400).json({ error: 'Conta desativada — entre em contato com o administrador' });
      return;
    }

    res.json({
      valid: true,
      email: resetToken.user.email,
      name: resetToken.user.name,
    });
  } catch (error) {
    logError('❌ Erro ao validar token', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Resetar senha
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        error:
          'Senha deve ter ao menos 12 caracteres incluindo: letras maiúsculas, minúsculas, números e símbolos (@$!%*?&)',
      });
      return;
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: 'Token inválido ou expirado' });
      return;
    }
    if (!resetToken.user.isActive) {
      res.status(400).json({ error: 'Conta desativada' });
      return;
    }

    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Troca senha + marca token como usado + revoga todos refresh tokens (force re-login)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    try {
      await prisma.activityLog.create({
        data: {
          userId: resetToken.userId,
          action: 'RESET_PASSWORD',
          entityType: 'USER',
          entityId: resetToken.userId,
          details: 'Senha redefinida via token de recuperação',
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (logErr) {
      logWarn('Falha ao registrar atividade de reset', { error: String(logErr) });
    }

    logInfo('✅ Senha resetada com sucesso', { userId: resetToken.userId });
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    logError('❌ Erro ao resetar senha', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
