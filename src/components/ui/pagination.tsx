/**
 * Componente de Paginação Reutilizável
 */

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'

interface PaginationMeta {
  count: number
  limit: number
  hasMore: boolean
  hasPrev: boolean
  nextUrl?: string
  prevUrl?: string
}

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (cursor: string | null, direction: 'next' | 'prev' | 'first') => void
  onLimitChange?: (limit: number) => void
  className?: string
  showLimitSelector?: boolean
  showPageInfo?: boolean
  limitOptions?: number[]
}

export const Pagination = ({
  meta,
  onPageChange,
  onLimitChange,
  className,
  showLimitSelector = true,
  showPageInfo = true,
  limitOptions = [10, 20, 50, 100]
}: PaginationProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handlePageChange = useCallback(async (cursor: string | null, direction: 'next' | 'prev' | 'first') => {
    setIsLoading(true)
    try {
      await onPageChange(cursor, direction)
    } finally {
      setIsLoading(false)
    }
  }, [onPageChange])

  const extractCursorFromUrl = (url?: string): string | null => {
    if (!url) return null
    const urlObj = new URL(url, window.location.origin)
    return urlObj.searchParams.get('cursor')
  }

  return (
    <div className={cn('flex items-center justify-between space-x-6 py-4', className)}>
      {/* Informações da página */}
      {showPageInfo && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>
            Mostrando {meta.count} {meta.count === 1 ? 'item' : 'itens'}
            {meta.hasMore && ' (há mais itens)'}
          </span>
        </div>
      )}

      {/* Controles centrais */}
      <div className="flex items-center space-x-2">
        {/* Primeira página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(null, 'first')}
          disabled={!meta.hasPrev || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">Primeira página</span>
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(extractCursorFromUrl(meta.prevUrl), 'prev')}
          disabled={!meta.hasPrev || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </Button>

        {/* Indicador de páginas */}
        <div className="flex items-center space-x-1">
          <div className="flex h-8 w-8 items-center justify-center rounded border text-sm">
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </div>

        {/* Próxima página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(extractCursorFromUrl(meta.nextUrl), 'next')}
          disabled={!meta.hasMore || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </Button>

        {/* Última página - desabilitado para cursor-based */}
        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8 w-8 p-0 opacity-50"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Última página (não disponível)</span>
        </Button>
      </div>

      {/* Seletor de limite */}
      {showLimitSelector && onLimitChange && (
        <div className="flex items-center space-x-2">
          <Label htmlFor="limit-select" className="text-sm font-medium">
            Itens por página
          </Label>
          <Select
            value={meta.limit.toString()}
            onValueChange={(value) => onLimitChange(parseInt(value))}
          >
            <SelectTrigger id="limit-select" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

// Componente simplificado para casos básicos
interface SimplePaginationProps {
  hasMore: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading?: boolean
  className?: string
}

export const SimplePagination = ({
  hasMore,
  hasPrev,
  onNext,
  onPrev,
  isLoading = false,
  className
}: SimplePaginationProps) => {
  return (
    <div className={cn('flex items-center justify-center space-x-2 py-4', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!hasPrev || isLoading}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Anterior
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasMore || isLoading}
      >
        Próximo
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}

// Hook para gerenciar estado de paginação
export interface UsePaginationOptions {
  initialLimit?: number
  initialSort?: string
  initialOrder?: 'ASC' | 'DESC'
}

export interface UsePaginationReturn {
  // Estado atual
  cursor: string | null
  limit: number
  sort: string
  order: 'ASC' | 'DESC'
  search: string
  filters: Record<string, any>
  
  // Funções de controle
  setPage: (cursor: string | null, direction?: 'next' | 'prev' | 'first') => void
  setLimit: (limit: number) => void
  setSort: (sort: string, order?: 'ASC' | 'DESC') => void
  setSearch: (search: string) => void
  setFilters: (filters: Record<string, any>) => void
  reset: () => void
  
  // Query string para API
  getQueryString: () => string
  getQueryParams: () => Record<string, any>
}

export const usePagination = (options: UsePaginationOptions = {}): UsePaginationReturn => {
  const {
    initialLimit = 20,
    initialSort = 'created_at',
    initialOrder = 'DESC'
  } = options

  const [cursor, setCursor] = useState<string | null>(null)
  const [limit, setLimitState] = useState(initialLimit)
  const [sort, setSortState] = useState(initialSort)
  const [order, setOrderState] = useState<'ASC' | 'DESC'>(initialOrder)
  const [search, setSearchState] = useState('')
  const [filters, setFiltersState] = useState<Record<string, any>>({})

  const setPage = useCallback((newCursor: string | null, direction?: 'next' | 'prev' | 'first') => {
    if (direction === 'first') {
      setCursor(null)
    } else {
      setCursor(newCursor)
    }
  }, [])

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit)
    setCursor(null) // Reset para primeira página
  }, [])

  const setSort = useCallback((newSort: string, newOrder: 'ASC' | 'DESC' = 'DESC') => {
    setSortState(newSort)
    setOrderState(newOrder)
    setCursor(null) // Reset para primeira página
  }, [])

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch)
    setCursor(null) // Reset para primeira página
  }, [])

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters)
    setCursor(null) // Reset para primeira página
  }, [])

  const reset = useCallback(() => {
    setCursor(null)
    setLimitState(initialLimit)
    setSortState(initialSort)
    setOrderState(initialOrder)
    setSearchState('')
    setFiltersState({})
  }, [initialLimit, initialSort, initialOrder])

  const getQueryParams = useCallback(() => {
    const params: Record<string, any> = {
      limit,
      sort,
      order
    }

    if (cursor) params.cursor = cursor
    if (search) params.search = search
    
    // Adicionar filtros não vazios
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value
      }
    })

    return params
  }, [cursor, limit, sort, order, search, filters])

  const getQueryString = useCallback(() => {
    const params = getQueryParams()
    return new URLSearchParams(params).toString()
  }, [getQueryParams])

  return {
    cursor,
    limit,
    sort,
    order,
    search,
    filters,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilters,
    reset,
    getQueryString,
    getQueryParams
  }
}