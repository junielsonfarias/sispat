import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { validateEnvironment, showEnvironmentInfo } from './config/validate-env';

// Carregar variáveis de ambiente
dotenv.config();

// ✅ Validar variáveis de ambiente obrigatórias
validateEnvironment();
showEnvironmentInfo();

// Inicializar Prisma Client
// ✅ Importar do arquivo de configuração otimizado
console.log('📦 Carregando configuração do banco de dados...');
import { prisma, testDatabaseConnection } from './config/database';
console.log('✅ Configuração do banco carregada');

// Inicializar Redis
console.log('📦 Carregando configuração do Redis...');
import { initializeRedis } from './config/redis';
const redis = initializeRedis();
console.log('✅ Configuração do Redis carregada');

// Inicializar sistemas de monitoramento
console.log('📦 Carregando sistema de métricas...');
import { metricsCollector } from './config/metrics';
console.log('✅ Sistema de métricas carregado');

console.log('📦 Carregando sistema de alertas...');
import { alertManager } from './config/alerts';
console.log('✅ Sistema de alertas carregado');

console.log('📦 Carregando sistema WebSocket...');
import { webSocketManager } from './config/websocket';
console.log('✅ Sistema WebSocket carregado');

// Exportar prisma para outros módulos
export { prisma };

// Criar aplicação Express
console.log('🚀 Criando aplicação Express...');
const app: Express = express();
console.log('✅ Aplicação Express criada');

// ✅ Inicializar Sentry ANTES de qualquer outro middleware
// TEMPORARIAMENTE DESABILITADO PARA BUILD
// import { initSentry, getSentryErrorHandler } from './config/sentry';
// initSentry(app);

// ✅ Trust proxy para rate limiting funcionar corretamente atrás do Nginx
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Helmet para segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
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
// TEMPORARIAMENTE DESABILITADO PARA DEBUG
// import { healthMonitorMiddleware } from './utils/health-monitor';
// app.use(healthMonitorMiddleware);

// Rate limiting global (proteção contra abuso)
// TEMPORARIAMENTE DESABILITADO PARA DEBUG
// import { globalRateLimiter } from './middlewares/advanced-rate-limit';
// app.use(globalRateLimiter);

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

console.log('🛣️  Carregando rotas...');

// Carregar rotas principais
import publicRoutes from './routes/publicRoutes';
console.log('✅ publicRoutes carregada');

import authRoutes from './routes/authRoutes';
console.log('✅ authRoutes carregada');

import userRoutes from './routes/userRoutes';
console.log('✅ userRoutes carregada');

import sectorsRoutes from './routes/sectorsRoutes';
console.log('✅ sectorsRoutes carregada');

import patrimonioRoutes from './routes/patrimonioRoutes';
console.log('✅ patrimonioRoutes carregada');

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

console.log('✅ Rotas carregadas');

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
    console.log('🔌 Conectando ao banco de dados PostgreSQL...');
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      console.log('✅ Conectado ao banco de dados PostgreSQL');
    } else {
      throw new Error('Falha no teste de conexão');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
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
  
  httpServer.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log(`   SISPAT Backend API v2.1.0`);
    console.log('   ================================');
    console.log(`   🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`   🔌 WebSocket ativo em: ws://localhost:${PORT}`);
    console.log(`   🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`   📚 API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`   🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('   ================================\n');
    
    // ⭐ v2.1.0: Iniciar health monitoring
    // TEMPORARIAMENTE DESABILITADO PARA DEBUG
    // import('./utils/health-monitor').then(({ healthMonitor }) => {
    //   if (process.env.ENABLE_HEALTH_MONITOR !== 'false') {
    //     healthMonitor.start()
    //     console.log('   📊 Health monitoring ativo')
    //   }
    // }).catch(err => console.error('❌ Erro ao iniciar health monitor:', err))
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar
startServer().catch((error) => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
});

export default app;

