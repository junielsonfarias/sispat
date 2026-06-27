import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FEATURES } from '@/lib/features'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  formatDate,
  formatCurrency,
  formatRelativeDate,
  getCloudImageUrl,
} from '@/lib/utils'
import { LOCAL_IMAGES } from '@/lib/image-utils'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import {
  Edit,
  Printer,
  Trash2,
  Clock,
  Send,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  FileText,
  QrCode,
  AlertCircle,
  Gift,
} from 'lucide-react'
import { Patrimonio, Note, TransferenciaType } from '@/types'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { usePermissions } from '@/hooks/usePermissions'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useLabelTemplates } from '@/hooks/useLabelTemplates'
import { toast } from '@/hooks/use-toast'
import { LabelPreview } from '@/components/LabelPreview'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubPatrimoniosManager } from '@/components/bens/SubPatrimoniosManager'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { SimplePrintForm } from '@/components/bens/SimplePrintForm'
import { PrintConfigDialog } from '@/components/PrintConfigDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BaixaBemModal } from '@/components/BaixaBemModal'
import { AssetTransferForm } from '@/components/bens/AssetTransferForm'
import { generatePatrimonioPDF } from '@/components/bens/PatrimonioPDFGenerator'
import { PDFConfigDialog } from '@/components/bens/PDFConfigDialog'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'
import { unwrapItem } from '@/services/api-helpers'

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-base sm:text-sm font-medium text-muted-foreground">{label}</p>
    <div className="text-base sm:text-sm">{value}</div>
  </div>
)

function BensView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchPatrimonioById, deletePatrimonio } = usePatrimonio()
  const { hasPermission } = usePermissions()
  // RBAC de UI: esconde ações mutantes de quem não tem permissão (o backend
  // também reforça). visualizador é read-only; delete fica com admin/superuser.
  const canUpdate = hasPermission('bens:update')
  const canDelete = hasPermission('bens:delete')
  const { settings } = useCustomization()
  const { templates: labelTemplates } = useLabelTemplates()
  
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null)
  const [_isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [historyVisibleCount, setHistoryVisibleCount] = useState(10)
  const [selectedPrintFields, setSelectedPrintFields] = useState<string[]>([])
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false)
  const [selectedLabelTemplate, setSelectedLabelTemplate] = useState<any>(null)
  const labelPrintRef = useRef<HTMLDivElement>(null)
  const [labelPrintOptions, setLabelPrintOptions] = useState({
    copies: 1,
    showCutGuides: true,
    showBorders: false,
    orientation: 'portrait' as 'portrait' | 'landscape',
  })
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [transferType, setTransferType] = useState<TransferenciaType>('transferencia')
  const [isPDFConfigOpen, setIsPDFConfigOpen] = useState(false)

  // ✅ Selecionar automaticamente o template padrão quando disponível
  useEffect(() => {
    if (isLabelDialogOpen && labelTemplates.length > 0 && !selectedLabelTemplate) {
      // Buscar template padrão ou usar o primeiro
      const defaultTemplate = labelTemplates.find(t => t.isDefault) || labelTemplates[0]
      setSelectedLabelTemplate(defaultTemplate)
      logger.debug('Template padrão selecionado automaticamente', { name: defaultTemplate?.name })
    }
  }, [isLabelDialogOpen, labelTemplates, selectedLabelTemplate])

  // ✅ Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P ou Cmd+P: Abrir impressão de etiqueta
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && patrimonio && !isLabelDialogOpen) {
        e.preventDefault()
        setIsLabelDialogOpen(true)
        return
      }

      // Esc: Fechar diálogos
      if (e.key === 'Escape') {
        if (isLabelDialogOpen) {
          setIsLabelDialogOpen(false)
        }
        if (isPrintDialogOpen) {
          setIsPrintDialogOpen(false)
        }
      }

      // Enter: Imprimir quando no diálogo de etiqueta (se template selecionado)
      if (e.key === 'Enter' && isLabelDialogOpen && selectedLabelTemplate && patrimonio && e.target instanceof HTMLElement && !['TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
        e.preventDefault()
        // Trigger print button click
        const printButton = document.querySelector('[data-print-label-btn]') as HTMLButtonElement
        if (printButton) {
          printButton.click()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [patrimonio, isLabelDialogOpen, isPrintDialogOpen, selectedLabelTemplate])

  const loadPatrimonio = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setLoadError(false)
    try {
      logger.debug('BensView - Carregando patrimônio do backend', { id })
      // Buscar sempre do backend para garantir dados atualizados
      const response = await fetchPatrimonioById(id)
      const data = response.patrimonio || response
      logger.debug('BensView - Patrimônio carregado', {
        id: data.id,
        fotos: data.fotos,
        fotosLength: data.fotos?.length,
        fotosDetalhes: data.fotos?.map((f: any, i: number) => ({
          index: i,
          tipo: typeof f,
          valor: f,
        })),
      })
      setPatrimonio(data)
      logger.debug('BensView - Estado patrimonio atualizado')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao carregar patrimônio:', error)
      }
      setLoadError(true)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados do bem.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, fetchPatrimonioById])

  useEffect(() => {
    loadPatrimonio()
  }, [loadPatrimonio])

  const handleSaveNote = async () => {
    if (!patrimonio || !newNote.trim()) return

    logger.debug('Salvando nota para patrimônio', { id: patrimonio.id, text: newNote.trim() })

    setIsSavingNote(true)
    try {
      // Criar nota usando rota específica
      const response = await api.post<unknown>(`/patrimonios/${patrimonio.id}/notes`, {
        text: newNote.trim()
      })

      logger.debug('Resposta da API', { response })

      // Extrair nota da resposta
      const noteData = unwrapItem<{ id: string; text: string; date: string; userId: string; userName: string }>(response, 'note')

      logger.debug('Dados da nota extraídos', { noteData })

      // ✅ CORREÇÃO: Mapear campos corretamente do backend para o frontend
      const newNoteObj: Note = {
        id: noteData.id,
        text: noteData.text, // Backend usa 'text', não 'content'
        date: new Date(noteData.date), // Backend usa 'date', não 'createdAt'
        userId: noteData.userId,
        userName: noteData.userName, // Backend usa 'userName', não 'author'
      }

      logger.debug('Objeto nota mapeado', { newNoteObj })

      const updatedPatrimonio = {
        ...patrimonio,
        notes: [...(patrimonio.notes || []), newNoteObj],
      }

      logger.debug('Patrimônio atualizado', {
        id: updatedPatrimonio.id,
        notasCount: updatedPatrimonio.notes?.length || 0
      })

      setPatrimonio(updatedPatrimonio)
      setNewNote('')
      
      toast({
        title: 'Nota adicionada!',
        description: 'A nota foi salva com sucesso.',
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [ERROR] Erro ao salvar nota:', error)
        console.error('❌ [ERROR] Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          response: error instanceof Error && 'response' in error ? (error as Record<string, unknown>)['response'] : 'N/A'
        })
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar nota',
        description: `Não foi possível salvar a nota. ${error instanceof Error ? error.message : 'Tente novamente.'}`,
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleDelete = async () => {
    if (!patrimonio) return

    setIsDeleting(true)
    try {
      await deletePatrimonio(patrimonio.id)
      toast({ title: 'Sucesso', description: 'Patrimônio excluído com sucesso.' })
      navigate('/bens-cadastrados')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao excluir patrimônio:', error)
      }
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível excluir o patrimônio. Tente novamente.'
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  const openTransferDialog = (type: TransferenciaType) => {
    setTransferType(type)
    setIsTransferDialogOpen(true)
  }

  const handleOpenPDFConfig = () => {
    setIsPDFConfigOpen(true)
  }

  const handleGeneratePDF = async (selectedSections: string[], templateId?: string) => {
    if (!patrimonio) return
    
    logger.debug('[BensView] handleGeneratePDF chamado', {
      patrimonioId: patrimonio.id,
      numeroPatrimonio: patrimonio.numero_patrimonio,
      templateId,
      selectedSections,
      sectionsCount: selectedSections.length
    })
    
    setIsGeneratingPDF(true)
    
    try {
      // Gerar PDF com as seções selecionadas e template
      const success = await generatePatrimonioPDF({
        patrimonio,
        municipalityName: settings.prefeituraName || 'Prefeitura Municipal',
        municipalityLogo: settings.activeLogoUrl || '/logo-government.svg',
        selectedSections,
        templateId,
      })
      
      if (success) {
        toast({
          title: 'PDF Gerado!',
          description: 'A ficha do bem foi gerada com sucesso.',
        })
      } else {
        throw new Error('Falha ao gerar PDF')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao gerar PDF:', error)
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handlePrintFichaOld = async (selectedFields: string[]) => {
    if (!patrimonio) return
    
    setSelectedPrintFields(selectedFields)
    setIsPrintDialogOpen(false)
    setIsGeneratingPDF(true)
    
    try {
      // Obter logo do contexto de customização
      const logoUrl = settings.activeLogoUrl
      
      // Gerar PDF com os campos selecionados
      await generatePatrimonioPDF({
        patrimonio,
        selectedSections: selectedFields,
        municipalityLogo: logoUrl || undefined,
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao gerar PDF:', error)
      }
      // Fallback para impressão tradicional se PDF falhar
      setTimeout(() => {
        const printElement = document.getElementById('printable-content')
        if (printElement) {
          window.print()
        }
      }, 500)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const depreciationData = useMemo(() => {
    if (!patrimonio) return null
    return calculateDepreciation(patrimonio)
  }, [patrimonio])

  const currentValue = useMemo(() => {
    return depreciationData?.bookValue || 0
  }, [depreciationData])

  if (!patrimonio) {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            {loadError ? (
              <>
                <p className="mb-4 text-muted-foreground">
                  Não foi possível carregar os dados do bem.
                </p>
                <Button variant="outline" onClick={() => loadPatrimonio()}>
                  Tentar novamente
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando patrimônio...</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/bens-cadastrados')}
                aria-label="Voltar para bens cadastrados"
                className="touch-target"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {canUpdate && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/bens-cadastrados/editar/${patrimonio.id}`)}
                  className="touch-target"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleOpenPDFConfig}
                disabled={isGeneratingPDF}
                className="touch-target"
              >
                <Printer className="mr-2 h-4 w-4" />
                {isGeneratingPDF ? 'Gerando PDF...' : 'Gerar Ficha PDF'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedLabelTemplate(null)
                  setIsLabelDialogOpen(true)
                }}
                className="touch-target"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Imprimir Etiqueta
              </Button>
              
              {canUpdate && patrimonio.status !== 'baixado' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openTransferDialog('transferencia')}
                    className="touch-target border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Transferir
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => openTransferDialog('doacao')}
                    className="touch-target border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Doar
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setIsBaixaModalOpen(true)}
                    className="touch-target border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Registrar Baixa
                  </Button>
                </>
              )}
              
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="touch-target">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este bem patrimonial? Esta ação
                        não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          'Excluir'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* First Row - Photo and Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Photo Section */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-foreground">
                    <ImageIcon className="h-5 w-5" />
                    Imagens
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {patrimonio.fotos && patrimonio.fotos.length > 0 ? (
                    <Carousel className="w-full">
                      <CarouselContent>
                        {(() => {
                          const fotos = patrimonio.fotos || []
                          logger.debug('Renderizando carrossel com fotos', {
                            total: fotos.length,
                            fotos: fotos,
                            tipos: fotos.map((f: any) => typeof f),
                          })
                          // ✅ CORREÇÃO: Backend já normaliza as fotos, mas manter compatibilidade
                          return fotos.map((foto: any) => {
                            if (typeof foto === 'string') return foto
                            if (typeof foto === 'object' && foto !== null) {
                              return foto.file_url || foto.url || foto.id || foto.fileName || String(foto)
                            }
                            return String(foto)
                          }).filter((f: string) => f && f.trim() !== '')
                        })().map((fotoId, index) => (
                          <CarouselItem key={index}>
                            <div className="relative flex items-center justify-center bg-muted rounded-lg min-h-[400px]">
                              <img
                                src={getCloudImageUrl(String(fotoId))}
                                alt={`${patrimonio.descricao_bem} - Foto ${index + 1}`}
                                loading="lazy"
                                className="rounded-lg object-contain w-full h-full max-h-[600px]"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  const originalSrc = target.src
                                  console.error('❌ Erro ao carregar foto:', {
                                    fotoId,
                                    url: originalSrc,
                                    patrimonioId: patrimonio.id
                                  })
                                  // Usar placeholder do LOCAL_IMAGES
                                  target.src = LOCAL_IMAGES.PLACEHOLDER_IMAGE
                                }}
                                onLoad={() => {
                                  logger.debug('Foto carregada com sucesso', { fotoId })
                                }}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {patrimonio.fotos.length > 1 && (
                        <>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </>
                      )}
                    </Carousel>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhuma imagem disponível
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Basic Information - First Row */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-card h-full">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                        <p className="text-base text-foreground mt-1 font-medium">{patrimonio.descricao_bem}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Número do Patrimônio</label>
                        <div className="mt-1">
                          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                            {patrimonio.numero_patrimonio}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {patrimonio.tipo || 'Não informado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Situação</label>
                        <div className="mt-1">
                          <Badge
                            className={`text-sm px-3 py-1 ${
                              // situacao_bem é gravado em lowercase pelo backend; normalizar
                              // antes de comparar, senão o badge fica sempre cinza (default).
                              (patrimonio.situacao_bem || '').toUpperCase() === 'OTIMO' ? 'bg-green-100 text-green-800 border-green-200' :
                              (patrimonio.situacao_bem || '').toUpperCase() === 'BOM' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              (patrimonio.situacao_bem || '').toUpperCase() === 'REGULAR' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              (patrimonio.situacao_bem || '').toUpperCase() === 'RUIM' ? 'bg-red-100 text-red-800 border-red-200' :
                              (patrimonio.situacao_bem || '').toUpperCase() === 'PESSIMO' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            } border font-medium`}
                          >
                            {patrimonio.situacao_bem}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Valor de Aquisição</label>
                        <p className="text-lg text-foreground mt-1 font-semibold">{formatCurrency(patrimonio.valor_aquisicao)}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Aquisição</label>
                        <p className="text-base text-foreground mt-1">{formatDate(patrimonio.data_aquisicao)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Second Row - Detailed Information */}
          <div className="space-y-6">
            {/* Financial Information */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <DetailItem 
                    label="Valor Atual" 
                    value={
                      <span className="text-green-600 font-medium">
                        {formatCurrency(currentValue)}
                      </span>
                    } 
                  />
                  <DetailItem 
                    label="Forma de Aquisição" 
                    value={patrimonio.forma_aquisicao} 
                  />
                  {/* Exibir informações de referência se disponíveis */}
                  {patrimonio.numero_licitacao && (
                    <DetailItem 
                      label="Número de Referência" 
                      value={
                        <span className="text-blue-700 font-medium">
                          {patrimonio.numero_licitacao}
                        </span>
                      } 
                    />
                  )}
                  {patrimonio.ano_licitacao && (
                    <DetailItem 
                      label="Ano de Referência" 
                      value={
                        <span className="text-blue-700 font-medium">
                          {patrimonio.ano_licitacao}
                        </span>
                      } 
                    />
                  )}
                  {depreciationData && (
                    <>
                      <DetailItem 
                        label="Depreciação Acumulada" 
                        value={
                          <span className="text-red-600 font-medium">
                            {formatCurrency(depreciationData.accumulatedDepreciation)}
                          </span>
                        } 
                      />
                      <DetailItem 
                        label="Taxa de Depreciação" 
                        value={`${depreciationData.depreciationRate}% ao ano`} 
                      />
                      <DetailItem 
                        label="Vida Útil Restante" 
                        value={`${depreciationData.remainingLife} anos`} 
                      />
                      <DetailItem 
                        label="Depreciação Mensal" 
                        value={
                          <span className="text-orange-600 font-medium">
                            {formatCurrency(depreciationData.monthlyDepreciation)}
                          </span>
                        } 
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technical Information */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Técnicas</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DetailItem label="Marca" value={patrimonio.marca || 'Não informado'} />
                  <DetailItem label="Modelo" value={patrimonio.modelo || 'Não informado'} />
                  <DetailItem label="Cor" value={patrimonio.cor || 'Não informado'} />
                  <DetailItem label="Número de Série" value={patrimonio.numero_serie || 'Não informado'} />
                  <DetailItem label="Quantidade" value={patrimonio.quantidade?.toString() || '1'} />
                  <DetailItem label="Número da Nota Fiscal" value={patrimonio.numero_nota_fiscal || 'Não informado'} />
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Localização</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="Setor Responsável" value={patrimonio.setor_responsavel} />
                  <DetailItem label="Local do Objeto" value={patrimonio.local_objeto} />
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-foreground">
                  <Clock className="h-5 w-5" />
                  Histórico de Movimentação
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {/* Entrada de criação */}
                    {patrimonio.createdAt && (
                      <div className="flex gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-green-100 text-green-700">
                            C
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-green-800">Criação do Patrimônio</p>
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                              {formatDate(patrimonio.createdAt)}
                            </Badge>
                          </div>
                          <p className="text-sm text-green-600">
                            Patrimônio criado por {patrimonio.createdBy}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Histórico de movimentação — paginado em blocos de 10
                        para não estourar a Card com bens muito movimentados (M3) */}
                    {(() => {
                      const all =
                        patrimonio.historico_movimentacao ||
                        []
                      const visible = all.slice(0, historyVisibleCount)
                      return (
                        <>
                          {visible.map((entry, index) => (
                            <div key={index} className="flex gap-4 p-4 border rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {entry.action[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{entry.action}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {formatDate(entry.date)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {entry.details}
                                </p>
                              </div>
                            </div>
                          ))}
                          {historyVisibleCount < all.length && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setHistoryVisibleCount((c) => c + 10)}
                            >
                              Mostrar mais ({all.length - historyVisibleCount} restantes)
                            </Button>
                          )}
                        </>
                      )
                    })()}
                    
                    {/* Mensagem quando não há histórico além da criação */}
                    {(!patrimonio.historico_movimentacao || patrimonio.historico_movimentacao.length === 0) &&
                     !patrimonio.createdAt && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum histórico disponível</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-foreground">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                  {/* Add Note Form */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Adicionar uma observação..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveNote}
                        disabled={!newNote.trim() || isSavingNote}
                        size="sm"
                      >
                        {isSavingNote ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3">
                    {patrimonio.notes?.map((note: Note) => (
                      <div key={note.id} className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{note.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(note.date)}
                          </p>
                        </div>
                        <p className="text-sm">{note.text}</p>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma observação adicionada</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sub-Patrimônios — escondido via feature flag até backend estar pronto */}
            {FEATURES.subPatrimonios && (
              <SubPatrimoniosManager
                patrimonioId={patrimonio.id}
                patrimonioNumero={patrimonio.numero_patrimonio}
                isKit={patrimonio.eh_kit ?? false}
                quantidadeUnidades={patrimonio.quantidade_unidades}
              />
            )}
          </div>
        </div>

        {/* Print Dialog */}
        <PrintConfigDialog
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          onConfirm={handlePrintFichaOld}
          assetType="patrimonio"
        />

        {/* Label Dialog */}
        <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta - {patrimonio?.numero_patrimonio}</DialogTitle>
              <DialogDescription>
                Selecione um modelo de etiqueta e visualize como ficará impressa.
              </DialogDescription>
            </DialogHeader>
            {patrimonio && (
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Selecione o Modelo de Etiqueta</h3>
                  {labelTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">Nenhum modelo de etiqueta encontrado.</p>
                      <p className="text-sm">
                        Crie um novo modelo em{' '}
                        <Link to="/ferramentas/gerenciar-etiquetas" className="text-blue-600 hover:underline">
                          Gerenciar Etiquetas
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {labelTemplates.map((template) => (
                        <div
                          key={template.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedLabelTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedLabelTemplate(template)}
                        >
                          <div className="font-medium text-sm mb-2">
                            {template.name}
                            {template.isDefault && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.width}x{template.height}mm
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {selectedLabelTemplate && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Visualização da Etiqueta</h3>
                    <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                      <LabelPreview 
                        asset={{ ...patrimonio, assetType: 'bem' }} 
                        template={selectedLabelTemplate}
                      />
                    </div>
                    {/* Opções Avançadas de Impressão */}
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <h4 className="text-sm font-medium">Opções de Impressão</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-600">Número de Cópias</label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={labelPrintOptions.copies}
                            onChange={(e) =>
                              setLabelPrintOptions((prev) => ({
                                ...prev,
                                copies: Math.max(1, parseInt(e.target.value) || 1),
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Orientação</label>
                          <Select
                            value={labelPrintOptions.orientation}
                            onValueChange={(value: 'portrait' | 'landscape') =>
                              setLabelPrintOptions((prev) => ({ ...prev, orientation: value }))
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">Retrato</SelectItem>
                              <SelectItem value="landscape">Paisagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="cut-guides"
                            checked={labelPrintOptions.showCutGuides}
                            onChange={(e) =>
                              setLabelPrintOptions((prev) => ({ ...prev, showCutGuides: e.target.checked }))
                            }
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="cut-guides" className="text-sm cursor-pointer">
                            Mostrar Guias de Corte
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="borders"
                            checked={labelPrintOptions.showBorders}
                            onChange={(e) =>
                              setLabelPrintOptions((prev) => ({ ...prev, showBorders: e.target.checked }))
                            }
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="borders" className="text-sm cursor-pointer">
                            Mostrar Bordas
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                      <Button 
                        data-print-label-btn
                        onClick={async () => {
                        if (!selectedLabelTemplate || !patrimonio) {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Por favor, selecione um modelo de etiqueta.',
                          })
                          return
                        }
                        
                        // Aguardar um pouco para garantir que o QR code seja carregado
                        await new Promise(resolve => setTimeout(resolve, 500))
                        
                        // Abrir janela de impressão
                        const printWindow = window.open('', '_blank')
                        if (printWindow) {
                          printWindow.document.write(
                            '<html><head><title>Imprimir Etiqueta</title>',
                          )
                          
                          // Copiar estilos
                          document.head
                            .querySelectorAll('link[rel="stylesheet"], style')
                            .forEach((el) => {
                              printWindow.document.head.appendChild(el.cloneNode(true))
                            })
                          
                          // ✅ AJUSTE: Estilos de impressão para A4 com etiqueta no topo (sem desperdício de papel)
                          // Suporta múltiplas cópias e opções avançadas
                          const orientationStyle = labelPrintOptions.orientation === 'landscape' 
                            ? 'size: A4 landscape;' 
                            : 'size: A4;'
                          const pageWidth = labelPrintOptions.orientation === 'landscape' ? 297 : 210
                          const pageHeight = labelPrintOptions.orientation === 'landscape' ? 210 : 297
                          
                          printWindow.document.write(`
                            <style>
                              @media print {
                                @page { 
                                  ${orientationStyle}
                                  margin: 0;
                                }
                                * {
                                  margin: 0;
                                  padding: 0;
                                  box-sizing: border-box;
                                }
                                body { 
                                  margin: 0;
                                  padding: 0;
                                  width: ${pageWidth}mm;
                                  min-height: ${pageHeight}mm;
                                  position: relative;
                                  -webkit-print-color-adjust: exact !important;
                                  print-color-adjust: exact !important;
                                }
                                .labels-container {
                                  display: flex;
                                  flex-direction: column;
                                  gap: 5mm;
                                  padding: 5mm;
                                }
                                .label-print-container {
                                  width: ${selectedLabelTemplate.width}mm;
                                  height: ${selectedLabelTemplate.height}mm;
                                  position: relative;
                                  overflow: hidden;
                                  page-break-inside: avoid;
                                  ${labelPrintOptions.showBorders ? 'border: 1px solid #ccc;' : ''}
                                  ${labelPrintOptions.showCutGuides ? 'border: 1px dashed #999;' : ''}
                                }
                              }
                              @media screen {
                                body {
                                  width: ${pageWidth}mm;
                                  min-height: ${pageHeight}mm;
                                  margin: 20px auto;
                                  padding: 0;
                                  background: #f0f0f0;
                                }
                                .labels-container {
                                  display: flex;
                                  flex-direction: column;
                                  gap: 5mm;
                                  padding: 5mm;
                                  background: white;
                                }
                                .label-print-container {
                                  width: ${selectedLabelTemplate.width}mm;
                                  height: ${selectedLabelTemplate.height}mm;
                                  position: relative;
                                  background: white;
                                  ${labelPrintOptions.showBorders ? 'border: 1px solid #ccc;' : ''}
                                  ${labelPrintOptions.showCutGuides ? 'border: 1px dashed #999;' : ''}
                                  box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                }
                              }
                            </style>
                          `)
                          
                          printWindow.document.write('</head><body>')
                          printWindow.document.write('<div class="labels-container">')
                          
                          // Imprimir múltiplas cópias
                          for (let copy = 0; copy < labelPrintOptions.copies; copy++) {
                            printWindow.document.write('<div class="label-print-container">')
                            
                            // ✅ CORREÇÃO: Verificar se o ref existe e tem conteúdo
                            if (labelPrintRef.current) {
                              printWindow.document.write(labelPrintRef.current.innerHTML)
                            } else {
                              // Fallback: criar HTML manualmente se ref não estiver disponível
                              printWindow.document.write(`
                                <div style="width: ${selectedLabelTemplate.width * 4}px; height: ${selectedLabelTemplate.height * 4}px; position: relative; background: white;">
                                  ${selectedLabelTemplate.elements.map((el: any) => {
                                    let content = ''
                                    if (el.type === 'LOGO') {
                                      content = `<img src="${settings?.activeLogoUrl || ''}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />`
                                    } else if (el.type === 'PATRIMONIO_FIELD') {
                                      content = String(patrimonio[el.content as keyof typeof patrimonio] || '')
                                    } else if (el.type === 'TEXT') {
                                      content = el.content || ''
                                    }
                                    return `
                                      <div style="position: absolute; left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; height: ${el.height}%; font-size: ${el.fontSize}px; font-weight: ${el.fontWeight}; text-align: ${el.textAlign};">
                                        ${content}
                                      </div>
                                    `
                                  }).join('')}
                                </div>
                              `)
                            }
                            
                            printWindow.document.write('</div>')
                          }
                          
                          printWindow.document.write('</div>')
                          printWindow.document.write('</body></html>')
                          printWindow.document.close()
                          
                          setTimeout(() => {
                            printWindow.focus()
                            printWindow.print()
                            // Fechar após impressão (opcional)
                            setTimeout(() => {
                              printWindow.close()
                              setIsLabelDialogOpen(false)
                            }, 1000)
                          }, 500)
                          
                          toast({
                            title: 'Sucesso',
                            description: 'Preparando etiqueta para impressão...',
                          })
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.',
                          })
                        }
                      }}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Etiqueta
                      </Button>
                      <Button variant="outline" onClick={() => setIsLabelDialogOpen(false)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Print Form - Always rendered but hidden on screen */}
        {patrimonio && (
          <div 
            id="printable-content"
            className="hidden print:block print:visible"
            style={{
              position: 'absolute',
              left: '-9999px',
              top: '-9999px',
              width: '210mm',
              minHeight: '297mm',
              zIndex: 9999,
              backgroundColor: 'white',
              color: 'black'
            }}
          >
            <SimplePrintForm 
              patrimonio={patrimonio} 
              fieldsToPrint={selectedPrintFields.length > 0 ? selectedPrintFields : [
                'numero_patrimonio',
                'descricao_bem',
                'tipo',
                'marca',
                'modelo',
                'data_aquisicao',
                'valor_aquisicao',
                'setor_responsavel',
                'local_objeto',
                'status'
              ]} 
            />
          </div>
        )}

        {/* Modal de Configuração de PDF */}
        {patrimonio && (
          <PDFConfigDialog
            open={isPDFConfigOpen}
            onOpenChange={setIsPDFConfigOpen}
            onGenerate={handleGeneratePDF}
            hasPhotos={patrimonio.fotos && patrimonio.fotos.length > 0}
            hasObservations={!!(patrimonio.notes && patrimonio.notes.length > 0)}
            hasDepreciation={!!patrimonio.metodo_depreciacao}
            isBaixado={patrimonio.status === 'baixado'}
          />
        )}

        {/* Modal de Baixa de Bem */}
        {patrimonio && (
          <BaixaBemModal
            isOpen={isBaixaModalOpen}
            onClose={() => setIsBaixaModalOpen(false)}
            patrimonio={patrimonio}
            onSuccess={() => {
              // Recarregar dados do patrimônio
              if (id) {
                loadPatrimonio()
              }
            }}
          />
        )}

        {/* Modal de Transferência/Doação */}
        {patrimonio && (
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {transferType === 'transferencia' ? 'Transferir Bem' : 'Doar Bem'}
                </DialogTitle>
                <DialogDescription>
                  Patrimônio: <strong>{patrimonio.numero_patrimonio}</strong> - {patrimonio.descricao_bem}
                  <br />
                  Preencha as informações para solicitar a{' '}
                  {transferType === 'transferencia' ? 'transferência' : 'doação'}.
                </DialogDescription>
              </DialogHeader>
              <AssetTransferForm
                asset={patrimonio}
                type={transferType}
                onSuccess={() => {
                  setIsTransferDialogOpen(false)
                  // Recarregar dados do patrimônio
                  if (id) {
                    loadPatrimonio()
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Área oculta para impressão de etiqueta */}
        <div className="hidden" style={{ position: 'absolute', left: '-9999px' }}>
          {selectedLabelTemplate && patrimonio && (
            <LabelPreview 
              ref={labelPrintRef}
              asset={{ ...patrimonio, assetType: 'bem' }} 
              template={selectedLabelTemplate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default BensView
