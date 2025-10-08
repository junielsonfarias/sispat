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
import { useImovel } from '@/contexts/ImovelContext'
import { useAuth } from '@/hooks/useAuth'

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
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [pagination, setPagination] = useState({ pageIndex: 1, pageSize: 10 })
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  })

  const processedData = useMemo(() => {
    let filtered = imoveis.filter(
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
      const aValue = a[sorting.column]
      const bValue = b[sorting.column]
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

  const canDelete = user?.role === 'supervisor' || user?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cadastro de Imóveis</h1>
        <Button asChild>
          <Link to="/imoveis/novo">
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Imóvel
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, denominação ou endereço..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      column="numero_patrimonio"
                      label="Nº Patrimônio"
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="denominacao" label="Denominação" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="endereco" label="Endereço" />
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item: Imovel) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/imoveis/ver/${item.id}`}
                        className="hover:underline text-primary"
                      >
                        {item.numero_patrimonio}
                      </Link>
                    </TableCell>
                    <TableCell>{item.denominacao}</TableCell>
                    <TableCell>{item.endereco}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/imoveis/ver/${item.id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/imoveis/editar/${item.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
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
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedData.length} de {processedData.length}{' '}
            resultados.
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
                        setPagination((p) => ({ ...p, pageIndex: item }))
                      }}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
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
  )
}
