import express from 'express';
import { pool } from '../database/connection.js';
import twoFactorAuth from '../services/two-factor-auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { logInfo, logError } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/two-factor/generate
 * Gera configuração 2FA para um usuário
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    logInfo(`Gerando configuração 2FA para usuário ${userEmail}`);

    // Gera a configuração 2FA
    const twoFactorSetup = await twoFactorAuth.generateTwoFactorSecret(
      userEmail,
      'SISPAT'
    );

    // Salva o secret no banco (sem os códigos de backup ainda)
    await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [
      twoFactorSetup.secret,
      userId,
    ]);

    logInfo(`Configuração 2FA gerada para usuário ${userEmail}`);

    res.json({
      success: true,
      data: {
        qrCodeUrl: twoFactorSetup.qrCodeUrl,
        manualEntryKey: twoFactorSetup.manualEntryKey,
        backupCodes: twoFactorSetup.backupCodes,
      },
      message: 'Configuração 2FA gerada com sucesso',
    });
  } catch (error) {
    logError('Erro ao gerar configuração 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao gerar configuração 2FA',
    });
  }
});

/**
 * POST /api/two-factor/verify
 * Verifica token 2FA
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório',
      });
    }

    if (!twoFactorAuth.isValidTokenFormat(token)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de token inválido',
      });
    }

    // Busca o secret do usuário
    const userResult = await pool.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        error: '2FA não configurado para este usuário',
      });
    }

    // Verifica o token
    const isValid = twoFactorAuth.verifyTwoFactorToken(
      token,
      user.two_factor_secret
    );

    if (isValid) {
      logInfo(
        `Token 2FA verificado com sucesso para usuário ${req.user.email}`
      );
      res.json({
        success: true,
        message: 'Token verificado com sucesso',
      });
    } else {
      logInfo(`Token 2FA inválido para usuário ${req.user.email}`);
      res.status(400).json({
        success: false,
        error: 'Token inválido',
      });
    }
  } catch (error) {
    logError('Erro ao verificar token 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao verificar token 2FA',
    });
  }
});

/**
 * POST /api/two-factor/verify-backup
 * Verifica código de backup
 */
router.post('/verify-backup', authenticateToken, async (req, res) => {
  try {
    const { backupCode } = req.body;
    const userId = req.user.id;

    if (!backupCode) {
      return res.status(400).json({
        success: false,
        error: 'Código de backup é obrigatório',
      });
    }

    // Busca os códigos de backup do usuário
    const userResult = await pool.query(
      'SELECT two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_backup_codes) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum código de backup disponível',
      });
    }

    const backupCodes = JSON.parse(user.two_factor_backup_codes);

    // Verifica o código de backup
    const result = twoFactorAuth.verifyBackupCode(backupCode, backupCodes);

    if (result.isValid) {
      // Atualiza a lista de códigos de backup
      await pool.query(
        'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
        [JSON.stringify(result.remainingCodes), userId]
      );

      logInfo(`Código de backup verificado para usuário ${req.user.email}`);
      res.json({
        success: true,
        message: 'Código de backup verificado com sucesso',
        remainingCodes: result.remainingCodes.length,
      });
    } else {
      logInfo(`Código de backup inválido para usuário ${req.user.email}`);
      res.status(400).json({
        success: false,
        error: 'Código de backup inválido',
      });
    }
  } catch (error) {
    logError('Erro ao verificar código de backup:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao verificar código de backup',
    });
  }
});

/**
 * POST /api/two-factor/disable
 * Desabilita 2FA para um usuário
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Senha é obrigatória para desabilitar 2FA',
      });
    }

    // Verifica a senha do usuário
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(
      password,
      userResult.rows[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Senha incorreta',
      });
    }

    // Remove a configuração 2FA
    await pool.query(
      'UPDATE users SET two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = $1',
      [userId]
    );

    logInfo(`2FA desabilitado para usuário ${req.user.email}`);
    res.json({
      success: true,
      message: '2FA desabilitado com sucesso',
    });
  } catch (error) {
    logError('Erro ao desabilitar 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao desabilitar 2FA',
    });
  }
});

/**
 * GET /api/two-factor/status
 * Verifica status do 2FA para um usuário
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    const user = userResult.rows[0];
    const isEnabled = !!user.two_factor_secret;

    res.json({
      success: true,
      data: {
        enabled: isEnabled,
      },
    });
  } catch (error) {
    logError('Erro ao verificar status 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao verificar status 2FA',
    });
  }
});

export default router;
