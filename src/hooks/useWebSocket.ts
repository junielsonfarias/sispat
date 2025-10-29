/**
 * Hook para WebSocket em tempo real
 * 
 * Este hook gerencia a conexão WebSocket e fornece
 * funcionalidades de tempo real para o SISPAT 2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './useAuth'
import { toast } from '@/hooks/use-toast'

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

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastActivity: Date | null
}

interface WebSocketHook {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastActivity: Date | null
  emit: <K extends keyof WebSocketEvents>(event: K, data: WebSocketEvents[K]) => void
  on: <K extends keyof WebSocketEvents>(event: K, callback: (data: WebSocketEvents[K]) => void) => void
  off: <K extends keyof WebSocketEvents>(event: K, callback?: (data: WebSocketEvents[K]) => void) => void
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  requestMetrics: () => void
  requestAlerts: () => void
  resolveAlert: (alertId: string) => void
}

export const useWebSocket = (): WebSocketHook => {
  const { user, token } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastActivity: null
  })

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (!user || !token || socketRef.current?.connected) return

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      socketRef.current = socket

      // Event listeners
      socket.on('connect', () => {
        console.log('🔌 WebSocket conectado')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          lastActivity: new Date()
        }))
      })

      socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket desconectado:', reason)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          lastActivity: new Date()
        }))
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message
        }))
      })

      socket.on('error', (error) => {
        console.error('❌ Erro WebSocket:', error)
        setState(prev => ({
          ...prev,
          error: error.message,
          lastActivity: new Date()
        }))
      })

      // Heartbeat
      socket.on('ping', () => {
        socket.emit('pong')
        setState(prev => ({ ...prev, lastActivity: new Date() }))
      })

      socket.on('pong', () => {
        setState(prev => ({ ...prev, lastActivity: new Date() }))
      })

      // Notificações de alertas
      socket.on('alert:new', (data) => {
        const severityColors = {
          low: 'default',
          medium: 'warning',
          high: 'destructive',
          critical: 'destructive'
        } as const

        toast({
          title: `Alerta: ${data.alertId}`,
          description: data.message,
          variant: severityColors[data.severity]
        })
      })

      // Notificações de dados
      socket.on('data:patrimonio:created', (data) => {
        toast({
          title: 'Novo Patrimônio',
          description: `${data.numero_patrimonio} - ${data.descricao_bem}`,
          variant: 'default'
        })
      })

      socket.on('data:patrimonio:updated', (data) => {
        toast({
          title: 'Patrimônio Atualizado',
          description: `${data.numero_patrimonio} foi modificado`,
          variant: 'default'
        })
      })

      socket.on('data:patrimonio:deleted', (data) => {
        toast({
          title: 'Patrimônio Removido',
          description: `${data.numero_patrimonio} foi removido`,
          variant: 'destructive'
        })
      })

      // Notificações de transferências
      socket.on('data:transfer:created', (data) => {
        toast({
          title: 'Nova Transferência',
          description: `Transferência de ${data.from} para ${data.to}`,
          variant: 'default'
        })
      })

      socket.on('data:transfer:status_changed', (data) => {
        toast({
          title: 'Status de Transferência',
          description: `Transferência ${data.status}`,
          variant: data.status === 'aprovada' ? 'default' : 'warning'
        })
      })

      // Notificações do sistema
      socket.on('system:maintenance', (data) => {
        toast({
          title: 'Manutenção Programada',
          description: data.message,
          variant: 'warning'
        })
      })

      socket.on('system:update', (data) => {
        toast({
          title: 'Atualização do Sistema',
          description: data.message,
          variant: 'default'
        })
      })

    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error)
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }))
    }
  }, [user, token])

  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastActivity: null
    })
  }, [])

  // Conectar quando usuário estiver logado
  useEffect(() => {
    if (user && token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, token, connect, disconnect])

  // Auto-reconexão
  useEffect(() => {
    if (!state.isConnected && !state.isConnecting && user && token) {
      const timer = setTimeout(() => {
        connect()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [state.isConnected, state.isConnecting, user, token, connect])

  // Emitir evento
  const emit = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    data: WebSocketEvents[K]
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
      setState(prev => ({ ...prev, lastActivity: new Date() }))
    }
  }, [])

  // Escutar evento
  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: (data: WebSocketEvents[K]) => void
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  // Parar de escutar evento
  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback?: (data: WebSocketEvents[K]) => void
  ) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback)
      } else {
        socketRef.current.off(event)
      }
    }
  }, [])

  // Entrar em room
  const joinRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:room', room)
    }
  }, [])

  // Sair de room
  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:room', room)
    }
  }, [])

  // Solicitar métricas
  const requestMetrics = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('metrics:request')
    }
  }, [])

  // Solicitar alertas
  const requestAlerts = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('alerts:request')
    }
  }, [])

  // Resolver alerta
  const resolveAlert = useCallback((alertId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('alert:resolve', { alertId })
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastActivity: state.lastActivity,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    requestMetrics,
    requestAlerts,
    resolveAlert
  }
}

export default useWebSocket
