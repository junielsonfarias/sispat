import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { getRow, query } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit, logError, logWarning } from '../utils/logger.js';

const router = express.Router();

// Rotas de debug removidas - sistema funcionando

// Login original
router.post(
  '/login',
  // sanitizeInput(sanitizationSchemas.auth),
  // validateSchema(authSchemas.login),
  async (req, res) => {
    try {
      const { email, password, municipalityId } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const userAgent = req.get('User-Agent') || 'Unknown';

      // Lockout manager temporariamente desabilitado
      // try {
      //   if (!lockoutManager.initialized) {
      //     await lockoutManager.initialize()
      //   }
      // } catch (lockoutError) {
      //   console.error('Erro ao inicializar lockout manager:', lockoutError)
      // }

      // Get user from database
      const user = await getRow('SELECT * FROM users WHERE email = $1', [
        email,
      ]);

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Check if user is locked out (básico)
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        return res.status(423).json({
          error:
            'Conta bloqueada temporariamente devido a múltiplas tentativas de login',
          lockoutUntil: user.locked_until,
          message:
            'Sua conta foi bloqueada por segurança. Tente novamente mais tarde ou contate um administrador.',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Sistema básico de lockout
        const newFailedAttempts = (user.login_attempts || 0) + 1;
        let lockoutUntil = null;

        if (newFailedAttempts >= 5) {
          lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailedAttempts, lockoutUntil, user.id]
        );

        return res.status(401).json({
          error: 'Credenciais inválidas',
          remainingAttempts: Math.max(0, 5 - newFailedAttempts),
        });
      }

      // Reset tentativas em login bem-sucedido
      if (user.login_attempts > 0) {
        await query(
          'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
          [user.id]
        );
      }

      // Check municipality access for non-superuser
      if (user.role !== 'superuser' && municipalityId) {
        if (user.municipality_id !== municipalityId) {
          return res.status(403).json({
            error: 'Usuário não tem acesso a este município',
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Log activity
      try {
        await query(
          'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            user.id,
            'LOGIN_SUCCESS',
            'users',
            user.id,
            JSON.stringify({ email: user.email, role: user.role }),
            user.municipality_id,
          ]
        );
      } catch (activityLogError) {
        logWarning('Erro ao registrar activity log', {
          error: activityLogError.message,
          userId: user.id,
          userName: user.name,
        });
        // Não falhar o login por causa do log
      }

      // Return user data (without password)
      const { password: _, login_attempts, locked_until, ...userData } = user;

      // Ensure municipality_id is included and properly named
      const userResponse = {
        ...userData,
        municipalityId: userData.municipality_id || null,
      };

      // Log de auditoria para login bem-sucedido
      logAudit('LOGIN_SUCCESS', user.id, {
        userName: user.name,
        userRole: user.role,
        municipalityId: user.municipality_id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        token,
        user: userResponse,
      });
    } catch (error) {
      logError('Erro durante login', error, {
        email: req.body?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { password, login_attempts, locked_until, ...userData } = req.user;

    // Ensure municipality_id is included and properly named
    const userResponse = {
      ...userData,
      municipalityId: userData.municipality_id || null,
      // Include sectors information
      sectors: userData.sectors || [],
      sector: userData.sector || null,
      responsibleSectors: userData.responsibleSectors || null,
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ensure superuser exists
router.post('/ensure-superuser', async (req, res) => {
  try {
    const superuser = await getRow('SELECT id FROM users WHERE role = $1', [
      'superuser',
    ]);

    if (!superuser) {
      const defaultPassword = process.env.DEFAULT_SUPERUSER_PASSWORD || 'ChangeMe123!@#';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      await query(
        `
        INSERT INTO users (id, name, email, password, role)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'JUNIELSON CASTRO FARIAS',
          'junielsonfarias@gmail.com',
          $1,
          'superuser'
        )
      `,
        [hashedPassword]
      );

      console.log('Superusuário criado automaticamente');
    }

    res.json({ message: 'Superusuário verificado' });
  } catch (error) {
    console.error('Ensure superuser error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await getRow('SELECT id, name FROM users WHERE email = $1', [
      email,
    ]);

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        message:
          'Se o email existir, você receberá instruções para redefinir sua senha',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real application, you would send this via email
    // For now, we'll just log it
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      message:
        'Se o email existir, você receberá instruções para redefinir sua senha',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Token e nova senha são obrigatórios' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      'UPDATE users SET password = $1, login_attempts = 0, locked_until = NULL WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'LOGOUT',
        'users',
        req.user.id,
        JSON.stringify({ action: 'logout' }),
        req.user.municipality_id,
      ]
    );

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API Keys routes
import {
    createApiKey,
    createApiKeysTable,
    listApiKeys,
    revokeApiKey,
} from '../middleware/api-auth.js';

// Inicializar tabela de API keys
createApiKeysTable().catch(console.error);

// GET /api/auth/api-keys - Listar API keys do usuário
router.get('/api-keys', async (req, res) => {
  try {
    const apiKeys = await listApiKeys(req.user.id);
    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    logError('Erro ao listar API keys', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// POST /api/auth/api-keys - Criar nova API key
router.post('/api-keys', async (req, res) => {
  try {
    const { name, description, permissions, rateLimitPerHour } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome da API key é obrigatório',
      });
    }

    const newApiKey = await createApiKey(
      name,
      req.user.id,
      permissions || ['read'],
      rateLimitPerHour || 1000
    );

    res.json({
      success: true,
      data: newApiKey,
    });
  } catch (error) {
    logError('Erro ao criar API key', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// POST /api/auth/api-keys/:id/revoke - Revogar API key
router.post('/api-keys/:id/revoke', async (req, res) => {
  try {
    const { id } = req.params;
    const revoked = await revokeApiKey(id, req.user.id);

    if (revoked) {
      res.json({
        success: true,
        message: 'API key revogada com sucesso',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'API key não encontrada',
      });
    }
  } catch (error) {
    logError('Erro ao revogar API key', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
