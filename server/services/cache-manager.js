/**
 * Cache Manager - Sistema avançado de cache com Redis
 */

import {
  logError,
  logInfo,
  logPerformance,
  logWarning,
} from '../utils/logger.js';
import { redisClient } from './redis-client.js';

class CacheManager {
  constructor() {
    this.isRedisAvailable = false;
    this.memoryCache = new Map();
    this.memoryTTL = new Map();
    this.maxMemoryItems = 1000;

    // Configurações de TTL por tipo de dados (em segundos)
    this.ttlConfig = {
      // Dados estáticos ou que mudam raramente
      municipalities: 24 * 60 * 60, // 24 horas
      sectors: 12 * 60 * 60, // 12 horas
      users: 5 * 60, // 5 minutos

      // Dados dinâmicos
      patrimonios: 2 * 60, // 2 minutos
      imoveis: 2 * 60, // 2 minutos

      // Sessões e autenticação
      sessions: 30 * 60, // 30 minutos
      auth_tokens: 60 * 60, // 1 hora

      // Consultas específicas
      reports: 10 * 60, // 10 minutos
      analytics: 5 * 60, // 5 minutos

      // Dados de configuração
      settings: 60 * 60, // 1 hora
      permissions: 15 * 60, // 15 minutos

      // Dados temporários
      temp: 5 * 60, // 5 minutos
      locks: 30, // 30 segundos
    };

    this.initialize();
  }

  async initialize() {
    try {
      // Verificar se o redisClient existe e está disponível
      if (
        redisClient &&
        typeof redisClient.isOpen === 'function' &&
        redisClient.isOpen()
      ) {
        this.isRedisAvailable = true;
        logInfo('Cache Manager inicializado com Redis');
      } else {
        this.isRedisAvailable = false;
        logWarning('Redis não disponível, usando cache em memória');
      }

      // Limpar cache expirado na memória a cada 5 minutos
      setInterval(() => this.cleanMemoryCache(), 5 * 60 * 1000);

      // Estatísticas de cache
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
      };
    } catch (error) {
      this.isRedisAvailable = false;
      logError('Erro ao inicializar Cache Manager', error);

      // Garantir que as estatísticas existam mesmo com erro
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
      };
    }
  }

  /**
   * Gerar chave de cache padronizada
   */
  generateKey(type, identifier, userId = null, municipalityId = null) {
    const parts = ['sispat', type];

    if (municipalityId) parts.push(`mun:${municipalityId}`);
    if (userId) parts.push(`user:${userId}`);
    if (identifier) parts.push(identifier);

    return parts.join(':');
  }

  /**
   * Obter dados do cache
   */
  async get(key) {
    const startTime = Date.now();

    try {
      let value = null;

      if (
        this.isRedisAvailable &&
        redisClient &&
        typeof redisClient.get === 'function'
      ) {
        try {
          value = await redisClient.get(key);
          if (value) {
            value = JSON.parse(value);
          }
        } catch (redisError) {
          logError(`Erro no Redis ao buscar cache: ${key}`, redisError);
          // Fallback para cache em memória
          this.isRedisAvailable = false;
        }
      }

      // Se Redis falhou ou não está disponível, usar cache em memória
      if (!value && !this.isRedisAvailable) {
        if (this.memoryCache.has(key)) {
          const ttl = this.memoryTTL.get(key);
          if (ttl && ttl > Date.now()) {
            value = this.memoryCache.get(key);
          } else {
            this.memoryCache.delete(key);
            this.memoryTTL.delete(key);
          }
        }
      }

      const duration = Date.now() - startTime;

      if (value) {
        this.stats.hits++;
        logPerformance(`Cache HIT: ${key}`, duration, {
          cacheType: this.isRedisAvailable ? 'redis' : 'memory',
        });
        return value;
      } else {
        this.stats.misses++;
        logPerformance(`Cache MISS: ${key}`, duration, {
          cacheType: this.isRedisAvailable ? 'redis' : 'memory',
        });
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      logError(`Erro ao buscar cache: ${key}`, error);
      return null;
    }
  }

  /**
   * Armazenar dados no cache
   */
  async set(key, value, ttlType = 'temp') {
    const startTime = Date.now();

    try {
      const ttl = this.ttlConfig[ttlType] || this.ttlConfig.temp;
      const serializedValue = JSON.stringify(value);

      if (this.isRedisAvailable) {
        await redisClient.setEx(key, ttl, serializedValue);
      } else {
        // Limitar tamanho do cache em memória
        if (this.memoryCache.size >= this.maxMemoryItems) {
          this.cleanOldestMemoryEntries();
        }

        this.memoryCache.set(key, value);
        this.memoryTTL.set(key, Date.now() + ttl * 1000);
      }

      this.stats.sets++;
      const duration = Date.now() - startTime;
      logPerformance(`Cache SET: ${key}`, duration, {
        ttl,
        size: serializedValue.length,
        cacheType: this.isRedisAvailable ? 'redis' : 'memory',
      });
    } catch (error) {
      this.stats.errors++;
      logError(`Erro ao armazenar cache: ${key}`, error);
    }
  }

  /**
   * Remover dados do cache
   */
  async delete(key) {
    try {
      if (this.isRedisAvailable) {
        await redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
      }

      this.stats.deletes++;
      logInfo(`Cache DELETE: ${key}`);
    } catch (error) {
      this.stats.errors++;
      logError(`Erro ao deletar cache: ${key}`, error);
    }
  }

  /**
   * Remover múltiplas chaves por padrão
   */
  async deletePattern(pattern) {
    try {
      if (this.isRedisAvailable) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
          logInfo(`Cache DELETE PATTERN: ${pattern} (${keys.length} chaves)`);
        }
      } else {
        // Para cache em memória, simular padrão
        const regex = new RegExp(pattern.replace('*', '.*'));
        const keysToDelete = [];

        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => {
          this.memoryCache.delete(key);
          this.memoryTTL.delete(key);
        });

        if (keysToDelete.length > 0) {
          logInfo(
            `Cache DELETE PATTERN: ${pattern} (${keysToDelete.length} chaves)`
          );
        }
      }
    } catch (error) {
      logError(`Erro ao deletar padrão cache: ${pattern}`, error);
    }
  }

  /**
   * Cache com função de fallback
   */
  async getOrSet(key, fallbackFn, ttlType = 'temp') {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const value = await fallbackFn();
      const duration = Date.now() - startTime;

      if (value !== null && value !== undefined) {
        await this.set(key, value, ttlType);
        logPerformance(`Cache FALLBACK: ${key}`, duration, { ttlType });
      }

      return value;
    } catch (error) {
      logError(`Erro em cache fallback: ${key}`, error);
      throw error;
    }
  }

  /**
   * Invalidar cache por tipo e contexto
   */
  async invalidate(type, municipalityId = null, userId = null) {
    try {
      let pattern = `sispat:${type}`;

      if (municipalityId) {
        pattern += `:mun:${municipalityId}`;
      }

      if (userId) {
        pattern += `:user:${userId}`;
      }

      pattern += '*';

      await this.deletePattern(pattern);
      logInfo(`Cache INVALIDATE: ${type}`, { municipalityId, userId });
    } catch (error) {
      logError(`Erro ao invalidar cache: ${type}`, error);
    }
  }

  /**
   * Limpar cache expirado da memória
   */
  cleanMemoryCache() {
    if (this.isRedisAvailable) return;

    const now = Date.now();
    let cleaned = 0;

    for (const [key, ttl] of this.memoryTTL.entries()) {
      if (ttl <= now) {
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logInfo(`Cache memory cleanup: ${cleaned} chaves expiradas removidas`);
    }
  }

  /**
   * Remover entradas mais antigas da memória
   */
  cleanOldestMemoryEntries() {
    const entries = Array.from(this.memoryTTL.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 100); // Remove as 100 mais antigas

    entries.forEach(([key]) => {
      this.memoryCache.delete(key);
      this.memoryTTL.delete(key);
    });

    logInfo(
      `Cache memory cleanup: ${entries.length} entradas antigas removidas`
    );
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize,
      isRedisAvailable: this.isRedisAvailable,
      cacheType: this.isRedisAvailable ? 'redis' : 'memory',
    };
  }

  /**
   * Limpar todas as estatísticas
   */
  clearStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Flush completo do cache
   */
  async flush() {
    try {
      if (this.isRedisAvailable) {
        await redisClient.flushDb();
      } else {
        this.memoryCache.clear();
        this.memoryTTL.clear();
      }

      logInfo('Cache FLUSH: Todos os dados removidos');
    } catch (error) {
      logError('Erro ao fazer flush do cache', error);
    }
  }
}

// Instância singleton
export const cacheManager = new CacheManager();

// Helper functions para uso comum
export const cache = {
  // Cache para dados de usuários
  async getUser(userId, municipalityId) {
    const key = cacheManager.generateKey('user', userId, null, municipalityId);
    return await cacheManager.get(key);
  },

  async setUser(userId, userData, municipalityId) {
    const key = cacheManager.generateKey('user', userId, null, municipalityId);
    await cacheManager.set(key, userData, 'users');
  },

  // Cache para patrimônios
  async getPatrimonios(municipalityId, filters = {}) {
    const filterKey =
      Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'all';
    const key = cacheManager.generateKey(
      'patrimonios',
      filterKey,
      null,
      municipalityId
    );
    return await cacheManager.get(key);
  },

  async setPatrimonios(patrimonios, municipalityId, filters = {}) {
    const filterKey =
      Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'all';
    const key = cacheManager.generateKey(
      'patrimonios',
      filterKey,
      null,
      municipalityId
    );
    await cacheManager.set(key, patrimonios, 'patrimonios');
  },

  // Cache para setores
  async getSectors(municipalityId) {
    const key = cacheManager.generateKey(
      'sectors',
      'all',
      null,
      municipalityId
    );
    return await cacheManager.get(key);
  },

  async setSectors(sectors, municipalityId) {
    const key = cacheManager.generateKey(
      'sectors',
      'all',
      null,
      municipalityId
    );
    await cacheManager.set(key, sectors, 'sectors');
  },

  // Invalidação específica
  async invalidateUser(userId, municipalityId) {
    await cacheManager.invalidate('user', municipalityId, userId);
  },

  async invalidatePatrimonios(municipalityId) {
    await cacheManager.invalidate('patrimonios', municipalityId);
  },

  async invalidateSectors(municipalityId) {
    await cacheManager.invalidate('sectors', municipalityId);
  },
};

export default cacheManager;
