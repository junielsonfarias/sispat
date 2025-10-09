import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Building,
  Archive,
  RefreshCw,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Patrimonio, Imovel } from '@/types'
import { useDebounce } from '@/hooks/use-debounce'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useImovel } from '@/contexts/ImovelContext'
import { usePublicSearch } from '@/contexts/PublicSearchContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { formatRelativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useSync } from '@/contexts/SyncContext'

type CombinedAsset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' }

// Helper para obter badge de situação
const getSituacaoBadge = (situacao: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ativo: 'default',
    em_uso: 'default',
    em_manutencao: 'secondary',
    baixado: 'destructive',
    cedido: 'outline',
  }
  return variants[situacao] || 'secondary'
}

// Helper para formatar situação
const formatSituacao = (situacao: string) => {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    em_uso: 'Em Uso',
    em_manutencao: 'Em Manutenção',
    baixado: 'Baixado',
    cedido: 'Cedido',
  }
  return labels[situacao] || situacao
}

export default function PublicAssets() {
  const navigate = useNavigate()
  const { settings: publicSettings } = usePublicSearch()
  const { settings: customizationSettings } = useCustomization()
  const { patrimonios } = usePatrimonio()
  const { imoveis } = useImovel()
  const { isSyncing, startSync, lastSync } = useSync()
  
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [assetTypeFilter, setAssetTypeFilter] = useState<'all' | 'bem' | 'imovel'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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
  }, [startSync])

  // Combinar bens e imóveis
  const combinedData: CombinedAsset[] = useMemo(() => {
    const bens: CombinedAsset[] = patrimonios.map((p) => ({
      ...p,
      assetType: 'bem' as const,
    }))
    const imoveisData: CombinedAsset[] = imoveis.map((i) => ({
      ...i,
      assetType: 'imovel' as const,
    }))
    return [...bens, ...imoveisData]
  }, [patrimonios, imoveis])

  // Filtrar e ordenar dados
  const filteredData = useMemo(() => {
    return combinedData.filter((item) => {
      // Filtro de tipo
      if (assetTypeFilter !== 'all' && item.assetType !== assetTypeFilter) {
        return false
      }

      // Filtro de busca
      if (debouncedSearchTerm) {
        const description = item.assetType === 'bem' 
          ? (item as Patrimonio).descricao_bem 
          : (item as Imovel).denominacao
        const setor = item.assetType === 'bem'
          ? (item as Patrimonio).setor_responsavel
          : (item as Imovel).setor || ''
        const local = item.assetType === 'bem'
          ? (item as Patrimonio).localizacao
          : (item as Imovel).endereco || ''

        const searchLower = debouncedSearchTerm.toLowerCase()
        return (
          item.numero_patrimonio.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          setor.toLowerCase().includes(searchLower) ||
          local.toLowerCase().includes(searchLower)
        )
      }

      return true
    }).sort((a, b) => a.numero_patrimonio.localeCompare(b.numero_patrimonio))
  }, [combinedData, assetTypeFilter, debouncedSearchTerm])

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // Navegar para detalhes
  const handleViewDetails = (item: CombinedAsset) => {
    if (item.assetType === 'bem') {
      navigate(`/consulta-publica/bem/${item.numero_patrimonio}`)
    } else {
      navigate(`/consulta-publica/imovel/${item.id}`)
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader className="text-center space-y-4 pb-6">
            {selectedMunicipality.logoUrl && (
              <img
                src={selectedMunicipality.logoUrl}
                alt={selectedMunicipality.name}
                className="h-20 w-auto mx-auto drop-shadow-lg"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Consulta Pública de Bens e Imóveis
              </h1>
              <p className="text-lg text-muted-foreground font-medium mt-2">
                {selectedMunicipality.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {customizationSettings.secretariaResponsavel}
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Filtros e Busca */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, descrição, setor ou local..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>

              {/* Filtro de tipo */}
              <Select
                value={assetTypeFilter}
                onValueChange={(v) => {
                  setAssetTypeFilter(v as any)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="bem">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      Bens Móveis
                    </div>
                  </SelectItem>
                  <SelectItem value="imovel">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Imóveis
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Botão atualizar */}
              <Button
                variant="outline"
                onClick={startSync}
                disabled={isSyncing}
                className="w-full md:w-auto"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>

            {/* Info */}
            <div className="flex justify-between items-center text-sm">
              <p className="text-muted-foreground">
                {filteredData.length} resultado(s) encontrado(s)
              </p>
              {lastSync && (
                <p className="text-muted-foreground">
                  Atualizado {formatRelativeDate(lastSync)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Bens */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Tipo</TableHead>
                    <TableHead className="font-bold">Nº Patrimônio</TableHead>
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="font-bold">Setor</TableHead>
                    <TableHead className="font-bold">Local</TableHead>
                    <TableHead className="font-bold">Situação</TableHead>
                    <TableHead className="font-bold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {isSyncing ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Carregando dados...
                          </div>
                        ) : (
                          'Nenhum bem encontrado'
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item) => {
                      const description = item.assetType === 'bem'
                        ? (item as Patrimonio).descricao_bem
                        : (item as Imovel).denominacao
                      const setor = item.assetType === 'bem'
                        ? (item as Patrimonio).setor_responsavel
                        : (item as Imovel).setor || '-'
                      const local = item.assetType === 'bem'
                        ? (item as Patrimonio).localizacao
                        : (item as Imovel).endereco || '-'
                      const situacao = item.assetType === 'bem'
                        ? (item as Patrimonio).status
                        : 'ativo'

                      return (
                        <TableRow
                          key={`${item.assetType}-${item.id}`}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleViewDetails(item)}
                        >
                          <TableCell>
                            {item.assetType === 'bem' ? (
                              <Badge variant="secondary" className="gap-1">
                                <Archive className="h-3 w-3" />
                                Bem Móvel
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Building className="h-3 w-3" />
                                Imóvel
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.numero_patrimonio}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {description}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {setor}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {local}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSituacaoBadge(situacao)}>
                              {formatSituacao(situacao)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetails(item)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
