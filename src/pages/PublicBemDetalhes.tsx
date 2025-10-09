import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Hash,
  Tag,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
  Boxes,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { getCloudImageUrl, formatDate, formatCurrency } from '@/lib/utils'

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const patrimonio = patrimonios.find((p) => p.numero_patrimonio === numero)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [numero])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando informações...</p>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl">
          <CardHeader className="space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Package className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bem não encontrado</h2>
              <p className="text-muted-foreground mt-2">
                O bem que você está procurando não foi encontrado ou não está disponível para consulta pública.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/consulta-publica')}
              className="w-full"
              size="lg"
            >
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
    : []

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % fotos.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Fixed */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/consulta-publica')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            {settings.activeLogoUrl && (
              <img
                src={settings.activeLogoUrl}
                alt="Logo"
                className="h-10 w-auto"
              />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Info */}
          <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Package className="h-3 w-3 mr-1" />
                      Bem Móvel
                    </Badge>
                    <Badge 
                      variant={getSituacaoBadge(patrimonio.status)}
                      className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                    >
                      {formatSituacao(patrimonio.status)}
                    </Badge>
                  </div>
                  
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      {patrimonio.descricao_bem}
                    </h1>
                    <div className="flex items-center gap-2 text-blue-100">
                      <Hash className="h-5 w-5" />
                      <span className="text-lg font-medium">
                        Patrimônio: {patrimonio.numero_patrimonio}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valor Destacado */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <p className="text-blue-100 text-sm mb-1">Valor de Aquisição</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(patrimonio.valor_aquisicao)}
                  </p>
                  <p className="text-blue-100 text-sm mt-2">
                    {formatDate(patrimonio.data_aquisicao)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Galeria de Fotos */}
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Fotos do Bem</h2>
                </div>

                {fotos.length > 0 ? (
                  <div className="space-y-4">
                    {/* Imagem Principal */}
                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden group">
                      <img
                        src={getCloudImageUrl(fotos[currentImageIndex])}
                        alt={`${patrimonio.descricao_bem} - Foto ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e2e8f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="18"%3ESem Imagem Disponível%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      
                      {/* Controles de Navegação */}
                      {fotos.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={prevImage}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={nextImage}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>

                          {/* Indicador */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                            {currentImageIndex + 1} / {fotos.length}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Miniaturas */}
                    {fotos.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {fotos.map((foto, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`
                              aspect-square rounded-lg overflow-hidden border-2 transition-all
                              ${index === currentImageIndex 
                                ? 'border-primary ring-2 ring-primary/20' 
                                : 'border-transparent hover:border-primary/50'
                              }
                            `}
                          >
                            <img
                              src={getCloudImageUrl(foto)}
                              alt={`Miniatura ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Package className="h-16 w-16 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma foto disponível</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações Detalhadas */}
            <div className="space-y-6">
              
              {/* Identificação */}
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold">Identificação</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                        <p className="font-semibold text-sm">{patrimonio.tipo}</p>
                      </div>
                      {patrimonio.marca && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Marca</p>
                          <p className="font-semibold text-sm">{patrimonio.marca}</p>
                        </div>
                      )}
                      {patrimonio.modelo && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                          <p className="font-semibold text-sm">{patrimonio.modelo}</p>
                        </div>
                      )}
                    </div>

                    {patrimonio.serie && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Número de Série</p>
                        <p className="font-semibold">{patrimonio.serie}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Localização */}
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold">Localização</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Setor Responsável</p>
                        <p className="font-semibold">{patrimonio.setor_responsavel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Localização Física</p>
                        <p className="font-semibold">{patrimonio.localizacao}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações Financeiras */}
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold">Dados Financeiros</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Valor de Aquisição</p>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(patrimonio.valor_aquisicao)}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Data de Aquisição</p>
                        <p className="font-semibold">{formatDate(patrimonio.data_aquisicao)}</p>
                      </div>
                    </div>

                    {patrimonio.forma_aquisicao && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Boxes className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Forma de Aquisição</p>
                          <p className="font-semibold">{patrimonio.forma_aquisicao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {patrimonio.observacoes && (
                <Card className="border-none shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-bold">Observações</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      {patrimonio.observacoes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer */}
          <Card className="border-none shadow-xl bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-8 text-center">
              <Separator className="mb-6" />
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {settings.prefeituraName || MUNICIPALITY_NAME}
                </p>
                <p className="text-sm text-muted-foreground">
                  {settings.secretariaResponsavel}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Consulta Pública de Patrimônio - Sistema SISPAT
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
