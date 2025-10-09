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
  Info,
  Sparkles,
  ShieldCheck,
  Circle,
  Star,
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

const getSituacaoColor = (situacao: string) => {
  const colors: Record<string, string> = {
    ativo: 'text-green-600 bg-green-50 border-green-200',
    em_uso: 'text-blue-600 bg-blue-50 border-blue-200',
    em_manutencao: 'text-amber-600 bg-amber-50 border-amber-200',
    baixado: 'text-red-600 bg-red-50 border-red-200',
    cedido: 'text-purple-600 bg-purple-50 border-purple-200',
  }
  return colors[situacao] || 'text-gray-600 bg-gray-50 border-gray-200'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
            <div className="absolute inset-0 animate-ping opacity-30">
              <Circle className="h-16 w-16 text-blue-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">Carregando detalhes</h3>
            <p className="text-sm text-gray-500">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <Package className="h-10 w-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Bem não encontrado</h2>
              <p className="text-gray-600">
                O patrimônio que você procura não está disponível para consulta pública.
              </p>
            </div>
            <Button onClick={() => navigate('/consulta-publica')} className="w-full" size="lg">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      
      {/* Navbar Superior */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/consulta-publica')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-4">
              {settings.activeLogoUrl && (
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo"
                  className="h-10 w-auto"
                />
              )}
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {settings.prefeituraName || MUNICIPALITY_NAME}
                </p>
                <p className="text-xs text-gray-500">
                  {settings.secretariaResponsavel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Package className="h-3 w-3 mr-1" />
                    Bem Móvel
                  </Badge>
                  <Badge className={`${getSituacaoColor(patrimonio.status)} border`}>
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {formatSituacao(patrimonio.status)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                    {patrimonio.descricao_bem}
                  </h1>
                  <div className="flex items-center gap-2 text-blue-100">
                    <Hash className="h-5 w-5" />
                    <span className="text-lg font-medium">
                      Patrimônio {patrimonio.numero_patrimonio}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-2xl min-w-[240px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Valor Aquisição</span>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(patrimonio.valor_aquisicao)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(patrimonio.data_aquisicao)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            
            {/* Galeria - 7 colunas */}
            <div className="lg:col-span-7">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {fotos.length > 0 ? (
                    <div className="space-y-4 p-6">
                      {/* Imagem Principal */}
                      <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group">
                        <img
                          src={getCloudImageUrl(fotos[currentImageIndex])}
                          alt={`${patrimonio.descricao_bem} - Foto ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                          }}
                        />

                        {fotos.length > 1 && (
                          <>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={nextImage}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                              {currentImageIndex + 1} / {fotos.length}
                            </div>
                          </>
                        )}

                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                          <Star className="h-3 w-3 fill-white" />
                          Verificado
                        </div>
                      </div>

                      {/* Miniaturas */}
                      {fotos.length > 1 && (
                        <div className="grid grid-cols-5 gap-3">
                          {fotos.map((foto, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`
                                aspect-square rounded-lg overflow-hidden transition-all
                                ${index === currentImageIndex
                                  ? 'ring-2 ring-blue-600 opacity-100'
                                  : 'ring-1 ring-gray-200 opacity-60 hover:opacity-100'
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
                    <div className="aspect-[4/3] flex items-center justify-center bg-gray-50 m-6 rounded-xl">
                      <div className="text-center text-gray-400 space-y-3">
                        <Package className="h-16 w-16 mx-auto opacity-20" />
                        <p className="text-sm">Sem fotos disponíveis</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Informações - 5 colunas */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Identificação */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-amber-700" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Identificação</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Tipo</p>
                        <p className="font-semibold text-sm text-gray-900">{patrimonio.tipo}</p>
                      </div>
                      {patrimonio.marca && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Marca</p>
                          <p className="font-semibold text-sm text-gray-900">{patrimonio.marca}</p>
                        </div>
                      )}
                    </div>

                    {patrimonio.modelo && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Modelo</p>
                        <p className="font-semibold text-gray-900">{patrimonio.modelo}</p>
                      </div>
                    )}

                    {patrimonio.serie && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Número de Série</p>
                        <p className="font-mono font-semibold text-gray-900">{patrimonio.serie}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Localização */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-700" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Localização</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Setor</p>
                        <p className="font-semibold text-gray-900">{patrimonio.setor_responsavel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Local</p>
                        <p className="font-semibold text-gray-900">{patrimonio.localizacao}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financeiro */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-700" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Informações Financeiras</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-700 mb-1">Valor de Aquisição</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(patrimonio.valor_aquisicao)}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Data de Aquisição</p>
                        <p className="font-semibold text-gray-900">{formatDate(patrimonio.data_aquisicao)}</p>
                      </div>
                    </div>

                    {patrimonio.forma_aquisicao && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Sparkles className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Forma de Aquisição</p>
                          <p className="font-semibold text-gray-900">{patrimonio.forma_aquisicao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {patrimonio.observacoes && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-700" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Observações</h2>
                    </div>

                    <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-lg">
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
