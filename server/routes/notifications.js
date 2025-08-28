/**
 * Rotas para Sistema de Notificações
 */

import express from 'express';
import { authenticateToken, requireUser } from '../middleware/auth.js';
import { notificationService } from '../services/notification-service.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

/**
 * GET /api/notifications
 * Obter notificações do usuário
 */
router.get('/', requireUser, async (req, res) => {
  try {
    // Por enquanto, retornamos notificações vazias
    // Em uma implementação completa, buscaríamos do banco de dados
    res.json({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
    });
  } catch (error) {
    logError('Erro ao buscar notificações', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/notifications/mark-read
 * Marcar notificação como lida
 */
router.post('/mark-read', requireUser, async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ error: 'ID da notificação é obrigatório' });
    }

    // Em uma implementação completa, marcaríamos como lida no banco
    logInfo('Notificação marcada como lida', {
      notificationId,
      userId: req.user.id,
    });

    res.json({ success: true, message: 'Notificação marcada como lida' });
  } catch (error) {
    logError('Erro ao marcar notificação como lida', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Marcar todas as notificações como lidas
 */
router.post('/mark-all-read', requireUser, async (req, res) => {
  try {
    // Em uma implementação completa, marcaríamos todas como lidas no banco
    logInfo('Todas as notificações marcadas como lidas', {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Todas as notificações marcadas como lidas',
    });
  } catch (error) {
    logError('Erro ao marcar todas as notificações como lidas', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/notifications/test
 * Endpoint de teste para enviar notificação
 */
router.post('/test', requireUser, async (req, res) => {
  try {
    const { type = 'info', title, message, target = 'user' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: 'Título e mensagem são obrigatórios',
      });
    }

    const notification = {
      type,
      title,
      message,
      data: {
        test: true,
        sentBy: req.user.name,
        timestamp: new Date().toISOString(),
      },
    };

    let sent = false;

    switch (target) {
      case 'user':
        sent = notificationService.sendToUser(req.user.id, notification);
        break;
      case 'municipality':
        if (req.user.municipality_id) {
          sent = notificationService.sendToMunicipality(
            req.user.municipality_id,
            notification
          );
        } else {
          return res
            .status(400)
            .json({ error: 'Usuário não tem município associado' });
        }
        break;
      case 'role':
        sent = notificationService.sendToRole(req.user.role, notification);
        break;
      case 'broadcast':
        sent = notificationService.broadcast(notification);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de destino inválido' });
    }

    if (sent) {
      logInfo('Notificação de teste enviada', {
        type,
        title,
        target,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Notificação de teste enviada com sucesso',
        notification,
      });
    } else {
      res.status(500).json({ error: 'Falha ao enviar notificação' });
    }
  } catch (error) {
    logError('Erro ao enviar notificação de teste', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/notifications/stats
 * Obter estatísticas do WebSocket
 */
router.get('/stats', requireUser, async (req, res) => {
  try {
    // Verificar se o usuário é superuser ou admin
    if (!['superuser', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Importar o WebSocket server para obter estatísticas
    const { websocketServer } = await import('../services/websocket-server.js');
    const stats = websocketServer.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logError('Erro ao obter estatísticas do WebSocket', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
