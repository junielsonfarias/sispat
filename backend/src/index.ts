import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { validateEnvironment, showEnvironmentInfo } from './config/validate-env';

// Carregar variáveis de ambiente
dotenv.config();

// ✅ Validar variáveis de ambiente obrigatórias
validateEnvironment();
showEnvironmentInfo();

// Inicializar Prisma Client
// ✅ Logs reduzidos em produção para melhor performance e segurança
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error']  // Apenas erros em produção
    : ['query', 'info', 'warn', 'error'],  // Todos em desenvolvimento
});

// Criar aplicação Express
const app: Express = express();

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

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rota principal
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SISPAT API v1.0.0',
    documentation: '/api-docs',
    health: '/health',
  });
});

// ============================================
// MIDDLEWARES CUSTOMIZADOS
// ============================================

import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFound } from './middlewares/errorHandler';

// Logger de requisições
app.use(requestLogger);

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
// TODO: Importar outras rotas quando criadas
// import dashboardRoutes from './routes/dashboardRoutes';

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
// app.use('/api/dashboard', dashboardRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// 404 - Rota não encontrada
app.use(notFound);

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
    console.log(`   SISPAT Backend API`);
    console.log('   ================================');
    console.log(`   🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`   🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`   🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('   ================================\n');
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

