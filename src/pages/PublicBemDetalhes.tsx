import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Sparkles,
  ShieldCheck,
  Circle,
  Star,
  CheckCircle2,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { getCloudImageUrl, formatDate, formatCurrency } from '@/lib/utils'

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

const getSituacaoStyle = (situacao: string) => {
  const styles: Record<string, string> = {
    ativo: 'bg-emerald-500 text-white',
    em_uso: 'bg-sky-500 text-white',
    em_manutencao: 'bg-amber-500 text-white',
    baixado: 'bg-rose-500 text-white',
    cedido: 'bg-violet-500 text-white',
  }
  return styles[situacao] || 'bg-slate-500 text-white'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className="w-20 h-20 rounded-full bg-indigo-600" />
            </div>
            <Loader2 className="h-20 w-20 animate-spin text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Carregando detalhes</h3>
            <p className="text-slate-600">Preparando visualização...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Package className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-slate-900">Bem não encontrado</h2>
              <p className="text-slate-600 text-lg">
                O patrimônio que você procura não está disponível para consulta pública.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/consulta-publica')} 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fotos = patrimonio.fotos && patrimonio.fotos.length > 0 ? patrimonio.fotos : []

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % fotos.length)
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + fotos.length) % fotos.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Navbar Premium */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/consulta-publica')}
              className="hover:bg-slate-100 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Voltar</span>
            </Button>

            <div className="flex items-center gap-4">
              {settings.activeLogoUrl && (
                <div className="relative">
                  <img
                    src={settings.activeLogoUrl}
                    alt="Logo"
                    className="h-12 w-auto drop-shadow-md"
                  />
                </div>
              )}
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900">
                  {settings.prefeituraName || MUNICIPALITY_NAME}
                </p>
                <p className="text-xs text-slate-600">
                  {settings.secretariaResponsavel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section Premium */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
              
              {/* Título e Info */}
              <div className="flex-1 space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm font-medium">
                    <Package className="h-4 w-4 mr-2" />
                    Bem Móvel
                  </Badge>
                  <Badge className={`${getSituacaoStyle(patrimonio.status)} px-4 py-1.5 text-sm font-medium shadow-lg`}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {formatSituacao(patrimonio.status)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-lg">
                    {patrimonio.descricao_bem}
                  </h1>
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                      <Hash className="h-5 w-5" />
                      <span className="text-lg font-bold">
                        {patrimonio.numero_patrimonio}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card de Valor Premium */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl blur-xl opacity-50" />
                <Card className="relative bg-white shadow-2xl border-0 rounded-3xl overflow-hidden min-w-[280px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full -mr-16 -mt-16" />
                  <CardContent className="p-8 relative">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Valor de Aquisição</span>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-black bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {formatCurrency(patrimonio.valor_aquisicao)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{formatDate(patrimonio.data_aquisicao)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-12 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            
            {/* Galeria Premium - 7 colunas */}
            <div className="lg:col-span-7">
              <Card className="overflow-hidden shadow-2xl border-0 rounded-3xl bg-white">
                <CardContent className="p-8">
                  {fotos.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-slate-900">Galeria de Fotos</h2>
                            <p className="text-sm text-slate-500">{fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Imagem Principal */}
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden group">
                        <img
                          src={getCloudImageUrl(fotos[currentImageIndex])}
                          alt={`${patrimonio.descricao_bem} - Foto ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="14"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                          }}
                        />

                        {fotos.length > 1 && (
                          <>
                            <Button
                              size="icon"
                              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-white/90 hover:bg-white shadow-xl hover:scale-110"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                              size="icon"
                              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-white/90 hover:bg-white shadow-xl hover:scale-110"
                              onClick={nextImage}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>

                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-xl backdrop-blur-sm">
                              {currentImageIndex + 1} / {fotos.length}
                            </div>
                          </>
                        )}

                        <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl">
                          <Star className="h-4 w-4 fill-white" />
                          Verificado
                        </div>
                      </div>

                      {/* Miniaturas Premium */}
                      {fotos.length > 1 && (
                        <div className="grid grid-cols-5 gap-4">
                          {fotos.map((foto, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`
                                relative aspect-square rounded-xl overflow-hidden transition-all duration-300
                                ${index === currentImageIndex
                                  ? 'ring-4 ring-indigo-600 scale-105 shadow-xl'
                                  : 'ring-2 ring-slate-200 hover:ring-indigo-400 opacity-60 hover:opacity-100 hover:scale-105'
                                }
                              `}
                            >
                              <img
                                src={getCloudImageUrl(foto)}
                                alt={`Miniatura ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {index === currentImageIndex && (
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/20 to-transparent" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl">
                      <div className="text-center text-slate-400 space-y-4">
                        <div className="w-24 h-24 mx-auto rounded-2xl bg-white/50 flex items-center justify-center">
                          <Package className="h-12 w-12 opacity-20" />
                        </div>
                        <div>
                          <p className="font-semibold">Sem fotos disponíveis</p>
                          <p className="text-sm">Este bem não possui imagens cadastradas</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Informações Premium - 5 colunas */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Identificação */}
              <Card className="overflow-hidden shadow-xl border-0 rounded-3xl bg-white">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Tag className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Identificação</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Tipo</p>
                        <p className="font-bold text-slate-900">{patrimonio.tipo}</p>
                      </div>
                      {patrimonio.marca && (
                        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1 font-medium">Marca</p>
                          <p className="font-bold text-slate-900">{patrimonio.marca}</p>
                        </div>
                      )}
                    </div>

                    {patrimonio.modelo && (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Modelo</p>
                        <p className="font-bold text-slate-900">{patrimonio.modelo}</p>
                      </div>
                    )}

                    {patrimonio.serie && (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Número de Série</p>
                        <p className="font-mono font-bold text-slate-900">{patrimonio.serie}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Localização */}
              <Card className="overflow-hidden shadow-xl border-0 rounded-3xl bg-white">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Localização</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                      <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Setor Responsável</p>
                        <p className="font-bold text-slate-900">{patrimonio.setor_responsavel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                      <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Localização Física</p>
                        <p className="font-bold text-slate-900">{patrimonio.localizacao}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financeiro */}
              <Card className="overflow-hidden shadow-xl border-0 rounded-3xl bg-white">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Dados Financeiros</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                      <p className="text-xs text-blue-700 mb-2 font-bold uppercase tracking-wide">Valor de Aquisição</p>
                      <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatCurrency(patrimonio.valor_aquisicao)}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                      <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Data de Aquisição</p>
                        <p className="font-bold text-slate-900">{formatDate(patrimonio.data_aquisicao)}</p>
                      </div>
                    </div>

                    {patrimonio.forma_aquisicao && (
                      <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <Layers className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1 font-medium">Forma de Aquisição</p>
                          <p className="font-bold text-slate-900">{patrimonio.forma_aquisicao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {patrimonio.observacoes && (
                <Card className="overflow-hidden shadow-xl border-0 rounded-3xl bg-white">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Observações</h2>
                    </div>

                    <p className="text-slate-700 leading-relaxed p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                      {patrimonio.observacoes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
