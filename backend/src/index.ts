import express, { Express, Request, Response, NextFunction } from 'express';
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
// ✅ Importar do arquivo dedicado para garantir que está atualizado
import './lib/prisma'; // Força o carregamento do módulo
const { prisma: prismaFromLib } = require('./lib/prisma');
export const prisma = prismaFromLib;

// Criar aplicação Express
const app: Express = express();

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

import authRoutes from './routes/authRoutes';
import publicRoutes from './routes/publicRoutes';
import patrimonioRoutes from './routes/patrimonioRoutes';
import imovelRoutes from './routes/imovelRoutes';
import inventarioRoutes from './routes/inventarioRoutes';
import tiposBensRoutes from './routes/tiposBensRoutes';
import formasAquisicaoRoutes from './routes/formasAquisicaoRoutes';
import locaisRoutes from './routes/locaisRoutes';
import sectorsRoutes from './routes/sectorsRoutes';
import userRoutes from './routes/userRoutes';
import customizationRoutes from './routes/customizationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import manutencaoRoutes from './routes/manutencaoRoutes';
import imovelFieldRoutes from './routes/imovelFieldRoutes';
import transferenciaRoutes from './routes/transferenciaRoutes';
import documentRoutes from './routes/documentRoutes';
import fichaTemplatesRoutes from './routes/fichaTemplates';

// ✅ Rotas públicas (sem autenticação)
app.use('/api/public', publicRoutes);

// Rotas autenticadas
app.use('/api/auth', authRoutes);
app.use('/api/patrimonios', patrimonioRoutes);
app.use('/api/imoveis', imovelRoutes);
app.use('/api/inventarios', inventarioRoutes);
app.use('/api/tipos-bens', tiposBensRoutes);
app.use('/api/formas-aquisicao', formasAquisicaoRoutes);
app.use('/api/locais', locaisRoutes);
app.use('/api/sectors', sectorsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/manutencoes', manutencaoRoutes);
app.use('/api/imovel-fields', imovelFieldRoutes);
app.use('/api/transferencias', transferenciaRoutes);
app.use('/api/documentos', documentRoutes);
app.use('/api/ficha-templates', fichaTemplatesRoutes);

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
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

// Função para iniciar o servidor
async function startServer() {
  await connectDatabase();
  
  app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log(`   SISPAT Backend API v2.1.0`);
    console.log('   ================================');
    console.log(`   🌐 Servidor rodando em: http://localhost:${PORT}`);
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

