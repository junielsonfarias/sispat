/**
 * Sistema de Cache Avançado do SISPAT
 * 
 * Este módulo integra todos os componentes do sistema de cache:
 * - Cache híbrido (Redis + Memória)
 * - Cache de relatórios
 * - Sistema de invalidação inteligente
 * - Pré-geração de relatórios
 * - Sistema de alertas
 */

// Exportar serviços principais
export { advancedCache } from './advancedCache';
export { cacheAlertSystem } from './cacheAlertSystem';
export { cacheInvalidationService } from './cacheInvalidationService';
export { redisClient } from './redisClient';
export { reportCache } from './reportCache';
export { reportPreGeneration } from './reportPreGeneration';

// Exportar middlewares
export {
    cacheClearMiddleware, cacheInvalidationMiddleware, cacheMiddleware, cacheStatsMiddleware,
    cacheWarmupMiddleware, dashboardCache, patrimonioCache, reportCache as reportCacheMiddleware, userCache
} from './cacheMiddleware';

export {
    aggregatedQueryCacheMiddleware, csvExportCacheMiddleware, dashboardCacheMiddleware, excelExportCacheMiddleware, pdfReportCacheMiddleware, reportCacheClearMiddleware, reportCacheMiddleware, reportCacheStatsMiddleware,
    reportPreGenerationMiddleware
} from './reportCacheMiddleware';

// Exportar hooks React
export {
    useAdvancedCache,
    useCacheInvalidation, useCacheMonitor, useCacheWarmup
} from '../hooks/useAdvancedCache';

export {
    useAggregatedQueryCache, useDashboardCache, useExportCache, usePdfReportCache, useReportPreGeneration
} from '../hooks/useReportCache';

// Exportar tipos
export type {
    CacheMetrics, CacheOptions,
    CacheStats
} from './advancedCache';

export type {
    DashboardData, ReportCacheOptions,
    ReportMetadata
} from './reportCache';

export type {
    CacheEvent, CacheInvalidationRule, InvalidationStats
} from './cacheInvalidationService';

export type {
    PreGenerationConfig,
    PreGenerationStats
} from './reportPreGeneration';

export type {
    AlertRule,
    AlertStats, CacheAlert
} from './cacheAlertSystem';

// Função de inicialização do sistema de cache
export async function initializeCacheSystem(): Promise<{
  success: boolean;
  message: string;
  services: {
    redis: boolean;
    invalidation: boolean;
    preGeneration: boolean;
    alerts: boolean;
  };
}> {
  const services = {
    redis: false,
    invalidation: false,
    preGeneration: false,
    alerts: false
  };

  try {
    console.log('🚀 Inicializando Sistema de Cache Avançado...');

    // 1. Conectar ao Redis
    try {
      const { redisClient: redis } = await import('./redisClient');
      await redis.connect();
      services.redis = true;
      console.log('✅ Redis conectado com sucesso');
    } catch (error) {
      console.warn('⚠️  Redis não disponível, usando apenas cache em memória:', error);
    }

    // 2. Inicializar sistema de invalidação
    try {
      const { cacheInvalidationService: invalidationService } = await import('./cacheInvalidationService');
      invalidationService.startMonitoring();
      services.invalidation = true;
      console.log('✅ Sistema de invalidação iniciado');
    } catch (error) {
      console.error('❌ Erro ao iniciar sistema de invalidação:', error);
    }

    // 3. Inicializar pré-geração de relatórios
    try {
      const { reportPreGeneration: preGeneration } = await import('./reportPreGeneration');
      preGeneration.start();
      services.preGeneration = true;
      console.log('✅ Sistema de pré-geração iniciado');
    } catch (error) {
      console.error('❌ Erro ao iniciar pré-geração:', error);
    }

    // 4. Inicializar sistema de alertas
    try {
      const { cacheAlertSystem: alertSystem } = await import('./cacheAlertSystem');
      alertSystem.startMonitoring();
      services.alerts = true;
      console.log('✅ Sistema de alertas iniciado');
    } catch (error) {
      console.error('❌ Erro ao iniciar sistema de alertas:', error);
    }

    const successfulServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    if (successfulServices === totalServices) {
      console.log('🎉 Sistema de Cache Avançado inicializado com sucesso!');
      return {
        success: true,
        message: 'Todos os serviços de cache foram inicializados com sucesso',
        services
      };
    } else {
      console.log(`⚠️  Sistema de Cache parcialmente inicializado (${successfulServices}/${totalServices} serviços)`);
      return {
        success: false,
        message: `Sistema parcialmente inicializado: ${successfulServices}/${totalServices} serviços ativos`,
        services
      };
    }

  } catch (error) {
    console.error('💥 Erro crítico na inicialização do sistema de cache:', error);
    return {
      success: false,
      message: `Erro crítico: ${error}`,
      services
    };
  }
}

// Função para parar todos os serviços de cache
export async function shutdownCacheSystem(): Promise<void> {
  console.log('🛑 Parando Sistema de Cache...');

  try {
    // Parar sistema de alertas
    const { cacheAlertSystem: alertSystem } = await import('./cacheAlertSystem');
    alertSystem.stopMonitoring();
    console.log('✅ Sistema de alertas parado');

    // Parar pré-geração
    const { reportPreGeneration: preGeneration } = await import('./reportPreGeneration');
    preGeneration.stop();
    console.log('✅ Sistema de pré-geração parado');

    // Parar sistema de invalidação
    const { cacheInvalidationService: invalidationService } = await import('./cacheInvalidationService');
    invalidationService.stopMonitoring();
    console.log('✅ Sistema de invalidação parado');

    // Desconectar Redis
    const { redisClient: redis } = await import('./redisClient');
    if (redis.isReady()) {
      await redis.disconnect();
      console.log('✅ Redis desconectado');
    }

    console.log('🎯 Sistema de Cache parado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao parar sistema de cache:', error);
  }
}

// Função para obter status geral do sistema
export async function getCacheSystemStatus(): Promise<{
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    redis: { status: 'online' | 'offline'; memory?: number };
    invalidation: { status: 'active' | 'inactive'; rules: number };
    preGeneration: { status: 'active' | 'inactive'; configs: number };
    alerts: { status: 'active' | 'inactive'; activeAlerts: number };
  };
  performance: {
    totalHitRate: number;
    redisHitRate: number;
    memoryHitRate: number;
  };
  alerts: number;
}> {
  try {
    // Status dos serviços
    const { redisClient: redis } = await import('./redisClient');
    const { cacheInvalidationService: invalidationService } = await import('./cacheInvalidationService');
    const { reportPreGeneration: preGeneration } = await import('./reportPreGeneration');
    const { cacheAlertSystem: alertSystem } = await import('./cacheAlertSystem');
    const { advancedCache } = await import('./advancedCache');
    
    const redisStatus = redis.isReady() ? 'online' : 'offline';
    const invalidationRules = invalidationService.getRules().length;
    const preGenConfigs = preGeneration.getConfigs().length;
    const activeAlerts = alertSystem.getActiveAlerts().length;

    // Performance
    const cacheStats = await advancedCache.getStats();

    // Determinar status geral
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (activeAlerts > 0) {
      const criticalAlerts = alertSystem.getAlertsBySeverity('critical');
      if (criticalAlerts.length > 0) {
        overall = 'critical';
      } else {
        overall = 'warning';
      }
    }

    if (cacheStats.total.hitRate < 0.5) {
      overall = 'critical';
    } else if (cacheStats.total.hitRate < 0.7) {
      overall = overall === 'critical' ? 'critical' : 'warning';
    }

    return {
      overall,
      services: {
        redis: {
          status: redisStatus,
          memory: redisStatus === 'online' ? cacheStats.redis.memoryUsage : undefined
        },
        invalidation: {
          status: invalidationRules > 0 ? 'active' : 'inactive',
          rules: invalidationRules
        },
        preGeneration: {
          status: preGenConfigs > 0 ? 'active' : 'inactive',
          configs: preGenConfigs
        },
        alerts: {
          status: activeAlerts >= 0 ? 'active' : 'inactive',
          activeAlerts
        }
      },
      performance: {
        totalHitRate: cacheStats.total.hitRate,
        redisHitRate: cacheStats.redis.hitRate,
        memoryHitRate: cacheStats.memory.hitRate
      },
      alerts: activeAlerts
    };

  } catch (error) {
    console.error('Erro ao obter status do sistema de cache:', error);
    return {
      overall: 'critical',
      services: {
        redis: { status: 'offline' },
        invalidation: { status: 'inactive', rules: 0 },
        preGeneration: { status: 'inactive', configs: 0 },
        alerts: { status: 'inactive', activeAlerts: 0 }
      },
      performance: {
        totalHitRate: 0,
        redisHitRate: 0,
        memoryHitRate: 0
      },
      alerts: 0
    };
  }
}

// Função de conveniência para operações comuns
export const cacheUtils = {
  // Invalidar cache relacionado a patrimônio
  async invalidatePatrimonio(patrimonioId?: string): Promise<number> {
    const { advancedCache } = await import('./advancedCache');
    const { cacheInvalidationService: invalidationService } = await import('./cacheInvalidationService');
    
    let totalInvalidated = 0;
    
    totalInvalidated += await advancedCache.invalidateByTags(['patrimonio', 'dashboard']);
    
    if (patrimonioId) {
      totalInvalidated += await advancedCache.invalidateByPattern(`patrimonio:${patrimonioId}:*`);
    }
    
    // Emitir evento para sistema de invalidação
    invalidationService.emitDataChange('patrimonio', 'update', patrimonioId || 'all');
    
    return totalInvalidated;
  },

  // Invalidar cache de usuário
  async invalidateUser(userId: string): Promise<number> {
    const { advancedCache } = await import('./advancedCache');
    const { cacheInvalidationService: invalidationService } = await import('./cacheInvalidationService');
    
    let totalInvalidated = 0;
    
    totalInvalidated += await advancedCache.invalidateByTags(['user']);
    totalInvalidated += await advancedCache.invalidateByPattern(`user:${userId}:*`);
    
    invalidationService.emitDataChange('usuarios', 'update', userId);
    
    return totalInvalidated;
  },

  // Aquecer cache principal
  async warmMainCache(): Promise<void> {
    const warmupConfigs = [
      {
        key: 'dashboard:main',
        fetcher: async () => {
          // Simular busca de dados do dashboard
          return {
            totalPatrimonio: 1250,
            patrimoniosPorCategoria: [],
            // ... outros dados
          };
        },
        options: { ttl: 300, tags: ['dashboard'] }
      }
    ];

    const { advancedCache } = await import('./advancedCache');
    await advancedCache.warmup(warmupConfigs);
  },

  // Limpeza de manutenção
  async maintenanceCleanup(): Promise<{ cleared: number; errors: string[] }> {
    const errors: string[] = [];
    let cleared = 0;

    try {
      // Limpar relatórios expirados
      const { reportCache } = await import('./reportCache');
      cleared += await reportCache.cleanupExpiredReports();
    } catch (error) {
      errors.push(`Erro na limpeza de relatórios: ${error}`);
    }

    try {
      // Limpar cache expirado
      const { advancedCache } = await import('./advancedCache');
      cleared += await advancedCache.invalidateByPattern('expired:*');
    } catch (error) {
      errors.push(`Erro na limpeza de cache expirado: ${error}`);
    }

    return { cleared, errors };
  }
};

// Configuração padrão para desenvolvimento
export const defaultCacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  defaultTTL: {
    short: 300,      // 5 minutos
    medium: 1800,    // 30 minutos
    long: 3600,      // 1 hora
    veryLong: 86400  // 24 horas
  },
  monitoring: {
    alertsEnabled: true,
    preGenerationEnabled: true,
    invalidationEnabled: true,
    metricsInterval: 30000 // 30 segundos
  }
};

export default {
  initializeCacheSystem,
  shutdownCacheSystem,
  getCacheSystemStatus,
  cacheUtils,
  defaultCacheConfig
};