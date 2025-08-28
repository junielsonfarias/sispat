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
} from 'lucide-react'
import { Imovel } from '@/types'
import { useImovel } from '@/contexts/ImovelContext'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { toast } from '@/hooks/use-toast'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImovelPrintForm } from '@/components/imoveis/ImovelPrintForm'
import { PrintConfigDialog } from '@/components/PrintConfigDialog'
import { useAuth } from '@/hooks/useAuth'
import { Label } from '@/components/ui/label'

const DetailItem = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-md">{value}</p>
  </div>
)

export default function ImoveisView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getImovelById, deleteImovel } = useImovel()
  const { fields: customFieldConfigs } = useImovelField()
  const [imovel, setImovel] = useState<Imovel | undefined>()
  const [isPrintConfigOpen, setPrintConfigOpen] = useState(false)
  const [fieldsToPrint, setFieldsToPrint] = useState<string[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

  const lastModification = useMemo(() => {
    if (!imovel?.historico || imovel.historico.length === 0) {
      return null
    }
    return imovel.historico[0]
  }, [imovel])

  const handlePrint = useCallback((selectedFields: string[]) => {
    setFieldsToPrint(selectedFields)
    setPrintConfigOpen(false)

    setTimeout(() => {
      const printContent = printRef.current?.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow && printContent) {
        printWindow.document.write(
          '<html><head><title>Ficha de Cadastro de Imóvel</title>',
        )
        document.head
          .querySelectorAll('link[rel="stylesheet"], style')
          .forEach((el) => {
            printWindow.document.head.appendChild(el.cloneNode(true))
          })
        printWindow.document.write('</head><body>')
        printWindow.document.write(printContent)
        printWindow.document.write('</body></html>')
        printWindow.document.close()
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }, 100)
  }, [])

  const handleDelete = useCallback(() => {
    if (imovel) {
      deleteImovel(imovel.id)
      toast({ description: 'Imóvel excluído com sucesso.' })
      navigate('/imoveis')
    }
  }, [imovel, deleteImovel, navigate])

  const canEdit =
    user?.role === 'supervisor' ||
    user?.role === 'admin' ||
    user?.role === 'usuario'
  const canDelete = user?.role === 'supervisor' || user?.role === 'admin'

  if (!imovel) {
    return <div>Imóvel não encontrado.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link to="/imoveis">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Lista
          </Link>
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link to={`/imoveis/editar/${id}`}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setPrintConfigOpen(true)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Ficha
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Deseja realmente excluir este
                    imóvel?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{imovel.denominacao}</CardTitle>
              <CardDescription>
                Nº de Patrimônio: {imovel.numero_patrimonio}
              </CardDescription>
              {lastModification && (
                <div className="text-xs text-muted-foreground pt-2">
                  Última alteração por <strong>{lastModification.user}</strong>{' '}
                  em{' '}
                  {formatDate(
                    new Date(lastModification.date),
                    "dd/MM/yyyy 'às' HH:mm",
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {imovel.fotos && imovel.fotos.length > 0 ? (
                <Carousel className="w-full max-w-lg mx-auto mb-6">
                  <CarouselContent>
                    {imovel.fotos.map((fotoId, index) => (
                      <CarouselItem key={index}>
                        <img
                          src={getCloudImageUrl(fotoId)}
                          alt={`${imovel.denominacao} - Foto ${index + 1}`}
                          className="rounded-lg object-cover w-full aspect-video"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-muted rounded-lg mb-6">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-12 w-12" />
                    <p>Nenhuma foto disponível</p>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Endereço" value={imovel.endereco} />
                <DetailItem
                  label="Data de Aquisição"
                  value={formatDate(new Date(imovel.data_aquisicao))}
                />
                <DetailItem
                  label="Valor de Aquisição"
                  value={formatCurrency(imovel.valor_aquisicao)}
                />
                <DetailItem
                  label="Área do Terreno (m²)"
                  value={imovel.area_terreno}
                />
                <DetailItem
                  label="Área Construída (m²)"
                  value={imovel.area_construida}
                />
                <DetailItem label="Latitude" value={imovel.latitude || 'N/A'} />
                <DetailItem
                  label="Longitude"
                  value={imovel.longitude || 'N/A'}
                />
                {customFieldConfigs
                  .filter((f) => f.isCustom)
                  .map((field) => (
                    <DetailItem
                      key={field.id}
                      label={field.label}
                      value={imovel.customFields?.[field.key] || 'N/A'}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="relative pl-6 after:absolute after:inset-y-0 after:w-0.5 after:bg-border after:left-0">
                  {imovel.historico
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((entry, index) => (
                      <div key={index} className="relative mb-6 pl-8">
                        <div className="absolute -left-3 mt-1.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-8 ring-background">
                          <Clock className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <time className="mb-1 text-xs font-normal text-muted-foreground">
                          {formatDate(
                            new Date(entry.date),
                            "dd/MM/yy 'às' HH:mm",
                          )}
                        </time>
                        <h3 className="font-semibold">
                          {entry.action} por {entry.user}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {entry.details}
                        </p>
                        {entry.origem && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Origem:</strong> {entry.origem}
                          </p>
                        )}
                        {entry.destino && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Destino:</strong> {entry.destino}
                          </p>
                        )}
                        {entry.documentosAnexos &&
                          entry.documentosAnexos.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold">
                                Documentos:
                              </p>
                              <div className="flex gap-2 mt-1">
                                {entry.documentosAnexos.map((docId, i) => (
                                  <Button
                                    key={i}
                                    size="sm"
                                    variant="outline"
                                    asChild
                                  >
                                    <a
                                      href={getCloudImageUrl(docId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <FileText className="h-3 w-3 mr-1" /> Doc{' '}
                                      {i + 1}
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden">
        <div className="printable-form-container">
          <ImovelPrintForm
            imovel={imovel}
            fieldsToPrint={fieldsToPrint}
            ref={printRef}
          />
        </div>
      </div>
      <PrintConfigDialog
        open={isPrintConfigOpen}
        onOpenChange={setPrintConfigOpen}
        onConfirm={handlePrint}
        assetType="imovel"
      />
    </div>
  )
}
