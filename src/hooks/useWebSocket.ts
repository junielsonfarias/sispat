import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface WebSocketStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastPing?: Date;
  connectionTime?: Date;
}

export const useWebSocket = () => {
  const { user, token } = useAuth();

  // Tentar obter o contexto de notificações de forma segura
  const notificationsContext = useNotifications();
  const addNotification = notificationsContext?.addNotification;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<WebSocketStatus>({
    isConnected: false,
    isConnecting: false,
  });

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!user || !token || socketRef.current?.connected) {
      return;
    }

    setStatus(prev => ({ ...prev, isConnecting: true }));

    try {
      // Criar conexão WebSocket
      socketRef.current = io(
        import.meta.env.VITE_API_URL || 'https://sispat.vps-kinghost.net',
        {
          auth: {
            token,
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          maxReconnectionAttempts: 5,
        }
      );

      // Event listeners
      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket conectado');
        setStatus({
          isConnected: true,
          isConnecting: false,
          connectionTime: new Date(),
        });

        // Iniciar ping periódico
        pingIntervalRef.current = setInterval(() => {
          socketRef.current?.emit('ping');
        }, 30000); // Ping a cada 30 segundos
      });

      socketRef.current.on('disconnect', reason => {
        console.log('🔌 WebSocket desconectado:', reason);
        setStatus(prev => ({ ...prev, isConnected: false }));

        // Limpar intervalos
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Tentar reconectar se não foi uma desconexão intencional
        if (reason !== 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      });

      socketRef.current.on('notification', (data: WebSocketMessage) => {
        console.log('📢 Nova notificação recebida:', data);

        // Adicionar notificação ao contexto usando optional chaining
        addNotification?.({
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          userId: user?.id || '',
          data: data.data,
        });

        // Mostrar toast para notificações importantes
        if (data.type === 'alert' || data.type === 'warning') {
          toast({
            title: data.title,
            description: data.message,
            variant: data.type === 'alert' ? 'destructive' : 'default',
          });
        }
      });

      socketRef.current.on('pong', data => {
        setStatus(prev => ({ ...prev, lastPing: new Date() }));
      });

      socketRef.current.on('error', error => {
        console.error('❌ Erro no WebSocket:', error);
        toast({
          title: 'Erro de Conexão',
          description: 'Problema na conexão com o servidor de notificações',
          variant: 'destructive',
        });
      });

      socketRef.current.on('connected', data => {
        console.log('✅ WebSocket autenticado:', data);
      });
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      setStatus(prev => ({ ...prev, isConnecting: false }));
    }
  }, [user, token, addNotification]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Limpar timeouts e intervalos
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    setStatus({
      isConnected: false,
      isConnecting: false,
    });
  }, []);

  // Função para enviar mensagem
  const sendMessage = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  // Função para entrar em sala
  const joinRoom = useCallback(
    (room: string) => {
      return sendMessage('join-room', room);
    },
    [sendMessage]
  );

  // Função para sair de sala
  const leaveRoom = useCallback(
    (room: string) => {
      return sendMessage('leave-room', room);
    },
    [sendMessage]
  );

  // Função para marcar notificação como lida
  const markNotificationRead = useCallback(
    (notificationId: string) => {
      return sendMessage('mark-notification-read', notificationId);
    },
    [sendMessage]
  );

  // Função para buscar notificações
  const getNotifications = useCallback(() => {
    return sendMessage('get-notifications');
  }, [sendMessage]);

  // Conectar quando o usuário estiver autenticado
  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup na desmontagem
    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  // Cleanup quando o componente for desmontado
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Cleanup adicional para intervalos e timeouts
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    leaveRoom,
    markNotificationRead,
    getNotifications,
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
  };
};
