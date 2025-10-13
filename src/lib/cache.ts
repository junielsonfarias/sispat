/**
 * Sistema de cache em memória otimizado
 * Para dados que não mudam frequentemente
 */

interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 1000 // Máximo de itens no cache
  private defaultTTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Armazena um valor no cache
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Remove item mais antigo se cache estiver cheio
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Recupera um valor do cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    // Verifica se expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.value as T
  }

  /**
   * Verifica se uma chave existe e não expirou
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) return false
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove itens expirados
   */
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Seria calculado em uma implementação mais complexa
    }
  }
}

// Instância global do cache
export const cache = new MemoryCache()

// Limpa cache expirado a cada 5 minutos
setInterval(() => {
  cache.cleanup()
}, 5 * 60 * 1000)

/**
 * Hook para usar o cache com React Query
 */
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): () => Promise<T> {
  return async () => {
    // Tenta buscar do cache primeiro
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }
    
    // Se não estiver no cache, busca e armazena
    const data = await fetcher()
    cache.set(key, data, ttl)
    
    return data
  }
}

/**
 * Funções utilitárias para cache
 */
export const cacheUtils = {
  /**
   * Gera chave de cache para listas com filtros
   */
  generateListKey: (baseKey: string, filters: Record<string, any>) => {
    const filterString = JSON.stringify(filters)
    return `${baseKey}:${btoa(filterString)}`
  },

  /**
   * Gera chave de cache para item específico
   */
  generateItemKey: (baseKey: string, id: string) => `${baseKey}:${id}`,

  /**
   * Invalida cache por padrão
   */
  invalidatePattern: (pattern: string) => {
    // Em uma implementação mais complexa, usaria regex ou prefix matching
    cache.clear() // Por simplicidade, limpa tudo
  },

  /**
   * Cache para dados de configuração (TTL longo)
   */
  setConfig: <T>(key: string, value: T) => {
    cache.set(key, value, 30 * 60 * 1000) // 30 minutos
  },

  /**
   * Cache para dados de usuário (TTL médio)
   */
  setUserData: <T>(key: string, value: T) => {
    cache.set(key, value, 10 * 60 * 1000) // 10 minutos
  },

  /**
   * Cache para dados de listagem (TTL curto)
   */
  setListData: <T>(key: string, value: T) => {
    cache.set(key, value, 2 * 60 * 1000) // 2 minutos
  },
}
