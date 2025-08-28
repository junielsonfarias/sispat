import { DashboardData, reportCache, ReportMetadata } from '@/services/cache/reportCache';
import { useCallback, useEffect, useState } from 'react';

export interface UseReportCacheOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export interface UseReportCacheReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isFromCache: boolean;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Hook para cache de dados de dashboard
 */
export function useDashboardCache(
  userId?: string,
  filters?: Record<string, any>,
  fetcher?: () => Promise<DashboardData>,
  options: UseReportCacheOptions = {}
): UseReportCacheReturn<DashboardData> {
  const {
    enabled = true,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutos
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!enabled) return;

    try {
      setError(null);
      setIsLoading(true);

      // Tentar buscar do cache primeiro
      if (!forceRefresh) {
        const cachedData = await reportCache.getDashboardData(userId, filters);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          setIsLoading(false);
          onSuccess?.(cachedData);
          return;
        }
      }

      // Se não tem no cache ou forceRefresh, buscar dados frescos
      if (fetcher) {
        setIsFromCache(false);
        const freshData = await fetcher();
        
        // Armazenar no cache
        await reportCache.setDashboardData(freshData, userId, filters);
        
        setData(freshData);
        onSuccess?.(freshData);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters, fetcher, enabled, onError, onSuccess]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  const clear = useCallback(async (): Promise<void> => {
    await reportCache.invalidateReportsOnDataChange(['patrimonio'], userId);
    setData(null);
    setIsFromCache(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refresh,
    clear
  };
}

/**
 * Hook para cache de relatórios PDF
 */
export function usePdfReportCache(
  reportId: string,
  userId?: string,
  filters?: Record<string, any>,
  generator?: () => Promise<{ buffer: Buffer; metadata: Omit<ReportMetadata, 'id' | 'generatedAt' | 'expiresAt'> }>,
  options: UseReportCacheOptions = {}
): UseReportCacheReturn<{ buffer: Buffer; metadata: ReportMetadata }> {
  const {
    enabled = true,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<{ buffer: Buffer; metadata: ReportMetadata } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchReport = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!enabled) return;

    try {
      setError(null);
      setIsLoading(true);

      // Tentar buscar do cache primeiro
      if (!forceRefresh) {
        const cachedReport = await reportCache.getPdfReport(reportId, userId, filters);
        if (cachedReport) {
          setData(cachedReport);
          setIsFromCache(true);
          setIsLoading(false);
          onSuccess?.(cachedReport);
          return;
        }
      }

      // Se não tem no cache ou forceRefresh, gerar novo relatório
      if (generator) {
        setIsFromCache(false);
        const { buffer, metadata } = await generator();
        
        // Armazenar no cache
        await reportCache.setPdfReport(reportId, buffer, metadata, userId, filters);
        
        const reportData = { buffer, metadata: { ...metadata, id: reportId, generatedAt: new Date(), expiresAt: new Date(Date.now() + 3600000) } as ReportMetadata };
        setData(reportData);
        onSuccess?.(reportData);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId, userId, filters, generator, enabled, onError, onSuccess]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchReport(true);
  }, [fetchReport]);

  const clear = useCallback(async (): Promise<void> => {
    await reportCache.invalidateReportsOnDataChange(['patrimonio'], userId);
    setData(null);
    setIsFromCache(false);
  }, [userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refresh,
    clear
  };
}

/**
 * Hook para cache de exportações
 */
export function useExportCache(
  exportType: 'excel' | 'csv',
  exportId: string,
  userId?: string,
  filters?: Record<string, any>,
  generator?: () => Promise<{ buffer: Buffer; metadata: Omit<ReportMetadata, 'id' | 'generatedAt' | 'expiresAt'> }>,
  options: UseReportCacheOptions = {}
): UseReportCacheReturn<{ buffer: Buffer; metadata: ReportMetadata }> {
  const {
    enabled = true,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<{ buffer: Buffer; metadata: ReportMetadata } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchExport = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!enabled) return;

    try {
      setError(null);
      setIsLoading(true);

      // Tentar buscar do cache primeiro
      if (!forceRefresh) {
        const cachedExport = await reportCache.getExport(exportType, exportId, userId, filters);
        if (cachedExport) {
          setData(cachedExport);
          setIsFromCache(true);
          setIsLoading(false);
          onSuccess?.(cachedExport);
          return;
        }
      }

      // Se não tem no cache ou forceRefresh, gerar nova exportação
      if (generator) {
        setIsFromCache(false);
        const { buffer, metadata } = await generator();
        
        // Armazenar no cache
        await reportCache.setExport(exportType, exportId, buffer, metadata, userId, filters);
        
        const exportData = { buffer, metadata: { ...metadata, id: exportId, generatedAt: new Date(), expiresAt: new Date(Date.now() + 1800000) } as ReportMetadata };
        setData(exportData);
        onSuccess?.(exportData);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [exportType, exportId, userId, filters, generator, enabled, onError, onSuccess]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchExport(true);
  }, [fetchExport]);

  const clear = useCallback(async (): Promise<void> => {
    await reportCache.invalidateReportsOnDataChange(['patrimonio'], userId);
    setData(null);
    setIsFromCache(false);
  }, [userId]);

  useEffect(() => {
    fetchExport();
  }, [fetchExport]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refresh,
    clear
  };
}

/**
 * Hook para cache de consultas agregadas
 */
export function useAggregatedQueryCache<T>(
  queryId: string,
  parameters: Record<string, any>,
  fetcher?: () => Promise<T>,
  userId?: string,
  options: UseReportCacheOptions = {}
): UseReportCacheReturn<T> {
  const {
    enabled = true,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchQuery = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!enabled) return;

    try {
      setError(null);
      setIsLoading(true);

      // Tentar buscar do cache primeiro
      if (!forceRefresh) {
        const cachedData = await reportCache.getAggregatedQuery<T>(queryId, parameters, userId);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          setIsLoading(false);
          onSuccess?.(cachedData);
          return;
        }
      }

      // Se não tem no cache ou forceRefresh, executar consulta
      if (fetcher) {
        setIsFromCache(false);
        const freshData = await fetcher();
        
        // Armazenar no cache
        await reportCache.setAggregatedQuery(queryId, freshData, parameters, userId);
        
        setData(freshData);
        onSuccess?.(freshData);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [queryId, parameters, fetcher, userId, enabled, onError, onSuccess]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchQuery(true);
  }, [fetchQuery]);

  const clear = useCallback(async (): Promise<void> => {
    await reportCache.invalidateReportsOnDataChange(['patrimonio'], userId);
    setData(null);
    setIsFromCache(false);
  }, [userId]);

  useEffect(() => {
    fetchQuery();
  }, [fetchQuery]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refresh,
    clear
  };
}

/**
 * Hook para pré-geração de relatórios
 */
export function useReportPreGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);

  const preGenerate = useCallback(async (
    reportConfigs: Array<{
      type: 'pdf' | 'excel' | 'csv' | 'dashboard';
      id: string;
      generator: () => Promise<Buffer | DashboardData>;
      metadata?: Partial<ReportMetadata>;
      userId?: string;
      filters?: Record<string, any>;
    }>
  ): Promise<void> => {
    setIsGenerating(true);
    setProgress({ success: 0, failed: 0, total: reportConfigs.length });
    setErrors([]);

    try {
      const result = await reportCache.preGenerateReports(reportConfigs);
      setProgress({ success: result.success, failed: result.failed, total: reportConfigs.length });
      setErrors(result.errors);
    } catch (error) {
      setErrors([`Erro geral na pré-geração: ${error}`]);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    return await reportCache.getReportCacheStats();
  }, []);

  const cleanup = useCallback(async (): Promise<number> => {
    return await reportCache.cleanupExpiredReports();
  }, []);

  return {
    isGenerating,
    progress,
    errors,
    preGenerate,
    getStats,
    cleanup
  };
}
