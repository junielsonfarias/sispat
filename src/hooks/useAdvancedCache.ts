import {
  advancedCache,
  CacheOptions,
  CacheStats,
} from '@/services/cache/advancedCache';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAdvancedCacheOptions extends CacheOptions {
  enabled?: boolean;
  refreshInterval?: number;
  staleWhileRevalidate?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export interface UseAdvancedCacheReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  isCached: boolean;
  mutate: (newData?: T) => Promise<void>;
  invalidate: () => Promise<void>;
  refresh: () => Promise<void>;
  stats: CacheStats | null;
}

export function useAdvancedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseAdvancedCacheOptions = {}
): UseAdvancedCacheReturn<T> {
  const {
    enabled = true,
    refreshInterval,
    staleWhileRevalidate = true,
    onError,
    onSuccess,
    ...cacheOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);

  const fetcherRef = useRef(fetcher);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  fetcherRef.current = fetcher;

  const fetchData = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (!enabled) return;

      try {
        setError(null);

        // Tentar buscar do cache primeiro
        if (!forceRefresh) {
          const cachedData = await advancedCache.get<T>(key, cacheOptions);
          if (cachedData !== null) {
            setData(cachedData);
            setIsCached(true);
            setIsStale(false);
            onSuccess?.(cachedData);
            return;
          }
        }

        setIsLoading(true);
        setIsCached(false);

        // Buscar dados frescos
        const freshData = await fetcherRef.current();

        // Armazenar no cache
        await advancedCache.set(key, freshData, cacheOptions);

        setData(freshData);
        setIsStale(false);
        onSuccess?.(freshData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);

        // Se temos dados stale e staleWhileRevalidate está habilitado, manter os dados
        if (staleWhileRevalidate && data) {
          setIsStale(true);
        } else {
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [key, enabled, staleWhileRevalidate, data, cacheOptions, onError, onSuccess]
  );

  const mutate = useCallback(
    async (newData?: T): Promise<void> => {
      if (newData !== undefined) {
        // Atualização otimista
        setData(newData);
        await advancedCache.set(key, newData, cacheOptions);
      } else {
        // Revalidar
        await fetchData(true);
      }
    },
    [key, cacheOptions, fetchData]
  );

  const invalidate = useCallback(async (): Promise<void> => {
    await advancedCache.delete(key);
    setData(null);
    setIsStale(false);
    setIsCached(false);
  }, [key]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  const updateStats = useCallback(async (): Promise<void> => {
    try {
      const cacheStats = await advancedCache.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error);
    }
  }, []);

  // Buscar dados na inicialização
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Configurar refresh automático
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchData]);

  // Atualizar estatísticas periodicamente
  useEffect(() => {
    updateStats();
    const statsInterval = setInterval(updateStats, 30000); // 30 segundos

    return () => clearInterval(statsInterval);
  }, [updateStats]);

  return {
    data,
    isLoading,
    error,
    isStale,
    isCached,
    mutate,
    invalidate,
    refresh,
    stats,
  };
}

// Hook para invalidação em massa
export function useCacheInvalidation() {
  const invalidateByTags = useCallback(
    async (tags: string[]): Promise<number> => {
      return await advancedCache.invalidateByTags(tags);
    },
    []
  );

  const invalidateByPattern = useCallback(
    async (pattern: string): Promise<number> => {
      return await advancedCache.invalidateByPattern(pattern);
    },
    []
  );

  const clearAll = useCallback(async (): Promise<void> => {
    await advancedCache.clear();
  }, []);

  const getStats = useCallback(async (): Promise<CacheStats> => {
    return await advancedCache.getStats();
  }, []);

  return {
    invalidateByTags,
    invalidateByPattern,
    clearAll,
    getStats,
  };
}

// Hook para aquecimento de cache
export function useCacheWarmup() {
  const [isWarming, setIsWarming] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState(0);

  const warmup = useCallback(
    async (
      keys: Array<{
        key: string;
        fetcher: () => Promise<any>;
        options?: CacheOptions;
      }>
    ): Promise<void> => {
      setIsWarming(true);
      setWarmupProgress(0);

      try {
        for (let i = 0; i < keys.length; i++) {
          const { key, fetcher, options } = keys[i];

          try {
            const exists = await advancedCache.exists(key);
            if (!exists) {
              const data = await fetcher();
              await advancedCache.set(key, data, options);
            }
          } catch (error) {
            console.error(`Erro ao aquecer cache para ${key}:`, error);
          }

          setWarmupProgress(((i + 1) / keys.length) * 100);
        }
      } finally {
        setIsWarming(false);
        setWarmupProgress(0);
      }
    },
    []
  );

  return {
    warmup,
    isWarming,
    warmupProgress,
  };
}

// Hook para monitoramento de cache em tempo real
export function useCacheMonitor() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback((interval = 5000) => {
    setIsMonitoring(true);

    const updateData = async () => {
      try {
        const [cacheStats, cacheMetrics] = await Promise.all([
          advancedCache.getStats(),
          advancedCache.getMetrics(),
        ]);

        setStats(cacheStats);
        setMetrics(cacheMetrics.slice(0, 20)); // Top 20 métricas
      } catch (error) {
        console.error('Erro ao monitorar cache:', error);
      }
    };

    updateData();
    const monitorInterval = setInterval(updateData, interval);

    return () => {
      clearInterval(monitorInterval);
      setIsMonitoring(false);
    };
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setStats(null);
    setMetrics([]);
  }, []);

  return {
    stats,
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}
