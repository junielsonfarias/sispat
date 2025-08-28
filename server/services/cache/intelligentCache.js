import NodeCache from 'node-cache';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Sistema de Cache Inteligente em Camadas
 * - Cache em memória (rápido)
 * - Cache distribuído (Redis - quando disponível)
 * - Cache de queries (otimização de banco)
 */
class IntelligentCacheManager {
  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 60, // Verificar a cada 1 minuto
      maxKeys: 1000
    });

    this.queryCache = new NodeCache({
      stdTTL: 600, // 10 minutos para queries
      checkperiod: 120,
      maxKeys: 500
    });

    this.accessPatterns = new Map();
    this.hotKeys = new Set();
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      // Aquecer cache com dados frequentemente acessados
      await this.warmup();
      logInfo('Sistema de cache inteligente inicializado');
    } catch (error) {
      logError('Erro ao inicializar cache inteligente:', error);
    }
  }

  /**
   * Aquecimento inteligente do cache
   */
  async warmup() {
    const warmupData = [
      {
        key: 'dashboard_metrics',
        fetcher: () => this.fetchDashboardMetrics(),
        ttl: 300
      },
      {
        key: 'public_patrimonios',
        fetcher: () => this.fetchPublicPatrimonios(),
        ttl: 600
      },
      {
        key: 'system_config',
        fetcher: () => this.fetchSystemConfig(),
        ttl: 1800
      }
    ];

    const promises = warmupData.map(async ({ key, fetcher, ttl }) => {
      try {
        const exists = await this.exists(key);
        if (!exists) {
          const value = await fetcher();
          await this.set(key, value, { ttl });
          logInfo(`Cache aquecido: ${key}`);
        }
      } catch (error) {
        logError(`Erro ao aquecer cache para ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Estratégia de cache inteligente baseada em padrões de acesso
   */
  async get(key, options = {}) {
    const { useQueryCache = false, fallback = null } = options;
    
    try {
      // Registrar padrão de acesso
      this.recordAccessPattern(key);

      // Tentar cache em memória primeiro
      let value = this.memoryCache.get(key);
      
      if (value !== undefined) {
        this.markAsHot(key);
        return value;
      }

      // Tentar cache de queries se aplicável
      if (useQueryCache) {
        value = this.queryCache.get(key);
        if (value !== undefined) {
          this.memoryCache.set(key, value, 60); // Cache por 1 minuto
          return value;
        }
      }

      return fallback;
    } catch (error) {
      logError(`Erro ao buscar cache para ${key}:`, error);
      return fallback;
    }
  }

  /**
   * Armazenar no cache com estratégia inteligente
   */
  async set(key, value, options = {}) {
    const { ttl = 300, useQueryCache = false, priority = 'normal' } = options;

    try {
      // Cache em memória
      this.memoryCache.set(key, value, ttl);

      // Cache de queries para dados de banco
      if (useQueryCache) {
        this.queryCache.set(key, value, ttl * 2); // TTL maior para queries
      }

      // Ajustar TTL baseado na prioridade
      if (priority === 'high') {
        this.memoryCache.set(key, value, ttl * 2);
        this.hotKeys.add(key);
      }

      logInfo(`Cache armazenado: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logError(`Erro ao armazenar cache para ${key}:`, error);
    }
  }

  /**
   * Invalidação inteligente baseada em padrões
   */
  async invalidate(pattern) {
    try {
      const keys = this.memoryCache.keys();
      const queryKeys = this.queryCache.keys();
      
      const allKeys = [...keys, ...queryKeys];
      const matchingKeys = allKeys.filter(key => 
        key.includes(pattern) || key.match(new RegExp(pattern, 'i'))
      );

      matchingKeys.forEach(key => {
        this.memoryCache.del(key);
        this.queryCache.del(key);
        this.hotKeys.delete(key);
      });

      logInfo(`Cache invalidado: ${matchingKeys.length} chaves para padrão "${pattern}"`);
      return matchingKeys.length;
    } catch (error) {
      logError(`Erro ao invalidar cache para padrão "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Verificar se chave existe
   */
  async exists(key) {
    return this.memoryCache.has(key) || this.queryCache.has(key);
  }

  /**
   * Registrar padrão de acesso para otimização
   */
  recordAccessPattern(key) {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || { count: 0, lastAccess: 0 };
    
    pattern.count++;
    pattern.lastAccess = now;
    
    this.accessPatterns.set(key, pattern);

    // Marcar como hot se acessado frequentemente
    if (pattern.count > 10) {
      this.markAsHot(key);
    }
  }

  /**
   * Marcar chave como frequentemente acessada
   */
  markAsHot(key) {
    this.hotKeys.add(key);
    
    // Aumentar TTL para chaves hot
    const value = this.memoryCache.get(key);
    if (value !== undefined) {
      this.memoryCache.set(key, value, 1800); // 30 minutos para chaves hot
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    return {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: this.memoryCache.getStats().hits,
        misses: this.memoryCache.getStats().misses,
        hitRate: this.memoryCache.getStats().hits / (this.memoryCache.getStats().hits + this.memoryCache.getStats().misses)
      },
      query: {
        keys: this.queryCache.keys().length,
        hits: this.queryCache.getStats().hits,
        misses: this.queryCache.getStats().misses,
        hitRate: this.queryCache.getStats().hits / (this.queryCache.getStats().hits + this.queryCache.getStats().misses)
      },
      hotKeys: this.hotKeys.size,
      accessPatterns: this.accessPatterns.size
    };
  }

  /**
   * Limpeza inteligente baseada em padrões de uso
   */
  async cleanup() {
    try {
      const now = Date.now();
      const coldThreshold = 3600000; // 1 hora

      // Remover chaves frias
      for (const [key, pattern] of this.accessPatterns.entries()) {
        if (now - pattern.lastAccess > coldThreshold && pattern.count < 5) {
          this.memoryCache.del(key);
          this.queryCache.del(key);
          this.hotKeys.delete(key);
          this.accessPatterns.delete(key);
        }
      }

      logInfo('Limpeza de cache inteligente concluída');
    } catch (error) {
      logError('Erro na limpeza de cache:', error);
    }
  }

  // Métodos auxiliares para dados específicos
  async fetchDashboardMetrics() {
    // Implementar busca de métricas do dashboard
    return { totalPatrimonios: 0, totalValue: 0, depreciationRate: 0 };
  }

  async fetchPublicPatrimonios() {
    // Implementar busca de patrimônios públicos
    return [];
  }

  async fetchSystemConfig() {
    // Implementar busca de configurações do sistema
    return {};
  }
}

// Instância singleton
const intelligentCache = new IntelligentCacheManager();

// Limpeza automática a cada 30 minutos
setInterval(() => {
  intelligentCache.cleanup();
}, 30 * 60 * 1000);

export default intelligentCache;
