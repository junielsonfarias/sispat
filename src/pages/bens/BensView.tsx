import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  formatDate,
  formatCurrency,
  formatRelativeDate,
  getCloudImageUrl,
} from '@/lib/utils'
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
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useAuth } from '@/hooks/useAuth'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useLabelTemplates } from '@/contexts/LabelTemplateContext'
import { toast } from '@/hooks/use-toast'
import { LabelPreview } from '@/components/LabelPreview'
import { Textarea } from '@/components/ui/textarea'
import SubPatrimoniosManager from '@/components/bens/SubPatrimoniosManager'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-base sm:text-sm font-medium text-muted-foreground">{label}</p>
    <div className="text-base sm:text-sm">{value}</div>
  </div>
)

function BensView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPatrimonioById, fetchPatrimonioById, updatePatrimonio, deletePatrimonio } = usePatrimonio()
  const { user } = useAuth()
  const { settings } = useCustomization()
  const { templates: labelTemplates } = useLabelTemplates()
  
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [selectedPrintFields, setSelectedPrintFields] = useState<string[]>([])
  const [printConfig, setPrintConfig] = useState({
    template: 'standard',
    includeImages: true,
    includeNotes: true,
  })
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false)
  const [selectedLabelTemplate, setSelectedLabelTemplate] = useState<any>(null)
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
      console.log('✅ Template padrão selecionado automaticamente:', defaultTemplate?.name)
    }
  }, [isLabelDialogOpen, labelTemplates, selectedLabelTemplate])

  const loadPatrimonio = useCallback(async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      console.log('🔄 BensView - Carregando patrimônio do backend:', id)
      // Buscar sempre do backend para garantir dados atualizados
      const response = await fetchPatrimonioById(id)
      const data = response.patrimonio || response
      console.log('✅ BensView - Patrimônio carregado:', {
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
      console.log('📦 BensView - Estado patrimonio atualizado')
    } catch (error) {
      console.error('Erro ao carregar patrimônio:', error)
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

    console.log('🔍 [DEBUG] Salvando nota para patrimônio:', patrimonio.id)
    console.log('🔍 [DEBUG] Texto da nota:', newNote.trim())

    setIsSavingNote(true)
    try {
      // Criar nota usando rota específica
      const response = await api.post(`/patrimonios/${patrimonio.id}/notes`, {
        text: newNote.trim()
      })

      console.log('✅ [DEBUG] Resposta da API:', response)

      // Extrair nota da resposta
      const noteData = response.note || response

      console.log('🔍 [DEBUG] Dados da nota extraídos:', noteData)

      // ✅ CORREÇÃO: Mapear campos corretamente do backend para o frontend
      const newNoteObj: Note = {
        id: noteData.id,
        text: noteData.text, // Backend usa 'text', não 'content'
        date: new Date(noteData.date), // Backend usa 'date', não 'createdAt'
        userId: noteData.userId,
        userName: noteData.userName, // Backend usa 'userName', não 'author'
      }

      console.log('✅ [DEBUG] Objeto nota mapeado:', newNoteObj)

      const updatedPatrimonio = {
        ...patrimonio,
        notes: [...(patrimonio.notes || []), newNoteObj],
      }

      console.log('✅ [DEBUG] Patrimônio atualizado:', {
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
      console.error('❌ [ERROR] Erro ao salvar nota:', error)
      console.error('❌ [ERROR] Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        response: error.response?.data || 'N/A'
      })
      
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
      navigate('/bens-cadastrados')
    } catch (error) {
      console.error('Erro ao excluir patrimônio:', error)
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
    
    console.log('🔍 [BensView] handleGeneratePDF chamado:', {
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
      console.error('Erro ao gerar PDF:', error)
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
        fieldsToPrint: selectedFields,
        includeLogo: !!logoUrl,
        logoUrl
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
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
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando patrimônio...</p>
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
                className="touch-target"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                  {patrimonio.descricao_bem || patrimonio.descricaoBem}
                </h1>
                <p className="text-base lg:text-lg text-gray-600">
                  Patrimônio #{patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
                </p>
              </div>
            </div>
          
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => navigate(`/bens-cadastrados/editar/${patrimonio.id}`)}
                className="touch-target"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              
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
              
              {patrimonio.status !== 'baixado' && (
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
              
              {(user?.role === 'admin' || user?.role === 'superuser') && (
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
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-gray-900">
                    <ImageIcon className="h-5 w-5" />
                    Imagens
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {(patrimonio.fotos || patrimonio.photos) && (patrimonio.fotos || patrimonio.photos).length > 0 ? (
                    <Carousel className="w-full">
                      <CarouselContent>
                        {(() => {
                          const fotos = patrimonio.fotos || patrimonio.photos
                          console.log('🖼️ Renderizando carrossel com fotos:', {
                            total: fotos.length,
                            fotos: fotos,
                            tipos: fotos.map((f: any) => typeof f),
                          })
                          return fotos
                        })().map((fotoId, index) => (
                          <CarouselItem key={index}>
                            <div className="relative flex items-center justify-center bg-gray-100 rounded-lg min-h-[400px]">
                              <img
                                src={getCloudImageUrl(fotoId)}
                                alt={`${patrimonio.descricao_bem || patrimonio.descricaoBem} - Foto ${index + 1}`}
                                className="rounded-lg object-contain w-full h-full max-h-[600px]"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {(patrimonio.fotos || patrimonio.photos).length > 1 && (
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
              <Card className="border-0 shadow-lg bg-white h-full">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Descrição</label>
                        <p className="text-base text-gray-900 mt-1 font-medium">{patrimonio.descricao_bem || patrimonio.descricaoBem}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Número do Patrimônio</label>
                        <div className="mt-1">
                          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                            {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tipo</label>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {patrimonio.tipo || 'Não informado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Situação</label>
                        <div className="mt-1">
                          <Badge 
                            className={`text-sm px-3 py-1 ${
                              (patrimonio.situacao_bem || patrimonio.situacaoBem) === 'ÓTIMO' ? 'bg-green-100 text-green-800 border-green-200' :
                              (patrimonio.situacao_bem || patrimonio.situacaoBem) === 'BOM' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              (patrimonio.situacao_bem || patrimonio.situacaoBem) === 'REGULAR' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              (patrimonio.situacao_bem || patrimonio.situacaoBem) === 'RUIM' ? 'bg-red-100 text-red-800 border-red-200' :
                              (patrimonio.situacao_bem || patrimonio.situacaoBem) === 'EM_MANUTENCAO' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            } border font-medium`}
                          >
                            {patrimonio.situacao_bem || patrimonio.situacaoBem}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Valor de Aquisição</label>
                        <p className="text-lg text-gray-900 mt-1 font-semibold">{formatCurrency(patrimonio.valor_aquisicao || patrimonio.valorAquisicao)}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data de Aquisição</label>
                        <p className="text-base text-gray-900 mt-1">{formatDate(patrimonio.data_aquisicao || patrimonio.dataAquisicao)}</p>
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
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Financeiras</CardTitle>
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
                    value={patrimonio.forma_aquisicao || patrimonio.formaAquisicao} 
                  />
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
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Técnicas</CardTitle>
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
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Localização</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="Setor Responsável" value={patrimonio.setor_responsavel || patrimonio.setorResponsavel} />
                  <DetailItem label="Local do Objeto" value={patrimonio.local_objeto || patrimonio.localObjeto} />
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-gray-900">
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
                    
                    {/* Histórico de movimentação */}
                    {(patrimonio.historico_movimentacao || patrimonio.historicoMovimentacao)?.map((entry, index) => (
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
                    )) || null}
                    
                    {/* Mensagem quando não há histórico além da criação */}
                    {(!patrimonio.historico_movimentacao || patrimonio.historico_movimentacao.length === 0) && 
                     (!patrimonio.historicoMovimentacao || patrimonio.historicoMovimentacao.length === 0) && 
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
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-gray-900">
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
                    {(patrimonio.notas || patrimonio.notes)?.map((note) => (
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

            {/* Sub-Patrimônios */}
            <SubPatrimoniosManager
              patrimonioId={patrimonio.id}
              patrimonioNumero={patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
              isKit={patrimonio.eh_kit || patrimonio.ehKit || false}
              quantidadeUnidades={patrimonio.quantidade_unidades || patrimonio.quantidadeUnidades}
            />
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
                    <div className="flex justify-center gap-2 mt-4">
                      <Button onClick={() => {
                        // Implementar impressão
                        console.log('Imprimir etiqueta:', selectedLabelTemplate, patrimonio)
                      }}>
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
            hasObservations={!!patrimonio.observacoes}
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
      </div>
    </div>
  )
}

export default BensView