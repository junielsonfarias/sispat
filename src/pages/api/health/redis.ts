import { NextApiRequest, NextApiResponse } from 'next';

interface RedisHealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  redis: {
    connected: boolean;
    responseTime: number;
    version: string | null;
    mode: 'standalone' | 'cluster' | 'sentinel' | null;
    role: 'master' | 'slave' | null;
  };
  memory: {
    used: number; // bytes
    peak: number; // bytes
    fragmentation: number; // ratio
    evictedKeys: number;
  };
  performance: {
    commandsProcessed: number;
    connectionsReceived: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRate: number; // percentage
  };
  persistence: {
    lastSave: string | null;
    changesSinceLastSave: number;
    aofEnabled: boolean;
  };
}

/**
 * Endpoint específico para Health Check do Redis
 * GET /api/health/redis
 * 
 * Retorna informações detalhadas sobre a saúde do Redis
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RedisHealthStatus | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Verificar se Redis está configurado
    if (!process.env.REDIS_URL) {
      return res.status(503).json({
        error: 'Redis not configured',
        details: 'REDIS_URL environment variable not set',
        timestamp: new Date().toISOString()
      } as any);
    }

    // Verificar conexão básica
    const connectionStatus = await checkRedisConnection();
    
    if (!connectionStatus.connected) {
      return res.status(503).json({
        error: 'Redis connection failed',
        details: connectionStatus.error,
        timestamp: new Date().toISOString()
      } as any);
    }

    // Coletar informações detalhadas
    const [serverInfo, memoryInfo, statsInfo, persistenceInfo] = await Promise.allSettled([
      getRedisServerInfo(),
      getRedisMemoryInfo(),
      getRedisStatsInfo(),
      getRedisPersistenceInfo()
    ]);

    const responseTime = Date.now() - startTime;

    const healthStatus: RedisHealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: true,
        responseTime,
        version: serverInfo.status === 'fulfilled' ? serverInfo.value.version : null,
        mode: serverInfo.status === 'fulfilled' ? serverInfo.value.mode : null,
        role: serverInfo.status === 'fulfilled' ? serverInfo.value.role : null
      },
      memory: memoryInfo.status === 'fulfilled' ? memoryInfo.value : {
        used: 0,
        peak: 0,
        fragmentation: 0,
        evictedKeys: 0
      },
      performance: statsInfo.status === 'fulfilled' ? statsInfo.value : {
        commandsProcessed: 0,
        connectionsReceived: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        hitRate: 0
      },
      persistence: persistenceInfo.status === 'fulfilled' ? persistenceInfo.value : {
        lastSave: null,
        changesSinceLastSave: 0,
        aofEnabled: false
      }
    };

    // Determinar status baseado nas métricas
    if (healthStatus.memory.fragmentation > 2.0 || 
        healthStatus.performance.hitRate < 50) {
      healthStatus.status = 'unhealthy';
    }

    // Adicionar headers úteis
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Redis-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Redis-Status', healthStatus.status);

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Redis health check error:', error);
    
    return res.status(503).json({
      error: 'Redis health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as any);
  }
}

/**
 * Verificar conexão básica com Redis
 */
async function checkRedisConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    // Implementar verificação com cliente Redis
    // const redis = require('redis');
    // const client = redis.createClient({
    //   url: process.env.REDIS_URL,
    //   socket: {
    //     connectTimeout: 5000,
    //     commandTimeout: 3000
    //   }
    // });
    
    // await client.connect();
    // const pong = await client.ping();
    // await client.quit();
    
    // if (pong !== 'PONG') {
    //   throw new Error('Invalid ping response');
    // }
    
    // Simulação para demonstração
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return { connected: true };
  } catch (error) {
    console.error('Redis connection failed:', error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * Obter informações do servidor Redis
 */
async function getRedisServerInfo(): Promise<{
  version: string;
  mode: 'standalone' | 'cluster' | 'sentinel';
  role: 'master' | 'slave';
}> {
  try {
    // Implementar comando INFO server
    // const redis = require('redis');
    // const client = redis.createClient({ url: process.env.REDIS_URL });
    // await client.connect();
    // const info = await client.info('server');
    // await client.quit();
    
    // Parse das informações do servidor
    // const lines = info.split('\r\n');
    // const serverInfo = {};
    // lines.forEach(line => {
    //   if (line.includes(':')) {
    //     const [key, value] = line.split(':');
    //     serverInfo[key] = value;
    //   }
    // });
    
    // Simulação para demonstração
    return {
      version: '7.2.3',
      mode: 'standalone',
      role: 'master'
    };
  } catch (error) { // eslint-disable-line no-unreachable
    console.error('Failed to get Redis server info:', error);
    throw error;
  }
}

/**
 * Obter informações de memória do Redis
 */
async function getRedisMemoryInfo(): Promise<{
  used: number;
  peak: number;
  fragmentation: number;
  evictedKeys: number;
}> {
  try {
    // Implementar comando INFO memory
    // const redis = require('redis');
    // const client = redis.createClient({ url: process.env.REDIS_URL });
    // await client.connect();
    // const info = await client.info('memory');
    // await client.quit();
    
    // Parse das informações de memória
    // const memoryInfo = parseRedisInfo(info);
    
    // Simulação para demonstração
    const usedMemory = Math.floor(Math.random() * 100) * 1024 * 1024; // MB em bytes
    const peakMemory = usedMemory * 1.2;
    
    return {
      used: usedMemory,
      peak: peakMemory,
      fragmentation: 1.1 + Math.random() * 0.5, // 1.1 - 1.6
      evictedKeys: Math.floor(Math.random() * 100)
    };
  } catch (error) {
    console.error('Failed to get Redis memory info:', error);
    throw error;
  }
}

/**
 * Obter estatísticas de performance do Redis
 */
async function getRedisStatsInfo(): Promise<{
  commandsProcessed: number;
  connectionsReceived: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  hitRate: number;
}> {
  try {
    // Implementar comando INFO stats
    // const redis = require('redis');
    // const client = redis.createClient({ url: process.env.REDIS_URL });
    // await client.connect();
    // const info = await client.info('stats');
    // await client.quit();
    
    // Parse das estatísticas
    // const statsInfo = parseRedisInfo(info);
    
    // Simulação para demonstração
    const keyspaceHits = Math.floor(Math.random() * 10000) + 5000;
    const keyspaceMisses = Math.floor(Math.random() * 1000) + 100;
    const hitRate = (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100;
    
    return {
      commandsProcessed: Math.floor(Math.random() * 100000) + 50000,
      connectionsReceived: Math.floor(Math.random() * 1000) + 500,
      keyspaceHits,
      keyspaceMisses,
      hitRate: Math.round(hitRate * 100) / 100 // 2 casas decimais
    };
  } catch (error) {
    console.error('Failed to get Redis stats info:', error);
    throw error;
  }
}

/**
 * Obter informações de persistência do Redis
 */
async function getRedisPersistenceInfo(): Promise<{
  lastSave: string | null;
  changesSinceLastSave: number;
  aofEnabled: boolean;
}> {
  try {
    // Implementar comandos de persistência
    // const redis = require('redis');
    // const client = redis.createClient({ url: process.env.REDIS_URL });
    // await client.connect();
    
    // const lastSaveTime = await client.lastSave();
    // const info = await client.info('persistence');
    // 
    // await client.quit();
    
    // Parse das informações de persistência
    // const persistenceInfo = parseRedisInfo(info);
    
    // Simulação para demonstração
    const lastSaveTime = new Date(Date.now() - Math.random() * 3600000); // última hora
    
    return {
      lastSave: lastSaveTime.toISOString(),
      changesSinceLastSave: Math.floor(Math.random() * 100),
      aofEnabled: true
    };
  } catch (error) {
    console.error('Failed to get Redis persistence info:', error);
    throw error;
  }
}

/**
 * Função auxiliar para parsear saída do comando INFO do Redis
 */
function parseRedisInfo(info: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = info.split('\r\n');
  
  lines.forEach(line => {
    if (line.includes(':') && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      // Tentar converter para número se possível
      const numValue = Number(value);
      result[key] = isNaN(numValue) ? value : numValue;
    }
  });
  
  return result;
}
