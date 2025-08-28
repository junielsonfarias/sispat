/**
 * Hook personalizado para gerenciar estados de loading
 */

import { useCallback, useRef, useState } from 'react';

interface UseLoadingOptions {
  initialLoading?: boolean;
  timeout?: number; // Timeout em ms para operações
}

interface UseLoadingReturn {
  loading: boolean;
  error: string | null;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      errorMessage?: string;
      successMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<T | null>;
}

export const useLoading = (
  options: UseLoadingOptions = {}
): UseLoadingReturn => {
  const { initialLoading = false, timeout } = options;
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);

    // Set timeout se especificado
    if (timeout) {
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setError('Operação expirou. Tente novamente.');
      }, timeout);
    }
  }, [timeout]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withLoading = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: {
        errorMessage?: string;
        successMessage?: string;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
      } = {}
    ): Promise<T | null> => {
      const { errorMessage, onSuccess, onError } = options;

      startLoading();

      try {
        const result = await asyncFn();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMsg =
          errorMessage ||
          (err instanceof Error ? err.message : 'Erro desconhecido');
        setError(errorMsg);
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setError,
    clearError,
    withLoading,
  };
};

// Hook específico para múltiplos estados de loading
interface UseMultipleLoadingReturn {
  loadingStates: Record<string, boolean>;
  errors: Record<string, string | null>;
  isAnyLoading: boolean;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  withLoading: <T>(
    key: string,
    asyncFn: () => Promise<T>,
    options?: {
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<T | null>;
}

export const useMultipleLoading = (): UseMultipleLoadingReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
    if (loading) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const withLoading = useCallback(
    async <T>(
      key: string,
      asyncFn: () => Promise<T>,
      options: {
        errorMessage?: string;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
      } = {}
    ): Promise<T | null> => {
      const { errorMessage, onSuccess, onError } = options;

      setLoading(key, true);

      try {
        const result = await asyncFn();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMsg =
          errorMessage ||
          (err instanceof Error ? err.message : 'Erro desconhecido');
        setError(key, errorMsg);
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(key, false);
      }
    },
    [setLoading, setError]
  );

  return {
    loadingStates,
    errors,
    isAnyLoading,
    setLoading,
    setError,
    clearError,
    clearAllErrors,
    withLoading,
  };
};

// Hook para loading de lista/tabela
interface UseListLoadingOptions {
  initialLoading?: boolean;
  pageSize?: number;
}

interface UseListLoadingReturn<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  totalItems: number;
  setItems: (items: T[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  setTotalItems: (total: number) => void;
  loadMore: () => void;
  refresh: () => void;
  withListLoading: <U>(
    asyncFn: (
      page: number,
      pageSize: number
    ) => Promise<{
      items: U[];
      total: number;
      hasMore: boolean;
    }>,
    options?: {
      append?: boolean;
      errorMessage?: string;
    }
  ) => Promise<void>;
}

export const useListLoading = <T>(
  options: UseListLoadingOptions = {}
): UseListLoadingReturn<T> => {
  const { initialLoading = false, pageSize = 20 } = options;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    setError(null);
  }, []);

  const withListLoading = useCallback(
    async <U>(
      asyncFn: (
        page: number,
        pageSize: number
      ) => Promise<{
        items: U[];
        total: number;
        hasMore: boolean;
      }>,
      options: {
        append?: boolean;
        errorMessage?: string;
      } = {}
    ) => {
      const { append = false, errorMessage } = options;

      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(page, pageSize);

        setItems(prev =>
          append ? [...prev, ...(result.items as T[])] : (result.items as T[])
        );
        setTotalItems(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        const errorMsg =
          errorMessage ||
          (err instanceof Error ? err.message : 'Erro ao carregar dados');
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  return {
    items,
    loading,
    error,
    hasMore,
    page,
    totalItems,
    setItems,
    setLoading,
    setError,
    setHasMore,
    setPage,
    setTotalItems,
    loadMore,
    refresh,
    withListLoading,
  };
};
