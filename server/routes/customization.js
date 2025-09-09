import express from 'express';
import { getRow, query } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

// Get customization settings for a municipality
router.get('/settings/:municipalityId', authenticateToken, async (req, res) => {
  try {
    const { municipalityId } = req.params;

    // Verificar se o usuário tem permissão para acessar essas configurações
    if (
      req.user.role !== 'superuser' &&
      req.user.municipality_id !== municipalityId
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const settings = await getRow(
      'SELECT valor FROM customization_settings WHERE chave = $1',
      [`municipality_${municipalityId}`]
    );

    if (settings) {
      res.json(settings.valor);
    } else {
      // Retornar configurações padrão se não existirem
      res.json({});
    }
  } catch (error) {
    logError('Erro ao buscar configurações de personalização', error, {
      municipalityId: req.params.municipalityId,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Save customization settings for a municipality
router.post(
  '/settings/:municipalityId',
  authenticateToken,
  async (req, res) => {
    try {
      const { municipalityId } = req.params;
      const settings = req.body;

      // Verificar se o usuário tem permissão para salvar essas configurações
      if (
        req.user.role !== 'superuser' &&
        req.user.municipality_id !== municipalityId
      ) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const key = `municipality_${municipalityId}`;

      // Verificar se já existe configuração para este município
      const existing = await getRow(
        'SELECT id FROM customization_settings WHERE chave = $1',
        [key]
      );

      if (existing) {
        // Atualizar configuração existente
        await query(
          'UPDATE customization_settings SET valor = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE chave = $3',
          [JSON.stringify(settings), req.user.id, key]
        );
        logInfo('Configurações de personalização atualizadas', {
          municipalityId,
          userId: req.user.id,
        });
      } else {
        // Criar nova configuração
        await query(
          'INSERT INTO customization_settings (chave, valor, descricao, categoria, created_by) VALUES ($1, $2, $3, $4, $5)',
          [
            key,
            JSON.stringify(settings),
            `Configurações de personalização para município ${municipalityId}`,
            'municipality_customization',
            req.user.id,
          ]
        );
        logInfo('Configurações de personalização criadas', {
          municipalityId,
          userId: req.user.id,
        });
      }

      res.json({ success: true, message: 'Configurações salvas com sucesso' });
    } catch (error) {
      logError('Erro ao salvar configurações de personalização', error, {
        municipalityId: req.params.municipalityId,
        userId: req.user?.id,
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Get global settings (for superuser)
router.get('/global', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const settings = await getRow(
      'SELECT valor FROM customization_settings WHERE chave = $1',
      ['global_settings']
    );

    if (settings) {
      res.json(settings.valor);
    } else {
      res.json({});
    }
  } catch (error) {
    logError('Erro ao buscar configurações globais', error, {
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Save global settings (for superuser)
router.post('/global', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const settings = req.body;
    const key = 'global_settings';

    // Verificar se já existe configuração global
    const existing = await getRow(
      'SELECT id FROM customization_settings WHERE chave = $1',
      [key]
    );

    if (existing) {
      // Atualizar configuração existente
      await query(
        'UPDATE customization_settings SET valor = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE chave = $3',
        [JSON.stringify(settings), req.user.id, key]
      );
    } else {
      // Criar nova configuração
      await query(
        'INSERT INTO customization_settings (chave, valor, descricao, categoria, created_by) VALUES ($1, $2, $3, $4, $5)',
        [
          key,
          JSON.stringify(settings),
          'Configurações globais do sistema',
          'global_settings',
          req.user.id,
        ]
      );
    }

    logInfo('Configurações globais salvas', {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Configurações globais salvas com sucesso',
    });
  } catch (error) {
    logError('Erro ao salvar configurações globais', error, {
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
