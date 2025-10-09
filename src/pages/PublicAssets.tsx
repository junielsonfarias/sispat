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
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

  // ✅ Sincronizar dados ao carregar a página (apenas uma vez)
  useEffect(() => {
    startSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Exportar para Excel
  const handleExportExcel = () => {
    const data = filteredData.map((item) => ({
      'Tipo': item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
      'Nº Patrimônio': item.numero_patrimonio,
      'Descrição': item.assetType === 'bem' 
        ? (item as Patrimonio).descricao_bem 
        : (item as Imovel).denominacao,
      'Setor': item.assetType === 'bem'
        ? (item as Patrimonio).setor_responsavel
        : (item as Imovel).setor || '-',
      'Local': item.assetType === 'bem'
        ? (item as Patrimonio).localizacao
        : (item as Imovel).endereco || '-',
      'Situação': item.assetType === 'bem'
        ? formatSituacao((item as Patrimonio).status)
        : 'Ativo',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bens')
    
    const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Exportar para CSV
  const handleExportCSV = () => {
    const data = filteredData.map((item) => ({
      'Tipo': item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
      'Nº Patrimônio': item.numero_patrimonio,
      'Descrição': item.assetType === 'bem' 
        ? (item as Patrimonio).descricao_bem 
        : (item as Imovel).denominacao,
      'Setor': item.assetType === 'bem'
        ? (item as Patrimonio).setor_responsavel
        : (item as Imovel).setor || '-',
      'Local': item.assetType === 'bem'
        ? (item as Patrimonio).localizacao
        : (item as Imovel).endereco || '-',
      'Situação': item.assetType === 'bem'
        ? formatSituacao((item as Patrimonio).status)
        : 'Ativo',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    
    const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.csv`
    saveAs(blob, fileName)
  }

  // Exportar para PDF
  const handleExportPDF = () => {
    const doc = new jsPDF()
    
    // Adicionar título
    doc.setFontSize(18)
    doc.text('Consulta Pública de Bens', 14, 20)
    doc.setFontSize(12)
    doc.text(selectedMunicipality.name, 14, 28)
    doc.setFontSize(10)
    doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 14, 35)

    // Preparar dados
    const tableData = filteredData.map((item) => [
      item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
      item.numero_patrimonio,
      item.assetType === 'bem' 
        ? (item as Patrimonio).descricao_bem 
        : (item as Imovel).denominacao,
      item.assetType === 'bem'
        ? (item as Patrimonio).setor_responsavel
        : (item as Imovel).setor || '-',
      item.assetType === 'bem'
        ? (item as Patrimonio).localizacao
        : (item as Imovel).endereco || '-',
      item.assetType === 'bem'
        ? formatSituacao((item as Patrimonio).status)
        : 'Ativo',
    ])

    // Gerar tabela
    autoTable(doc, {
      head: [['Tipo', 'Nº Patrimônio', 'Descrição', 'Setor', 'Local', 'Situação']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    })

    const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
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
            <div className="space-y-4">
              {/* Linha 1: Busca e Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
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

              {/* Linha 2: Botões de Exportação */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-2"
                  disabled={filteredData.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="gap-2"
                  disabled={filteredData.length === 0}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Exportar CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="gap-2"
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4 text-red-600" />
                  Exportar PDF
                </Button>
              </div>
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
