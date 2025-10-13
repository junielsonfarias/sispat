import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from '../middlewares/errorHandler';
import { logActivity } from '../utils/activityLogger';

// ✅ Validar JWT_SECRET obrigatório em produção
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('🔴 ERRO CRÍTICO: JWT_SECRET não configurado!');
  console.error('Configure a variável de ambiente JWT_SECRET antes de iniciar.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.includes('dev') || JWT_SECRET.includes('test') || JWT_SECRET.length < 32)) {
  console.error('🔴 ERRO CRÍTICO: JWT_SECRET inseguro em produção!');
  console.error('Use uma chave de 256+ bits (32+ caracteres).');
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Gerar token JWT
 */
const generateToken = (userId: string, email: string, role: string, municipalityId: string): string => {
  return jwt.sign(
    { userId, email, role, municipalityId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * Gerar refresh token
 */
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * Login de usuário
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validação
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    // Buscar usuário
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

    // ✅ CORREÇÃO: Verificar se está ativo (usar 403 em vez de 401)
    if (!user.isActive) {
      res.status(403).json({ error: 'Conta desativada. Entre em contato com o administrador.' });
      return;
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Gerar tokens
    const token = generateToken(user.id, user.email, user.role, user.municipalityId);
    const refreshToken = generateRefreshToken(user.id);

    // ✅ v2.0.7: Log de atividade com IP automático
    await logActivity(req, 'LOGIN', 'USER', user.id, 'Login realizado com sucesso');

    // Resposta
    res.json({
      message: 'Login realizado com sucesso',
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
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
};

/**
 * Refresh token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Refresh token não fornecido' });
      return;
    }

    // Verificar refresh token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    // Gerar novo token
    const newToken = generateToken(user.id, user.email, user.role, user.municipalityId);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Refresh token expirado' });
      return;
    }
    res.status(401).json({ error: 'Token inválido' });
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

    // Buscar dados completos do usuário
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
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Log de atividade
      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'LOGOUT',
          entityType: 'USER',
          entityId: req.user.userId,
          details: 'Logout realizado',
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    }

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
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

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha atual incorreta' });
      return;
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log de atividade
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
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

