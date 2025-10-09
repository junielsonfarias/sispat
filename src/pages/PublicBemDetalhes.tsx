import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { getCloudImageUrl, formatDate, formatCurrency } from '@/lib/utils'

const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
    {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1 break-words">{value}</p>
    </div>
  </div>
)

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

export default function PublicBemDetalhes() {
  const { numero } = useParams<{ numero: string }>()
  const navigate = useNavigate()
  const { patrimonios } = usePatrimonio()
  const { settings } = useCustomization()
  const [isLoading, setIsLoading] = useState(true)

  const patrimonio = patrimonios.find((p) => p.numero_patrimonio === numero)

  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [numero])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Bem não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O bem que você está procurando não foi encontrado.
            </p>
            <Button onClick={() => navigate('/consulta-publica')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Consulta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fotos = patrimonio.fotos && patrimonio.fotos.length > 0 
    ? patrimonio.fotos 
    : ['/placeholder-image.jpg']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/consulta-publica')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          {settings.activeLogoUrl && (
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="h-12 w-auto"
            />
          )}
        </div>

        {/* Card Principal */}
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Bem Móvel</Badge>
                  <Badge variant={getSituacaoBadge(patrimonio.status)}>
                    {formatSituacao(patrimonio.status)}
                  </Badge>
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {patrimonio.descricao_bem}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Patrimônio Nº: <span className="font-semibold">{patrimonio.numero_patrimonio}</span>
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Galeria de Fotos */}
            {fotos.length > 0 && (
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Fotos do Bem
                </h3>
                {fotos.length === 1 ? (
                  <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={getCloudImageUrl(fotos[0])}
                      alt={patrimonio.descricao_bem}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>
                ) : (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {fotos.map((foto, index) => (
                        <CarouselItem key={index}>
                          <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
                            <img
                              src={getCloudImageUrl(foto)}
                              alt={`${patrimonio.descricao_bem} - Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                )}
              </div>
            )}

            {/* Informações Principais */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informações do Bem
              </h3>
              <div className="space-y-0 border rounded-lg">
                <DetailRow
                  label="Descrição"
                  value={patrimonio.descricao_bem}
                  icon={Info}
                />
                <DetailRow
                  label="Tipo"
                  value={patrimonio.tipo}
                />
                {patrimonio.marca && (
                  <DetailRow
                    label="Marca"
                    value={patrimonio.marca}
                  />
                )}
                {patrimonio.modelo && (
                  <DetailRow
                    label="Modelo"
                    value={patrimonio.modelo}
                  />
                )}
              </div>
            </div>

            {/* Localização */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </h3>
              <div className="space-y-0 border rounded-lg">
                <DetailRow
                  label="Setor Responsável"
                  value={patrimonio.setor_responsavel}
                  icon={Building2}
                />
                <DetailRow
                  label="Local"
                  value={patrimonio.localizacao}
                  icon={MapPin}
                />
              </div>
            </div>

            {/* Informações Financeiras */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações Financeiras
              </h3>
              <div className="space-y-0 border rounded-lg">
                <DetailRow
                  label="Valor de Aquisição"
                  value={formatCurrency(patrimonio.valor_aquisicao)}
                  icon={DollarSign}
                />
                <DetailRow
                  label="Data de Aquisição"
                  value={formatDate(patrimonio.data_aquisicao)}
                  icon={Calendar}
                />
              </div>
            </div>

            {/* Rodapé */}
            <div className="pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                {settings.prefeituraName || MUNICIPALITY_NAME}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.secretariaResponsavel}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

