import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCache } from './useCache';
import { useVirtualizedList } from './useVirtualizedList';

export interface PerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  listVirtualized: boolean;
  totalItems: number;
  visibleItems: number;
}

export interface OptimizationOptions {
  enableCache?: boolean;
  enableVirtualization?: boolean;
  enableMemoization?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  virtualizationThreshold?: number;
  itemHeight?: number;
  containerHeight?: number;
}

// Hook principal para otimização de performance
export function usePerformanceOptimization<T extends { id: string | number }>(
  data: T[],
  options: OptimizationOptions = {}
) {
  const {
    enableCache = true,
    enableVirtualization = true,
    enableMemoization = true,
    cacheKey = 'performance_data',
    cacheTTL = 5 * 60 * 1000, // 5 minutos
    virtualizationThreshold = 100,
    itemHeight = 50,
    containerHeight = 400,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    dataProcessingTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    listVirtualized: false,
    totalItems: 0,
    visibleItems: 0,
  });

  const renderStartTime = useRef<number>(0);
  const processingStartTime = useRef<number>(0);

  // Cache inteligente
  const {
    data: cachedData,
    isLoading: cacheLoading,
    mutate: updateCache,
  } = useCache(cacheKey, () => Promise.resolve(data), {
    ttl: cacheTTL,
    persistToStorage: true,
    version: '1.0',
  });

  // Dados processados com memoização
  const processedData = useMemo(() => {
    if (!enableMemoization) return data;

    processingStartTime.current = performance.now();

    // Simular processamento de dados
    const processed = enableCache && cachedData ? cachedData : data;

    const processingTime = performance.now() - processingStartTime.current;

    setMetrics(prev => ({
      ...prev,
      dataProcessingTime: processingTime,
      totalItems: processed.length,
    }));

    return processed;
  }, [data, cachedData, enableCache, enableMemoization]);

  // Virtualização de lista
  const virtualizationConfig = useVirtualizedList({
    data: processedData,
    itemHeight,
    containerHeight,
    pageSize: 50,
  });

  const shouldVirtualize =
    enableVirtualization && processedData.length > virtualizationThreshold;

  const optimizedData = shouldVirtualize
    ? virtualizationConfig.visibleItems
    : processedData;

  // Métricas de performance
  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      listVirtualized: shouldVirtualize,
      visibleItems: optimizedData.length,
      memoryUsage: getMemoryUsage(),
    }));
  }, [optimizedData, shouldVirtualize]);

  // Função para medir uso de memória (aproximado)
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }, []);

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    updateCache();
  }, [updateCache]);

  // Função para otimização manual
  const optimize = useCallback(() => {
    // Força garbage collection se disponível
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // Atualiza cache
    invalidateCache();
  }, [invalidateCache]);

  return {
    // Dados otimizados
    data: optimizedData,
    totalCount: processedData.length,

    // Estados
    isLoading: cacheLoading,
    isVirtualized: shouldVirtualize,

    // Controles de virtualização
    ...virtualizationConfig,

    // Métricas
    metrics,

    // Controles
    invalidateCache,
    optimize,

    // Configuração
    options: {
      enableCache,
      enableVirtualization,
      enableMemoization,
      virtualizationThreshold,
    },
  };
}

// Hook para monitoramento de performance em tempo real
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const animationFrame = useRef<number>();

  const measureFPS = useCallback(() => {
    frameCount.current++;
    const now = Date.now();

    if (now - lastTime.current >= 1000) {
      const fps = Math.round(
        (frameCount.current * 1000) / (now - lastTime.current)
      );
      frameCount.current = 0;
      lastTime.current = now;

      setMetrics(prev => ({
        ...prev,
        fps,
        memoryUsage: getMemoryUsage(),
        renderTime: performance.now(),
      }));
    }

    animationFrame.current = requestAnimationFrame(measureFPS);
  }, []);

  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      return Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    }
    return 0;
  }, []);

  useEffect(() => {
    animationFrame.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [measureFPS]);

  return metrics;
}

// Hook para otimização de imagens
export function useImageOptimization(
  src: string,
  options: {
    lazy?: boolean;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
    sizes?: string;
  } = {}
) {
  const { lazy = true, quality = 80, format = 'auto', sizes } = options;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>();

  const optimizedSrc = useMemo(() => {
    // Aqui você pode implementar lógica para otimização de imagens
    // Por exemplo, usar um serviço como Cloudinary ou ImageKit
    let optimized = src;

    if (quality < 100) {
      optimized += `?q=${quality}`;
    }

    if (format !== 'auto') {
      optimized += `&f=${format}`;
    }

    return optimized;
  }, [src, quality, format]);

  useEffect(() => {
    if (!lazy) {
      const img = new Image();
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
      img.src = optimizedSrc;
      imgRef.current = img;
    }
  }, [optimizedSrc, lazy]);

  const load = useCallback(() => {
    if (lazy && !loaded && !error) {
      const img = new Image();
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
      img.src = optimizedSrc;
      imgRef.current = img;
    }
  }, [optimizedSrc, lazy, loaded, error]);

  return {
    src: optimizedSrc,
    loaded,
    error,
    load,
    sizes,
  };
}

// Hook para debounce otimizado
export function useOptimizedDebounce<T>(
  value: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTime = useRef<number>(0);
  const lastInvokeTime = useRef<number>(0);

  const invokeFunc = useCallback(() => {
    setDebouncedValue(value);
    lastInvokeTime.current = Date.now();
  }, [value]);

  const leadingEdge = useCallback(() => {
    lastInvokeTime.current = Date.now();
    if (leading) {
      invokeFunc();
    }
  }, [leading, invokeFunc]);

  const remainingWait = useCallback(
    (time: number) => {
      const timeSinceLastCall = time - lastCallTime.current;
      const timeSinceLastInvoke = time - lastInvokeTime.current;
      const timeWaiting = delay - timeSinceLastCall;

      return maxWait !== undefined
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    },
    [delay, maxWait]
  );

  const shouldInvoke = useCallback(
    (time: number) => {
      const timeSinceLastCall = time - lastCallTime.current;
      const timeSinceLastInvoke = time - lastInvokeTime.current;

      return (
        lastCallTime.current === 0 ||
        timeSinceLastCall >= delay ||
        timeSinceLastCall < 0 ||
        (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
      );
    },
    [delay, maxWait]
  );

  useEffect(() => {
    const time = Date.now();
    lastCallTime.current = time;

    if (shouldInvoke(time)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
      leadingEdge();
    } else {
      const wait = remainingWait(time);

      timeoutRef.current = setTimeout(() => {
        if (trailing) {
          invokeFunc();
        }
      }, wait);

      if (maxWait !== undefined) {
        maxTimeoutRef.current = setTimeout(invokeFunc, maxWait);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [
    value,
    shouldInvoke,
    remainingWait,
    leadingEdge,
    invokeFunc,
    trailing,
    maxWait,
  ]);

  return debouncedValue;
}
