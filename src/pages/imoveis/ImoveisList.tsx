import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit,
  Trash,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from '@/components/ui/pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Imovel } from '@/types'
import { useDebounce } from '@/hooks/use-debounce'
import { useImovel } from '@/hooks/useImovel'
import { usePermissions } from '@/hooks/usePermissions'

type SortConfig = {
  column: keyof Imovel
  direction: 'asc' | 'desc'
}

const getPaginationItems = (currentPage: number, pageCount: number) => {
  const delta = 1
  const range = []
  for (
    let i = Math.max(2, currentPage - delta);
    i <= Math.min(pageCount - 1, currentPage + delta);
    i++
  ) {
    range.push(i)
  }

  if (currentPage - delta > 2) {
    range.unshift('...')
  }
  if (currentPage + delta < pageCount - 1) {
    range.push('...')
  }

  range.unshift(1)
  if (pageCount > 1) {
    range.push(pageCount)
  }

  return [...new Set(range)]
}

export default function ImoveisList() {
  const { imoveis, deleteImovel } = useImovel()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [pagination, setPagination] = useState({ pageIndex: 1, pageSize: 10 })
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  })

  const processedData = useMemo(() => {
    const filtered = imoveis.filter(
      (p) =>
        (p.denominacao || '')
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        (p.numero_patrimonio || '').includes(debouncedSearchTerm) ||
        (p.endereco || '')
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()),
    )

    filtered.sort((a, b) => {
      const aValue = a[sorting.column] ?? ''
      const bValue = b[sorting.column] ?? ''
      if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [imoveis, debouncedSearchTerm, sorting])

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.pageIndex - 1) * pagination.pageSize
    return processedData.slice(startIndex, startIndex + pagination.pageSize)
  }, [processedData, pagination])

  const pageCount = Math.ceil(processedData.length / pagination.pageSize)
  const paginationItems = getPaginationItems(pagination.pageIndex, pageCount)

  const handleSort = (column: keyof Imovel) => {
    setSorting((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const SortableHeader = ({
    column,
    label,
  }: {
    column: keyof Imovel
    label: string
  }) => {
    const isSorted = sorting.column === column
    const Icon = isSorted
      ? sorting.direction === 'asc'
        ? ArrowUp
        : ArrowDown
      : ChevronsUpDown
    return (
      <Button variant="ghost" onClick={() => handleSort(column)}>
        {label}
        <Icon className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  // Gating via modelo de permissões (usePermissions) — editável pelo superuser em
  // runtime. A autorização real é sempre reforçada no backend.
  const canDelete = hasPermission('imoveis:delete')
  const canCreate = hasPermission('imoveis:create')
  const canEdit = hasPermission('imoveis:update')

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-1 sm:mb-2">
                Cadastro de Imóveis
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                Gerencie todos os imóveis cadastrados no sistema
              </p>
            </div>
            {canCreate && (
              <Button asChild className="min-h-[48px] sm:min-h-[44px] lg:min-h-[40px]">
                <Link to="/imoveis/novo">
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar Imóvel
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, denominação ou endereço..."
              className="pl-10 min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-card">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">Imóveis Cadastrados</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {paginatedData.length} de {processedData.length} imóveis
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border">
                      <TableHead className="text-sm font-semibold text-foreground">
                        <SortableHeader
                          column="numero_patrimonio"
                          label="Nº Patrimônio"
                        />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        <SortableHeader column="denominacao" label="Denominação" />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        <SortableHeader column="endereco" label="Endereço" />
                      </TableHead>
                      <TableHead className="text-right text-sm font-semibold text-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item: Imovel) => (
                      <TableRow key={item.id} className="hover:bg-muted/50 border-border">
                        <TableCell className="font-medium font-mono text-sm text-foreground">
                          <Link
                            to={`/imoveis/ver/${item.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.numero_patrimonio}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{item.denominacao}</TableCell>
                        <TableCell className="text-sm text-foreground">{item.endereco}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/imoveis/ver/${item.id}`}>
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Link>
                            </Button>
                            {canEdit && (
                              <Button variant="ghost" size="icon" asChild aria-label="Editar imóvel">
                                <Link to={`/imoveis/editar/${item.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            {canDelete && (
                              <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  aria-label="Excluir imóvel"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Tem certeza que deseja excluir este imóvel?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteImovel(item.id)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {paginatedData.map((item: Imovel) => (
                <Card key={item.id} className="border border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Header com número */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link
                          to={`/imoveis/ver/${item.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm font-medium"
                        >
                          {item.numero_patrimonio}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.denominacao}
                        </p>
                      </div>
                    </div>

                    {/* Informações principais */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-muted-foreground">Endereço:</span>
                        <span className="text-sm text-foreground text-right flex-1 ml-2">
                          {item.endereco}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 px-3 text-xs"
                        >
                          <Link to={`/imoveis/ver/${item.id}`}>
                            <FileText className="h-3 w-3 mr-1" />
                            Ver
                          </Link>
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 px-3 text-xs"
                          >
                            <Link to={`/imoveis/editar/${item.id}`}>
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Link>
                          </Button>
                        )}
                      </div>
                      {canDelete && (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Excluir imóvel"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Tem certeza que deseja excluir este imóvel?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteImovel(item.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Mostrando {paginatedData.length} de {processedData.length} resultados.
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPagination((p) => ({
                        ...p,
                        pageIndex: Math.max(1, p.pageIndex - 1),
                      }))
                    }}
                    className={
                      pagination.pageIndex === 1
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
                {/* Desktop: Show all pages */}
                <div className="hidden sm:flex">
                  {paginationItems.map((item, index) => (
                    <PaginationItem key={index}>
                      {item === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={pagination.pageIndex === item}
                          onClick={(e) => {
                            e.preventDefault()
                            setPagination((p) => ({ ...p, pageIndex: item as number }))
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                </div>
                {/* Mobile: Show current page only */}
                <div className="sm:hidden">
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={true}
                      onClick={(e) => e.preventDefault()}
                    >
                      {pagination.pageIndex}
                    </PaginationLink>
                  </PaginationItem>
                </div>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPagination((p) => ({
                        ...p,
                        pageIndex: Math.min(pageCount, p.pageIndex + 1),
                      }))
                    }}
                    className={
                      pagination.pageIndex === pageCount
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
