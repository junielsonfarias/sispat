import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { formatDate, formatCurrency, getCloudImageUrl } from '@/lib/utils'
import {
  Edit,
  Printer,
  Trash2,
  Clock,
  Image as ImageIcon,
  ArrowLeft,
  FileText,
  QrCode,
  Send,
  Gift,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  Ruler,
  Home,
} from 'lucide-react'
import { Imovel, TransferenciaType } from '@/types'
import { useImovel } from '@/hooks/useImovel'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AssetTransferForm } from '@/components/bens/AssetTransferForm'
import { generateImovelPDF } from '@/components/imoveis/ImovelPDFGenerator'

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </p>
    <div className="text-base">{value}</div>
  </div>
)

export default function ImoveisView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getImovelById, deleteImovel } = useImovel()
  const [imovel, setImovel] = useState<Imovel | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [transferType, setTransferType] = useState<TransferenciaType>('transferencia')

  const loadImovel = useCallback(() => {
    if (id) {
      const data = getImovelById(id)
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: 'Você não tem permissão para acessar este imóvel.',
        })
        navigate('/imoveis')
        return
      }
      setImovel(data)
    }
  }, [id, getImovelById, navigate])

  useEffect(() => {
    loadImovel()
  }, [loadImovel])

  const openTransferDialog = (type: TransferenciaType) => {
    setTransferType(type)
    setIsTransferDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!imovel) return
    
    setIsDeleting(true)
    try {
      await deleteImovel(imovel.id)
      toast({ description: 'Imóvel excluído com sucesso.' })
      navigate('/imoveis')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao excluir imóvel.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = async () => {
    if (!imovel) return
    
    try {
      const success = await generateImovelPDF({
        imovel,
        municipalityName: 'Prefeitura Municipal', // Pode vir do contexto de customização
        municipalityLogo: '/logo-government.svg', // Pode vir do contexto de customização
      })
      
      if (success) {
        toast({
          title: 'PDF Gerado!',
          description: 'A ficha do imóvel foi gerada com sucesso.',
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
    }
  }

  const canEdit = user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'usuario'
  const canDelete = user?.role === 'admin' || user?.role === 'superuser'

  if (!imovel) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando imóvel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com Título e Botões */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/imoveis')}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                  {imovel.denominacao}
                </h1>
                <p className="text-base lg:text-lg text-gray-600">
                  Imóvel #{imovel.numero_patrimonio}
                </p>
              </div>
            </div>
          
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/imoveis/editar/${imovel.id}`)}
                  className="touch-target"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handlePrint}
                className="touch-target"
              >
                <Printer className="mr-2 h-4 w-4" />
                Gerar Ficha PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsLabelDialogOpen(true)}
                className="touch-target"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Imprimir Etiqueta
              </Button>
              
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
                        Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem 
                  label="Número do Patrimônio" 
                  value={<Badge variant="secondary" className="font-mono">{imovel.numero_patrimonio}</Badge>}
                  icon={FileText}
                />
                <DetailItem 
                  label="Denominação" 
                  value={imovel.denominacao}
                  icon={Home}
                />
                <DetailItem 
                  label="Tipo de Imóvel" 
                  value={<Badge variant="outline">{imovel.tipo_imovel || 'Não especificado'}</Badge>}
                />
                <DetailItem 
                  label="Situação" 
                  value={<Badge className={
                    imovel.situacao === 'ativo' ? 'bg-green-100 text-green-800' :
                    imovel.situacao === 'alugado' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>{imovel.situacao || 'Não especificado'}</Badge>}
                />
              </CardContent>
            </Card>

            {/* Localização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <DetailItem 
                    label="Endereço Completo" 
                    value={imovel.endereco}
                    icon={MapPin}
                  />
                </div>
                <DetailItem 
                  label="Setor Responsável" 
                  value={imovel.setor || 'Não especificado'}
                  icon={Building}
                />
                {imovel.latitude && imovel.longitude && (
                  <DetailItem 
                    label="Coordenadas" 
                    value={`${imovel.latitude}, ${imovel.longitude}`}
                  />
                )}
              </CardContent>
            </Card>

            {/* Informações Financeiras e Medidas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informações Financeiras e Medidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem 
                  label="Data de Aquisição" 
                  value={formatDate(imovel.data_aquisicao)}
                  icon={Calendar}
                />
                <DetailItem 
                  label="Valor de Aquisição" 
                  value={formatCurrency(imovel.valor_aquisicao)}
                  icon={DollarSign}
                />
                <DetailItem 
                  label="Área do Terreno" 
                  value={imovel.area_terreno ? `${imovel.area_terreno} m²` : 'Não informado'}
                  icon={Ruler}
                />
                <DetailItem 
                  label="Área Construída" 
                  value={imovel.area_construida ? `${imovel.area_construida} m²` : 'Não informado'}
                  icon={Ruler}
                />
              </CardContent>
            </Card>

            {/* Descrição e Observações */}
            {(imovel.descricao || imovel.observacoes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {imovel.descricao && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Descrição</p>
                      <p className="text-sm">{imovel.descricao}</p>
                    </div>
                  )}
                  {imovel.observacoes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Observações</p>
                      <p className="text-sm">{imovel.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fotos */}
            {imovel.fotos && imovel.fotos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Fotos do Imóvel ({imovel.fotos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {imovel.fotos.map((foto, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                          <div className="p-1">
                            <img
                              src={getCloudImageUrl(foto)}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-64 object-cover rounded-lg"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Status e Informações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem 
                  label="Tipo" 
                  value={<Badge variant="outline">{imovel.tipo_imovel || 'Não especificado'}</Badge>}
                />
                <DetailItem 
                  label="Situação" 
                  value={<Badge className={
                    imovel.situacao === 'ativo' ? 'bg-green-100 text-green-800' :
                    imovel.situacao === 'alugado' ? 'bg-blue-100 text-blue-800' :
                    imovel.situacao === 'desativado' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>{imovel.situacao || 'Não especificado'}</Badge>}
                />
                <DetailItem 
                  label="Setor" 
                  value={imovel.setor}
                  icon={Building}
                />
                <DetailItem 
                  label="Cadastrado em" 
                  value={formatDate(imovel.createdAt)}
                  icon={Calendar}
                />
                {imovel.updatedAt && (
                  <DetailItem 
                    label="Última atualização" 
                    value={formatDate(imovel.updatedAt)}
                    icon={Clock}
                  />
                )}
              </CardContent>
            </Card>

            {/* Campos Personalizados */}
            {imovel.customFields && Object.keys(imovel.customFields).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campos Personalizados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(imovel.customFields).map(([key, value]) => (
                    <DetailItem 
                      key={key}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      value={value as string}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {imovel.historico && imovel.historico.length > 0 ? (
                <div className="relative pl-6 after:absolute after:inset-y-0 after:w-0.5 after:bg-border after:left-0">
                  {imovel.historico
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry, index) => (
                      <div key={index} className="relative mb-6 pl-8">
                        <div className="absolute -left-3 mt-1.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-8 ring-background">
                          <Clock className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <time className="mb-1 text-xs font-normal text-muted-foreground">
                          {formatDate(entry.date)}
                        </time>
                        <h3 className="text-sm font-semibold">{entry.action}</h3>
                        <p className="text-sm text-muted-foreground">{entry.details}</p>
                        {entry.user && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {entry.user}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de movimentação registrado.
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Modal de Etiqueta */}
        <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Imprimir Etiqueta do Imóvel</DialogTitle>
              <DialogDescription>
                Gere uma etiqueta com QR Code para identificação do imóvel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Pré-visualização da Etiqueta</p>
                <div className="bg-white border-2 border-dashed p-4 rounded">
                  <p className="font-bold text-lg">{imovel.denominacao}</p>
                  <p className="text-sm text-muted-foreground">#{imovel.numero_patrimonio}</p>
                  <div className="mt-4 flex justify-center">
                    <QrCode className="h-24 w-24 text-gray-400" />
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                window.print()
                setIsLabelDialogOpen(false)
              }}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Etiqueta
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Transferência/Doação */}
        {imovel && (
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {transferType === 'transferencia' ? 'Transferir Imóvel' : 'Doar Imóvel'}
                </DialogTitle>
                <DialogDescription>
                  Imóvel: <strong>{imovel.numero_patrimonio}</strong> - {imovel.denominacao}
                  <br />
                  Preencha as informações para solicitar a{' '}
                  {transferType === 'transferencia' ? 'transferência' : 'doação'}.
                </DialogDescription>
              </DialogHeader>
              <AssetTransferForm
                asset={imovel as any}
                type={transferType}
                onSuccess={() => {
                  setIsTransferDialogOpen(false)
                  loadImovel()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
