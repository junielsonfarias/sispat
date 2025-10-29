/**
 * Tabela Mobile Otimizada para SISPAT 2.0
 * 
 * Este componente fornece uma tabela otimizada para dispositivos móveis
 * com cards responsivos e melhor UX
 */

import React, { useState } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Search, Filter, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, item: T) => React.ReactNode
  sortable?: boolean
  mobilePriority?: number // 1 = alta prioridade, 3 = baixa prioridade
}

interface MobileTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchFields?: (keyof T)[]
  onSearch?: (query: string) => void
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, any>) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  searchFields = [],
  onSearch,
  onSort,
  onFilter,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  className
}: MobileTableProps<T>) {
  const { isMobile, screenWidth } = useMobile()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filtrar colunas por prioridade mobile
  const getVisibleColumns = () => {
    if (!isMobile) return columns

    const maxColumns = screenWidth < 480 ? 2 : screenWidth < 768 ? 3 : 4
    return columns
      .filter(col => col.mobilePriority !== undefined)
      .sort((a, b) => (a.mobilePriority || 3) - (b.mobilePriority || 3))
      .slice(0, maxColumns)
  }

  const visibleColumns = getVisibleColumns()

  // Filtrar dados
  const filteredData = data.filter(item => {
    if (!searchQuery) return true
    
    return searchFields.some(field => {
      const value = item[field]
      return value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
    })
  })

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (key: keyof T) => {
    const direction = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(direction)
    onSort?.(key, direction)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg p-4">
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 itens</SelectItem>
            <SelectItem value="20">20 itens</SelectItem>
            <SelectItem value="50">50 itens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela Mobile - Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {paginatedData.map((item, index) => (
            <div key={index} className="bg-card border rounded-lg p-4 space-y-2">
              {visibleColumns.map((column) => (
                <div key={String(column.key)} className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    {column.label}:
                  </span>
                  <div className="text-sm text-right flex-1 ml-2">
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || '-')
                    }
                  </div>
                </div>
              ))}
              
              {/* Ações */}
              <div className="pt-2 border-t">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <MoreVertical className="h-4 w-4 mr-2" />
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Visualizar</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Tabela Desktop */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-4 py-3 text-left text-sm font-medium"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      {column.label}
                      {column.sortable && sortKey === column.key && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  {visibleColumns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3 text-sm">
                      {column.render 
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || '-')
                      }
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Visualizar</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredData.length)} de {filteredData.length} itens
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileTable
