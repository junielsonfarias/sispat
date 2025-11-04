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
  ArrowLeft,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Patrimonio, Imovel } from '@/types'
import { useDebounce } from '@/hooks/use-debounce'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useImovel } from '@/hooks/useImovel'
import { usePublicSearch } from '@/contexts/PublicSearchContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { formatRelativeDate, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useSync } from '@/contexts/SyncContext'
import { toast } from '@/hooks/use-toast'

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
  
  // ✅ NOVO: Filtros avançados
  const [filtroSetor, setFiltroSetor] = useState<string>('all')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('all')
  const [filtroTipo, setFiltroTipo] = useState<string>('all')
  const [filtroLocal, setFiltroLocal] = useState<string>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
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

  // ✅ NOVO: Extrair valores únicos para os filtros
  const filterOptions = useMemo(() => {
    const setores = new Set<string>()
    const situacoes = new Set<string>()
    const tipos = new Set<string>()
    const locais = new Set<string>()

    patrimonios.forEach((p) => {
      if (p.setor_responsavel) setores.add(p.setor_responsavel)
      if (p.status) situacoes.add(p.status)
      // ✅ CORREÇÃO: Considerar tipo direto ou tipoBem?.nome
      const tipo = (p as any).tipoBem?.nome || p.tipo || ''
      if (tipo) tipos.add(tipo)
      // ✅ CORREÇÃO: Usar local_objeto ou local?.name
      const local = (p as any).local?.name || p.local_objeto || ''
      if (local) locais.add(local)
    })

    imoveis.forEach((i) => {
      if (i.setor) setores.add(i.setor)
      situacoes.add('ativo') // Imóveis sempre ativos
      if ((i as any).tipo_imovel) tipos.add((i as any).tipo_imovel)
      if (i.endereco) locais.add(i.endereco)
    })

    return {
      setores: Array.from(setores).sort(),
      situacoes: Array.from(situacoes).sort(),
      tipos: Array.from(tipos).sort(),
      locais: Array.from(locais).sort(),
    }
  }, [patrimonios, imoveis])

  // ✅ NOVO: Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroSetor('all')
    setFiltroSituacao('all')
    setFiltroTipo('all')
    setFiltroLocal('all')
    setAssetTypeFilter('all')
    setSearchTerm('')
    setCurrentPage(1)
  }

  // ✅ NOVO: Verificar se há filtros ativos
  const temFiltrosAtivos = useMemo(() => {
    return (
      filtroSetor !== 'all' ||
      filtroSituacao !== 'all' ||
      filtroTipo !== 'all' ||
      filtroLocal !== 'all' ||
      assetTypeFilter !== 'all' ||
      searchTerm !== ''
    )
  }, [filtroSetor, filtroSituacao, filtroTipo, filtroLocal, assetTypeFilter, searchTerm])

  // No. Sincronizar dados ao carregar a página (apenas uma vez)
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

      // ✅ NOVO: Filtro de setor
      if (filtroSetor !== 'all') {
        const setor = item.assetType === 'bem'
          ? (item as Patrimonio).setor_responsavel
          : (item as Imovel).setor || ''
        if (setor !== filtroSetor) return false
      }

      // ✅ NOVO: Filtro de situação
      if (filtroSituacao !== 'all') {
        const situacao = item.assetType === 'bem'
          ? (item as Patrimonio).status
          : 'ativo'
        if (situacao !== filtroSituacao) return false
      }

      // ✅ NOVO: Filtro de tipo (tipoBem)
      if (filtroTipo !== 'all') {
        const tipo = item.assetType === 'bem'
          ? (item as Patrimonio).tipo || (item as any).tipoBem?.nome
          : (item as Imovel).tipo_imovel || ''
        if (tipo !== filtroTipo) return false
      }

      // ✅ NOVO: Filtro de local
      if (filtroLocal !== 'all') {
        const local = item.assetType === 'bem'
          ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || ''
          : (item as Imovel).endereco || ''
        if (local !== filtroLocal) return false
      }

      // Filtro de busca
      if (debouncedSearchTerm) {
        const description = item.assetType === 'bem' 
          ? (item as Patrimonio).descricao_bem 
          : (item as Imovel).denominacao
        const setor = item.assetType === 'bem'
          ? (item as Patrimonio).setor_responsavel
          : (item as Imovel).setor || ''
        // ✅ CORREÇÃO: Usar local_objeto ou local?.name
        const local = item.assetType === 'bem'
          ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || ''
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
  }, [combinedData, assetTypeFilter, debouncedSearchTerm, filtroSetor, filtroSituacao, filtroTipo, filtroLocal])

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
    try {
      if (filteredData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum dado',
          description: 'Não há dados para exportar.',
        })
        return
      }

      const data = filteredData.map((item) => {
        // ✅ CORREÇÃO: Usar local_objeto ou local?.name
        const local = item.assetType === 'bem'
          ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || ''
          : (item as Imovel).endereco || '-'
        
        return {
          'Tipo': item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
          'Nº Patrimônio': item.numero_patrimonio,
          'Descrição': item.assetType === 'bem' 
            ? (item as Patrimonio).descricao_bem 
            : (item as Imovel).denominacao,
          'Setor': item.assetType === 'bem'
            ? (item as Patrimonio).setor_responsavel
            : (item as Imovel).setor || '-',
          'Local': local,
          'Situação': item.assetType === 'bem'
            ? formatSituacao((item as Patrimonio).status)
            : 'Ativo',
        }
      })

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Bens')
      
      const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast({
        title: 'Exportação concluída',
        description: 'Arquivo Excel gerado e baixado com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Falha ao gerar arquivo Excel. Tente novamente.',
      })
    }
  }

  // Exportar para CSV
  const handleExportCSV = () => {
    try {
      if (filteredData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum dado',
          description: 'Não há dados para exportar.',
        })
        return
      }

      const data = filteredData.map((item) => {
        // ✅ CORREÇÃO: Usar local_objeto ou local?.name
        const local = item.assetType === 'bem'
          ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || ''
          : (item as Imovel).endereco || '-'
        
        return {
          'Tipo': item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
          'Nº Patrimônio': item.numero_patrimonio,
          'Descrição': item.assetType === 'bem' 
            ? (item as Patrimonio).descricao_bem 
            : (item as Imovel).denominacao,
          'Setor': item.assetType === 'bem'
            ? (item as Patrimonio).setor_responsavel
            : (item as Imovel).setor || '-',
          'Local': local,
          'Situação': item.assetType === 'bem'
            ? formatSituacao((item as Patrimonio).status)
            : 'Ativo',
        }
      })

      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      
      const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.csv`
      saveAs(blob, fileName)
      
      toast({
        title: 'Exportação concluída',
        description: 'Arquivo CSV gerado e baixado com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Falha ao gerar arquivo CSV. Tente novamente.',
      })
    }
  }

  // Exportar para PDF
  const handleExportPDF = async () => {
    try {
      if (filteredData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum dado',
          description: 'Não há dados para exportar.',
        })
        return
      }

      const doc = new jsPDF()
      
      // ✅ NOVO: Converter logo para base64 (se existir)
      let logoBase64: string | null = null
      if (selectedMunicipality.logoUrl) {
        try {
          const logoResponse = await fetch(selectedMunicipality.logoUrl)
          const logoBlob = await logoResponse.blob()
          const logoReader = new FileReader()
          logoBase64 = await new Promise<string>((resolve, reject) => {
            logoReader.onloadend = () => resolve(logoReader.result as string)
            logoReader.onerror = reject
            logoReader.readAsDataURL(logoBlob)
          })
        } catch (error) {
          console.warn('Erro ao carregar logo:', error)
        }
      }

      // ✅ NOVO: Adicionar cabeçalho com logo e informações
      let currentY = 15

      // Logo (se disponível)
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, currentY, 40, 15)
          currentY = 20
        } catch (error) {
          console.warn('Erro ao adicionar logo no PDF:', error)
        }
      }

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Consulta Pública de Bens e Imóveis', logoBase64 ? 60 : 14, currentY)
      
      currentY += 8
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      
      // Nome do Município
      doc.setFont('helvetica', 'bold')
      doc.text(selectedMunicipality.name, logoBase64 ? 60 : 14, currentY)
      
      currentY += 6
      doc.setFont('helvetica', 'normal')
      
      // Secretaria Responsável
      if (customizationSettings.secretariaResponsavel) {
        doc.setFontSize(10)
        doc.text(`Secretaria: ${customizationSettings.secretariaResponsavel}`, logoBase64 ? 60 : 14, currentY)
        currentY += 5
      }
      
      // Departamento Responsável
      if (customizationSettings.departamentoResponsavel) {
        doc.setFontSize(10)
        doc.text(`Departamento: ${customizationSettings.departamentoResponsavel}`, logoBase64 ? 60 : 14, currentY)
        currentY += 5
      }
      
      // Data de geração
      currentY += 3
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Gerado em: ${formatDate(new Date())}`, logoBase64 ? 60 : 14, currentY)
      doc.setTextColor(0, 0, 0) // Resetar cor
      
      // Linha separadora
      currentY += 5
      doc.setDrawColor(200, 200, 200)
      doc.line(14, currentY, 196, currentY)
      
      currentY += 8

      // Preparar dados
      const tableData = filteredData.map((item) => {
        // ✅ CORREÇÃO: Usar local_objeto ou local?.name
        const local = item.assetType === 'bem'
          ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || ''
          : (item as Imovel).endereco || '-'
        
        return [
          item.assetType === 'bem' ? 'Bem Móvel' : 'Imóvel',
          item.numero_patrimonio,
          item.assetType === 'bem' 
            ? (item as Patrimonio).descricao_bem 
            : (item as Imovel).denominacao,
          item.assetType === 'bem'
            ? (item as Patrimonio).setor_responsavel
            : (item as Imovel).setor || '-',
          local,
          item.assetType === 'bem'
            ? formatSituacao((item as Patrimonio).status)
            : 'Ativo',
        ]
      })

      // Gerar tabela
      autoTable(doc, {
        head: [['Tipo', 'Nº Patrimônio', 'Descrição', 'Setor', 'Local', 'Situação']],
        body: tableData,
        startY: currentY,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      })

      const fileName = `consulta_publica_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      // ✅ Feedback ao usuário
      toast({
        title: 'Exportação concluída',
        description: 'PDF gerado e baixado com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Falha ao gerar PDF. Tente novamente.',
      })
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
        {/* Botão Voltar */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o Sistema
          </Button>
        </div>

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

                {/* ✅ NOVO: Botão Filtros Avançados */}
                <Button
                  variant={showAdvancedFilters ? 'default' : 'outline'}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full md:w-auto gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                  {showAdvancedFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

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

              {/* ✅ NOVO: Filtros Avançados */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleContent className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filtro Setor */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Setor</label>
                      <Select
                        value={filtroSetor}
                        onValueChange={(v) => {
                          setFiltroSetor(v)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os setores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os setores</SelectItem>
                          {filterOptions.setores.map((setor) => (
                            <SelectItem key={setor} value={setor}>
                              {setor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Situação */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Situação</label>
                      <Select
                        value={filtroSituacao}
                        onValueChange={(v) => {
                          setFiltroSituacao(v)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as situações" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as situações</SelectItem>
                          {filterOptions.situacoes.map((situacao) => (
                            <SelectItem key={situacao} value={situacao}>
                              {formatSituacao(situacao)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Tipo */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo</label>
                      <Select
                        value={filtroTipo}
                        onValueChange={(v) => {
                          setFiltroTipo(v)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tipos</SelectItem>
                          {filterOptions.tipos.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Local */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Local</label>
                      <Select
                        value={filtroLocal}
                        onValueChange={(v) => {
                          setFiltroLocal(v)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os locais" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os locais</SelectItem>
                          {filterOptions.locais.map((local) => (
                            <SelectItem key={local} value={local}>
                              {local}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Botão Limpar Filtros */}
                  {temFiltrosAtivos && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={limparFiltros}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Limpar Filtros
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

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
            <div className="flex justify-between items-center text-sm mt-4">
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
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
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
                      // ✅ CORREÇÃO: Usar local_objeto ou local?.name
                      const local = item.assetType === 'bem'
                        ? ((item as Patrimonio) as any).local?.name || (item as Patrimonio).local_objeto || '-'
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
