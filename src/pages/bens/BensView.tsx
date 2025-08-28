import { PrintConfigDialog } from '@/components/PrintConfigDialog'
import { BensPrintForm } from '@/components/bens/BensPrintForm'
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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { ScrollArea } from '@/components/ui/scroll-area'

import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import {
    formatCurrency,
    formatDate,
    getCloudImageUrl
} from '@/lib/utils'
import { Patrimonio } from '@/types'
import {
    ArrowLeft,
    ArrowRightLeft,
    Clock,
    Edit,
    FileText,
    Gift,
    Image as ImageIcon,
    Printer,
    QrCode,

    Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

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

const BensView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPatrimonioById, updatePatrimonio, deletePatrimonio } =
    usePatrimonio()
  const [patrimonio, setPatrimonio] = useState<Patrimonio | undefined>()

  const [isPrintConfigOpen, setPrintConfigOpen] = useState(false)
  const [fieldsToPrint, setFieldsToPrint] = useState<string[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      console.log('🔍 BensView - Carregando patrimônio com ID:', id)
      const patrimonioData = getPatrimonioById(id)
      console.log('📋 BensView - Dados do patrimônio:', patrimonioData)
      console.log('📋 BensView - Campos específicos:', {
        setor_responsavel: patrimonioData?.setor_responsavel,
        local_objeto: patrimonioData?.local_objeto,
        situacao_bem: patrimonioData?.situacao_bem,
        status: patrimonioData?.status,
        fotos: patrimonioData?.fotos ? `${patrimonioData.fotos.length} fotos` : 'Nenhuma'
      })
      setPatrimonio(patrimonioData)
    }
  }, [id, getPatrimonioById])

  const lastModification = useMemo(() => {
    if (
      !patrimonio?.historico_movimentacao ||
      !Array.isArray(patrimonio.historico_movimentacao) ||
      patrimonio.historico_movimentacao.length === 0
    ) {
      return null
    }
    return patrimonio.historico_movimentacao[0]
  }, [patrimonio])

  const depreciationInfo = useMemo(() => {
    if (!patrimonio) return null
    return calculateDepreciation(patrimonio)
  }, [patrimonio])



  const handlePrint = useCallback((selectedFields: string[]) => {
    setFieldsToPrint(selectedFields)
    setPrintConfigOpen(false)

    setTimeout(() => {
      const printContent = printRef.current?.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow && printContent) {
        printWindow.document.write(
          '<html><head><title>Ficha de Cadastro</title>',
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

  const handleDelete = useCallback(async () => {
    if (patrimonio) {
      try {
        await deletePatrimonio(patrimonio.id)
        toast({ description: 'Bem excluído com sucesso.' })
        
        // Aguardar um momento para garantir que a lista foi atualizada
        await new Promise(resolve => setTimeout(resolve, 500))
        
        navigate('/bens-cadastrados')
      } catch (error) {
        console.error('Erro ao excluir patrimônio:', error)
      }
    }
  }, [patrimonio, deletePatrimonio, navigate])

  const handleGenerateLabel = useCallback(() => {
    if (!patrimonio) return

    try {
      // Criar uma nova janela para impressão da etiqueta
      const labelWindow = window.open('', '_blank', 'width=400,height=600')
      if (!labelWindow) {
        toast({ 
          title: 'Erro ao gerar etiqueta',
          description: 'Permita pop-ups para gerar a etiqueta',
          variant: 'destructive'
        })
        return
      }

      // Gerar URL da consulta pública para o QR Code
      const publicUrl = `${window.location.origin}/consulta-publica/${patrimonio.numero_patrimonio}`
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}&q=H`

      // Usar o modelo correto da etiqueta conforme imagem fornecida
      const labelContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Etiqueta - ${patrimonio.numero_patrimonio}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 5px;
              font-size: 10px;
            }
            .label {
              width: 240px; /* 60mm * 4px */
              height: 160px; /* 40mm * 4px */
              border: 1px solid #000;
              position: relative;
              background: white;
              box-sizing: border-box;
            }
            .logo {
              position: absolute;
              left: 5%;
              top: 5%;
              width: 25%;
              height: 20%;
              text-align: center;
              background: #FF6B35;
              border-radius: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 8px;
              font-weight: bold;
            }
            .entity-info {
              position: absolute;
              right: 5%;
              top: 5%;
              width: 60%;
              height: 20%;
              text-align: left;
            }
            .entity-name {
              font-size: 6px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .municipality-name {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .department {
              font-size: 6px;
              line-height: 1.2;
            }
            .patrimony-section {
              position: absolute;
              left: 5%;
              bottom: 5%;
              width: 55%;
              height: 25%;
            }
            .patrimony-label {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .patrimony-number {
              font-size: 16px;
              font-weight: bold;
              color: #000;
            }
            .qrcode {
              position: absolute;
              right: 5%;
              bottom: 5%;
              width: 30%;
              height: 35%;
              text-align: center;
            }
            .qrcode img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            @media print {
              body { margin: 0; }
              .label { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="logo">🏛️</div>
            <div class="entity-info">
              <div class="entity-name">PREFEITURA MUNICIPAL DE</div>
              <div class="municipality-name">SÃO SEBASTIÃO DA BOA VISTA</div>
              <div class="department">Secretaria de Administração e Finanças</div>
              <div class="department">Gestão e Controle de Patrimônio</div>
            </div>
            <div class="patrimony-section">
              <div class="patrimony-label">Nº PATRIMÔNIO</div>
              <div class="patrimony-number">${patrimonio.numero_patrimonio}</div>
            </div>
            <div class="qrcode">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
        </html>
      `

      labelWindow.document.write(labelContent)
      labelWindow.document.close()

      toast({ description: 'Etiqueta gerada com sucesso!' })
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error)
      toast({ 
        title: 'Erro ao gerar etiqueta',
        description: 'Tente novamente',
        variant: 'destructive'
      })
    }
  }, [patrimonio])

  if (!patrimonio) {
    return <div>Bem não encontrado.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link to="/bens-cadastrados">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Lista
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/bens-cadastrados/editar/${id}`}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setPrintConfigOpen(true)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Ficha
          </Button>
          <Button variant="outline" onClick={handleGenerateLabel}>
            <QrCode className="mr-2 h-4 w-4" /> Gerar Etiqueta
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/bens/transferencias?patrimonioId=${id}`}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/bens/emprestimos?patrimonioId=${id}`}>
              <Gift className="mr-2 h-4 w-4" /> Emprestar
            </Link>
          </Button>
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
                  Esta ação é irreversível. Deseja realmente excluir este bem?
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
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{patrimonio.descricao}</CardTitle>
              <CardDescription>
                Nº de Patrimônio: {patrimonio.numero_patrimonio}
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
              {(patrimonio.fotos || []).length > 0 ? (
                <Carousel className="w-full max-w-lg mx-auto mb-6">
                  <CarouselContent>
                    {(patrimonio.fotos || []).map((fotoId, index) => (
                      <CarouselItem key={index}>
                        <OptimizedImage
                          src={getCloudImageUrl(fotoId)}
                          alt={`${patrimonio.descricao} - Foto ${
                            index + 1
                          }`}
                          size="large"
                          aspectRatio="video"
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
                <DetailItem
                  label="Status"
                  value={<Badge>{patrimonio.status || 'NÃO INFORMADO'}</Badge>}
                />
                <DetailItem
                  label="Situação"
                  value={
                    <Badge variant="secondary">{patrimonio.situacao_bem || 'NÃO INFORMADO'}</Badge>
                  }
                />
                <DetailItem
                  label="Setor Responsável"
                  value={patrimonio.setor_responsavel}
                />
                <DetailItem
                  label="Localização"
                  value={patrimonio.local_objeto}
                />
                <DetailItem
                  label="Data de Aquisição"
                  value={formatDate(new Date(patrimonio.data_aquisicao))}
                />
                <DetailItem
                  label="Valor de Aquisição"
                  value={formatCurrency(patrimonio.valor_aquisicao)}
                />
                <DetailItem label="Quantidade" value={patrimonio.quantidade} />
                <DetailItem
                  label="Nota Fiscal"
                  value={patrimonio.numero_nota_fiscal}
                />
                <DetailItem
                  label="Forma de Aquisição"
                  value={patrimonio.forma_aquisicao}
                />
                <DetailItem
                  label="Número de Série"
                  value={patrimonio.numero_serie}
                />
                <DetailItem label="Marca" value={patrimonio.marca} />
                <DetailItem label="Modelo" value={patrimonio.modelo} />
                <DetailItem label="Cor" value={patrimonio.cor} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {(patrimonio.documentos || []).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(patrimonio.documentos || []).map((docId, index) => (
                    <a
                      key={index}
                      href={getCloudImageUrl(docId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <div className="aspect-square flex flex-col items-center justify-center bg-muted rounded-lg p-2 text-center group-hover:bg-accent transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs truncate">
                          Documento {index + 1}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum documento anexado.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informações de Depreciação</CardTitle>
            </CardHeader>
            <CardContent>
              {depreciationInfo ? (
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                  <DetailItem
                    label="Método"
                    value={patrimonio.metodo_depreciacao || 'N/A'}
                  />
                  <DetailItem
                    label="Vida Útil"
                    value={`${patrimonio.vida_util_anos || 0} anos`}
                  />
                  <DetailItem
                    label="Depreciação Acumulada"
                    value={formatCurrency(
                      depreciationInfo.accumulatedDepreciation,
                    )}
                  />
                  <DetailItem
                    label="Valor Contábil Atual"
                    value={formatCurrency(depreciationInfo.bookValue)}
                  />
                  <DetailItem
                    label="Depreciação Anual"
                    value={formatCurrency(depreciationInfo.annualDepreciation)}
                  />
                  <DetailItem
                    label="Vida Útil Restante"
                    value={`${(
                      depreciationInfo.remainingLifeMonths / 12
                    ).toFixed(1)} anos`}
                  />
                </div>
              ) : (
                <p>Informações de depreciação não disponíveis.</p>
              )}
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
                  {(patrimonio.historico_movimentacao || [])
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
                        {(entry.documentosAnexos || []).length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold">
                                Documentos:
                              </p>
                              <div className="flex gap-2 mt-1">
                                {(entry.documentosAnexos || []).map((docId, i) => (
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
          <BensPrintForm
            patrimonio={patrimonio}
            fieldsToPrint={fieldsToPrint}
            ref={printRef}
          />
        </div>
      </div>
      <PrintConfigDialog
        open={isPrintConfigOpen}
        onOpenChange={setPrintConfigOpen}
        onConfirm={handlePrint}
        assetType="patrimonio"
      />
    </div>
  )
}

export default BensView
