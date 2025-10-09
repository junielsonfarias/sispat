import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Building,
  Archive,
  Filter,
  RefreshCw,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { Patrimonio, Imovel } from '@/types'
import { useDebounce } from '@/hooks/use-debounce'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useImovel } from '@/contexts/ImovelContext'
import { usePublicSearch } from '@/contexts/PublicSearchContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { getCloudImageUrl, formatRelativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  PublicAssetsFilterSheet,
  PublicFilterValues,
} from '@/components/public/PublicAssetsFilterSheet'
import { parseISO } from 'date-fns'
import { useSync } from '@/contexts/SyncContext'

type CombinedAsset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' }
type SortConfig = {
  column: keyof CombinedAsset | 'descricao'
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

const initialFilters: PublicFilterValues = {
  tipo: '',
  status: undefined,
  situacao: undefined,
  setor: '',
  dataAquisicaoInicio: '',
  dataAquisicaoFim: '',
}

export default function PublicAssets() {
  const { settings: publicSettings } = usePublicSearch()
  const { settings: customizationSettings } = useCustomization()
  const { patrimonios } = usePatrimonio()
  const { imoveis } = useImovel()
  const { isSyncing, startSync, lastSync } = useSync()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [pagination, setPagination] = useState({ pageIndex: 1, pageSize: 9 })
  const [assetTypeFilter, setAssetTypeFilter] = useState<
    'all' | 'bem' | 'imovel'
  >('all')
  const [filters, setFilters] = useState<PublicFilterValues>(initialFilters)
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false)
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  })

  // ✅ Sistema single-municipality - carrega automaticamente
  const selectedMunicipalityId = '1'
  
  const selectedMunicipality = useMemo(
    () => ({
      id: '1',
      name: customizationSettings.prefeituraName || MUNICIPALITY_NAME,
      logoUrl: customizationSettings.activeLogoUrl,
    }),
    [customizationSettings],
  )

  // ✅ Sincronizar dados ao carregar a página
  useEffect(() => {
    startSync()
  }, [])

  const combinedData: CombinedAsset[] = useMemo(() => {
    const bens: CombinedAsset[] = patrimonios.map((p) => ({
      ...p,
      assetType: 'bem',
    }))
    const imoveisData: CombinedAsset[] = imoveis.map((i) => ({
      ...i,
      assetType: 'imovel',
    }))
    return [...bens, ...imoveisData]
  }, [patrimonios, imoveis])

  const processedData = useMemo(() => {
    if (!selectedMunicipalityId) return []

    const filtered = combinedData.filter((p) => {
      const municipalityMatch = p.municipalityId === selectedMunicipalityId
      if (!municipalityMatch) return false

      const description =
        p.assetType === 'bem'
          ? (p as Patrimonio).descricao_bem
          : (p as Imovel).denominacao
      const searchMatch =
        description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.numero_patrimonio.includes(debouncedSearchTerm)

      const assetTypeMatch =
        assetTypeFilter === 'all' || p.assetType === assetTypeFilter

      const filterMatch =
        p.assetType === 'imovel' ||
        ((!filters.tipo ||
          (p as Patrimonio).tipo
            .toLowerCase()
            .includes(filters.tipo.toLowerCase())) &&
          (!filters.status || (p as Patrimonio).status === filters.status) &&
          (!filters.situacao ||
            (p as Patrimonio).situacao_bem === filters.situacao) &&
          (!filters.setor ||
            (p as Patrimonio).setor_responsavel
              .toLowerCase()
              .includes(filters.setor.toLowerCase())) &&
          (!filters.dataAquisicaoInicio ||
            new Date(p.data_aquisicao) >=
              parseISO(filters.dataAquisicaoInicio)) &&
          (!filters.dataAquisicaoFim ||
            new Date(p.data_aquisicao) <= parseISO(filters.dataAquisicaoFim)))

      return searchMatch && assetTypeMatch && filterMatch
    })

    filtered.sort((a, b) => {
      const getSortableValue = (
        item: CombinedAsset,
        key: SortConfig['column'],
      ) => {
        if (key === 'descricao') {
          return item.assetType === 'bem'
            ? (item as Patrimonio).descricao_bem
            : (item as Imovel).denominacao
        }
        return item[key as keyof CombinedAsset]
      }

      const aValue = getSortableValue(a, sorting.column)
      const bValue = getSortableValue(b, sorting.column)

      if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [
    combinedData,
    debouncedSearchTerm,
    selectedMunicipalityId,
    assetTypeFilter,
    filters,
    sorting,
  ])

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.pageIndex - 1) * pagination.pageSize
    return processedData.slice(startIndex, startIndex + pagination.pageSize)
  }, [processedData, pagination])

  const pageCount = Math.ceil(processedData.length / pagination.pageSize)
  const paginationItems = getPaginationItems(pagination.pageIndex, pageCount)

  const handleApplyFilters = (newFilters: PublicFilterValues) => {
    setPagination({ ...pagination, pageIndex: 1 })
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setPagination({ ...pagination, pageIndex: 1 })
    setFilters(initialFilters)
  }

  const handleSort = (column: SortConfig['column']) => {
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
    column: SortConfig['column']
    label: string
  }) => {
    const isSorted = sorting.column === column
    const Icon = isSorted
      ? sorting.direction === 'asc'
        ? ArrowUp
        : ArrowDown
      : ChevronsUpDown
    return (
      <Button
        variant="ghost"
        onClick={() => handleSort(column)}
        className="px-0 hover:bg-transparent"
      >
        {label}
        <Icon className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  if (!publicSettings.isPublicSearchEnabled) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Consulta Pública Indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              A consulta pública de bens está temporariamente desabilitada. Por
              favor, tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* ✅ Header com logo e informações do município */}
        <div className="text-center mb-6">
          {selectedMunicipality.logoUrl && (
            <img
              src={selectedMunicipality.logoUrl}
              alt={selectedMunicipality.name}
              className="h-20 w-auto mx-auto mb-4 drop-shadow-lg"
            />
          )}
          <h1 className="text-3xl font-bold text-primary">Consulta Pública de Bens</h1>
          <p className="text-lg text-muted-foreground font-medium mt-2">
            {selectedMunicipality.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {customizationSettings.secretariaResponsavel}
          </p>
        </div>

        {/* ✅ Conteúdo principal - sem necessidade de seleção */}
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou descrição..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Select
                  value={assetTypeFilter}
                  onValueChange={(v) => setAssetTypeFilter(v as any)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Bens</SelectItem>
                    <SelectItem value="bem">Bens Móveis</SelectItem>
                    <SelectItem value="imovel">Imóveis</SelectItem>
                  </SelectContent>
                </Select>
                <Sheet
                  open={isFilterSheetOpen}
                  onOpenChange={setFilterSheetOpen}
                >
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" /> Filtros
                    </Button>
                  </SheetTrigger>
                  <PublicAssetsFilterSheet
                    onApplyFilters={handleApplyFilters}
                    onClearFilters={handleClearFilters}
                    initialFilters={filters}
                    onClose={() => setFilterSheetOpen(false)}
                  />
                </Sheet>
                <Button
                  variant="outline"
                  onClick={startSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Atualizar
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {processedData.length} resultado(s) encontrado(s).
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Ordenar por:</span>
                <SortableHeader column="descricao" label="Descrição" />
                <SortableHeader
                  column="numero_patrimonio"
                  label="Nº Patrimônio"
                />
                <SortableHeader
                  column="data_aquisicao"
                  label="Data de Aquisição"
                />
              </div>
            </div>
            {lastSync && (
              <p className="text-xs text-muted-foreground text-center mb-4">
                Dados atualizados {formatRelativeDate(lastSync)}.
              </p>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedData.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-col hover:shadow-md transition-shadow"
                >
                  <CardHeader className="p-0">
                    <img
                      src={getCloudImageUrl(item.fotos[0])}
                      alt={
                        item.assetType === 'bem'
                          ? (item as Patrimonio).descricao_bem
                          : (item as Imovel).denominacao
                      }
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </CardHeader>
                  <CardContent className="p-4 flex-grow">
                    <Badge
                      variant="secondary"
                      className="mb-2 flex items-center w-fit"
                    >
                      {item.assetType === 'bem' ? (
                        <Archive className="h-3 w-3 mr-1" />
                      ) : (
                        <Building className="h-3 w-3 mr-1" />
                      )}
                      {item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel'}
                    </Badge>
                    <CardTitle className="text-lg">
                      {item.assetType === 'bem'
                        ? (item as Patrimonio).descricao_bem
                        : (item as Imovel).denominacao}
                    </CardTitle>
                    <CardDescription>
                      Nº: {item.numero_patrimonio}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="p-4">
                    <Button asChild className="w-full">
                      <Link
                        to={
                          item.assetType === 'bem'
                            ? `/consulta-publica/${item.numero_patrimonio}`
                            : `/consulta-publica/imovel/${item.id}`
                        }
                      >
                        Ver Detalhes
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="mt-6">
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
            </div>
        </div>
      </div>
    </div>
  )
}
