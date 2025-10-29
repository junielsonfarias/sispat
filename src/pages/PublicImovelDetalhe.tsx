import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Imovel } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  ServerCrash,
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useImovel } from '@/hooks/useImovel'
import { getCloudImageUrl, formatDate, formatCurrency } from '@/lib/utils'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'

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

export default function PublicImovelDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { getImovelById } = useImovel()
  const { fields: customFieldConfigs } = useImovelField()
  const [imovel, setImovel] = useState<Imovel | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      if (id) {
        setImovel(getImovelById(id))
      }
      setIsLoading(false)
    }, 500)
  }, [id, getImovelById])

  const municipality = useMemo(() => {
    if (!imovel) return null
    return { id: '1', name: MUNICIPALITY_NAME }
  }, [imovel])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!imovel) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <ServerCrash className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Imóvel não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              O imóvel que você está procurando não foi encontrado. Verifique o
              endereço e tente novamente.
            </p>
            <Button asChild className="mt-4">
              <Link to="/consulta-publica">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {municipality?.logoUrl && (
              <img
                src={municipality.logoUrl}
                alt="Logo"
                className="h-12 w-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                Consulta Pública de Patrimônio
              </h1>
              <p className="text-muted-foreground">{municipality?.name}</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/consulta-publica">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
            </Link>
          </Button>
        </div>
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>{imovel.denominacao}</CardTitle>
            <CardDescription>
              Nº de Patrimônio: {imovel.numero_patrimonio || imovel.numeroPatrimonio}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {imovel.fotos && imovel.fotos.length > 0 ? (
                <Carousel className="w-full">
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
                <div className="w-full aspect-video flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-12 w-12" />
                    <p>Nenhuma foto disponível</p>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-2 space-y-4">
              <DetailItem label="Endereço" value={imovel.endereco} />
              <DetailItem
                label="Data de Aquisição"
                value={formatDate(new Date(imovel.data_aquisicao || imovel.dataAquisicao))}
              />
              <DetailItem
                label="Valor de Aquisição"
                value={formatCurrency(imovel.valor_aquisicao || imovel.valorAquisicao)}
              />
              <DetailItem
                label="Área do Terreno"
                value={`${imovel.area_terreno.toLocaleString('pt-BR')} m²`}
              />
              <DetailItem
                label="Área Construída"
                value={`${imovel.area_construida.toLocaleString('pt-BR')} m²`}
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
    </div>
  )
}
