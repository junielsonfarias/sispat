import WebSocket from 'ws';
import { performanceMonitor, recordCustomMetric } from './performanceMetrics';
import { systemMonitor } from './systemMetrics';

export interface MonitoringClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
}

export interface MetricUpdate {
  type: 'metric' | 'alert' | 'system' | 'health';
  data: any;
  timestamp: number;
}

// Classe para gerenciar WebSocket de monitoramento
export class MonitoringWebSocketServer {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, MonitoringClient> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 8080) {}

  // Inicializar servidor WebSocket
  public start(): void {
    this.wss = new WebSocket.Server({ port: this.port });

    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      const client: MonitoringClient = {
        id: clientId,
        ws,
        subscriptions: new Set(['metrics', 'alerts']), // Subscrições padrão
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);

      // Log de conexão
      console.log(`Cliente de monitoramento conectado: ${clientId}`);
      recordCustomMetric('websocket_connection', 1, { client_id: clientId });

      // Configurar handlers do cliente
      this.setupClientHandlers(client);

      // Enviar dados iniciais
      this.sendInitialData(client);
    });

    // Iniciar envio de atualizações periódicas
    this.startPeriodicUpdates();
    this.startHeartbeat();

    console.log(`Servidor WebSocket de monitoramento iniciado na porta ${this.port}`);
  }

  // Parar servidor
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('Servidor WebSocket de monitoramento parado');
  }

  // Configurar handlers para um cliente
  private setupClientHandlers(client: MonitoringClient): void {
    client.ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(client, data);
      } catch (error) {
        console.error('Erro ao processar mensagem do cliente:', error);
        this.sendError(client, 'Formato de mensagem inválido');
      }
    });

    client.ws.on('close', () => {
      console.log(`Cliente de monitoramento desconectado: ${client.id}`);
      recordCustomMetric('websocket_disconnection', 1, { client_id: client.id });
      this.clients.delete(client.id);
    });

    client.ws.on('error', (error) => {
      console.error(`Erro no WebSocket do cliente ${client.id}:`, error);
      recordCustomMetric('websocket_error', 1, { 
        client_id: client.id,
        error: error.message
      });
    });

    client.ws.on('pong', () => {
      client.lastPing = Date.now();
    });
  }

  // Processar mensagem do cliente
  private handleClientMessage(client: MonitoringClient, data: any): void {
    switch (data.type) {
      case 'subscribe':
        if (Array.isArray(data.channels)) {
          data.channels.forEach((channel: string) => {
            client.subscriptions.add(channel);
          });
          this.sendAck(client, 'Subscrições atualizadas');
        }
        break;

      case 'unsubscribe':
        if (Array.isArray(data.channels)) {
          data.channels.forEach((channel: string) => {
            client.subscriptions.delete(channel);
          });
          this.sendAck(client, 'Subscrições atualizadas');
        }
        break;

      case 'ping':
        this.sendMessage(client, { type: 'pong', timestamp: Date.now() });
        break;

      case 'get_current_metrics':
        this.sendCurrentMetrics(client);
        break;

      default:
        this.sendError(client, `Tipo de mensagem desconhecido: ${data.type}`);
    }
  }

  // Enviar dados iniciais para um cliente
  private async sendInitialData(client: MonitoringClient): Promise<void> {
    try {
      // Métricas atuais
      const apiMetrics = await performanceMonitor.getAPIMetrics();
      const databaseMetrics = await performanceMonitor.getDatabaseMetrics();
      const systemMetrics = await systemMonitor.collectSystemMetrics();

      this.sendMessage(client, {
        type: 'initial_data',
        data: {
          api: apiMetrics,
          database: databaseMetrics,
          system: systemMetrics,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Erro ao enviar dados iniciais:', error);
      this.sendError(client, 'Erro ao carregar dados iniciais');
    }
  }

  // Enviar métricas atuais
  private async sendCurrentMetrics(client: MonitoringClient): Promise<void> {
    try {
      const apiMetrics = await performanceMonitor.getAPIMetrics();
      const databaseMetrics = await performanceMonitor.getDatabaseMetrics();
      const systemMetrics = await systemMonitor.collectSystemMetrics();

      this.sendMessage(client, {
        type: 'current_metrics',
        data: {
          api: apiMetrics,
          database: databaseMetrics,
          system: systemMetrics,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Erro ao enviar métricas atuais:', error);
    }
  }

  // Iniciar atualizações periódicas
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      if (this.clients.size === 0) return;

      try {
        // Coletar métricas
        const apiMetrics = await performanceMonitor.getAPIMetrics();
        const databaseMetrics = await performanceMonitor.getDatabaseMetrics();
        const systemMetrics = await systemMonitor.collectSystemMetrics();
        const alerts = systemMonitor.checkSystemAlerts();

        // Enviar atualizações para clientes subscritos
        const metricsUpdate: MetricUpdate = {
          type: 'metric',
          data: {
            api: apiMetrics,
            database: databaseMetrics,
            system: systemMetrics
          },
          timestamp: Date.now()
        };

        this.broadcast('metrics', metricsUpdate);

        // Enviar alertas se houver
        if (alerts.length > 0) {
          const alertsUpdate: MetricUpdate = {
            type: 'alert',
            data: alerts,
            timestamp: Date.now()
          };

          this.broadcast('alerts', alertsUpdate);
        }

      } catch (error) {
        console.error('Erro nas atualizações periódicas:', error);
        recordCustomMetric('websocket_update_error', 1, {
          error: (error as Error).message
        });
      }
    }, 5000); // Atualizar a cada 5 segundos
  }

  // Iniciar heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 60000) { // 60 segundos sem resposta
          console.log(`Cliente ${clientId} não respondeu ao ping, desconectando...`);
          client.ws.terminate();
          this.clients.delete(clientId);
        } else {
          // Enviar ping
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          }
        }
      });
    }, 30000); // Ping a cada 30 segundos
  }

  // Broadcast para todos os clientes subscritos a um canal
  private broadcast(channel: string, data: any): void {
    this.clients.forEach(client => {
      if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client, data);
      }
    });
  }

  // Enviar mensagem para um cliente específico
  private sendMessage(client: MonitoringClient, data: any): void {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error(`Erro ao enviar mensagem para cliente ${client.id}:`, error);
    }
  }

  // Enviar confirmação
  private sendAck(client: MonitoringClient, message: string): void {
    this.sendMessage(client, {
      type: 'ack',
      message,
      timestamp: Date.now()
    });
  }

  // Enviar erro
  private sendError(client: MonitoringClient, message: string): void {
    this.sendMessage(client, {
      type: 'error',
      message,
      timestamp: Date.now()
    });
  }

  // Gerar ID único para cliente
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter estatísticas dos clientes conectados
  public getStats(): {
    connectedClients: number;
    totalConnections: number;
    subscriptions: Record<string, number>;
  } {
    const subscriptions: Record<string, number> = {};
    
    this.clients.forEach(client => {
      client.subscriptions.forEach(sub => {
        subscriptions[sub] = (subscriptions[sub] || 0) + 1;
      });
    });

    return {
      connectedClients: this.clients.size,
      totalConnections: this.clients.size, // Simplificado - em produção manteria histórico
      subscriptions
    };
  }
}

// Instância global do servidor WebSocket
export const monitoringWS = new MonitoringWebSocketServer();
