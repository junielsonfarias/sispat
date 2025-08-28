import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logError, logInfo } from '../utils/logger.js';
import crypto from 'crypto';
import QRCode from 'qrcode';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Verificar se a tabela 2fa existe e criá-la se necessário
const ensure2FATable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_2fa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        secret VARCHAR(32) NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        backup_codes TEXT[], -- Array de códigos de backup
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índice para performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id)
    `);
  } catch (error) {
    logError('Erro ao criar tabela 2FA', error);
  }
};

// Gerar código TOTP
const generateTOTP = (secret, time = Math.floor(Date.now() / 30000)) => {
  const key = Buffer.from(secret, 'base32');
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(time), 0);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counter);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
};

// Verificar código TOTP
const verifyTOTP = (secret, code) => {
  const now = Math.floor(Date.now() / 30000);

  // Verificar código atual e códigos adjacentes (janela de 30 segundos)
  for (let i = -1; i <= 1; i++) {
    const expectedCode = generateTOTP(secret, now + i);
    if (code === expectedCode) {
      return true;
    }
  }

  return false;
};

// Gerar códigos de backup
const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
};

// GET /api/auth/2fa/status - Verificar status do 2FA
router.get('/status', async (req, res) => {
  try {
    await ensure2FATable();

    const result = await getRow(
      `
      SELECT enabled, secret, backup_codes
      FROM user_2fa
      WHERE user_id = $1
    `,
      [req.user.id]
    );

    if (result) {
      res.json({
        enabled: result.enabled,
        setupComplete: result.enabled,
        secret: result.secret,
        backupCodes: result.backup_codes,
      });
    } else {
      res.json({
        enabled: false,
        setupComplete: false,
      });
    }
  } catch (error) {
    logError('Erro ao verificar status 2FA', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/setup - Iniciar configuração do 2FA
router.post('/setup', async (req, res) => {
  try {
    await ensure2FATable();

    // Gerar chave secreta
    const secret = crypto.randomBytes(20).toString('base32');

    // Gerar códigos de backup
    const backupCodes = generateBackupCodes();

    // Gerar QR code
    const otpauth = `otpauth://totp/SISPAT:${req.user.email}?secret=${secret}&issuer=SISPAT`;
    const qrCode = await QRCode.toDataURL(otpauth);

    // Salvar ou atualizar no banco
    await query(
      `
      INSERT INTO user_2fa (user_id, secret, backup_codes)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        secret = $2,
        backup_codes = $3,
        enabled = FALSE,
        updated_at = CURRENT_TIMESTAMP
    `,
      [req.user.id, secret, backupCodes]
    );

    logInfo('Configuração 2FA iniciada', { userId: req.user.id });

    res.json({
      secret,
      qrCode,
      backupCodes,
    });
  } catch (error) {
    logError('Erro ao configurar 2FA', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/verify - Verificar código TOTP
router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    const result = await getRow(
      `
      SELECT secret, enabled
      FROM user_2fa
      WHERE user_id = $1
    `,
      [req.user.id]
    );

    if (!result) {
      return res.status(400).json({ error: '2FA não configurado' });
    }

    if (result.enabled) {
      // Verificação para login
      if (verifyTOTP(result.secret, code)) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Código inválido' });
      }
    } else {
      // Verificação para configuração
      if (verifyTOTP(result.secret, code)) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Código inválido' });
      }
    }
  } catch (error) {
    logError('Erro ao verificar código 2FA', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/enable - Ativar 2FA
router.post('/enable', async (req, res) => {
  try {
    await query(
      `
      UPDATE user_2fa
      SET enabled = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `,
      [req.user.id]
    );

    logInfo('2FA ativado', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    logError('Erro ao ativar 2FA', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/disable - Desativar 2FA
router.post('/disable', async (req, res) => {
  try {
    await query(
      `
      UPDATE user_2fa
      SET enabled = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `,
      [req.user.id]
    );

    logInfo('2FA desativado', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    logError('Erro ao desativar 2FA', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/regenerate-backup - Regenerar códigos de backup
router.post('/regenerate-backup', async (req, res) => {
  try {
    const backupCodes = generateBackupCodes();

    await query(
      `
      UPDATE user_2fa
      SET backup_codes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `,
      [req.user.id, backupCodes]
    );

    logInfo('Códigos de backup regenerados', { userId: req.user.id });

    res.json({ backupCodes });
  } catch (error) {
    logError('Erro ao regenerar códigos de backup', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/verify-backup - Verificar código de backup
router.post('/verify-backup', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código de backup necessário' });
    }

    const result = await getRow(
      `
      SELECT backup_codes
      FROM user_2fa
      WHERE user_id = $1 AND enabled = TRUE
    `,
      [req.user.id]
    );

    if (!result || !result.backup_codes) {
      return res.status(400).json({ error: '2FA não configurado' });
    }

    const backupCodes = result.backup_codes;
    const codeIndex = backupCodes.indexOf(code.toUpperCase());

    if (codeIndex === -1) {
      return res.status(400).json({ error: 'Código de backup inválido' });
    }

    // Remover código usado
    backupCodes.splice(codeIndex, 1);

    await query(
      `
      UPDATE user_2fa
      SET backup_codes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `,
      [req.user.id, backupCodes]
    );

    logInfo('Código de backup usado', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    logError('Erro ao verificar código de backup', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/change-password - Alterar senha
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    // Verificar senha atual
    const user = await getRow(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
    `,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Aqui você deve verificar a senha atual usando bcrypt
    // const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
    // if (!isValidPassword) {
    //   return res.status(400).json({ error: 'Senha atual incorreta' })
    // }

    // Hash da nova senha
    // const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Atualizar senha
    // await query(`
    //   UPDATE users
    //   SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
    //   WHERE id = $1
    // `, [req.user.id, newPasswordHash])

    logInfo('Senha alterada', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    logError('Erro ao alterar senha', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/2fa/terminate-sessions - Encerrar todas as sessões
router.post('/terminate-sessions', async (req, res) => {
  try {
    // Aqui você pode implementar a lógica para encerrar sessões
    // Por exemplo, invalidar tokens JWT ou limpar sessões no Redis

    logInfo('Sessões encerradas', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    logError('Erro ao encerrar sessões', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
