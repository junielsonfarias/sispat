import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export const useWebSocketNotifications = (
  onNotification?: (notification: WebSocketMessage) => void
) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!user || !token || socketRef.current?.connected) {
      return;
    }

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
        console.log('🔌 WebSocket conectado (notificações)');

        // Iniciar ping periódico
        pingIntervalRef.current = setInterval(() => {
          socketRef.current?.emit('ping');
        }, 30000); // Ping a cada 30 segundos
      });

      socketRef.current.on('disconnect', reason => {
        console.log('🔌 WebSocket desconectado (notificações):', reason);

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

        // Chamar callback se fornecido
        if (onNotification) {
          onNotification(data);
        }

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
        // Atualizar último ping se necessário
      });

      socketRef.current.on('error', error => {
        console.error('❌ Erro no WebSocket (notificações):', error);
        toast({
          title: 'Erro de Conexão',
          description: 'Problema na conexão com o servidor de notificações',
          variant: 'destructive',
        });
      });
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket (notificações):', error);
    }
  }, [user, token, onNotification]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Função para marcar notificação como lida
  const markNotificationRead = useCallback((notificationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark-notification-read', { notificationId });
    }
  }, []);

  // Função para buscar notificações
  const getNotifications = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('get-notifications');
    }
  }, []);

  // Conectar quando o componente montar
  useEffect(() => {
    connect();

    // Limpar na desmontagem
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    markNotificationRead,
    getNotifications,
    isConnected: socketRef.current?.connected || false,
  };
};
