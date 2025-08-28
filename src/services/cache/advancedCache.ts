import { globalCache } from '@/hooks/useCache';
import { redisClient } from './redisClient';

export interface CacheOptions {
  ttl?: number;
  useRedis?: boolean;
  useMemory?: boolean;
  tags?: string[];
  version?: string;
  compression?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface CacheStats {
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
  };
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  total: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export interface CacheMetrics {
  key: string;
  hits: number;
  misses: number;
  lastAccess: number;
  size: number;
  ttl: number;
}

class AdvancedCacheManager {
  private stats = {
    redis: { hits: 0, misses: 0 },
    memory: { hits: 0, misses: 0 }
  };
  
  private metrics = new Map<string, CacheMetrics>();
  private tags = new Map<string, Set<string>>();

  constructor() {
    // Conectar ao Redis na inicialização
    void this.initializeRedis();
    
    // Limpar métricas antigas periodicamente
    setInterval(() => this.cleanupMetrics(), 60 * 60 * 1000); // 1 hora
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis não disponível, usando apenas cache em memória:', error);
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { useRedis = true, useMemory = true, tags = [] } = options;
    let value: T | null = null;

    // Tentar cache em memória primeiro (mais rápido)
    if (useMemory) {
      value = globalCache.get<T>(key);
      if (value !== null) {
        this.stats.memory.hits++;
        this.updateMetrics(key, 'hit', this.getDataSize(value));
        return value;
      }
      this.stats.memory.misses++;
    }

    // Tentar Redis se cache em memória falhou
    if (useRedis && redisClient.isReady()) {
      try {
        value = await redisClient.get<T>(key);
        if (value !== null) {
          this.stats.redis.hits++;
          this.updateMetrics(key, 'hit', this.getDataSize(value));
          
          // Armazenar também no cache em memória para próximas consultas
          if (useMemory) {
            globalCache.set(key, value, { ttl: options.ttl });
          }
          
          return value;
        }
        this.stats.redis.misses++;
      } catch (error) {
        console.error('Erro ao buscar no Redis:', error);
      }
    }

    this.updateMetrics(key, 'miss', 0);
    return null;
  }

  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    const { 
      ttl = 300, // 5 minutos padrão
      useRedis = true, 
      useMemory = true, 
      tags = [],
      version,
      compression = false,
      priority = 'medium'
    } = options;

    let success = true;

    // Processar tags
    if (tags.length > 0) {
      this.addTags(key, tags);
    }

    // Armazenar no cache em memória
    if (useMemory) {
      try {
        globalCache.set(key, value, { ttl: ttl * 1000, version });
      } catch (error) {
        console.error('Erro ao armazenar no cache em memória:', error);
        success = false;
      }
    }

    // Armazenar no Redis
    if (useRedis && redisClient.isReady()) {
      try {
        const processedValue = value;
        
        // Aplicar compressão se solicitado
        if (compression && typeof value === 'string') {
          // Aqui você pode implementar compressão se necessário
          // processedValue = compress(value);
        }

        const redisSuccess = await redisClient.set(key, processedValue, ttl);
        success = success && redisSuccess;

        // Armazenar metadados no Redis
        if (tags.length > 0 || version || priority !== 'medium') {
          await redisClient.hset(`meta:${key}`, 'tags', tags.join(','), ttl);
          if (version) {
            await redisClient.hset(`meta:${key}`, 'version', version, ttl);
          }
          await redisClient.hset(`meta:${key}`, 'priority', priority, ttl);
        }
      } catch (error) {
        console.error('Erro ao armazenar no Redis:', error);
        success = false;
      }
    }

    this.updateMetrics(key, 'set', this.getDataSize(value), ttl);
    return success;
  }

  async delete(key: string): Promise<boolean> {
    let success = true;

    // Remover do cache em memória
    try {
      globalCache.delete(key);
    } catch (error) {
      console.error('Erro ao deletar do cache em memória:', error);
      success = false;
    }

    // Remover do Redis
    if (redisClient.isReady()) {
      try {
        const redisSuccess = await redisClient.del(key);
        await redisClient.del(`meta:${key}`);
        success = success && redisSuccess;
      } catch (error) {
        console.error('Erro ao deletar do Redis:', error);
        success = false;
      }
    }

    // Limpar das tags
    this.removeFromTags(key);
    this.metrics.delete(key);

    return success;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    for (const tag of tags) {
      const keys = this.tags.get(tag);
      if (keys) {
        for (const key of keys) {
          const success = await this.delete(key);
          if (success) invalidated++;
        }
        this.tags.delete(tag);
      }
    }

    return invalidated;
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    let invalidated = 0;

    // Invalidar no Redis
    if (redisClient.isReady()) {
      try {
        invalidated += await redisClient.deleteByPattern(pattern);
      } catch (error) {
        console.error('Erro ao invalidar por padrão no Redis:', error);
      }
    }

    // Invalidar no cache em memória
    try {
      const cache = globalCache as any;
      const keys = Array.from(cache.cache.keys());
      const matchingKeys = keys.filter((key: string) => 
        key.includes(pattern.replace('*', ''))
      );
      
      for (const key of matchingKeys) {
        globalCache.delete(key);
        this.metrics.delete(key);
        invalidated++;
      }
    } catch (error) {
      console.error('Erro ao invalidar por padrão no cache em memória:', error);
    }

    return invalidated;
  }

  async clear(): Promise<void> {
    // Limpar cache em memória
    globalCache.clear();

    // Limpar Redis
    if (redisClient.isReady()) {
      await redisClient.flushdb();
    }

    // Limpar estatísticas e métricas
    this.stats = {
      redis: { hits: 0, misses: 0 },
      memory: { hits: 0, misses: 0 }
    };
    this.metrics.clear();
    this.tags.clear();
  }

  async warmup(keys: Array<{ key: string; fetcher: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    const promises = keys.map(async ({ key, fetcher, options }) => {
      try {
        const exists = await this.exists(key);
        if (!exists) {
          const value = await fetcher();
          await this.set(key, value, options);
        }
      } catch (error) {
        console.error(`Erro ao aquecer cache para ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  async exists(key: string): Promise<boolean> {
    // Verificar cache em memória primeiro
    if (globalCache.has && globalCache.has(key)) {
      return true;
    }

    // Verificar Redis
    if (redisClient.isReady()) {
      return await redisClient.exists(key);
    }

    return false;
  }

  async getStats(): Promise<CacheStats> {
    const memoryStats = globalCache.getStats();
    
    let redisMemoryUsage = 0;
    if (redisClient.isReady()) {
      try {
        const info = await redisClient.info();
        if (info) {
          const memoryMatch = info.match(/used_memory:(\d+)/);
          if (memoryMatch) {
            redisMemoryUsage = parseInt(memoryMatch[1]) / 1024 / 1024; // MB
          }
        }
      } catch (error) {
        console.error('Erro ao obter estatísticas do Redis:', error);
      }
    }

    const redisTotal = this.stats.redis.hits + this.stats.redis.misses;
    const memoryTotal = this.stats.memory.hits + this.stats.memory.misses;
    const totalHits = this.stats.redis.hits + this.stats.memory.hits;
    const totalMisses = this.stats.redis.misses + this.stats.memory.misses;
    const grandTotal = totalHits + totalMisses;

    return {
      redis: {
        hits: this.stats.redis.hits,
        misses: this.stats.redis.misses,
        hitRate: redisTotal > 0 ? this.stats.redis.hits / redisTotal : 0,
        memoryUsage: redisMemoryUsage
      },
      memory: {
        hits: this.stats.memory.hits,
        misses: this.stats.memory.misses,
        hitRate: memoryStats.hitRate,
        size: memoryStats.size
      },
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: grandTotal > 0 ? totalHits / grandTotal : 0
      }
    };
  }

  getMetrics(): CacheMetrics[] {
    return Array.from(this.metrics.values());
  }

  private addTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  private removeFromTags(key: string): void {
    for (const [tag, keys] of this.tags.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tags.delete(tag);
      }
    }
  }

  private updateMetrics(key: string, operation: 'hit' | 'miss' | 'set', size: number, ttl?: number): void {
    const existing = this.metrics.get(key) || {
      key,
      hits: 0,
      misses: 0,
      lastAccess: Date.now(),
      size: 0,
      ttl: 0
    };

    if (operation === 'hit') {
      existing.hits++;
    } else if (operation === 'miss') {
      existing.misses++;
    }

    existing.lastAccess = Date.now();
    existing.size = size;
    if (ttl) existing.ttl = ttl;

    this.metrics.set(key, existing);
  }

  private getDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private cleanupMetrics(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [key, metrics] of this.metrics.entries()) {
      if (now - metrics.lastAccess > maxAge) {
        this.metrics.delete(key);
      }
    }
  }
}

// Instância singleton
export const advancedCache = new AdvancedCacheManager();
export default AdvancedCacheManager;
