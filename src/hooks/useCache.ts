import { advancedCache } from '@/services/cache/advancedCache';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  version?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live em milissegundos
  maxSize?: number; // Máximo de entradas no cache
  version?: string; // Versão dos dados para invalidação
  staleWhileRevalidate?: boolean; // Retorna dados stale enquanto revalida
  persistToStorage?: boolean; // Persiste no localStorage
  storagePrefix?: string; // Prefixo para chaves no storage
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  totalSize: number;
}

class IntelligentCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private storagePrefix: string;

  constructor(maxSize = 1000, storagePrefix = 'sispat_cache_') {
    this.maxSize = maxSize;
    this.storagePrefix = storagePrefix;

    // Limpar cache expirado na inicialização
    this.cleanup();

    // Limpar cache expirado a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = 5 * 60 * 1000, // 5 minutos por padrão
      version,
      persistToStorage = false,
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
      version,
    };

    // Limitar tamanho do cache
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);

    // Também armazenar no cache avançado se disponível
    try {
      advancedCache.set(key, data, {
        ttl: Math.floor(ttl / 1000), // Converter para segundos
        version,
        useMemory: true,
        useRedis: true,
      });
    } catch (error) {
      console.warn('Falha ao armazenar no cache avançado:', error);
    }

    // Persistir no localStorage se solicitado
    if (persistToStorage) {
      try {
        localStorage.setItem(this.storagePrefix + key, JSON.stringify(entry));
      } catch (error) {
        console.warn('Falha ao persistir cache no localStorage:', error);
      }
    }
  }

  get<T>(key: string, options: CacheOptions = {}): T | null {
    let entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // Se não encontrou no cache em memória, tentar localStorage
    if (!entry && options.persistToStorage) {
      try {
        const stored = localStorage.getItem(this.storagePrefix + key);
        if (stored) {
          entry = JSON.parse(stored);
          if (entry && entry.expiresAt > Date.now()) {
            this.cache.set(key, entry);
          } else {
            localStorage.removeItem(this.storagePrefix + key);
            entry = undefined;
          }
        }
      } catch (error) {
        console.warn('Falha ao recuperar cache do localStorage:', error);
      }
    }

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar expiração
    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      if (options.persistToStorage) {
        localStorage.removeItem(this.storagePrefix + key);
      }
      this.stats.misses++;
      return null;
    }

    // Verificar versão
    if (options.version && entry.version !== options.version) {
      this.cache.delete(key);
      if (options.persistToStorage) {
        localStorage.removeItem(this.storagePrefix + key);
      }
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  async getAdvanced<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    // Primeiro tentar cache local
    const localData = this.get<T>(key, options);
    if (localData) {
      return localData;
    }

    // Se não encontrou localmente, tentar cache avançado
    try {
      const advancedData = await advancedCache.get<T>(key, {
        useMemory: true,
        useRedis: true,
      });

      if (advancedData) {
        // Armazenar localmente para próximas consultas
        const ttl = options.ttl || 5 * 60 * 1000;
        this.set(key, advancedData, { ...options, ttl });
        this.stats.hits++;
        return advancedData;
      }
    } catch (error) {
      console.warn('Falha ao buscar no cache avançado:', error);
    }

    this.stats.misses++;
    return null;
  }

  has(key: string): boolean {
    return (
      this.cache.has(key) && (this.cache.get(key)?.expiresAt || 0) > Date.now()
    );
  }

  delete(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch (error) {
      // Ignorar erros de localStorage
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };

    // Limpar localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Falha ao limpar cache do localStorage:', error);
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      totalSize: this.maxSize,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      try {
        localStorage.removeItem(this.storagePrefix + key);
      } catch (error) {
        // Ignorar erros
      }
    });
  }

  private evictLRU(): void {
    // Encontrar e remover a entrada mais antiga
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

// Instância global do cache
const globalCache = new IntelligentCache();

// Hook principal para cache
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T> | T,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const {
    ttl = 5 * 60 * 1000,
    staleWhileRevalidate = true,
    version,
    persistToStorage = false,
  } = options;

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      try {
        // Verificar cache primeiro
        if (!forceRefresh) {
          const cached = globalCache.get<T>(key, { version, persistToStorage });
          if (cached) {
            setData(cached);
            setError(null);
            return cached;
          }
        }

        setIsLoading(true);
        setError(null);

        const result = await fetcherRef.current();

        // Armazenar no cache
        globalCache.set(key, result, { ttl, version, persistToStorage });

        setData(result);
        setIsStale(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Se temos dados stale e staleWhileRevalidate está habilitado, manter os dados
        if (staleWhileRevalidate && data) {
          setIsStale(true);
        } else {
          setData(null);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [key, ttl, version, persistToStorage, staleWhileRevalidate, data]
  );

  // Carregar dados na inicialização
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(
    async (newData?: T) => {
      if (newData !== undefined) {
        // Atualização otimista
        setData(newData);
        globalCache.set(key, newData, { ttl, version, persistToStorage });
      } else {
        // Revalidar
        await fetchData(true);
      }
    },
    [key, ttl, version, persistToStorage, fetchData]
  );

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    setData(null);
    setIsStale(false);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    isStale,
    mutate,
    invalidate,
    refetch: () => fetchData(true),
  };
}

// Hook para cache de lista com paginação
export function usePaginatedCache<T>(
  baseKey: string,
  fetcher: (
    page: number,
    pageSize: number
  ) => Promise<{ data: T[]; total: number }>,
  options: CacheOptions & { pageSize?: number } = {}
) {
  const { pageSize = 20, ...cacheOptions } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);

  const pageKey = `${baseKey}_page_${currentPage}_size_${pageSize}`;

  const {
    data: pageData,
    isLoading,
    error,
    mutate,
  } = useCache(pageKey, () => fetcher(currentPage, pageSize), cacheOptions);

  useEffect(() => {
    if (pageData) {
      setAllData(prev => {
        const startIndex = (currentPage - 1) * pageSize;
        const newData = [...prev];
        pageData.data.forEach((item, index) => {
          newData[startIndex + index] = item;
        });
        return newData;
      });
      setTotal(pageData.total);
    }
  }, [pageData, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const invalidateAll = useCallback(() => {
    // Invalidar todas as páginas em cache
    const totalPages = Math.ceil(total / pageSize);
    for (let i = 1; i <= totalPages; i++) {
      globalCache.delete(`${baseKey}_page_${i}_size_${pageSize}`);
    }
    setAllData([]);
    setTotal(0);
  }, [baseKey, total, pageSize]);

  return {
    data: pageData?.data || [],
    allData,
    total,
    currentPage,
    isLoading,
    error,
    goToPage,
    mutate,
    invalidateAll,
    hasNextPage: currentPage * pageSize < total,
    hasPrevPage: currentPage > 1,
  };
}

// Hook para invalidação em massa
export function useCacheInvalidation() {
  const invalidatePattern = useCallback((pattern: string) => {
    const cache = globalCache as any;
    const keys = Array.from(cache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    });
  }, []);

  const invalidateAll = useCallback(() => {
    globalCache.clear();
  }, []);

  const getStats = useCallback(() => {
    return globalCache.getStats();
  }, []);

  return {
    invalidatePattern,
    invalidateAll,
    getStats,
  };
}

// Hook para cache de busca
export function useSearchCache<T>(
  baseKey: string,
  searchFn: (query: string) => Promise<T[]>,
  options: CacheOptions = {}
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce da query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchKey = `${baseKey}_search_${debouncedQuery}`;

  const { data, isLoading, error, mutate } = useCache(
    searchKey,
    () => (debouncedQuery ? searchFn(debouncedQuery) : Promise.resolve([])),
    { ttl: 2 * 60 * 1000, ...options } // Cache de busca mais curto
  );

  return {
    query,
    setQuery,
    results: data || [],
    isLoading: isLoading && debouncedQuery.length > 0,
    error,
    mutate,
  };
}

export { globalCache };
