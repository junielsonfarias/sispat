import { useState, useMemo, useCallback } from 'react'

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
}

export interface UsePaginationReturn<T> {
  // Estado
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
  
  // Dados paginados
  paginatedData: T[]
  
  // Ações
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  previousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  
  // Informações
  startIndex: number
  endIndex: number
  isFirstPage: boolean
  isLastPage: boolean
}

/**
 * Hook customizado para paginação de dados
 * 
 * @example
 * const {
 *   paginatedData,
 *   currentPage,
 *   totalPages,
 *   nextPage,
 *   previousPage
 * } = usePagination(data, { initialPageSize: 20 })
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10 } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // Calcular total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil((data?.length || 0) / pageSize)
  }, [data?.length, pageSize])

  // Calcular índices
  const startIndex = useMemo(() => {
    return (currentPage - 1) * pageSize
  }, [currentPage, pageSize])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + pageSize, data?.length || 0)
  }, [startIndex, pageSize, data?.length])

  // Dados paginados
  const paginatedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    return data.slice(startIndex, endIndex)
  }, [data, startIndex, endIndex])

  // Navegação
  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])

  const nextPage = useCallback(() => {
    setPage(currentPage + 1)
  }, [currentPage, setPage])

  const previousPage = useCallback(() => {
    setPage(currentPage - 1)
  }, [currentPage, setPage])

  const goToFirstPage = useCallback(() => {
    setPage(1)
  }, [setPage])

  const goToLastPage = useCallback(() => {
    setPage(totalPages)
  }, [totalPages, setPage])

  // Verificações
  const canGoNext = currentPage < totalPages
  const canGoPrevious = currentPage > 1
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages || totalPages === 0

  // Reset para primeira página quando dados mudarem
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [data?.length, totalPages, currentPage])

  return {
    // Estado
    currentPage,
    pageSize,
    totalPages,
    totalItems: data?.length || 0,
    
    // Dados
    paginatedData,
    
    // Ações
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    canGoNext,
    canGoPrevious,
    
    // Informações
    startIndex,
    endIndex,
    isFirstPage,
    isLastPage,
  }
}

