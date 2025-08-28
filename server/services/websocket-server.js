/**
 * Servidor WebSocket para Notificações em Tempo Real
 */

import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { logError, logInfo, logWarning } from '../utils/logger.js';

class WebSocketServer {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.roomSubscriptions = new Map();
    this.notificationQueue = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializar servidor WebSocket
   */
  initialize(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin:
            process.env.NODE_ENV === 'production'
              ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
              : [
                  'http://localhost:8080',
                  'http://127.0.0.1:8080',
                  'http://localhost:5173',
                  'http://192.168.1.173:8080',
                  'http://192.168.1.173:5173',
                ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.setupMiddleware();
      this.setupEventHandlers();
      this.isInitialized = true;

      logInfo('WebSocket server initialized', {
        transports: ['websocket', 'polling'],
        cors: true,
      });

      return true;
    } catch (error) {
      logError('Failed to initialize WebSocket server', error);
      return false;
    }
  }

  /**
   * Configurar middleware de autenticação
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.municipalityId = decoded.municipality_id;
        socket.userName = decoded.name;

        logInfo('WebSocket client authenticated', {
          userId: socket.userId,
          role: socket.userRole,
          municipalityId: socket.municipalityId,
        });

        next();
      } catch (error) {
        logError('WebSocket authentication failed', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    this.io.on('connection', socket => {
      this.handleConnection(socket);
    });
  }

  /**
   * Lidar com nova conexão
   */
  handleConnection(socket) {
    const clientInfo = {
      id: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      role: socket.userRole,
      municipalityId: socket.municipalityId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connectedClients.set(socket.id, clientInfo);

    logInfo('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      totalClients: this.connectedClients.size,
    });

    // Entrar nas salas apropriadas
    this.joinRooms(socket);

    // Enviar notificações pendentes
    this.sendPendingNotifications(socket);

    // Event handlers
    socket.on('disconnect', () => this.handleDisconnection(socket));
    socket.on('join-room', room => this.handleJoinRoom(socket, room));
    socket.on('leave-room', room => this.handleLeaveRoom(socket, room));
    socket.on('mark-notification-read', notificationId =>
      this.handleMarkNotificationRead(socket, notificationId)
    );
    socket.on('get-notifications', () => this.handleGetNotifications(socket));
    socket.on('ping', () => this.handlePing(socket));

    // Enviar evento de conexão bem-sucedida
    socket.emit('connected', {
      message: 'Conectado ao sistema de notificações',
      clientId: socket.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Entrar nas salas apropriadas baseado no usuário
   */
  joinRooms(socket) {
    const rooms = [];

    // Sala do usuário específico
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    rooms.push(userRoom);

    // Sala do município
    if (socket.municipalityId) {
      const municipalityRoom = `municipality:${socket.municipalityId}`;
      socket.join(municipalityRoom);
      rooms.push(municipalityRoom);
    }

    // Salas baseadas no role
    const roleRoom = `role:${socket.userRole}`;
    socket.join(roleRoom);
    rooms.push(roleRoom);

    // Sala global para todos os usuários
    socket.join('global');
    rooms.push('global');

    logInfo('WebSocket client joined rooms', {
      socketId: socket.id,
      userId: socket.userId,
      rooms,
    });
  }

  /**
   * Lidar com desconexão
   */
  handleDisconnection(socket) {
    const clientInfo = this.connectedClients.get(socket.id);

    if (clientInfo) {
      logInfo('WebSocket client disconnected', {
        socketId: socket.id,
        userId: clientInfo.userId,
        userName: clientInfo.userName,
        duration: Date.now() - clientInfo.connectedAt.getTime(),
        totalClients: this.connectedClients.size - 1,
      });

      this.connectedClients.delete(socket.id);
    }
  }

  /**
   * Entrar em sala específica
   */
  handleJoinRoom(socket, room) {
    if (this.isValidRoom(room, socket)) {
      socket.join(room);

      logInfo('WebSocket client joined custom room', {
        socketId: socket.id,
        userId: socket.userId,
        room,
      });

      socket.emit('room-joined', { room, timestamp: new Date().toISOString() });
    } else {
      socket.emit('error', { message: 'Não autorizado a entrar nesta sala' });
    }
  }

  /**
   * Sair de sala específica
   */
  handleLeaveRoom(socket, room) {
    socket.leave(room);

    logInfo('WebSocket client left room', {
      socketId: socket.id,
      userId: socket.userId,
      room,
    });

    socket.emit('room-left', { room, timestamp: new Date().toISOString() });
  }

  /**
   * Marcar notificação como lida
   */
  async handleMarkNotificationRead(socket, notificationId) {
    try {
      // Aqui você implementaria a lógica para marcar como lida no banco
      // await markNotificationAsRead(notificationId, socket.userId)

      socket.emit('notification-marked-read', {
        notificationId,
        timestamp: new Date().toISOString(),
      });

      logInfo('Notification marked as read', {
        notificationId,
        userId: socket.userId,
      });
    } catch (error) {
      logError('Failed to mark notification as read', error);
      socket.emit('error', { message: 'Erro ao marcar notificação como lida' });
    }
  }

  /**
   * Obter notificações do usuário
   */
  async handleGetNotifications(socket) {
    try {
      // Aqui você implementaria a busca de notificações no banco
      // const notifications = await getUserNotifications(socket.userId)

      const notifications = []; // Placeholder

      socket.emit('notifications', {
        notifications,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError('Failed to get notifications', error);
      socket.emit('error', { message: 'Erro ao buscar notificações' });
    }
  }

  /**
   * Lidar com ping
   */
  handlePing(socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
    socket.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Validar se o usuário pode entrar na sala
   */
  isValidRoom(room, socket) {
    // Regras de validação para salas
    if (room.startsWith('user:')) {
      const targetUserId = room.split(':')[1];
      return targetUserId === socket.userId || socket.userRole === 'superuser';
    }

    if (room.startsWith('municipality:')) {
      const targetMunicipalityId = room.split(':')[1];
      return (
        targetMunicipalityId === socket.municipalityId ||
        socket.userRole === 'superuser'
      );
    }

    if (room.startsWith('admin:')) {
      return ['admin', 'superuser'].includes(socket.userRole);
    }

    return false;
  }

  /**
   * Enviar notificações pendentes
   */
  async sendPendingNotifications(socket) {
    const pendingNotifications =
      this.notificationQueue.get(socket.userId) || [];

    if (pendingNotifications.length > 0) {
      socket.emit('pending-notifications', {
        notifications: pendingNotifications,
        count: pendingNotifications.length,
      });

      // Limpar notificações pendentes
      this.notificationQueue.delete(socket.userId);

      logInfo('Sent pending notifications', {
        userId: socket.userId,
        count: pendingNotifications.length,
      });
    }
  }

  /**
   * Enviar notificação para usuário específico
   */
  sendNotificationToUser(userId, notification) {
    if (!this.isInitialized) {
      logWarning('WebSocket server not initialized, queueing notification');
      this.queueNotification(userId, notification);
      return false;
    }

    const room = `user:${userId}`;
    const sent = this.io.to(room).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logInfo('Notification sent to user', {
      userId,
      type: notification.type,
      title: notification.title,
    });

    return sent;
  }

  /**
   * Enviar notificação para município
   */
  sendNotificationToMunicipality(municipalityId, notification) {
    if (!this.isInitialized) {
      logWarning('WebSocket server not initialized');
      return false;
    }

    const room = `municipality:${municipalityId}`;
    const sent = this.io.to(room).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logInfo('Notification sent to municipality', {
      municipalityId,
      type: notification.type,
      title: notification.title,
    });

    return sent;
  }

  /**
   * Enviar notificação para role específico
   */
  sendNotificationToRole(role, notification) {
    if (!this.isInitialized) {
      logWarning('WebSocket server not initialized');
      return false;
    }

    const room = `role:${role}`;
    const sent = this.io.to(room).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logInfo('Notification sent to role', {
      role,
      type: notification.type,
      title: notification.title,
    });

    return sent;
  }

  /**
   * Broadcast para todos os usuários
   */
  broadcastNotification(notification) {
    if (!this.isInitialized) {
      logWarning('WebSocket server not initialized');
      return false;
    }

    const sent = this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logInfo('Notification broadcasted', {
      type: notification.type,
      title: notification.title,
      clients: this.connectedClients.size,
    });

    return sent;
  }

  /**
   * Enfileirar notificação para usuário offline
   */
  queueNotification(userId, notification) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }

    const queue = this.notificationQueue.get(userId);
    queue.push({
      ...notification,
      queuedAt: new Date().toISOString(),
    });

    // Limitar tamanho da fila
    if (queue.length > 50) {
      queue.shift(); // Remove a mais antiga
    }

    logInfo('Notification queued for offline user', {
      userId,
      queueSize: queue.length,
    });
  }

  /**
   * Obter estatísticas do servidor
   */
  getStats() {
    const clients = Array.from(this.connectedClients.values());

    return {
      isInitialized: this.isInitialized,
      connectedClients: this.connectedClients.size,
      queuedNotifications: this.notificationQueue.size,
      clientsByRole: this.groupClientsByRole(clients),
      clientsByMunicipality: this.groupClientsByMunicipality(clients),
      averageConnectionTime: this.calculateAverageConnectionTime(clients),
    };
  }

  /**
   * Agrupar clientes por role
   */
  groupClientsByRole(clients) {
    return clients.reduce((acc, client) => {
      acc[client.role] = (acc[client.role] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Agrupar clientes por município
   */
  groupClientsByMunicipality(clients) {
    return clients.reduce((acc, client) => {
      const key = client.municipalityId || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calcular tempo médio de conexão
   */
  calculateAverageConnectionTime(clients) {
    if (clients.length === 0) return 0;

    const now = Date.now();
    const totalTime = clients.reduce((sum, client) => {
      return sum + (now - client.connectedAt.getTime());
    }, 0);

    return Math.round(totalTime / clients.length / 1000); // em segundos
  }

  /**
   * Desconectar cliente específico
   */
  disconnectClient(socketId) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
      return true;
    }
    return false;
  }

  /**
   * Limpar recursos
   */
  cleanup() {
    if (this.io) {
      this.io.close();
      this.connectedClients.clear();
      this.notificationQueue.clear();
      this.isInitialized = false;

      logInfo('WebSocket server cleaned up');
    }
  }
}

// Instância singleton
export const websocketServer = new WebSocketServer();

export default websocketServer;
