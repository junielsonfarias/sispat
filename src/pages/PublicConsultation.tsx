import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Patrimonio } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { publicApi } from '@/services/public-api'
import { getCloudImageUrl, formatDate, formatCurrency } from '@/lib/utils'
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

interface PublicPatrimonio {
  id: string
  numeroPatrimonio: string
  descricaoBem: string
  tipo?: string
  marca?: string
  modelo?: string
  status: string
  setor?: string
  local?: string
  municipality: string
  municipalityLogo?: string
}

export default function PublicConsultation() {
  const { id } = useParams<{ id: string }>()
  const [patrimonio, setPatrimonio] = useState<PublicPatrimonio | null | undefined>(
    undefined,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPatrimonio = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        const data = await publicApi.getPatrimonioById(id)
        setPatrimonio(data)
      } catch (error) {
        console.error('Erro ao buscar patrimônio:', error)
        setPatrimonio(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatrimonio()
  }, [id])

  const municipality = useMemo(() => {
    if (!patrimonio) return null
    return { id: '1', name: MUNICIPALITY_NAME }
  }, [patrimonio])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <ServerCrash className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Patrimônio não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              O bem que você está procurando não foi encontrado. Verifique o
              número e tente novamente.
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
            <CardTitle>{patrimonio.descricao_bem || patrimonio.descricaoBem}</CardTitle>
            <CardDescription>
              Nº de Patrimônio: {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {patrimonio.fotos && patrimonio.fotos.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {patrimonio.fotos.map((fotoId, index) => (
                      <CarouselItem key={index}>
                        <img
                          src={getCloudImageUrl(fotoId)}
                          alt={`${patrimonio.descricao_bem || patrimonio.descricaoBem} - Foto ${
                            index + 1
                          }`}
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
              <DetailItem
                label="Status"
                value={<Badge>{patrimonio.status}</Badge>}
              />
              <DetailItem
                label="Situação do Bem"
                value={
                  <Badge variant="secondary">{patrimonio.situacao_bem || patrimonio.situacaoBem}</Badge>
                }
              />
              <DetailItem
                label="Setor Responsável"
                value={patrimonio.setor_responsavel || patrimonio.setorResponsavel}
              />
              <DetailItem label="Localização" value={patrimonio.local_objeto || patrimonio.localObjeto} />
              <DetailItem
                label="Data de Aquisição"
                value={formatDate(new Date(patrimonio.data_aquisicao || patrimonio.dataAquisicao))}
              />
              <DetailItem
                label="Valor de Aquisição"
                value={formatCurrency(patrimonio.valor_aquisicao || patrimonio.valorAquisicao)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
