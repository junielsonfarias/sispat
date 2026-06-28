import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
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
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Patrimonio, ReportTemplate, ReportComponent } from '@/types'
import {
  Printer,
  Loader2,
  ServerCrash,
  LayoutTemplate,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react'
import { MUNICIPALITY_NAME, MUNICIPALITY_NAME_WITH_UF } from '@/config/municipality'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
// jspdf (385KB) e html2canvas (200KB) são lazy-loaded em handleDownloadPDF
// para evitar inflar o bundle inicial do app.
import { useCustomization } from '@/contexts/CustomizationContext'
import { logger } from '@/lib/logger'

const ReportView = () => {
  const { templateId } = useParams<{ templateId: string }>()
  const [searchParams] = useSearchParams()
  const { getTemplateById } = useReportTemplates()
  const { data: patrimonios = [] } = useAllPatrimonios()
  const { settings } = useCustomization()
  const [template, setTemplate] = useState<ReportTemplate | null | undefined>(
    undefined,
  )
  const reportRef = useRef<HTMLDivElement>(null)
  const [paperSize, setPaperSize] = useState('a4')
  const [orientation, setOrientation] = useState('landscape')
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [pdfStage, setPdfStage] = useState<string>('')
  const [zoom, setZoom] = useState(1)

  // Extrair filtros da URL
  const filters = useMemo(() => {
    const status = searchParams.get('status')
    const situacao_bem = searchParams.get('situacao_bem')
    const setor = searchParams.get('setor')
    const tipo = searchParams.get('tipo')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    return {
      status: status || undefined,
      situacao_bem: situacao_bem || undefined,
      setor: setor || undefined,
      tipo: tipo || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      // Fim do dia para incluir o dia final inteiro (data_aquisicao pode ter
      // hora); sem isso, bens adquiridos no próprio dia final eram excluídos.
      dateTo: dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : undefined,
    }
  }, [searchParams])

  // Aplicar filtros aos patrimônios
  const filteredPatrimonios = useMemo(() => {
    let filtered = [...patrimonios]

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status)
    }

    // Filtro por situação do bem
    if (filters.situacao_bem) {
      filtered = filtered.filter(p => p.situacao_bem === filters.situacao_bem)
    }

    // Filtro por setor
    if (filters.setor) {
      filtered = filtered.filter(p => p.setor_responsavel === filters.setor)
    }

    // Filtro por tipo — alinhado à exibição (getColumnValue): o nome pode estar
    // em tipoBem.nome (relação) ou no campo legado p.tipo. Comparar só p.tipo
    // zerava o relatório quando o tipo vinha da relação.
    if (filters.tipo) {
      filtered = filtered.filter(p => {
        const tipoBemNome = (p as unknown as Record<string, unknown>).tipoBem as { nome?: string } | undefined
        return (tipoBemNome?.nome ?? p.tipo) === filters.tipo
      })
    }

    // Filtro por data de aquisição
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(p => {
        if (!p.data_aquisicao) return false
        const dataAquisicao = new Date(p.data_aquisicao)
        
        if (filters.dateFrom && dataAquisicao < filters.dateFrom) {
          return false
        }
        if (filters.dateTo && dataAquisicao > filters.dateTo) {
          return false
        }
        return true
      })
    }

    return filtered
  }, [patrimonios, filters])

  const municipalityData = useMemo(() => {
    return { 
      name: settings.prefeituraName || MUNICIPALITY_NAME,
      logoUrl: settings.activeLogoUrl || '/logo-government.svg',
      secretaria: settings.secretariaResponsavel || '',
      departamento: settings.departamentoResponsavel || ''
    }
  }, [settings.activeLogoUrl, settings.prefeituraName, settings.secretariaResponsavel, settings.departamentoResponsavel])


  const paperDimensions = useMemo(() => {
    const dimensions = {
      a4: { portrait: { width: '210mm', height: '297mm' }, landscape: { width: '297mm', height: '210mm' } },
      letter: { portrait: { width: '8.5in', height: '11in' }, landscape: { width: '11in', height: '8.5in' } },
      legal: { portrait: { width: '8.5in', height: '14in' }, landscape: { width: '14in', height: '8.5in' } }
    } as const
    
    type PaperSize = keyof typeof dimensions
    type Orientation = 'portrait' | 'landscape'
    
    const size = paperSize as PaperSize
    const orient = orientation as Orientation
    
    const current = dimensions[size]?.[orient] || dimensions.a4.portrait
    
    return {
      width: current.width,
      height: current.height,
      aspectRatio: paperSize === 'a4' && orientation === 'portrait' ? '210/297' :
                  paperSize === 'a4' && orientation === 'landscape' ? '297/210' :
                  paperSize === 'letter' && orientation === 'portrait' ? '8.5/11' :
                  paperSize === 'letter' && orientation === 'landscape' ? '11/8.5' :
                  paperSize === 'legal' && orientation === 'portrait' ? '8.5/14' :
                  paperSize === 'legal' && orientation === 'landscape' ? '14/8.5' : '210/297'
    }
  }, [paperSize, orientation])

  useEffect(() => {
    if (templateId) {
      const foundTemplate = getTemplateById(templateId)
      setTemplate(foundTemplate || null)
    }
  }, [templateId, getTemplateById])

  // Mapeamento de labels otimizados para cabeçalhos
  const getHeaderLabel = (fieldId: string) => {
    const headerLabels: Record<string, string> = {
      'numero_patrimonio': 'Nº Patrimônio',
      'descricao_bem': 'Descrição',
      'tipo': 'Tipo',
      'marca': 'Marca',
      'modelo': 'Modelo',
      'cor': 'Cor',
      'numero_serie': 'Nº Série',
      'data_aquisicao': 'Data de\nAquisição',
      'valor_aquisicao': 'Valor de\nAquisição',
      'quantidade': 'Qtd.',
      'numero_nota_fiscal': 'Nota Fiscal',
      'forma_aquisicao': 'Forma de\nAquisição',
      'setor_responsavel': 'Setor\nResponsável',
      'local_objeto': 'Localização',
      'status': 'Status',
      'situacao_bem': 'Situação\ndo Bem',
      'data_baixa': 'Data da\nBaixa',
      'motivo_baixa': 'Motivo da\nBaixa',
      'entityName': 'Nome da\nEntidade',
      'fotos': 'Qtd.\nFotos',
      'documentos': 'Qtd.\nDocs'
    }
    return headerLabels[fieldId] || fieldId
  }

  // Gerar legendas dinâmicas baseadas nos campos do relatório
  const generateLegend = () => {
    if (!template?.fields) return []
    
    const legendItems: string[] = []
    const usedFields = template.fields.filter(fieldId => fieldId !== ('descricao' as string))
    
    // Adicionar apenas legendas para campos que usam abreviações
    if (usedFields.includes('quantidade')) {
      legendItems.push('Qtd.: Quantidade')
    }
    if (usedFields.includes('numero_patrimonio') || usedFields.includes('numero_serie')) {
      legendItems.push('Nº: Número')
    }
    if (usedFields.includes('fotos')) {
      legendItems.push('Qtd. Fotos: Quantidade de fotos')
    }
    if (usedFields.includes('documentos')) {
      legendItems.push('Qtd. Docs: Quantidade de documentos')
    }
    
    return legendItems
  }

  const getColumnValue = (item: Patrimonio, key: string) => {
    // Ignorar campo 'descricao' duplicado, usar apenas 'descricao_bem'
    if (key === 'descricao') {
      return '' // Retorna vazio para campo duplicado
    }
    
    // ✅ CORREÇÃO: Tratar campo 'tipo' - usar tipoBem.nome se disponível, senão usar tipo direto
    if (key === 'tipo') {
      // Verificar se existe relacionamento tipoBem
      const tipoBem = (item as unknown as Record<string, unknown>).tipoBem as { nome?: string } | undefined
      if (tipoBem && tipoBem.nome) {
        return tipoBem.nome
      }
      // Fallback para campo tipo direto (compatibilidade)
      return item.tipo || ''
    }
    
    // ✅ CORREÇÃO: Garantir que descricao_bem seja exibida sem transformações
    if (key === 'descricao_bem') {
      return item.descricao_bem || ''
    }
    
    // Verificar se o campo existe no item
    if (!(key in item)) {
      // ✅ CORREÇÃO: Verificar também em relacionamentos (para campos aninhados)
      if ((item as unknown as Record<string, unknown>)[key] !== undefined) {
        return String((item as unknown as Record<string, unknown>)[key])
      }
      return 'Campo não encontrado'
    }
    
    const value = item[key as keyof Patrimonio]
    
    // Tratar valores undefined ou null
    if (value === undefined || value === null) {
      return ''
    }
    
    if (value instanceof Date) {
      return formatDate(value)
    }

    if (typeof value === 'string') {
      // Só trata como data se PARECER ISO (YYYY-MM-DD...); evita "2024"/"2025-001"
      // (numero_patrimonio) virarem datas erradas no relatório.
      if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(value)) {
        const parsedDate = new Date(value)
        if (!Number.isNaN(parsedDate.getTime())) {
          return formatDate(parsedDate)
        }
      }
      return value
    }

    if (typeof value === 'number' && key === 'valor_aquisicao')
      return formatCurrency(value)
    if (Array.isArray(value)) return String(value.length)
    return String(value)
  }

  const handlePrint = () => {
    window.print()
  }

  /**
   * Yield para o event loop entre etapas pesadas. Permite que React repinte
   * o spinner/progresso. Usa requestIdleCallback quando disponível.
   */
  const yieldToBrowser = () =>
    new Promise<void>((resolve) => {
      if (typeof (window as { requestIdleCallback?: unknown }).requestIdleCallback === 'function') {
        (window as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => resolve())
      } else {
        setTimeout(resolve, 0)
      }
    })

  const handleDownloadPDF = async () => {
    if (isExportingPDF) return
    setIsExportingPDF(true)
    setPdfStage('Preparando...')
    try {
      setPdfStage('Carregando gerador de PDF...')
      // Tabela via jspdf-autotable: pagina linha a linha (sem cortar linhas como
      // o html2canvas fatiado fazia), repete o cabeçalho em cada página e ajusta
      // a largura das colunas ao conteúdo (sem o mapa fixo de % que espalhava as
      // colunas). Cabeçalho com branding (logo + município + filtros) é desenhado
      // por cima. Lazy-load p/ não pesar o bundle inicial.
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      await yieldToBrowser()

      const isLandscape = orientation === 'landscape'
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: paperSize === 'a4' ? 'a4' : paperSize === 'letter' ? 'letter' : 'legal',
      })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 12

      setPdfStage('Montando relatório...')
      await yieldToBrowser()

      const pageHeight = pdf.internal.pageSize.getHeight()
      const HEADER_H = 34 // espaço reservado p/ o cabeçalho (repetido em toda página)
      const reportTitle = template?.name || 'Relatório'
      const now = new Date()
      const generatedAt = `${formatDate(now)} ${now.toLocaleTimeString('pt-BR')}`

      // Dados do município (todos exibidos no cabeçalho de TODAS as páginas)
      const prefeitura = municipalityData?.name || 'Prefeitura'
      const secretaria = municipalityData?.secretaria || ''
      const departamento = municipalityData?.departamento || ''
      const headerComp = template?.layout?.find((c) => c.type === 'HEADER')
      const subtitle =
        (headerComp?.props as { subtitle?: string } | undefined)?.subtitle ||
        'Relatório de Patrimônio'

      // Logo (carregada uma vez, reaproveitada em cada página)
      let logoDataUrl: string | null = null
      const logoUrl = municipalityData?.logoUrl
      if (logoUrl) {
        try {
          const resp = await fetch(logoUrl)
          const blob = await resp.blob()
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader()
            r.onloadend = () => resolve(r.result as string)
            r.onerror = reject
            r.readAsDataURL(blob)
          })
        } catch {
          logger.debug('Logo não carregada para o PDF', { logoUrl })
        }
      }

      // Cabeçalho com TODAS as informações do município — redesenhado por página.
      const drawHeader = () => {
        let tx = margin
        if (logoDataUrl) {
          try {
            pdf.addImage(logoDataUrl, 'PNG', margin, 7, 20, 15)
            tx = margin + 25
          } catch {
            /* logo inválida — ignora */
          }
        }
        pdf.setTextColor(0)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)
        pdf.text(prefeitura, tx, 12)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(70)
        pdf.setFontSize(8.5)
        let hy = 17
        pdf.text(MUNICIPALITY_NAME_WITH_UF, tx, hy)
        hy += 4
        if (secretaria) { pdf.text(secretaria, tx, hy); hy += 4 }
        if (departamento) { pdf.text(departamento, tx, hy); hy += 4 }
        pdf.setFont('helvetica', 'italic')
        pdf.text(subtitle, tx, hy)
        pdf.setFont('helvetica', 'normal')
        // Data de geração (topo direito)
        pdf.setFontSize(8.5)
        pdf.setTextColor(70)
        pdf.text('Data de geração:', pageWidth - margin, 10, { align: 'right' })
        pdf.text(generatedAt, pageWidth - margin, 14, { align: 'right' })
        pdf.setTextColor(0)
        pdf.setDrawColor(200)
        pdf.line(margin, HEADER_H - 3, pageWidth - margin, HEADER_H - 3)
      }

      // Resumo de filtros + total — só na 1ª página, logo abaixo do cabeçalho.
      const filterParts: string[] = []
      if (filters.status) filterParts.push(`Status: ${filters.status}`)
      if (filters.situacao_bem) filterParts.push(`Situação: ${filters.situacao_bem}`)
      if (filters.setor) filterParts.push(`Setor: ${filters.setor}`)
      if (filters.tipo) filterParts.push(`Tipo: ${filters.tipo}`)
      if (filters.dateFrom || filters.dateTo) {
        filterParts.push(
          `Período: ${filters.dateFrom ? formatDate(filters.dateFrom) : '...'} até ${filters.dateTo ? formatDate(filters.dateTo) : '...'}`,
        )
      }
      const filterLines =
        filterParts.length > 0
          ? pdf.splitTextToSize(`Filtros: ${filterParts.join('   •   ')}`, pageWidth - margin * 2)
          : []
      const filtersH = (filterLines.length > 0 ? filterLines.length * 4 + 1 : 0) + 5
      const drawFilters = () => {
        let fy = HEADER_H + 1
        if (filterLines.length > 0) {
          pdf.setFontSize(8)
          pdf.setTextColor(40, 80, 160)
          pdf.text(filterLines, margin, fy)
          fy += filterLines.length * 4 + 1
        }
        pdf.setFontSize(8)
        pdf.setTextColor(90)
        pdf.text(`Total de registros: ${filteredPatrimonios.length}`, margin, fy)
        pdf.setTextColor(0)
      }

      // --- Tabela (autotable) ---
      const fields = (template?.fields || []).filter((f) => f !== ('descricao' as string))
      const head = [fields.map((f) => getHeaderLabel(f))]
      const body = filteredPatrimonios.map((item) =>
        fields.map((f) => getColumnValue(item, f)),
      )
      // Colunas numéricas/moeda alinhadas à direita (mais legível).
      const numericFields = new Set([
        'valor_aquisicao',
        'quantidade',
        'vida_util_anos',
        'valor_residual',
      ])
      const columnStyles: Record<number, { halign: 'right' }> = {}
      fields.forEach((f, i) => {
        if (numericFields.has(f)) columnStyles[i] = { halign: 'right' }
      })

      autoTable(pdf, {
        head,
        body,
        startY: HEADER_H + filtersH,
        styles: { fontSize: isLandscape ? 8 : 9, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles,
        // top reserva o cabeçalho em TODAS as páginas; bottom reserva o rodapé.
        margin: { left: margin, right: margin, top: HEADER_H, bottom: 14 },
        tableWidth: 'auto',
        didDrawPage: (data) => {
          drawHeader()
          if (data.pageNumber === 1) drawFilters()
        },
      })

      // --- Assinatura ao final (responsável pelo patrimônio) ---
      const lastAutoTable = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      let finalY = lastAutoTable?.finalY ?? HEADER_H + filtersH
      const SIG_BLOCK_H = 46
      if (finalY + SIG_BLOCK_H > pageHeight - 14) {
        pdf.addPage()
        drawHeader()
        finalY = HEADER_H
      }
      let sy = finalY + 16
      pdf.setFontSize(10)
      pdf.setTextColor(0)
      pdf.setFont('helvetica', 'normal')
      // Local (município - UF) e data de geração
      pdf.text(`${MUNICIPALITY_NAME_WITH_UF}, ${formatDate(now)}.`, pageWidth - margin, sy, {
        align: 'right',
      })
      sy += 20
      const lineW = 80
      const cx = pageWidth / 2
      pdf.setDrawColor(0)
      pdf.line(cx - lineW / 2, sy, cx + lineW / 2, sy)
      sy += 5
      pdf.setFontSize(10)
      pdf.text('Responsável pelo Patrimônio', cx, sy, { align: 'center' })

      // --- Rodapé "i/total" em TODAS as páginas (segunda passada: total já existe) ---
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(120)
        pdf.text(reportTitle, margin, pageHeight - 6)
        pdf.text(`${i}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
        pdf.setTextColor(0)
      }

      const filename = `${reportTitle.replace(/\s+/g, '_')}_${formatDate(now, 'yyyy-MM-dd')}.pdf`
      setPdfStage('Salvando arquivo...')
      await yieldToBrowser()
      pdf.save(filename)

      logger.debug('PDF gerado com sucesso', { filename })

    } catch (error) {
      logger.error('Erro ao gerar PDF:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
      })
    } finally {
      setIsExportingPDF(false)
      setPdfStage('')
    }
  }


  const renderComponent = (component: ReportComponent) => {
    const style = { ...component.styles }
    switch (component.type) {
      case 'HEADER':
        return (
          <div className="border-b-2 border-gray-300 pb-4 mb-6 report-header" style={style}>
            {/* Cabeçalho Principal */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img
                  src={municipalityData?.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto"
                  onError={(e) => {
                    logger.debug('Erro ao carregar logo', { logoUrl: municipalityData?.logoUrl })
                    e.currentTarget.src = '/logo-government.svg'
                  }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{municipalityData?.name}</h1>
                  <p className="text-sm text-gray-500">
                    {component.props?.subtitle || 'Relatório de Patrimônio'}
                  </p>
                  
                  {/* Informações Personalizadas - Logo abaixo do subtítulo */}
                  {component.props?.customLines && component.props.customLines.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {component.props.customLines.map((line: string, index: number) => (
                        <p key={index} className="text-xs text-gray-600">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Data: {formatDate(new Date())}</p>
                <p>Horário: {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>
            
            {/* Indicador de Filtros Aplicados */}
            {(filters.status || filters.situacao_bem || filters.setor || filters.tipo || filters.dateFrom || filters.dateTo) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs font-semibold text-blue-800 mb-2">Filtros Aplicados:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.status && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Status: <strong className="ml-1">{filters.status}</strong>
                    </span>
                  )}
                  {filters.situacao_bem && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Situação: <strong className="ml-1">{filters.situacao_bem}</strong>
                    </span>
                  )}
                  {filters.setor && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Setor: <strong className="ml-1">{filters.setor}</strong>
                    </span>
                  )}
                  {filters.tipo && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Tipo: <strong className="ml-1">{filters.tipo}</strong>
                    </span>
                  )}
                  {(filters.dateFrom || filters.dateTo) && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Período: <strong className="ml-1">
                        {filters.dateFrom ? formatDate(filters.dateFrom) : '...'} até {filters.dateTo ? formatDate(filters.dateTo) : '...'}
                      </strong>
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Total de registros: <strong>{filteredPatrimonios.length}</strong> {filteredPatrimonios.length === 1 ? 'bem' : 'bens'}
                </p>
              </div>
            )}
          </div>
        )
      case 'TABLE':
        return (
          <div style={{ width: '100%', overflow: 'hidden', ...style }}>
            <Table style={{ width: '100%', tableLayout: 'fixed', fontSize: '12px' }}>
              <TableHeader>
                <TableRow>
                  {template?.fields
                    .filter(fieldId => fieldId !== ('descricao' as string)) // Filtrar campo 'descricao' duplicado
                    .map((fieldId) => (
                    <TableHead 
                      key={fieldId}
                      style={{ 
                        padding: '8px 6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        whiteSpace: 'pre-line',
                        lineHeight: '1.2',
                        width: (() => {
                          const columnWidths: Record<string, string> = {
                            'numero_patrimonio': '15%',
                            'setor_responsavel': '20%',
                            'status': '10%',
                            'valor_aquisicao': '12%',
                            'descricao_bem': '25%',
                            'tipo': '10%',
                            'quantidade': '8%'
                          }
                          return columnWidths[fieldId] || `${Math.floor(100 / (template?.fields.length || 1))}%`
                        })()
                      }}
                    >
                      {getHeaderLabel(fieldId)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatrimonios.map((item) => (
                  <TableRow key={item.id}>
                    {template?.fields
                      .filter(fieldId => fieldId !== ('descricao' as string)) // Filtrar campo 'descricao' duplicado
                      .map((fieldId) => (
                      <TableCell 
                        key={`${item.id}-${fieldId}`}
                        style={{ 
                          padding: '6px 4px',
                          fontSize: '11px',
                          lineHeight: '1.3',
                          wordWrap: 'break-word',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {getColumnValue(item, fieldId)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      case 'TEXT':
        return <p style={style}>{component.props?.content}</p>
      case 'FOOTER': {
        const isPageBottom = component.props?.position === 'page-bottom'
        return (
          <div 
            className={`text-xs ${isPageBottom ? 'footer-page-bottom' : ''}`}
            style={{
              ...style,
              textAlign: component.props?.alignment || 'center',
              position: isPageBottom ? 'absolute' : (component.props?.position || 'relative'),
              bottom: isPageBottom ? '0' : 'auto',
              left: isPageBottom ? '0' : 'auto',
              right: isPageBottom ? '0' : 'auto',
              width: isPageBottom ? '100%' : 'auto',
              marginTop: isPageBottom ? '0' : (component.props?.marginTop || '20px'),
              padding: component.props?.padding || '10px 0',
              borderTop: component.props?.showBorder ? '1px solid #e5e7eb' : 'none',
              backgroundColor: isPageBottom ? '#ffffff' : 'transparent',
              zIndex: isPageBottom ? 10 : 'auto'
            }}
          >
            {/* Conteúdo personalizado do footer */}
            {component.props?.customContent && (
              <div className="mb-2">
                {component.props.customContent.split('\n').map((line: string, index: number) => (
                  <p key={index} className="mb-1">
                    {line}
                  </p>
                ))}
              </div>
            )}
            
            {/* Informações automáticas */}
            <div className="text-gray-500">
              <p>Página 1 de 1 - {template?.name} - Gerado por SISPAT</p>
              {component.props?.showDate && (
                <p>Data de geração: {formatDate(new Date())}</p>
              )}
            </div>
          </div>
        )
      }
      default:
        return (
          <div className="flex items-center justify-center h-full bg-muted rounded-md">
            Componente '{component.type}' não implementado.
          </div>
        )
    }
  }

  if (template === undefined)
    return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />
  if (template === null)
    return (
      <div className="text-center mt-10">
        <ServerCrash className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Relatório não encontrado</h2>
      </div>
    )
  if (!template.layout || !Array.isArray(template.layout))
    return (
      <div className="text-center mt-10">
        <ServerCrash className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Layout do relatório não encontrado</h2>
      </div>
    )
  if (!template.fields || !Array.isArray(template.fields))
    return (
      <div className="text-center mt-10">
        <ServerCrash className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Campos do relatório não encontrados</h2>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {/* Estilos para impressão */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'a4' ? 'A4' : paperSize === 'letter' ? 'Letter' : 'Legal'} ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 0.5cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .no-print {
            display: none !important;
          }
          
          .printable-area {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            outline: none !important;
            ${orientation === 'landscape' ? `
              transform: rotate(0deg) !important;
              max-width: 100% !important;
            ` : ''}
          }
          
          .report-grid {
            padding: 0 !important;
            background: white !important;
            border: none !important;
            margin: 0 !important;
          }
          
          /* Footer no final da página */
          .footer-page-bottom {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            background: white !important;
            border-top: 1px solid #e5e7eb !important;
            padding: 10px 0 !important;
            z-index: 10 !important;
          }
          
          /* Ajustar conteúdo quando footer está no final da página */
          .printable-area:has(.footer-page-bottom) {
            padding-bottom: 60px !important;
          }
          
          .a4-size {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            background: white !important;
            border: none !important;
          }
          
          .portrait-orientation {
            width: 100% !important;
            height: auto !important;
            background: white !important;
            border: none !important;
          }
          
          .landscape-orientation {
            width: 100% !important;
            height: auto !important;
            background: white !important;
            border: none !important;
          }

          .a4-portrait,
          .a4-landscape,
          .letter-portrait,
          .letter-landscape,
          .legal-portrait,
          .legal-landscape {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            aspect-ratio: unset !important;
            background: white !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          table {
            page-break-inside: avoid;
            border-collapse: collapse;
            width: 100% !important;
            table-layout: fixed !important;
            background: white !important;
            border: none !important;
            ${orientation === 'landscape' ? `
              font-size: 9px !important;
            ` : ''}
          }
          
          th, td {
            border: 1px solid #000 !important;
            padding: ${orientation === 'landscape' ? '3px 2px' : '4px 3px'} !important;
            font-size: ${orientation === 'landscape' ? '9px' : '10px'} !important;
            line-height: 1.3 !important;
            word-wrap: break-word !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            background: white !important;
          }
          
          th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            font-size: ${orientation === 'landscape' ? '10px' : '11px'} !important;
            white-space: pre-line !important;
            line-height: 1.2 !important;
          }
          
          /* Estilos específicos para o cabeçalho */
          .report-header {
            border-bottom: 2px solid #d1d5db !important;
            padding-bottom: 16px !important;
            margin-bottom: 24px !important;
          }
          
          .report-header h1 {
            font-size: 20px !important;
            font-weight: bold !important;
            color: #1f2937 !important;
            margin: 0 !important;
          }
          
          .report-grid {
            padding: 8px !important;
            background: white !important;
            border: none !important;
          }
          
          /* Remove any container borders and backgrounds */
          div, section, article, main {
            background: white !important;
            border: none !important;
            outline: none !important;
          }
          
          /* Ensure no gray borders */
          .border, .border-gray, .border-gray-200, .border-gray-300 {
            border: none !important;
          }
          
          /* Remove shadows */
          .shadow, .shadow-lg, .shadow-md, .shadow-sm {
            box-shadow: none !important;
          }
          
          /* Specific clean print styles */
          .print-clean {
            background: white !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Remove any parent container styling */
          .print-clean * {
            background: white !important;
            border: none !important;
            outline: none !important;
          }
          
          /* Keep only table borders */
          .print-clean table,
          .print-clean th,
          .print-clean td {
            border: 1px solid #000 !important;
          }
          
          .print-clean th {
            background-color: #f5f5f5 !important;
          }
          
          /* Remove container background and borders */
          .print-container {
            background: white !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Remove any background from parent elements */
          .bg-muted, .bg-gray-100, .bg-gray-200 {
            background: white !important;
          }
        }
      `}</style>

      <Breadcrumb className="no-print">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/relatorios">Relatórios</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Visualizar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between no-print">
        <h1 className="text-xl font-bold">{template.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/relatorios/templates/editor/${template.id}`}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Design
            </Link>
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" disabled={isExportingPDF}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingPDF ? (pdfStage || 'Gerando PDF...') : 'Baixar PDF'}
          </Button>
        </div>
      </div>
      <Card className="no-print">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={paperSize} onValueChange={setPaperSize}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="letter">Carta</SelectItem>
                <SelectItem value="legal">Ofício</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orientation} onValueChange={setOrientation}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Retrato</SelectItem>
                <SelectItem value="landscape">Paisagem</SelectItem>
              </SelectContent>
            </Select>
            {orientation === 'landscape' && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                <span className="text-sm">⚠️ Configure a impressora para orientação paisagem</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div
        className={cn(
          'p-8 bg-muted flex justify-center overflow-auto print-container',
          `paper-${paperSize}`,
          orientation,
        )}
      >
        <div
          id="printable-area"
          ref={reportRef}
          className="bg-white shadow-lg printable-area print-clean"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top',
            width: paperDimensions.width,
            // minHeight (não height fixo) + overflow visível: o conteúdo flui além
            // de 1 página, então relatórios longos não são cortados e o html2canvas
            // captura o scrollHeight inteiro (todas as páginas). aspectRatio removido
            // pois forçaria a caixa de volta à proporção de 1 página.
            minHeight: paperDimensions.height,
            maxWidth: 'none',
            flexShrink: 0,
            overflow: 'visible'
          }}
        >
          <div className="p-6 report-grid" style={{ width: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
            {template.layout.map((comp) => (
              <div
                key={comp.id}
                style={{
                  gridColumn: `span ${comp.w}`,
                  gridRow: `span ${comp.h}`,
                }}
              >
                {renderComponent(comp)}
              </div>
            ))}
            
          </div>
        </div>
      </div>
      
      {/* Rodapé com legendas - apenas se houver legendas */}
      {generateLegend().length > 0 && (
        <div 
          className="no-print"
          style={{
            marginTop: '20px',
            padding: '8px 12px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '9px',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '4px'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '10px' }}>Legenda:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {generateLegend().map((item, index) => (
              <span key={index} style={{ whiteSpace: 'nowrap' }}>
                <strong>{item.split(':')[0]}:</strong> {item.split(':')[1]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportView
