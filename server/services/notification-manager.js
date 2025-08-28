/**
 * Gerenciador de Notificações
 */

import { getRow, getRows, query } from '../database/connection.js';
import { logError, logInfo } from '../utils/logger.js';
import { websocketServer } from './websocket-server.js';

class NotificationManager {
  constructor() {
    this.notificationTypes = {
      SYSTEM: 'system',
      PATRIMONIO: 'patrimonio',
      TRANSFER: 'transfer',
      INVENTORY: 'inventory',
      USER: 'user',
      MAINTENANCE: 'maintenance',
      REPORT: 'report',
      SECURITY: 'security',
    };

    this.priorities = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    };
  }

  /**
   * Inicializar tabela de notificações
   */
  async initialize() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          priority VARCHAR(20) DEFAULT 'medium',
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          action_url VARCHAR(500),
          action_label VARCHAR(100)
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_municipality_id ON notifications(municipality_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)
      `);

      logInfo('Notification system initialized');
      return true;
    } catch (error) {
      logError('Failed to initialize notification system', error);
      return false;
    }
  }

  /**
   * Criar nova notificação
   */
  async createNotification(options) {
    const {
      userId,
      municipalityId,
      type = this.notificationTypes.SYSTEM,
      priority = this.priorities.MEDIUM,
      title,
      message,
      data = {},
      expiresAt = null,
      actionUrl = null,
      actionLabel = null,
    } = options;

    try {
      const notification = await getRow(
        `
        INSERT INTO notifications (
          user_id, municipality_id, type, priority, title, message, 
          data, expires_at, action_url, action_label
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          userId,
          municipalityId,
          type,
          priority,
          title,
          message,
          JSON.stringify(data),
          expiresAt,
          actionUrl,
          actionLabel,
        ]
      );

      // Enviar via WebSocket se o usuário estiver online
      if (userId) {
        websocketServer.sendNotificationToUser(userId, {
          id: notification.id,
          type,
          priority,
          title,
          message,
          data,
          actionUrl,
          actionLabel,
          createdAt: notification.created_at,
        });
      }

      logInfo('Notification created', {
        id: notification.id,
        userId,
        type,
        priority,
        title,
      });

      return notification;
    } catch (error) {
      logError('Failed to create notification', error);
      throw error;
    }
  }

  /**
   * Notificação para patrimônio criado
   */
  async notifyPatrimonioCreated(patrimonio, createdBy) {
    return await this.createNotification({
      userId: createdBy,
      municipalityId: patrimonio.municipality_id,
      type: this.notificationTypes.PATRIMONIO,
      priority: this.priorities.LOW,
      title: 'Patrimônio cadastrado',
      message: `O patrimônio "${patrimonio.descricao_bem}" foi cadastrado com sucesso.`,
      data: {
        patrimonioId: patrimonio.id,
        numeroPatrimonio: patrimonio.numero_patrimonio,
      },
      actionUrl: `/patrimonios/${patrimonio.id}`,
      actionLabel: 'Ver patrimônio',
    });
  }

  /**
   * Notificação para transferência de patrimônio
   */
  async notifyPatrimonioTransfer(transfer, affectedUsers = []) {
    const notifications = [];

    for (const userId of affectedUsers) {
      const notification = await this.createNotification({
        userId,
        municipalityId: transfer.municipality_id,
        type: this.notificationTypes.TRANSFER,
        priority: this.priorities.MEDIUM,
        title: 'Transferência de patrimônio',
        message: `O patrimônio "${transfer.patrimonio_descricao}" foi transferido para outro setor.`,
        data: { transferId: transfer.id, patrimonioId: transfer.patrimonio_id },
        actionUrl: `/transferencias/${transfer.id}`,
        actionLabel: 'Ver transferência',
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Notificação de inventário iniciado
   */
  async notifyInventoryStarted(inventory, users = []) {
    const notifications = [];

    for (const userId of users) {
      const notification = await this.createNotification({
        userId,
        municipalityId: inventory.municipality_id,
        type: this.notificationTypes.INVENTORY,
        priority: this.priorities.HIGH,
        title: 'Inventário iniciado',
        message: `Um novo inventário foi iniciado: "${inventory.name}".`,
        data: { inventoryId: inventory.id },
        actionUrl: `/inventarios/${inventory.id}`,
        actionLabel: 'Participar do inventário',
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Notificação de manutenção agendada
   */
  async notifyMaintenanceScheduled(maintenance, users = []) {
    const notifications = [];

    for (const userId of users) {
      const notification = await this.createNotification({
        userId,
        municipalityId: maintenance.municipality_id,
        type: this.notificationTypes.MAINTENANCE,
        priority: this.priorities.MEDIUM,
        title: 'Manutenção agendada',
        message: `Manutenção agendada para ${new Date(maintenance.scheduled_date).toLocaleDateString()}.`,
        data: { maintenanceId: maintenance.id },
        expiresAt: maintenance.scheduled_date,
        actionUrl: `/manutencao/${maintenance.id}`,
        actionLabel: 'Ver detalhes',
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Notificação de segurança
   */
  async notifySecurityAlert(alert, users = []) {
    const notifications = [];

    for (const userId of users) {
      const notification = await this.createNotification({
        userId,
        municipalityId: alert.municipality_id,
        type: this.notificationTypes.SECURITY,
        priority: this.priorities.CRITICAL,
        title: 'Alerta de segurança',
        message: alert.message,
        data: alert.data || {},
        actionUrl: alert.actionUrl,
        actionLabel: 'Ver detalhes',
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Broadcast de notificação do sistema
   */
  async broadcastSystemNotification(notification) {
    try {
      // Criar notificação para todos os usuários ativos
      const activeUsers = await getRows(`
        SELECT id, municipality_id 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const notifications = [];

      for (const user of activeUsers) {
        const created = await this.createNotification({
          userId: user.id,
          municipalityId: user.municipality_id,
          type: this.notificationTypes.SYSTEM,
          priority: notification.priority || this.priorities.MEDIUM,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
        });
        notifications.push(created);
      }

      // Broadcast via WebSocket
      websocketServer.broadcastNotification({
        type: this.notificationTypes.SYSTEM,
        priority: notification.priority || this.priorities.MEDIUM,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
      });

      logInfo('System notification broadcasted', {
        title: notification.title,
        usersNotified: notifications.length,
      });

      return notifications;
    } catch (error) {
      logError('Failed to broadcast system notification', error);
      throw error;
    }
  }

  /**
   * Obter notificações do usuário
   */
  async getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false, type = null } = options;

    try {
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (unreadOnly) {
        whereClause += ' AND read_at IS NULL';
      }

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Excluir notificações expiradas
      whereClause += ' AND (expires_at IS NULL OR expires_at > NOW())';

      const notifications = await getRows(
        `
        SELECT * FROM notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
        [...params, limit, offset]
      );

      return notifications;
    } catch (error) {
      logError('Failed to get user notifications', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await getRow(
        `
        UPDATE notifications 
        SET read_at = NOW()
        WHERE id = $1 AND user_id = $2 AND read_at IS NULL
        RETURNING *
      `,
        [notificationId, userId]
      );

      if (notification) {
        logInfo('Notification marked as read', {
          id: notificationId,
          userId,
        });
      }

      return notification;
    } catch (error) {
      logError('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(userId) {
    try {
      const result = await query(
        `
        UPDATE notifications 
        SET read_at = NOW()
        WHERE user_id = $1 AND read_at IS NULL
      `,
        [userId]
      );

      logInfo('All notifications marked as read', {
        userId,
        count: result.rowCount,
      });

      return result.rowCount;
    } catch (error) {
      logError('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  /**
   * Deletar notificação
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await query(
        `
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2
      `,
        [notificationId, userId]
      );

      if (result.rowCount > 0) {
        logInfo('Notification deleted', {
          id: notificationId,
          userId,
        });
      }

      return result.rowCount > 0;
    } catch (error) {
      logError('Failed to delete notification', error);
      throw error;
    }
  }

  /**
   * Limpar notificações expiradas
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await query(`
        DELETE FROM notifications 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
      `);

      if (result.rowCount > 0) {
        logInfo('Expired notifications cleaned up', {
          count: result.rowCount,
        });
      }

      return result.rowCount;
    } catch (error) {
      logError('Failed to cleanup expired notifications', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de notificações
   */
  async getNotificationStats(municipalityId = null) {
    try {
      let whereClause = '';
      const params = [];

      if (municipalityId) {
        whereClause = 'WHERE municipality_id = $1';
        params.push(municipalityId);
      }

      const stats = await getRow(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
          COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
        FROM notifications
        ${whereClause}
      `,
        params
      );

      return stats;
    } catch (error) {
      logError('Failed to get notification stats', error);
      throw error;
    }
  }
}

// Instância singleton
export const notificationManager = new NotificationManager();

export default notificationManager;
