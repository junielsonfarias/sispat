import { NextApiRequest, NextApiResponse } from 'next';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
  };
  metrics: {
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage: number;
    requestCount: number;
    errorCount: number;
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
  };
}

/**
 * Endpoint de Health Check Principal
 * GET /api/health
 *
 * Retorna o status geral da aplicação e suas dependências
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();

    // Verificar status dos serviços
    const [dbStatus, redisStatus, cacheStatus] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkCacheHealth(),
    ]);

    // Coletar métricas do sistema
    const metrics = await collectSystemMetrics();

    // Determinar status geral
    const services = {
      database: dbStatus.status === 'fulfilled' ? dbStatus.value : 'unhealthy',
      redis:
        redisStatus.status === 'fulfilled' ? redisStatus.value : 'unhealthy',
      cache:
        cacheStatus.status === 'fulfilled' ? cacheStatus.value : 'unhealthy',
    };

    const overallStatus = determineOverallStatus(services);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.VERSION || process.env.VCS_REF || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics,
    };

    // Definir código de status HTTP baseado na saúde
    const statusCode =
      overallStatus === 'healthy'
        ? 200
        : overallStatus === 'degraded'
          ? 200
          : 503;

    // Adicionar headers úteis
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Health-Check-Duration', `${Date.now() - startTime}ms`);
    res.setHeader('X-Health-Status', overallStatus);

    return res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);

    return res.status(503).json({
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
    } as any);
  }
}

/**
 * Verificar saúde do banco de dados
 */
async function checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Implementar verificação do Prisma/banco de dados
    // const { PrismaClient } = require('@prisma/client');
    // const prisma = new PrismaClient();
    // await prisma.$queryRaw`SELECT 1`;
    // await prisma.$disconnect();

    // Simulação para demonstração
    await new Promise(resolve => setTimeout(resolve, 10));
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Verificar saúde do Redis
 */
async function checkRedisHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Implementar verificação do Redis
    // const redis = require('redis');
    // const client = redis.createClient(process.env.REDIS_URL);
    // await client.ping();
    // await client.quit();

    // Simulação para demonstração
    if (process.env.REDIS_URL) {
      await new Promise(resolve => setTimeout(resolve, 5));
      return 'healthy';
    } else {
      return 'unhealthy';
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Verificar saúde do sistema de cache
 */
async function checkCacheHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Implementar verificação do sistema de cache avançado
    // const { advancedCache } = require('@/services/cache/advancedCache');
    // const stats = await advancedCache.getStats();
    // return stats.total.hitRate > 0 ? 'healthy' : 'unhealthy';

    // Simulação para demonstração
    await new Promise(resolve => setTimeout(resolve, 5));
    return 'healthy';
  } catch (error) {
    console.error('Cache health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Coletar métricas do sistema
 */
async function collectSystemMetrics() {
  const memoryUsage = process.memoryUsage();

  return {
    memoryUsage: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      ),
    },
    cpuUsage: Math.round(process.cpuUsage().user / 1000000), // Aproximação em %
    requestCount: getRequestCount(),
    errorCount: getErrorCount(),
    responseTime: {
      avg: getAverageResponseTime(),
      p95: getP95ResponseTime(),
      p99: getP99ResponseTime(),
    },
  };
}

/**
 * Determinar status geral baseado nos serviços
 */
function determineOverallStatus(
  services: Record<string, 'healthy' | 'unhealthy'>
): 'healthy' | 'unhealthy' | 'degraded' {
  const healthyServices = Object.values(services).filter(
    status => status === 'healthy'
  ).length;
  const totalServices = Object.values(services).length;

  if (healthyServices === totalServices) {
    return 'healthy';
  } else if (healthyServices === 0 || services.database === 'unhealthy') {
    // Se banco está down ou todos os serviços estão down
    return 'unhealthy';
  } else {
    // Alguns serviços estão down, mas banco está ok
    return 'degraded';
  }
}

// Funções auxiliares para métricas (implementar conforme necessário)
function getRequestCount(): number {
  // Implementar contador de requisições
  return Math.floor(Math.random() * 1000);
}

function getErrorCount(): number {
  // Implementar contador de erros
  return Math.floor(Math.random() * 10);
}

function getAverageResponseTime(): number {
  // Implementar cálculo de tempo médio de resposta
  return Math.floor(Math.random() * 100) + 50;
}

function getP95ResponseTime(): number {
  // Implementar cálculo do percentil 95
  return Math.floor(Math.random() * 200) + 100;
}

function getP99ResponseTime(): number {
  // Implementar cálculo do percentil 99
  return Math.floor(Math.random() * 500) + 200;
}
