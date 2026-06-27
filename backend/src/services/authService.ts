/**
 * authService — regras de negócio de autenticação.
 *
 * Mesmo padrão de patrimonioService/imovelService. Validação de JWT_SECRET em
 * produção e geração de tokens vivem aqui. O controller orquestra request →
 * service → cookies → response.
 *
 * Cookies HttpOnly e CSRF continuam no controller (são responsabilidade da
 * camada HTTP, não da regra de negócio).
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { emailService } from '../config/email';
import { logDebug, logError, logInfo, logWarn } from '../config/logger';
import { maskEmail } from '../utils/mask';

// ===========================================================================
// Validação obrigatória de JWT_SECRET (no startup do módulo)
// ===========================================================================

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
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Senha forte: ≥12 caracteres, ao menos 1 maiúscula, 1 minúscula, 1 dígito, 1 símbolo.
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

// ===========================================================================
// Erros tipados
// ===========================================================================

export class AuthInvalidCredentialsError extends Error {
  constructor(message = 'Credenciais inválidas') {
    super(message);
    this.name = 'AuthInvalidCredentialsError';
  }
}
export class AuthAccountDisabledError extends Error {
  constructor(message = 'Conta desativada. Entre em contato com o administrador.') {
    super(message);
    this.name = 'AuthAccountDisabledError';
  }
}
export class AuthTokenInvalidError extends Error {
  constructor(message = 'Token inválido') {
    super(message);
    this.name = 'AuthTokenInvalidError';
  }
}
export class AuthTokenExpiredError extends Error {
  constructor(message = 'Token expirado') {
    super(message);
    this.name = 'AuthTokenExpiredError';
  }
}
export class AuthWeakPasswordError extends Error {
  constructor(
    message = 'Senha deve ter ao menos 12 caracteres incluindo: letras maiúsculas, minúsculas, números e símbolos (@$!%*?&)',
  ) {
    super(message);
    this.name = 'AuthWeakPasswordError';
  }
}
export class AuthEmailServiceUnavailableError extends Error {
  constructor(message = 'Serviço de email não configurado. Entre em contato com o administrador.') {
    super(message);
    this.name = 'AuthEmailServiceUnavailableError';
  }
}

// ===========================================================================
// Helpers internos
// ===========================================================================

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

const generateAccessJwt = (
  userId: string,
  email: string,
  role: string,
  municipalityId: string,
): string =>
  jwt.sign({ userId, email, role, municipalityId }, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

const generateRefreshJwt = (userId: string): string =>
  jwt.sign({ userId, type: 'refresh' }, JWT_SECRET as string, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

export interface ClientMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const issueRefreshToken = async (userId: string, meta: ClientMeta): Promise<string> => {
  const token = generateRefreshJwt(userId);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + refreshTokenExpiryMs()),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return token;
};

// ===========================================================================
// Login
// ===========================================================================

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
    responsibleSectors: string[];
    municipality: {
      id: string;
      name: string;
      state: string;
      logoUrl: string | null;
      primaryColor: string | null;
    } | null;
  };
}

export const loginUser = async (
  email: string,
  password: string,
  meta: ClientMeta,
): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      municipality: {
        select: { id: true, name: true, state: true, logoUrl: true, primaryColor: true },
      },
    },
  });

  if (!user) throw new AuthInvalidCredentialsError();
  if (!user.isActive) throw new AuthAccountDisabledError();

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AuthInvalidCredentialsError();

  const token = generateAccessJwt(user.id, user.email, user.role, user.municipalityId);
  const refreshToken = await issueRefreshToken(user.id, meta);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      responsibleSectors: user.responsibleSectors,
      municipality: user.municipality,
    },
  };
};

// ===========================================================================
// Refresh token com rotation
// ===========================================================================

export interface RefreshResult {
  token: string;
  refreshToken: string;
}

export const rotateRefreshToken = async (
  token: string,
  meta: ClientMeta,
): Promise<RefreshResult> => {
  // 1) Assinatura
  let decoded: { userId: string; type: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string; type: string };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AuthTokenExpiredError('Refresh token expirado');
    throw new AuthTokenInvalidError();
  }
  if (decoded.type !== 'refresh') throw new AuthTokenInvalidError();

  // 2) Persistência: existe, não revogado, não expirado
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!stored) {
    // JWT válido mas não persistido → possível reuso após revogação. Revoga tudo.
    logWarn('⚠️ Refresh token não encontrado no banco — possível reuso', { userId: decoded.userId });
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AuthTokenInvalidError();
  }

  if (stored.revokedAt) {
    logWarn('⚠️ Uso de refresh token revogado — revogando todos do usuário', { userId: stored.userId });
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AuthTokenInvalidError('Token revogado');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw new AuthTokenExpiredError('Refresh token expirado');
  }

  // 3) Usuário
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

  if (!user || !user.isActive) throw new AuthAccountDisabledError('Usuário não autorizado');

  // 4) Rotation atômica: revoga antigo, cria novo
  const newJwt = generateRefreshJwt(user.id);
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
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    }),
  ]);

  const newAccess = generateAccessJwt(user.id, user.email, user.role, user.municipalityId);
  return { token: newAccess, refreshToken: newJwt };
};

// ===========================================================================
// Logout
// ===========================================================================

export const revokeRefreshToken = async (
  userId: string,
  token: string | undefined,
  allDevices: boolean,
): Promise<void> => {
  if (allDevices) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return;
  }
  if (token) {
    await prisma.refreshToken
      .updateMany({
        where: { tokenHash: hashToken(token), userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch((err) => logWarn('Falha ao revogar refresh token no logout', { error: String(err) }));
  }
};

// ===========================================================================
// Change password (requer senha atual)
// ===========================================================================

export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  if (!STRONG_PASSWORD_REGEX.test(newPassword)) throw new AuthWeakPasswordError();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthInvalidCredentialsError('Usuário não encontrado');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new AuthInvalidCredentialsError('Senha atual incorreta');

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Atualiza senha + revoga todos os refresh tokens (force re-login)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

// ===========================================================================
// Forgot / Reset password
// ===========================================================================

/**
 * Inicia o fluxo de reset. Sempre retorna sucesso para o caller (não revela se
 * o email existe). Se o usuário existe e o serviço de email está OK, envia
 * o link. Lança AuthEmailServiceUnavailableError se SMTP não está configurado.
 */
export const requestPasswordReset = async (
  email: string,
  audit: { ipAddress?: string; userAgent?: string },
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { municipality: { select: { name: true } } },
  });

  // Não revelar se o email existe
  if (!user || !user.isActive) {
    logDebug('📧 Email não encontrado ou inativo (resposta neutra)', { email: maskEmail(email) });
    return;
  }

  if (!(await emailService.isConfigured())) {
    logError('❌ Serviço de email não configurado');
    throw new AuthEmailServiceUnavailableError();
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  // Apenas 1 token vivo por usuário
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });

  // Armazenar apenas o HASH do token (como os refresh tokens). O token raw vai
  // só no e-mail; um vazamento do banco não permite redefinir senhas.
  await prisma.passwordResetToken.create({
    data: { token: hashToken(resetToken), userId: user.id, email: user.email, expiresAt },
  });

  const sent = await emailService.sendPasswordResetEmail(
    user.email,
    user.name,
    resetToken,
    user.municipality.name,
  );

  if (!sent) {
    // Limpa token recém-criado se o email falhou
    await prisma.passwordResetToken.updateMany({
      where: { token: resetToken },
      data: { used: true },
    });
    throw new Error('Erro ao enviar email. Tente novamente mais tarde.');
  }

  logInfo('✅ Email de reset enviado', { email: maskEmail(user.email), audit });
};

export interface ResetTokenInfo {
  email: string;
  name: string;
}

export const validatePasswordResetToken = async (token: string): Promise<ResetTokenInfo> => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
    throw new AuthTokenInvalidError('Token inválido ou expirado');
  }

  if (!resetToken.user.isActive) {
    throw new AuthAccountDisabledError('Conta desativada — entre em contato com o administrador');
  }

  return { email: resetToken.user.email, name: resetToken.user.name };
};

export const resetUserPassword = async (
  token: string,
  newPassword: string,
): Promise<{ userId: string }> => {
  if (!STRONG_PASSWORD_REGEX.test(newPassword)) throw new AuthWeakPasswordError();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
    throw new AuthTokenInvalidError('Token inválido ou expirado');
  }
  if (!resetToken.user.isActive) throw new AuthAccountDisabledError('Conta desativada');

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Troca senha + marca token usado + revoga refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
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

  logInfo('✅ Senha resetada com sucesso', { userId: resetToken.userId });
  return { userId: resetToken.userId };
};
