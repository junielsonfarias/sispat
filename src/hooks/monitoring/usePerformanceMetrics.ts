import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIMetrics,
  DatabaseMetrics,
  SystemMetrics,
} from '../../services/monitoring/performanceMetrics';

export interface PerformanceData {
  api: APIMetrics;
  database: DatabaseMetrics;
  system: SystemMetrics;
  timestamp: number;
}

export interface Alert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export interface UsePerformanceMetricsOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  channels?: string[];
}

export interface UsePerformanceMetricsReturn {
  data: PerformanceData | null;
  alerts: Alert[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  refreshMetrics: () => void;
}

const DEFAULT_OPTIONS: Required<UsePerformanceMetricsOptions> = {
  autoConnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  channels: ['metrics', 'alerts'],
};

export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions = {}
): UsePerformanceMetricsReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [data, setData] = useState<PerformanceData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Já conectado
    }

    setIsLoading(true);
    setError(null);

    try {
      // Em produção, use a URL correta do seu servidor
      const wsUrl =
        process.env.NODE_ENV === 'production'
          ? 'wss://your-domain.com:8080'
          : 'ws://localhost:8080';

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Conectado ao WebSocket de monitoramento');
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        reconnectAttempts.current = 0;

        // Subscrever aos canais padrão
        if (opts.channels.length > 0) {
          subscribe(opts.channels);
        }
      };

      ws.current.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Erro ao processar mensagem WebSocket:', err);
          setError('Erro ao processar dados do servidor');
        }
      };

      ws.current.onclose = event => {
        console.log('Conexão WebSocket fechada:', event.code, event.reason);
        setIsConnected(false);
        setIsLoading(false);

        // Tentar reconectar se não foi fechamento manual
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < opts.maxReconnectAttempts
        ) {
          scheduleReconnect();
        }
      };

      ws.current.onerror = event => {
        console.error('Erro no WebSocket:', event);
        setError('Erro de conexão com o servidor de monitoramento');
        setIsLoading(false);
      };
    } catch (err) {
      console.error('Erro ao conectar WebSocket:', err);
      setError('Falha ao conectar com o servidor de monitoramento');
      setIsLoading(false);
    }
  }, [opts.channels, opts.maxReconnectAttempts]);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Desconexão manual');
      ws.current = null;
    }

    setIsConnected(false);
    setData(null);
    setAlerts([]);
    setError(null);
  }, []);

  // Agendar reconexão
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    reconnectAttempts.current++;
    const delay =
      opts.reconnectInterval *
      Math.pow(2, Math.min(reconnectAttempts.current - 1, 3));

    console.log(
      `Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts.current}/${opts.maxReconnectAttempts})`
    );

    reconnectTimeout.current = setTimeout(() => {
      if (reconnectAttempts.current <= opts.maxReconnectAttempts) {
        connect();
      } else {
        setError('Máximo de tentativas de reconexão atingido');
      }
    }, delay);
  }, [connect, opts.reconnectInterval, opts.maxReconnectAttempts]);

  // Processar mensagens do WebSocket
  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'initial_data':
      case 'current_metrics':
        if (message.data) {
          setData({
            api: message.data.api || {
              requestsPerSecond: 0,
              averageResponseTime: 0,
              errorRate: 0,
              activeRequests: 0,
              totalRequests: 0,
            },
            database: message.data.database || {
              averageQueryTime: 0,
              slowQueries: 0,
              activeConnections: 0,
              totalQueries: 0,
            },
            system: message.data.system || {
              cpuUsage: 0,
              memoryUsage: 0,
              memoryTotal: 0,
              diskUsage: 0,
              uptime: 0,
            },
            timestamp: message.timestamp || Date.now(),
          });
        }
        break;

      case 'metric':
        if (message.data) {
          setData(prevData => ({
            api: message.data.api ||
              prevData?.api || {
                requestsPerSecond: 0,
                averageResponseTime: 0,
                errorRate: 0,
                activeRequests: 0,
                totalRequests: 0,
              },
            database: message.data.database ||
              prevData?.database || {
                averageQueryTime: 0,
                slowQueries: 0,
                activeConnections: 0,
                totalQueries: 0,
              },
            system: message.data.system ||
              prevData?.system || {
                cpuUsage: 0,
                memoryUsage: 0,
                memoryTotal: 0,
                diskUsage: 0,
                uptime: 0,
              },
            timestamp: message.timestamp || Date.now(),
          }));
        }
        break;

      case 'alert':
        if (Array.isArray(message.data)) {
          setAlerts(message.data);
        }
        break;

      case 'error':
        console.error('Erro do servidor:', message.message);
        setError(message.message);
        break;

      case 'pong':
        // Resposta ao ping, conexão está ativa
        break;

      default:
        console.log('Mensagem desconhecida:', message);
    }
  }, []);

  // Subscrever a canais
  const subscribe = useCallback((channels: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'subscribe',
          channels,
        })
      );
    }
  }, []);

  // Desinscrever de canais
  const unsubscribe = useCallback((channels: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'unsubscribe',
          channels,
        })
      );
    }
  }, []);

  // Atualizar métricas manualmente
  const refreshMetrics = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'get_current_metrics',
        })
      );
    }
  }, []);

  // Efeito para conexão automática
  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, opts.autoConnect]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  return {
    data,
    alerts,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    refreshMetrics,
  };
}
