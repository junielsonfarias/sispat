/**
 * Configuração do WebSocket para SISPAT 2.0
 * 
 * Este arquivo contém a configuração e gerenciamento do WebSocket
 * para atualizações em tempo real
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { prisma } from './database'
import { metricsCollector } from './metrics'
import { alertManager } from './alerts'

export interface AuthenticatedSocket extends Socket {
  userId: string
  email: string
  role: string
  municipalityId: string
}

export interface WebSocketEvents {
  // Métricas em tempo real
  'metrics:update': {
    system: any
    application: any
    health: number
    timestamp: number
  }
  
  // Alertas
  'alert:new': {
    id: string
    alertId: string
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    timestamp: string
  }
  
  'alert:resolved': {
    alertId: string
    timestamp: string
  }
  
  // Atualizações de dados
  'data:patrimonio:created': {
    id: string
    numero_patrimonio: string
    descricao_bem: string
    setor: string
    timestamp: string
  }
  
  'data:patrimonio:updated': {
    id: string
    numero_patrimonio: string
    changes: any
    timestamp: string
  }
  
  'data:patrimonio:deleted': {
    id: string
    numero_patrimonio: string
    timestamp: string
  }
  
  'data:transfer:created': {
    id: string
    from: string
    to: string
    status: string
    timestamp: string
  }
  
  'data:transfer:status_changed': {
    id: string
    status: string
    timestamp: string
  }
  
  // Notificações do sistema
  'system:maintenance': {
    message: string
    scheduledAt: string
    duration: number
  }
  
  'system:update': {
    version: string
    message: string
    timestamp: string
  }
  
  // Heartbeat
  'ping': void
  'pong': void
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private connectedClients: Map<string, AuthenticatedSocket> = new Map()
  private metricsInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * Inicializar WebSocket Server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:8080",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventHandlers()
    this.startMetricsBroadcast()
    this.startHeartbeat()
    
    console.log('✅ WebSocket Server inicializado')
    return this.io
  }

  /**
   * Configurar event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', async (socket: Socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`)

      // Autenticar cliente
      const authResult = await this.authenticateClient(socket)
      if (!authResult) {
        socket.disconnect(true)
        return
      }

      const { user } = authResult
      const authenticatedSocket = socket as AuthenticatedSocket
      authenticatedSocket.userId = user.id
      authenticatedSocket.email = user.email
      authenticatedSocket.role = user.role
      authenticatedSocket.municipalityId = user.municipalityId

      this.connectedClients.set(socket.id, authenticatedSocket)

      // Adicionar a rooms baseadas no role e município
      await this.joinUserRooms(authenticatedSocket)

      // Event handlers
      this.setupSocketEventHandlers(authenticatedSocket)

      // Notificar conexão
      this.broadcastToAdmins('user:connected', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      })
    })

    this.io.on('disconnect', (socket) => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`)
      this.connectedClients.delete(socket.id)
    })
  }

  /**
   * Autenticar cliente WebSocket
   */
  private async authenticateClient(socket: any): Promise<{ user: any } | null> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
      
      if (!token) {
        socket.emit('error', { message: 'Token não fornecido' })
        return null
      }

      const JWT_SECRET = process.env.JWT_SECRET
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET não configurado')
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any

      // Verificar se usuário existe e está ativo
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          municipalityId: true,
          isActive: true
        }
      })

      if (!user || !user.isActive) {
        socket.emit('error', { message: 'Usuário não autorizado' })
        return null
      }

      return { user }
    } catch (error) {
      console.error('Erro na autenticação WebSocket:', error)
      socket.emit('error', { message: 'Token inválido' })
      return null
    }
  }

  /**
   * Adicionar usuário às rooms apropriadas
   */
  private async joinUserRooms(socket: AuthenticatedSocket) {
    // Room global
    socket.join('global')
    
    // Room do município
    socket.join(`municipality:${socket.municipalityId}`)
    
    // Room do role
    socket.join(`role:${socket.role}`)
    
    // Room pessoal
    socket.join(`user:${socket.userId}`)
    
    // Rooms específicas para admin/supervisor
    if (['admin', 'supervisor', 'superuser'].includes(socket.role)) {
      socket.join('admin')
      socket.join('metrics')
      socket.join('alerts')
    }
  }

  /**
   * Configurar event handlers do socket
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket) {
    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // Join room específica
    socket.on('join:room', (room: string) => {
      if (this.canJoinRoom(socket, room)) {
        socket.join(room)
        socket.emit('joined:room', { room })
      }
    })

    // Leave room específica
    socket.on('leave:room', (room: string) => {
      socket.leave(room)
      socket.emit('left:room', { room })
    })

    // Solicitar métricas atuais
    socket.on('metrics:request', async () => {
      if (['admin', 'supervisor', 'superuser'].includes(socket.role)) {
        const summary = await metricsCollector.getMetricsSummary()
        if (summary) {
          socket.emit('metrics:update', summary)
        }
      }
    })

    // Solicitar alertas ativos
    socket.on('alerts:request', async () => {
      if (['admin', 'supervisor', 'superuser'].includes(socket.role)) {
        const alerts = await alertManager.getActiveAlerts()
        socket.emit('alerts:list', alerts)
      }
    })

    // Resolver alerta
    socket.on('alert:resolve', async (data: { alertId: string }) => {
      if (['admin', 'supervisor', 'superuser'].includes(socket.role)) {
        // Implementar resolução de alerta
        console.log(`Alerta ${data.alertId} resolvido por ${socket.email}`)
        this.broadcastToAdmins('alert:resolved', {
          alertId: data.alertId,
          resolvedBy: socket.email,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  /**
   * Verificar se usuário pode entrar em uma room
   */
  private canJoinRoom(socket: AuthenticatedSocket, room: string): boolean {
    // Rooms públicas
    if (['global', `municipality:${socket.municipalityId}`, `role:${socket.role}`, `user:${socket.userId}`].includes(room)) {
      return true
    }

    // Rooms de admin
    if (['admin', 'metrics', 'alerts'].includes(room)) {
      return ['admin', 'supervisor', 'superuser'].includes(socket.role)
    }

    return false
  }

  /**
   * Iniciar broadcast de métricas
   */
  private startMetricsBroadcast() {
    this.metricsInterval = setInterval(async () => {
      if (!this.io) return

      try {
        const summary = await metricsCollector.getMetricsSummary()
        if (summary) {
          this.io.to('metrics').emit('metrics:update', summary)
        }
      } catch (error) {
        console.error('Erro ao broadcast métricas:', error)
      }
    }, 10000) // A cada 10 segundos
  }

  /**
   * Iniciar heartbeat
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (!this.io) return

      this.io.emit('ping')
    }, 30000) // A cada 30 segundos
  }

  /**
   * Broadcast para todos os admins
   */
  broadcastToAdmins(event: string, data: any) {
    if (this.io) {
      this.io.to('admin').emit(event, data)
    }
  }

  /**
   * Broadcast para um município específico
   */
  broadcastToMunicipality(municipalityId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`municipality:${municipalityId}`).emit(event, data)
    }
  }

  /**
   * Broadcast para um usuário específico
   */
  broadcastToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data)
    }
  }

  /**
   * Broadcast global
   */
  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data)
    }
  }

  /**
   * Notificar criação de patrimônio
   */
  notifyPatrimonioCreated(patrimonio: any) {
    this.broadcastToMunicipality(patrimonio.municipalityId, 'data:patrimonio:created', {
      id: patrimonio.id,
      numero_patrimonio: patrimonio.numero_patrimonio,
      descricao_bem: patrimonio.descricao_bem,
      setor: patrimonio.sector?.name || 'N/A',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Notificar atualização de patrimônio
   */
  notifyPatrimonioUpdated(patrimonio: any, changes: any) {
    this.broadcastToMunicipality(patrimonio.municipalityId, 'data:patrimonio:updated', {
      id: patrimonio.id,
      numero_patrimonio: patrimonio.numero_patrimonio,
      changes,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Notificar deleção de patrimônio
   */
  notifyPatrimonioDeleted(patrimonio: any) {
    this.broadcastToMunicipality(patrimonio.municipalityId, 'data:patrimonio:deleted', {
      id: patrimonio.id,
      numero_patrimonio: patrimonio.numero_patrimonio,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Notificar novo alerta
   */
  notifyNewAlert(alert: any) {
    this.broadcastToAdmins('alert:new', {
      id: alert.id,
      alertId: alert.alertId,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.triggeredAt
    })
  }

  /**
   * Obter estatísticas de conexões
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      connectionsByRole: Array.from(this.connectedClients.values()).reduce((acc, client) => {
        acc[client.role] = (acc[client.role] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      connectedUsers: Array.from(this.connectedClients.values()).map(client => ({
        id: client.userId,
        email: client.email,
        role: client.role
      }))
    }
  }

  /**
   * Fechar conexões
   */
  close() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.io) {
      this.io.close()
    }
  }
}

// Instância singleton
export const webSocketManager = new WebSocketManager()

export default webSocketManager
