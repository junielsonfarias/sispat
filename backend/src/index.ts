import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { validateEnvironment, showEnvironmentInfo } from './config/validate-env';
import { logInfo, logError } from './config/logger';

// Carregar variáveis de ambiente
dotenv.config();

// ✅ Validar variáveis de ambiente obrigatórias
validateEnvironment();
showEnvironmentInfo();

// Inicializar Prisma Client
// ✅ Importar do arquivo de configuração otimizado
logInfo('📦 Carregando configuração do banco de dados...');
import { prisma, testDatabaseConnection } from './config/database';
logInfo('✅ Configuração do banco carregada');

// Inicializar Redis
logInfo('📦 Carregando configuração do Redis...');
import { initializeRedis } from './config/redis';
const redis = initializeRedis();
logInfo('✅ Configuração do Redis carregada');

// Inicializar sistemas de monitoramento
logInfo('📦 Carregando sistema de métricas...');
import { metricsCollector } from './config/metrics';
logInfo('✅ Sistema de métricas carregado');

logInfo('📦 Carregando sistema de alertas...');
import { alertManager } from './config/alerts';
logInfo('✅ Sistema de alertas carregado');

logInfo('📦 Carregando sistema WebSocket...');
import { webSocketManager } from './config/websocket';
logInfo('✅ Sistema WebSocket carregado');

// Exportar prisma para outros módulos
export { prisma };

// Criar aplicação Express
logInfo('🚀 Criando aplicação Express...');
const app: Express = express();
logInfo('✅ Aplicação Express criada');

// ✅ Inicializar Sentry ANTES de qualquer outro middleware
// TEMPORARIAMENTE DESABILITADO PARA BUILD
// import { initSentry, getSentryErrorHandler } from './config/sentry';
// initSentry(app);

// ✅ Trust proxy para rate limiting funcionar corretamente atrás do Nginx
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3000;

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Helmet para segurança
// ✅ CSP sempre habilitado (pode ser ajustado via variável de ambiente)
const isProduction = process.env.NODE_ENV === 'production';
const disableCSP = process.env.DISABLE_CSP === 'true'; // Opção para desabilitar se necessário

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: !disableCSP ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Necessário para estilos inline do React/Vite
      scriptSrc: isProduction 
        ? ["'self'"] // Em produção, sem unsafe-inline/unsafe-eval
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Em dev, necessário para Vite
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Para imagens e uploads
      connectSrc: ["'self'", "ws:", "wss:", process.env.FRONTEND_URL || "http://localhost:8080"], // Para WebSocket e API calls
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
      workerSrc: ["'self'", "blob:"], // Para Service Workers
    },
  } : false,
}));

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser
// ✅ Limite reduzido para melhor segurança e performance
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';
app.use(express.json({ limit: MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================
// ROTAS
// ============================================

// ============================================
// MIDDLEWARES CUSTOMIZADOS
// ============================================

import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { captureIP } from './middlewares/ipTracking';

// ✅ v2.0.7: Capturar IP do cliente para auditoria
app.use(captureIP);

// Logger de requisições
app.use(requestLogger);

// ============================================
// v2.1.0: ALTA DISPONIBILIDADE - MIDDLEWARES
// ============================================

// Health monitoring (tracking de requests e métricas)
// ✅ Habilitar em produção ou quando explicitamente habilitado
import { healthMonitorMiddleware, healthMonitor } from './utils/health-monitor';

if (isProduction || process.env.ENABLE_HEALTH_MONITOR === 'true') {
  app.use(healthMonitorMiddleware);
  logInfo('✅ Health monitoring middleware habilitado');
} else {
  logInfo('ℹ️  Health monitoring desabilitado em desenvolvimento');
}

// Rate limiting global (proteção contra abuso)
// ✅ Habilitar apenas em produção ou quando explicitamente habilitado
import { globalRateLimiter, writeRateLimiter } from './middlewares/advanced-rate-limit';

if (isProduction || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use(globalRateLimiter);
  // Aplicar rate limiting para operações de escrita em rotas específicas
  app.use('/api/patrimonios', writeRateLimiter);
  app.use('/api/imoveis', writeRateLimiter);
  app.use('/api/transfers', writeRateLimiter);
  logInfo('✅ Rate limiting habilitado');
} else {
  logInfo('ℹ️  Rate limiting desabilitado em desenvolvimento');
}

// ============================================
// MIDDLEWARES DE CACHE
// ============================================

import { 
  cacheStatsMiddleware, 
  cacheClearMiddleware,
  patrimoniosCacheMiddleware,
  imoveisCacheMiddleware,
  transferenciasCacheMiddleware,
  documentosCacheMiddleware,
  dashboardCacheMiddleware,
  cacheInvalidationMiddleware
} from './middlewares/cache';

// Middlewares de estatísticas e limpeza de cache
app.use(cacheStatsMiddleware());
app.use(cacheClearMiddleware());

// ============================================
// ROTAS DE SAÚDE (antes das rotas principais)
// ============================================

import healthRoutes from './routes/healthRoutes';
app.use('/api/health', healthRoutes);

// ============================================
// DOCUMENTAÇÃO DA API (SWAGGER)
// ============================================

import { setupSwagger } from './config/swagger';
setupSwagger(app);

// Rota principal
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SISPAT API v2.1.0',
    documentation: '/api-docs',
    openapi: '/api-docs.json',
    health: '/api/health',
    healthDetailed: '/api/health/detailed',
    ready: '/api/health/ready',
    live: '/api/health/live',
  });
});

// ============================================
// IMPORTAR E USAR ROTAS
// ============================================

logInfo('🛣️  Carregando rotas...');

// Carregar rotas principais
import publicRoutes from './routes/publicRoutes';
logInfo('✅ publicRoutes carregada');

import authRoutes from './routes/authRoutes';
logInfo('✅ authRoutes carregada');

import userRoutes from './routes/userRoutes';
logInfo('✅ userRoutes carregada');

import sectorsRoutes from './routes/sectorsRoutes';
logInfo('✅ sectorsRoutes carregada');

import patrimonioRoutes from './routes/patrimonioRoutes';
logInfo('✅ patrimonioRoutes carregada');

// Comentar rotas secundárias temporariamente
import emailConfigRoutes from './routes/emailConfigRoutes';
import imovelRoutes from './routes/imovelRoutes';
import inventarioRoutes from './routes/inventarioRoutes';
import tiposBensRoutes from './routes/tiposBensRoutes';
import formasAquisicaoRoutes from './routes/formasAquisicaoRoutes';
import locaisRoutes from './routes/locaisRoutes';
import customizationRoutes from './routes/customizationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import manutencaoRoutes from './routes/manutencaoRoutes';
import imovelFieldRoutes from './routes/imovelFieldRoutes';
import transferRoutes from './routes/transferRoutes';
import documentRoutes from './routes/documentRoutes';
import fichaTemplatesRoutes from './routes/fichaTemplates';
import labelTemplateRoutes from './routes/labelTemplateRoutes';
import configRoutes from './routes/configRoutes';
import systemConfigRoutes from './routes/systemConfigRoutes';
import notificationRoutes from './routes/notificationRoutes';

logInfo('✅ Rotas carregadas');

// ✅ Rotas públicas (sem autenticação)
app.use('/api/public', publicRoutes);

// Rotas autenticadas - Principais
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sectors', sectorsRoutes);

// Aplicar cache específico para patrimônios
app.use('/api/patrimonios', patrimoniosCacheMiddleware(), patrimonioRoutes);

// Rotas secundárias - HABILITADAS
app.use('/api/email-config', emailConfigRoutes);

// Aplicar cache específico para imóveis
app.use('/api/imoveis', imoveisCacheMiddleware(), imovelRoutes);

app.use('/api/inventarios', inventarioRoutes);
app.use('/api/tipos-bens', tiposBensRoutes);
app.use('/api/formas-aquisicao', formasAquisicaoRoutes);
app.use('/api/locais', locaisRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/manutencoes', manutencaoRoutes);
app.use('/api/imovel-fields', imovelFieldRoutes);

// Aplicar cache específico para transferências e documentos
app.use('/api/transfers', transferenciasCacheMiddleware(), transferRoutes);
app.use('/api/documents', documentosCacheMiddleware(), documentRoutes);
app.use('/api/ficha-templates', fichaTemplatesRoutes);
app.use('/api/label-templates', labelTemplateRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system-configuration', systemConfigRoutes);
app.use('/api/notifications', notificationRoutes);

// Rotas de métricas e monitoramento
import metricsRoutes from './routes/metricsRoutes';
app.use('/api/metrics', metricsRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// 404 - Rota não encontrada
app.use(notFound);

// Sentry error handler (ANTES do error handler global)
// TEMPORARIAMENTE DESABILITADO PARA BUILD
// app.use(getSentryErrorHandler());

// Error handler global
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================

// Função para conectar ao banco
async function connectDatabase() {
  try {
    logInfo('🔌 Conectando ao banco de dados PostgreSQL...');
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      logInfo('✅ Conectado ao banco de dados PostgreSQL');
    } else {
      throw new Error('Falha no teste de conexão');
    }
  } catch (error) {
    logError('❌ Erro ao conectar ao banco de dados', error);
    process.exit(1);
  }
}

// Função para iniciar o servidor
async function startServer() {
  await connectDatabase();
  
  // Criar servidor HTTP
  const httpServer = createServer(app);
  
  // Inicializar WebSocket
  webSocketManager.initialize(httpServer);
  
  // Escutar em 0.0.0.0 para permitir conexões do Nginx
  const HOST = process.env.HOST || '0.0.0.0';
  
  httpServer.listen(Number(PORT), HOST, () => {
    logInfo('\n🚀 ================================');
    logInfo(`   SISPAT Backend API v2.1.0`);
    logInfo('   ================================');
    logInfo(`   🌐 Servidor rodando em: http://${HOST}:${PORT}`);
    logInfo(`   🔌 WebSocket ativo em: ws://${HOST}:${PORT}`);
    logInfo(`   🏥 Health check: http://${HOST}:${PORT}/api/health`);
    logInfo(`   📚 API Docs: http://${HOST}:${PORT}/api-docs`);
    logInfo(`   🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logInfo('   ================================\n');
    
    // ⭐ v2.1.0: Iniciar health monitoring
    // ✅ Habilitar em produção ou quando explicitamente habilitado
    if (isProduction || process.env.ENABLE_HEALTH_MONITOR === 'true') {
      try {
        healthMonitor.start();
        logInfo('   📊 Health monitoring ativo');
      } catch (err) {
        logError('❌ Erro ao iniciar health monitor', err);
      }
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logInfo('\n👋 Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('\n👋 Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar
startServer().catch((error) => {
  logError('❌ Erro ao iniciar servidor', error);
  process.exit(1);
});

export default app;

