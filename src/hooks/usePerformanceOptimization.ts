import { useCallback, useMemo, useRef, useState } from 'react';

interface PerformanceOptions {
  enableCache?: boolean;
  enableVirtualization?: boolean;
  enableMemoization?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  virtualizationThreshold?: number;
  debounceMs?: number;
}

interface PerformanceMetrics {
  renderTime: number;
  dataSize: number;
  cacheHits: number;
  cacheMisses: number;
  virtualizationEnabled: boolean;
  memoizationEnabled: boolean;
}

interface PerformanceOptimizationReturn<T> {
  data: T[];
  totalCount: number;
  isLoading: boolean;
  isVirtualized: boolean;
  metrics: PerformanceMetrics;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  invalidateCache: () => void;
  optimize: () => void;
}

const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function usePerformanceOptimization<T>(
  data: T[],
  options: PerformanceOptions = {}
): PerformanceOptimizationReturn<T> {
  const {
    enableCache = true,
    enableVirtualization = true,
    enableMemoization = true,
    cacheKey = 'default',
    cacheTTL = 5 * 60 * 1000, // 5 minutos
    virtualizationThreshold = 100,
    debounceMs = 300,
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    dataSize: 0,
    cacheHits: 0,
    cacheMisses: 0,
    virtualizationEnabled: false,
    memoizationEnabled: false,
  });

  const renderStartTime = useRef<number>(0);
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);

  // Memoização dos dados
  const memoizedData = useMemo(() => {
    if (!enableMemoization) return data;

    renderStartTime.current = performance.now();
    const result = [...data];
    const renderTime = performance.now() - renderStartTime.current;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      dataSize: result.length,
      memoizationEnabled: true,
    }));

    return result;
  }, [data, enableMemoization]);

  // Cache de dados
  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      cacheHitsRef.current++;
      return cached.data;
    }
    cacheMissesRef.current++;
    return null;
  }, []);

  const setCachedData = useCallback(
    (key: string, data: any) => {
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL,
      });
    },
    [cacheTTL]
  );

  // Dados otimizados
  const optimizedData = useMemo(() => {
    if (!enableCache) return memoizedData;

    const cached = getCachedData(cacheKey);
    if (cached) {
      setMetrics(prev => ({
        ...prev,
        cacheHits: cacheHitsRef.current,
        cacheMisses: cacheMissesRef.current,
      }));
      return cached;
    }

    const result = memoizedData;
    setCachedData(cacheKey, result);

    setMetrics(prev => ({
      ...prev,
      cacheHits: cacheHitsRef.current,
      cacheMisses: cacheMissesRef.current,
    }));

    return result;
  }, [memoizedData, enableCache, cacheKey, getCachedData, setCachedData]);

  // Virtualização
  const isVirtualized = useMemo(() => {
    const shouldVirtualize =
      enableVirtualization && optimizedData.length > virtualizationThreshold;
    setMetrics(prev => ({
      ...prev,
      virtualizationEnabled: shouldVirtualize,
    }));
    return shouldVirtualize;
  }, [enableVirtualization, optimizedData.length, virtualizationThreshold]);

  // Paginação
  const pageSize = isVirtualized ? 50 : 100;
  const totalCount = optimizedData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const paginatedData = useMemo(() => {
    if (!isVirtualized) return optimizedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return optimizedData.slice(startIndex, endIndex);
  }, [optimizedData, currentPage, pageSize, isVirtualized]);

  // Funções de navegação
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  // Invalidação de cache
  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey);
    cacheMissesRef.current++;
    setMetrics(prev => ({
      ...prev,
      cacheMisses: cacheMissesRef.current,
    }));
  }, [cacheKey]);

  // Otimização manual
  const optimize = useCallback(() => {
    setIsLoading(true);

    // Simular otimização
    setTimeout(() => {
      invalidateCache();
      setCurrentPage(1);
      setIsLoading(false);
    }, 1000);
  }, [invalidateCache]);

  return {
    data: paginatedData,
    totalCount,
    isLoading,
    isVirtualized,
    metrics,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    invalidateCache,
    optimize,
  };
}

// Hook para debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para throttle
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useMemo(() => {
    if (Date.now() - lastRan.current >= limit) {
      setThrottledValue(value);
      lastRan.current = Date.now();
    } else {
      const timeout = setTimeout(
        () => {
          setThrottledValue(value);
          lastRan.current = Date.now();
        },
        limit - (Date.now() - lastRan.current)
      );

      return () => clearTimeout(timeout);
    }
  }, [value, limit]);

  return throttledValue;
}

// Hook para memoização de funções
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

// Hook para memoização de valores
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}
