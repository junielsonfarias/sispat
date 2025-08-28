import express, { Application, Request, Response } from 'express';
import { databaseMonitor, monitoredQuery } from './databaseMonitoring';
import {
    apiPerformanceMiddleware,
    corsWithMetrics,
    errorTrackingMiddleware,
    healthCheckMiddleware,
    performanceMiddleware,
    slowQueryMiddleware
} from './middleware';
import { getPrometheusMetrics } from './performanceMetrics';
import { systemMonitor } from './systemMetrics';
import { monitoringWS } from './websocket';

// Interface para configuração do monitoramento
export interface MonitoringConfig {
  enableWebSocket: boolean;
  webSocketPort: number;
  enablePrometheusMetrics: boolean;
  slowQueryThreshold: number;
  enableSystemMetrics: boolean;
  enableDatabaseMonitoring: boolean;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  enableWebSocket: true,
  webSocketPort: 8080,
  enablePrometheusMetrics: true,
  slowQueryThreshold: 1000,
  enableSystemMetrics: true,
  enableDatabaseMonitoring: true
};

// Classe para integrar monitoramento com Express
export class ExpressMonitoringIntegration {
  private app: Application;
  private config: MonitoringConfig;

  constructor(app: Application, config: Partial<MonitoringConfig> = {}) {
    this.app = app;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Configurar todos os middlewares de monitoramento
  public setupMonitoring(): void {
    console.log('🔧 Configurando monitoramento de performance...');

    // CORS com métricas (deve ser primeiro)
    if (this.config.enablePrometheusMetrics) {
      this.app.use(corsWithMetrics());
    }

    // Health check (deve ser antes do middleware de performance)
    this.app.use(healthCheckMiddleware());

    // Middleware de performance principal
    this.app.use(performanceMiddleware());

    // Middleware específico para APIs
    this.app.use('/api', apiPerformanceMiddleware());

    // Middleware para queries lentas
    if (this.config.enableDatabaseMonitoring) {
      this.app.use(slowQueryMiddleware(this.config.slowQueryThreshold));
    }

    // Configurar endpoints de métricas
    this.setupMetricsEndpoints();

    // Configurar WebSocket se habilitado
    if (this.config.enableWebSocket) {
      this.setupWebSocket();
    }

    // Middleware de erro (deve ser último)
    this.app.use(errorTrackingMiddleware());

    console.log('✅ Monitoramento de performance configurado com sucesso!');
  }

  // Configurar endpoints de métricas
  private setupMetricsEndpoints(): void {
    // Endpoint para métricas do Prometheus
    if (this.config.enablePrometheusMetrics) {
      this.app.get('/metrics', async (req: Request, res: Response) => {
        try {
          const metrics = await getPrometheusMetrics();
          res.set('Content-Type', 'text/plain');
          res.send(metrics);
        } catch (error) {
          console.error('Erro ao obter métricas do Prometheus:', error);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      });
    }

    // Endpoint para métricas de banco de dados
    if (this.config.enableDatabaseMonitoring) {
      this.app.get('/api/monitoring/database', async (req: Request, res: Response) => {
        try {
          const metrics = await databaseMonitor.getDatabaseMetrics();
          const slowQueries = databaseMonitor.getSlowQueries(10);
          const tableStats = databaseMonitor.getTableStats();
          const alerts = databaseMonitor.getActiveAlerts();

          res.json({
            metrics,
            slowQueries,
            tableStats,
            alerts,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Erro ao obter métricas do banco:', error);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      });
    }

    // Endpoint para métricas do sistema
    if (this.config.enableSystemMetrics) {
      this.app.get('/api/monitoring/system', async (req: Request, res: Response) => {
        try {
          const metrics = await systemMonitor.collectSystemMetrics();
          const systemInfo = systemMonitor.getSystemInfo();
          const alerts = systemMonitor.checkSystemAlerts();

          res.json({
            metrics,
            systemInfo,
            alerts,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Erro ao obter métricas do sistema:', error);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      });
    }

    // Endpoint para métricas combinadas
    this.app.get('/api/monitoring/dashboard', async (req: Request, res: Response) => {
      try {
        const [databaseMetrics, systemMetrics] = await Promise.all([
          this.config.enableDatabaseMonitoring ? databaseMonitor.getDatabaseMetrics() : null,
          this.config.enableSystemMetrics ? systemMonitor.collectSystemMetrics() : null
        ]);

        const alerts = [
          ...(this.config.enableDatabaseMonitoring ? databaseMonitor.getActiveAlerts() : []),
          ...(this.config.enableSystemMetrics ? systemMonitor.checkSystemAlerts() : [])
        ];

        res.json({
          database: databaseMetrics,
          system: systemMetrics,
          alerts,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Erro ao obter métricas do dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });

    console.log('📊 Endpoints de métricas configurados');
  }

  // Configurar servidor WebSocket
  private setupWebSocket(): void {
    try {
      monitoringWS.start();
      console.log(`🔌 Servidor WebSocket iniciado na porta ${this.config.webSocketPort}`);
    } catch (error) {
      console.error('Erro ao iniciar WebSocket:', error);
    }
  }

  // Parar monitoramento
  public stop(): void {
    if (this.config.enableWebSocket) {
      monitoringWS.stop();
    }
    console.log('🛑 Monitoramento parado');
  }
}

// Função helper para monitorar queries de banco facilmente
export function createDatabaseWrapper(db: any) {
  return {
    // Wrapper para query simples
    async query(sql: string, params: any[] = []): Promise<any> {
      return monitoredQuery(
        sql,
        () => db.query(sql, params),
        params,
        `conn_${Date.now()}`
      );
    },

    // Wrapper para transações
    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
      const client = await db.connect();
      const connectionId = `tx_${Date.now()}`;
      
      try {
        await monitoredQuery(
          'BEGIN',
          () => client.query('BEGIN'),
          [],
          connectionId
        );

        const wrappedClient = {
          query: async (sql: string, params: any[] = []) => {
            return monitoredQuery(sql, () => client.query(sql, params), params, connectionId);
          }
        };

        const result = await callback(wrappedClient);

        await monitoredQuery(
          'COMMIT',
          () => client.query('COMMIT'),
          [],
          connectionId
        );

        return result;
      } catch (error) {
        await monitoredQuery(
          'ROLLBACK',
          () => client.query('ROLLBACK'),
          [],
          connectionId
        );
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

// Exemplo de uso com diferentes ORMs/bibliotecas de banco

// Exemplo com pg (node-postgres)
export function setupPostgreSQLMonitoring(pool: any) {
  const originalQuery = pool.query.bind(pool);
  
  pool.query = async function(text: string, params?: any[]) {
    return monitoredQuery(
      text,
      () => originalQuery(text, params),
      params,
      `pool_${Date.now()}`
    );
  };

  console.log('🐘 Monitoramento PostgreSQL configurado');
}

// Exemplo com Prisma
export function setupPrismaMonitoring(prisma: any) {
  // Interceptar queries do Prisma usando middleware
  if (prisma.$use) {
    prisma.$use(async (params: any, next: any) => {
      const query = `${params.model}.${params.action}`;
      
      return monitoredQuery(
        query,
        () => next(params),
        [JSON.stringify(params.args)],
        `prisma_${Date.now()}`
      );
    });

    console.log('🔷 Monitoramento Prisma configurado');
  }
}

// Exemplo com Sequelize
export function setupSequelizeMonitoring(sequelize: any) {
  sequelize.addHook('beforeQuery', (options: any) => {
    options._startTime = Date.now();
  });

  sequelize.addHook('afterQuery', (options: any, query: any) => {
    const duration = Date.now() - options._startTime;
    
    // Simular monitoramento (Sequelize já tem hooks próprios)
    if (duration > 1000) {
      console.warn(`Slow Sequelize query: ${duration}ms`, {
        sql: options.sql,
        bind: options.bind
      });
    }
  });

  console.log('🔶 Monitoramento Sequelize configurado');
}

// Função para configuração completa de uma aplicação Express
export function setupCompleteMonitoring(
  app: Application, 
  config: Partial<MonitoringConfig> = {}
): ExpressMonitoringIntegration {
  const monitoring = new ExpressMonitoringIntegration(app, config);
  monitoring.setupMonitoring();
  
  // Configurar graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, parando monitoramento...');
    monitoring.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Recebido SIGINT, parando monitoramento...');
    monitoring.stop();
    process.exit(0);
  });

  return monitoring;
}

// Exemplo de uso completo
export function exampleUsage() {
  const app = express();
  
  // Configurar monitoramento
  const monitoring = setupCompleteMonitoring(app, {
    enableWebSocket: true,
    webSocketPort: 8080,
    slowQueryThreshold: 500,
    enableDatabaseMonitoring: true
  });

  // Exemplo de rota com monitoramento
  app.get('/api/patrimonio', async (req: Request, res: Response) => {
    try {
      // Esta query será automaticamente monitorada
      const result = await monitoredQuery(
        'SELECT * FROM patrimonio WHERE status = $1 ORDER BY data_aquisicao DESC LIMIT $2',
        async () => {
          // Simular query ao banco
          return { rows: [], rowCount: 0 };
        },
        ['ATIVO', 10]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Métricas disponíveis em http://localhost:${PORT}/metrics`);
    console.log(`🔌 WebSocket de monitoramento na porta 8080`);
  });

  return { app, monitoring };
}
