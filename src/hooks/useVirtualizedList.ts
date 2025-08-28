import { useCallback, useMemo, useState } from 'react';

export interface VirtualizedListItem {
  id: string;
  [key: string]: any;
}

export interface UseVirtualizedListOptions<T extends VirtualizedListItem> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  searchTerm?: string;
  searchFields?: (keyof T)[];
  sortConfig?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };
  filters?: Record<string, any>;
  pageSize?: number;
}

export interface UseVirtualizedListReturn<T> {
  // Dados processados
  visibleItems: T[];
  totalCount: number;
  
  // Paginação virtual
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Controles
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Configurações de renderização
  itemHeight: number;
  containerHeight: number;
  
  // Performance metrics
  isLargeDataset: boolean;
  shouldVirtualize: boolean;
}

export function useVirtualizedList<T extends VirtualizedListItem>({
  data,
  itemHeight,
  containerHeight,
  searchTerm = '',
  searchFields = [],
  sortConfig,
  filters = {},
  pageSize = 50
}: UseVirtualizedListOptions<T>): UseVirtualizedListReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);

  // Processamento dos dados
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Aplicar filtros de busca
    if (searchTerm && searchFields.length > 0) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Aplicar filtros customizados
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof T];
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }
          return itemValue === value;
        });
      }
    });

    // Aplicar ordenação
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, searchFields, sortConfig, filters]);

  // Métricas de performance
  const isLargeDataset = processedData.length > 1000;
  const shouldVirtualize = processedData.length > 100;

  // Paginação virtual para datasets grandes
  const paginatedData = useMemo(() => {
    if (!shouldVirtualize) {
      return processedData;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, pageSize, shouldVirtualize]);

  const totalPages = Math.ceil(processedData.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Controles de navegação
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

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

  // Reset da página quando os dados mudam
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  return {
    visibleItems: shouldVirtualize ? paginatedData : processedData,
    totalCount: processedData.length,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    itemHeight,
    containerHeight,
    isLargeDataset,
    shouldVirtualize
  };
}
