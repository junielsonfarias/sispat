import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
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
  Sparkles,
  ShieldCheck,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="h-16 w-16 text-primary/30 mx-auto" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Carregando informações...</p>
            <p className="text-sm text-muted-foreground">Aguarde um momento</p>
          </div>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-1">
            <div className="bg-white dark:bg-slate-900 p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500/10 to-pink-500/10 flex items-center justify-center">
                <Package className="h-10 w-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Bem não encontrado
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  O bem que você está procurando não foi encontrado ou não está disponível para consulta pública.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/consulta-publica')}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar para Consulta
              </Button>
            </div>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      
      {/* Header Superior Fixo com Informações da Prefeitura */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
        <div className="container mx-auto px-4">
          {/* Linha Superior - Logo e Informações */}
          <div className="flex items-center justify-between py-4 border-b border-white/20">
            <Button
              variant="ghost"
              onClick={() => navigate('/consulta-publica')}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>

            <div className="flex items-center gap-4">
              {settings.activeLogoUrl && (
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo"
                  className="h-12 sm:h-16 w-auto drop-shadow-2xl"
                />
              )}
              <div className="hidden md:block text-right">
                <h2 className="text-white font-bold text-lg leading-tight">
                  {settings.prefeituraName || MUNICIPALITY_NAME}
                </h2>
                <p className="text-blue-100 text-xs">
                  {settings.secretariaResponsavel}
                </p>
              </div>
            </div>
          </div>

          {/* Linha Inferior - Título do Bem */}
          <div className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30">
                    <Package className="h-3 w-3 mr-1" />
                    Bem Móvel
                  </Badge>
                  <Badge 
                    variant={getSituacaoBadge(patrimonio.status)}
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {formatSituacao(patrimonio.status)}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                  {patrimonio.descricao_bem}
                </h1>
                <div className="flex items-center gap-2 text-blue-100 mt-1">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">Patrimônio: {patrimonio.numero_patrimonio}</span>
                </div>
              </div>

              {/* Card de Valor Flutuante */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border-2 border-white/50 min-w-[180px]">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatCurrency(patrimonio.valor_aquisicao)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(patrimonio.data_aquisicao)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Main Grid */}
          <div className="grid lg:grid-cols-5 gap-6">
            
            {/* Galeria de Fotos - 3 colunas */}
            <div className="lg:col-span-3">
              <Card className="border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1">
                  <CardContent className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          Galeria de Fotos
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {fotos.length > 0 ? `${fotos.length} ${fotos.length === 1 ? 'foto disponível' : 'fotos disponíveis'}` : 'Nenhuma foto disponível'}
                        </p>
                      </div>
                    </div>

                    {fotos.length > 0 ? (
                      <div className="space-y-4">
                        {/* Imagem Principal */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden group shadow-xl">
                          <img
                            src={getCloudImageUrl(fotos[currentImageIndex])}
                            alt={`${patrimonio.descricao_bem} - Foto ${currentImageIndex + 1}`}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" y1="0" x2="1" y2="1"%3E%3Cstop offset="0%25" stop-color="%23e2e8f0"/%3E%3Cstop offset="100%25" stop-color="%23cbd5e1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23g)" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="16" font-family="Arial"%3ESem Imagem Disponível%3C/text%3E%3C/svg%3E'
                            }}
                          />
                          
                          {/* Controles de Navegação */}
                          {fotos.length > 1 && (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl hover:scale-110 bg-white/90 backdrop-blur-sm"
                                onClick={prevImage}
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl hover:scale-110 bg-white/90 backdrop-blur-sm"
                                onClick={nextImage}
                              >
                                <ChevronRight className="h-5 w-5" />
                              </Button>

                              {/* Indicador Moderno */}
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg">
                                {currentImageIndex + 1} / {fotos.length}
                              </div>
                            </>
                          )}

                          {/* Badge de Qualidade */}
                          <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verificado
                          </div>
                        </div>

                        {/* Miniaturas Melhoradas */}
                        {fotos.length > 1 && (
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            {fotos.map((foto, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`
                                  relative aspect-square rounded-xl overflow-hidden transition-all duration-300
                                  ${index === currentImageIndex 
                                    ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50 scale-105' 
                                    : 'ring-2 ring-slate-200 hover:ring-purple-400 hover:scale-105 opacity-70 hover:opacity-100'
                                  }
                                `}
                              >
                                <img
                                  src={getCloudImageUrl(foto)}
                                  alt={`Miniatura ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {index === currentImageIndex && (
                                  <div className="absolute inset-0 bg-gradient-to-t from-purple-600/30 to-transparent" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center">
                        <div className="text-center text-muted-foreground space-y-3">
                          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto">
                            <Package className="h-10 w-10 opacity-30" />
                          </div>
                          <p className="font-medium">Nenhuma foto disponível</p>
                          <p className="text-sm">Este bem ainda não possui fotos cadastradas</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            </div>

            {/* Informações Detalhadas - 2 colunas */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Identificação */}
              <Card className="border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-1">
                  <CardContent className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <Tag className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        Identificação
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                          <p className="font-bold text-sm truncate">{patrimonio.tipo}</p>
                        </div>
                        {patrimonio.marca && (
                          <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-muted-foreground mb-1">Marca</p>
                            <p className="font-bold text-sm truncate">{patrimonio.marca}</p>
                          </div>
                        )}
                      </div>

                      {patrimonio.modelo && (
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                          <p className="font-bold">{patrimonio.modelo}</p>
                        </div>
                      )}

                      {patrimonio.serie && (
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-muted-foreground mb-1">Número de Série</p>
                          <p className="font-mono font-bold">{patrimonio.serie}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Localização */}
              <Card className="border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1">
                  <CardContent className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        Localização
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800">
                        <Building2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Setor Responsável</p>
                          <p className="font-bold">{patrimonio.setor_responsavel}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800">
                        <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Localização Física</p>
                          <p className="font-bold">{patrimonio.localizacao}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Informações Financeiras */}
              <Card className="border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-1">
                  <CardContent className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Dados Financeiros
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Valor de Aquisição</p>
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                          {formatCurrency(patrimonio.valor_aquisicao)}
                        </p>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Data de Aquisição</p>
                          <p className="font-bold">{formatDate(patrimonio.data_aquisicao)}</p>
                        </div>
                      </div>

                      {patrimonio.forma_aquisicao && (
                        <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <Boxes className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Forma de Aquisição</p>
                            <p className="font-bold">{patrimonio.forma_aquisicao}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Observações */}
              {patrimonio.observacoes && (
                <Card className="border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1">
                    <CardContent className="p-6 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          Observações
                        </h2>
                      </div>
                      <p className="text-muted-foreground leading-relaxed p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        {patrimonio.observacoes}
                      </p>
                    </CardContent>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Footer Elegante */}
          <div className="mt-8">
            <Card className="border-none shadow-xl bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-8 text-center">
                <Separator className="mb-6 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  {settings.activeLogoUrl && (
                    <img
                      src={settings.activeLogoUrl}
                      alt="Logo"
                      className="h-16 w-auto opacity-80"
                    />
                  )}
                  <div className="text-center md:text-left space-y-1">
                    <p className="font-bold text-lg">
                      {settings.prefeituraName || MUNICIPALITY_NAME}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {settings.secretariaResponsavel}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2 flex items-center justify-center md:justify-start gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Consulta Pública de Patrimônio - Sistema SISPAT
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
