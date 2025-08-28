import { websocketServer } from './websocket-server.js';
import { logInfo, logWarning } from '../utils/logger.js';

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Inicializar o serviço de notificações
   */
  initialize() {
    this.isInitialized = true;
    logInfo('📢 Serviço de notificações inicializado');
  }

  /**
   * Enviar notificação para usuário específico
   */
  sendToUser(userId, notification) {
    if (!this.isInitialized) {
      logWarning('Serviço de notificações não inicializado');
      return false;
    }

    return websocketServer.sendNotificationToUser(userId, {
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
    });
  }

  /**
   * Enviar notificação para município
   */
  sendToMunicipality(municipalityId, notification) {
    if (!this.isInitialized) {
      logWarning('Serviço de notificações não inicializado');
      return false;
    }

    return websocketServer.sendNotificationToMunicipality(municipalityId, {
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
    });
  }

  /**
   * Enviar notificação para role específico
   */
  sendToRole(role, notification) {
    if (!this.isInitialized) {
      logWarning('Serviço de notificações não inicializado');
      return false;
    }

    return websocketServer.sendNotificationToRole(role, {
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
    });
  }

  /**
   * Broadcast para todos os usuários
   */
  broadcast(notification) {
    if (!this.isInitialized) {
      logWarning('Serviço de notificações não inicializado');
      return false;
    }

    return websocketServer.broadcastNotification({
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
    });
  }

  // ===== NOTIFICAÇÕES ESPECÍFICAS DO SISTEMA =====

  /**
   * Notificação de novo patrimônio cadastrado
   */
  notifyPatrimonioCreated(patrimonio, user) {
    const notification = {
      type: 'success',
      title: 'Novo Patrimônio Cadastrado',
      message: `Patrimônio "${patrimonio.numero_patrimonio}" foi cadastrado por ${user.name}`,
      data: {
        patrimonioId: patrimonio.id,
        numeroPatrimonio: patrimonio.numero_patrimonio,
        createdBy: user.name,
        action: 'patrimonio_created',
      },
    };

    // Enviar para o município
    this.sendToMunicipality(patrimonio.municipality_id, notification);

    // Enviar para supervisores
    this.sendToRole('supervisor', {
      ...notification,
      title: 'Novo Patrimônio - Ação Requerida',
      message: `Novo patrimônio cadastrado que pode requerer sua atenção: ${patrimonio.numero_patrimonio}`,
    });
  }

  /**
   * Notificação de patrimônio atualizado
   */
  notifyPatrimonioUpdated(patrimonio, user) {
    const notification = {
      type: 'info',
      title: 'Patrimônio Atualizado',
      message: `Patrimônio "${patrimonio.numero_patrimonio}" foi atualizado por ${user.name}`,
      data: {
        patrimonioId: patrimonio.id,
        numeroPatrimonio: patrimonio.numero_patrimonio,
        updatedBy: user.name,
        action: 'patrimonio_updated',
      },
    };

    this.sendToMunicipality(patrimonio.municipality_id, notification);
  }

  /**
   * Notificação de patrimônio excluído
   */
  notifyPatrimonioDeleted(patrimonio, user) {
    const notification = {
      type: 'warning',
      title: 'Patrimônio Excluído',
      message: `Patrimônio "${patrimonio.numero_patrimonio}" foi excluído por ${user.name}`,
      data: {
        numeroPatrimonio: patrimonio.numero_patrimonio,
        deletedBy: user.name,
        action: 'patrimonio_deleted',
      },
    };

    this.sendToMunicipality(patrimonio.municipality_id, notification);
  }

  /**
   * Notificação de novo usuário cadastrado
   */
  notifyUserCreated(user, createdBy) {
    const notification = {
      type: 'success',
      title: 'Novo Usuário Cadastrado',
      message: `Usuário "${user.name}" foi cadastrado por ${createdBy.name}`,
      data: {
        userId: user.id,
        userName: user.name,
        createdBy: createdBy.name,
        action: 'user_created',
      },
    };

    this.sendToMunicipality(user.municipality_id, notification);
  }

  /**
   * Notificação de transferência solicitada
   */
  notifyTransferRequested(transfer, user) {
    const notification = {
      type: 'info',
      title: 'Transferência Solicitada',
      message: `Transferência do patrimônio "${transfer.numero_patrimonio}" foi solicitada por ${user.name}`,
      data: {
        transferId: transfer.id,
        patrimonioId: transfer.patrimonio_id,
        numeroPatrimonio: transfer.numero_patrimonio,
        requestedBy: user.name,
        action: 'transfer_requested',
      },
    };

    this.sendToMunicipality(transfer.municipality_id, notification);
  }

  /**
   * Notificação de transferência aprovada
   */
  notifyTransferApproved(transfer, approvedBy) {
    const notification = {
      type: 'success',
      title: 'Transferência Aprovada',
      message: `Transferência do patrimônio "${transfer.numero_patrimonio}" foi aprovada por ${approvedBy.name}`,
      data: {
        transferId: transfer.id,
        patrimonioId: transfer.patrimonio_id,
        numeroPatrimonio: transfer.numero_patrimonio,
        approvedBy: approvedBy.name,
        action: 'transfer_approved',
      },
    };

    this.sendToMunicipality(transfer.municipality_id, notification);
  }

  /**
   * Notificação de transferência rejeitada
   */
  notifyTransferRejected(transfer, rejectedBy, reason) {
    const notification = {
      type: 'warning',
      title: 'Transferência Rejeitada',
      message: `Transferência do patrimônio "${transfer.numero_patrimonio}" foi rejeitada por ${rejectedBy.name}`,
      data: {
        transferId: transfer.id,
        patrimonioId: transfer.patrimonio_id,
        numeroPatrimonio: transfer.numero_patrimonio,
        rejectedBy: rejectedBy.name,
        reason: reason,
        action: 'transfer_rejected',
      },
    };

    this.sendToMunicipality(transfer.municipality_id, notification);
  }

  /**
   * Notificação de inventário iniciado
   */
  notifyInventoryStarted(inventory, user) {
    const notification = {
      type: 'info',
      title: 'Inventário Iniciado',
      message: `Inventário "${inventory.nome}" foi iniciado por ${user.name}`,
      data: {
        inventoryId: inventory.id,
        inventoryName: inventory.nome,
        startedBy: user.name,
        action: 'inventory_started',
      },
    };

    this.sendToMunicipality(inventory.municipality_id, notification);
  }

  /**
   * Notificação de inventário concluído
   */
  notifyInventoryCompleted(inventory, user) {
    const notification = {
      type: 'success',
      title: 'Inventário Concluído',
      message: `Inventário "${inventory.nome}" foi concluído por ${user.name}`,
      data: {
        inventoryId: inventory.id,
        inventoryName: inventory.nome,
        completedBy: user.name,
        action: 'inventory_completed',
      },
    };

    this.sendToMunicipality(inventory.municipality_id, notification);
  }

  /**
   * Notificação de backup realizado
   */
  notifyBackupCompleted(backupInfo) {
    const notification = {
      type: 'success',
      title: 'Backup Realizado',
      message: `Backup do sistema foi realizado com sucesso`,
      data: {
        backupId: backupInfo.id,
        backupSize: backupInfo.size,
        action: 'backup_completed',
      },
    };

    this.sendToRole('superuser', notification);
  }

  /**
   * Notificação de erro no sistema
   */
  notifySystemError(error, context) {
    const notification = {
      type: 'alert',
      title: 'Erro no Sistema',
      message: `Ocorreu um erro no sistema: ${error.message}`,
      data: {
        error: error.message,
        context: context,
        timestamp: new Date().toISOString(),
        action: 'system_error',
      },
    };

    this.sendToRole('superuser', notification);
  }

  /**
   * Notificação de manutenção agendada
   */
  notifyMaintenanceScheduled(maintenance, user) {
    const notification = {
      type: 'warning',
      title: 'Manutenção Agendada',
      message: `Manutenção "${maintenance.titulo}" foi agendada por ${user.name}`,
      data: {
        maintenanceId: maintenance.id,
        maintenanceTitle: maintenance.titulo,
        scheduledBy: user.name,
        scheduledDate: maintenance.data_agendada,
        action: 'maintenance_scheduled',
      },
    };

    this.sendToMunicipality(maintenance.municipality_id, notification);
  }

  /**
   * Notificação de login suspeito
   */
  notifySuspiciousLogin(user, loginInfo) {
    const notification = {
      type: 'alert',
      title: 'Login Suspeito Detectado',
      message: `Login suspeito detectado para o usuário ${user.name}`,
      data: {
        userId: user.id,
        userName: user.name,
        loginInfo: loginInfo,
        action: 'suspicious_login',
      },
    };

    this.sendToRole('superuser', notification);
    this.sendToRole('admin', notification);
  }
}

// Instância singleton
export const notificationService = new NotificationService();

export default notificationService;
