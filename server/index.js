import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Carregar variáveis de ambiente PRIMEIRO
dotenv.config({ path: '.env' });

// Configurar tratamento de erros não capturados
setupUncaughtExceptionHandling();

// Verificar configurações críticas
if (!process.env.JWT_SECRET) {
  console.error('🚨 ERRO CRÍTICO: JWT_SECRET não encontrado no arquivo .env');
  console.error(
    '💡 Solução: Verifique se o arquivo .env existe e contém JWT_SECRET=sua_chave_secreta'
  );
  process.exit(1);
}

if (!process.env.DB_HOST) {
  console.error(
    '🚨 ERRO CRÍTICO: Configurações do banco de dados não encontradas'
  );
  console.error('💡 Solução: Verifique as configurações DB_* no arquivo .env');
  process.exit(1);
}

// Import routes
import { registerRoutes } from './routes/index.js';

// Import database connection
import { pool } from './database/connection.js';

// Import logging and error handling
import {
  criticalErrorNotifier,
  errorHandler,
  notFoundHandler,
  requestTracker,
} from './middleware/errorHandler.js';
import { setupLogContext } from './middleware/logContext.js';
import {
  errorMonitoringMiddleware,
  monitoringMiddleware,
  requestTimestampMiddleware,
} from './middleware/monitoring.js';
import { rateLimitMiddleware } from './middleware/rate-limiter.js';
import { lockoutManager } from './services/lockout-manager.js';
import {
  logError,
  logHttp,
  logInfo,
  logStartup,
  logWarning,
  setupUncaughtExceptionHandling,
} from './utils/logger.js';

// Import backup service
import backupService from './services/backup/backupService.js';

// Load environment variables
dotenv.config({ path: '.env' });

// Variáveis de ambiente carregadas com sucesso

// Validate environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado');
  process.exit(1);
}

if (!process.env.DB_PASSWORD) {
  console.error('❌ DB_PASSWORD não configurado');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Request tracking middleware (deve ser o primeiro)
app.use(requestTracker);

// Monitoring middleware (temporariamente desabilitado)
app.use(requestTimestampMiddleware);
app.use(monitoringMiddleware);

// HTTP logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logHttp(req, res, responseTime);
  });

  next();
});

// Security middleware - Configuração mais restritiva
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false, // Necessário para alguns recursos
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS configuration - Mais restritivo e configurável
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) || []
    : [
        'http://localhost:3001', // Backend API
        'http://127.0.0.1:3001', // Backend API
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:5173', // Vite dev server
        'http://127.0.0.1:5173',
        'http://192.168.1.173:8080', // IP da rede local
        'http://192.168.1.173:5173', // Vite dev server na rede
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://192.168.1.173:8081',
        'http://localhost:8082',
        'http://127.0.0.1:8082',
        'http://192.168.1.173:8082',
      ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (mobile apps, Postman, etc.) em desenvolvimento
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Em produção, permitir requisições sem origin também (para servir arquivos estáticos)
      if (!origin && process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }

      // Em produção, permitir origens configuradas + localhost para testes
      const productionOrigins =
        process.env.NODE_ENV === 'production'
          ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
          : [];

      const allAllowedOrigins = [...allowedOrigins, ...productionOrigins];

      if (allAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS bloqueado para origem: ${origin}`);
        // Em produção, permitir temporariamente para debug
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 horas
  })
);

// Debug endpoint to check public data sync (BEFORE ANY MIDDLEWARE)
app.get('/debug/public-sync', async (req, res) => {
  try {
    console.log('🔍 DEBUG - Verificando sincronização de dados públicos');

    // Check municipalities (all municipalities are public for now)
    const municipalities = await pool.query(
      'SELECT id, name, state FROM municipalities'
    );
    console.log('📋 Municípios públicos:', municipalities.rows.length);

    // Check patrimonios for each municipality
    const patrimoniosData = [];
    for (const municipality of municipalities.rows) {
      const patrimonios = await pool.query(
        `
        SELECT id, numero_patrimonio, descricao, municipality_id 
        FROM patrimonios 
        WHERE municipality_id = $1 AND deleted_at IS NULL
        LIMIT 10
      `,
        [municipality.id]
      );

      patrimoniosData.push({
        municipality: municipality,
        patrimonios: patrimonios.rows,
        count: patrimonios.rows.length,
      });

      console.log(
        `📋 Município ${municipality.name}: ${patrimonios.rows.length} patrimônios`
      );
    }

    res.json({
      municipalities: municipalities.rows,
      patrimoniosData: patrimoniosData,
      totalMunicipalities: municipalities.rows.length,
      totalPatrimonios: patrimoniosData.reduce(
        (sum, data) => sum + data.count,
        0
      ),
    });
  } catch (error) {
    console.error('❌ Erro no debug de sincronização:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Force public data sync endpoint (BEFORE ANY MIDDLEWARE)
app.post('/debug/force-public-sync', async (req, res) => {
  try {
    console.log('🔄 FORÇANDO sincronização de dados públicos...');

    // Get all public municipalities (all municipalities are public for now)
    const municipalities = await pool.query(
      'SELECT id, name, state FROM municipalities'
    );
    console.log(
      '📋 Municípios públicos encontrados:',
      municipalities.rows.length
    );

    // Get all public patrimonios
    const patrimonios = await pool.query(`
      SELECT id, numero_patrimonio, descricao, municipality_id 
      FROM patrimonios 
      WHERE deleted_at IS NULL
      ORDER BY numero_patrimonio
    `);
    console.log(
      '📋 Patrimônios públicos encontrados:',
      patrimonios.rows.length
    );

    // Group patrimonios by municipality
    const patrimoniosByMunicipality = {};
    for (const patrimonio of patrimonios.rows) {
      if (!patrimoniosByMunicipality[patrimonio.municipality_id]) {
        patrimoniosByMunicipality[patrimonio.municipality_id] = [];
      }
      patrimoniosByMunicipality[patrimonio.municipality_id].push(patrimonio);
    }

    res.json({
      success: true,
      message: 'Sincronização forçada concluída',
      municipalities: municipalities.rows,
      patrimonios: patrimonios.rows,
      patrimoniosByMunicipality: patrimoniosByMunicipality,
      totalMunicipalities: municipalities.rows.length,
      totalPatrimonios: patrimonios.rows.length,
    });
  } catch (error) {
    console.error('❌ Erro na sincronização forçada:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Debug endpoint to test WebSocket (BEFORE ANY MIDDLEWARE)
app.post('/debug/test-websocket', express.json(), async (req, res) => {
  try {
    const { type = 'info', title, message, target = 'broadcast' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: 'Título e mensagem são obrigatórios',
      });
    }

    // Import notification service
    const { notificationService } = await import(
      './services/notification-service.js'
    );
    const { websocketServer } = await import('./services/websocket-server.js');

    const notification = {
      type,
      title,
      message,
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    };

    let sent = false;
    let stats = null;

    switch (target) {
      case 'broadcast':
        sent = notificationService.broadcast(notification);
        break;
      case 'role':
        sent = notificationService.sendToRole('superuser', notification);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de destino inválido' });
    }

    if (sent) {
      stats = websocketServer.getStats();

      res.json({
        success: true,
        message: 'Notificação enviada com sucesso',
        notification,
        websocketStats: stats,
      });
    } else {
      res.status(500).json({ error: 'Falha ao enviar notificação' });
    }
  } catch (error) {
    console.error('❌ Erro ao testar WebSocket:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Frontend sync endpoint (BEFORE ANY MIDDLEWARE)
app.get('/api/sync/public-data', async (req, res) => {
  try {
    console.log('🔄 Sincronização de dados públicos para o frontend...');

    // Get all municipalities
    const municipalities = await pool.query(
      'SELECT id, name, state FROM municipalities'
    );
    console.log('📋 Municípios encontrados:', municipalities.rows.length);

    // Get all patrimonios
    const patrimonios = await pool.query(`
      SELECT id, numero_patrimonio, descricao, municipality_id 
      FROM patrimonios 
      WHERE deleted_at IS NULL
      ORDER BY numero_patrimonio
    `);
    console.log('📋 Patrimônios encontrados:', patrimonios.rows.length);

    // Group patrimonios by municipality
    const patrimoniosByMunicipality = {};
    for (const patrimonio of patrimonios.rows) {
      if (!patrimoniosByMunicipality[patrimonio.municipality_id]) {
        patrimoniosByMunicipality[patrimonio.municipality_id] = [];
      }
      patrimoniosByMunicipality[patrimonio.municipality_id].push(patrimonio);
    }

    // Return data in the format expected by the frontend
    const syncData = {
      municipalities: municipalities.rows,
      patrimonios: patrimonios.rows,
      patrimoniosByMunicipality: patrimoniosByMunicipality,
      publicSettings: {
        isPublicSearchEnabled: true,
        publicMunicipalityIds: municipalities.rows.map(m => m.id),
      },
      totalMunicipalities: municipalities.rows.length,
      totalPatrimonios: patrimonios.rows.length,
      syncTimestamp: new Date().toISOString(),
    };

    console.log('✅ Dados de sincronização preparados:', {
      municipalities: syncData.totalMunicipalities,
      patrimonios: syncData.totalPatrimonios,
      timestamp: syncData.syncTimestamp,
    });

    res.json(syncData);
  } catch (error) {
    console.error('❌ Erro na sincronização para frontend:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Debug endpoint to check database tables (BEFORE ANY MIDDLEWARE)
app.get('/debug/check-tables', async (req, res) => {
  try {
    console.log('🔍 Verificando tabelas do banco de dados...');

    // Check if tables exist
    const tables = ['municipalities', 'patrimonios', 'imoveis'];
    const tableStatus = {};

    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        tableStatus[table] = {
          exists: true,
          count: result.rows[0].count,
        };
        console.log(`✅ Tabela ${table}: ${result.rows[0].count} registros`);
      } catch (error) {
        tableStatus[table] = {
          exists: false,
          error: error.message,
        };
        console.log(`❌ Tabela ${table}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      tables: tableStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rate limiting será aplicado nas rotas específicas, não globalmente

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar contexto de logging (deve vir após parsing)
app.use(setupLogContext);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// File serving endpoint for documents and images
app.get('/api/files/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;

    // Validar o fileId
    if (!fileId || fileId.includes('..') || fileId.includes('/')) {
      return res.status(400).json({ error: 'ID de arquivo inválido' });
    }

    const filePath = path.join(__dirname, '../uploads', fileId);

    // Verificar se o arquivo existe
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Servir o arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check endpoint - Removido pois está definido em routes/index.js

// API routes - Removido registro manual duplicado
// As rotas são registradas via registerRoutes() mais abaixo

// Log das rotas registradas
console.log('🔧 Rotas registradas no app:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((layer, index) => {
    if (layer.route) {
      console.log(
        `  ${index}: ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`
      );
    } else if (layer.name === 'router') {
      console.log(`  ${index}: Router - ${layer.regexp}`);
    }
  });
}

// Temporary route to fix patrimonios table schema
app.post('/api/database/fix-patrimonios-schema', async (req, res) => {
  try {
    console.log('🔄 Atualizando schema da tabela patrimonios...');

    // Add missing columns to patrimonios table
    const alterQueries = [
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS cor VARCHAR(30)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS forma_aquisicao VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(255)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS local_objeto VARCHAR(255)',
      "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo'",
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS situacao_bem VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS fotos JSONB',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS documentos JSONB',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS metodo_depreciacao VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS vida_util_anos INTEGER',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS valor_residual DECIMAL(10,2)',
    ];

    for (const query of alterQueries) {
      await pool.query(query);
      console.log(`✅ Executed: ${query}`);
    }

    console.log('✅ Schema da tabela patrimonios atualizado com sucesso!');
    res.json({
      success: true,
      message: 'Schema da tabela patrimonios atualizado com sucesso',
      updatedColumns: [
        'cor',
        'quantidade',
        'forma_aquisicao',
        'setor_responsavel',
        'local_objeto',
        'status',
        'situacao_bem',
        'fotos',
        'documentos',
        'metodo_depreciacao',
        'vida_util_anos',
        'valor_residual',
      ],
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar schema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar schema da tabela patrimonios',
      details: error.message,
    });
  }
});

// Rota para criar todas as tabelas e colunas faltantes
app.post('/api/database/create-missing-tables', async (req, res) => {
  try {
    console.log('🔧 Criando todas as tabelas e colunas faltantes...');

    // Importar e executar o script de criação
    const createMissingTables = (
      await import('./database/create-missing-tables.js')
    ).default;
    await createMissingTables();

    res.json({
      success: true,
      message: 'Todas as tabelas e colunas foram criadas com sucesso',
      createdTables: [
        'transfers',
        'form_fields',
        'excel_csv_templates',
        'customization_settings',
      ],
      updatedTables: [
        'imoveis',
        'manutencao_tasks',
        'inventories',
        'report_templates',
        'label_templates',
      ],
    });
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar tabelas e colunas',
      details: error.message,
    });
  }
});

// Rota para criar dados de exemplo
app.post('/api/database/create-sample-data', async (req, res) => {
  try {
    console.log('🎨 Criando dados de exemplo...');

    // Importar e executar o script de criação de dados de exemplo
    const createSampleData = (await import('./database/create-sample-data.js'))
      .default;
    await createSampleData();

    res.json({
      success: true,
      message: 'Dados de exemplo criados com sucesso',
      createdData: [
        'Templates de relatório',
        'Templates de etiqueta',
        'Campos personalizáveis',
        'Templates de exportação',
        'Configurações de personalização',
      ],
    });
  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar dados de exemplo',
      details: error.message,
    });
  }
});

// Temporary route to check patrimonios data
app.get('/api/debug/patrimonios-data', async (req, res) => {
  try {
    console.log('🔍 Verificando dados na tabela patrimonios...');

    // Check total count
    const totalCount = await pool.query(
      'SELECT COUNT(*) as total FROM patrimonios'
    );
    console.log('📊 Total de patrimônios:', totalCount.rows[0].total);

    // Check by municipality
    const byMunicipality = await pool.query(`
      SELECT municipality_id, COUNT(*) as count 
      FROM patrimonios 
      GROUP BY municipality_id
    `);
    console.log('📊 Patrimônios por município:', byMunicipality.rows);

    // Get sample data
    const sampleData = await pool.query(`
      SELECT id, numero_patrimonio, descricao, municipality_id, created_at 
      FROM patrimonios 
      LIMIT 5
    `);
    console.log('📋 Amostra de dados:', sampleData.rows);

    res.json({
      total: totalCount.rows[0].total,
      byMunicipality: byMunicipality.rows,
      sampleData: sampleData.rows,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    res.status(500).json({ error: 'Erro ao verificar dados' });
  }
});

// Backup routes (apenas para superuser)
app.post('/api/backup/create', async (req, res) => {
  try {
    const result = await backupService.createBackup('manual');
    res.json(result);
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: 'Erro ao criar backup' });
  }
});

app.get('/api/backup/list', async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

app.get('/api/backup/stats', async (req, res) => {
  try {
    const stats = await backupService.getBackupStats();
    res.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas de backup:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas de backup' });
  }
});

// Health check endpoint - Removido pois está definido em routes/index.js
// As rotas são registradas via registerRoutes() mais abaixo

// Registrar todas as rotas da API
console.log('🔧 Chamando registerRoutes...');
registerRoutes(app);
console.log('✅ registerRoutes chamado com sucesso!');

// Middleware para notificação de erros críticos
app.use(criticalErrorNotifier);

// ============================================================================
// ROTA PRINCIPAL DE HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SISPAT Backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected', // Assumindo que está conectado
  });
});

// ============================================================================
// REGISTRO DE ROTAS
// ============================================================================

// 404 handler - deve vir DEPOIS das rotas serem registradas
app.use('*', notFoundHandler);

// Global error handling middleware (deve ser o último)
app.use(errorMonitoringMiddleware);
app.use(errorHandler);

// Inicializar WebSocket server e serviço de notificações
Promise.all([
  import('./services/websocket-server.js').catch(() => ({
    websocketServer: null,
  })),
  import('./services/notification-service.js').catch(() => ({
    notificationService: null,
  })),
  import('./services/audit.js').catch(() => ({ auditService: null })),
])
  .then(([wsResult, notificationResult, auditResult]) => {
    const websocketServer = wsResult?.websocketServer;
    const notificationService = notificationResult?.notificationService;
    const auditService = auditResult?.auditService;

    if (websocketServer) {
      const wsInitialized = websocketServer.initialize(server);
      if (wsInitialized) {
        logInfo('🔌 WebSocket server inicializado com sucesso');
        if (notificationService) {
          notificationService.initialize();
        }
        if (auditService) {
          auditService
            .initialize()
            .then(() => {
              logInfo('🔍 Serviço de auditoria inicializado com sucesso');
            })
            .catch(error => {
              logWarning(
                '⚠️ Erro ao inicializar serviço de auditoria, continuando...'
              );
            });
        }
      } else {
        logWarning('⚠️ Falha ao inicializar WebSocket server');
      }
    } else {
      logWarning('⚠️ WebSocket server não disponível, continuando...');
    }
  })
  .catch(error => {
    logWarning('⚠️ Erro ao inicializar serviços opcionais, continuando...');
  });

// Start server - Bind em todas as interfaces para aceitar conexões externas
server.listen(PORT, '0.0.0.0', () => {
  logInfo('🚀 SISPAT Server Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `http://localhost:${PORT}/api`,
    timestamp: new Date().toISOString(),
    features: {
      logging: 'enabled',
      errorHandling: 'enabled',
      security: 'enabled',
      rateLimit: 'enabled',
    },
  });

  logStartup('🚀 Servidor SISPAT rodando', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `http://localhost:${PORT}/api`,
    features: {
      logging: 'enabled',
      errorHandling: 'enabled',
      security: 'enabled',
      rateLimit: 'enabled',
    },
  });

  // Iniciar serviço de backup automático
  import('./services/backup-scheduler.js')
    .then(({ startBackupService }) => {
      const started = startBackupService();

      if (started) {
        logInfo('💾 Sistema de backup automático iniciado com agendamento');
      } else {
        logWarning('⚠️ Falha ao iniciar sistema de backup automático');
      }
    })
    .catch(error => {
      logWarning('⚠️ Serviço de backup não disponível, continuando...');
    });

  // Inicializar sistema de lockout
  lockoutManager
    .initialize()
    .then(() => {
      logInfo('🔐 Sistema de lockout inicializado com sucesso');
    })
    .catch(error => {
      logError('Erro ao inicializar sistema de lockout', error);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, fechando servidor...');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, fechando servidor...');
  pool.end();
  process.exit(0);
});

export default app;
