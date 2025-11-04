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
  CheckCircle2,
} from 'lucide-react'
import { usePatrimonio } from '@/hooks/usePatrimonio'
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
    em_uso: 'bg-blue-500 text-white',
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center">
              <Package className="h-8 w-8 text-rose-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Bem não encontrado</h2>
              <p className="text-slate-600">
                O patrimônio solicitado não está disponível.
              </p>
            </div>
            <Button onClick={() => navigate('/consulta-publica')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
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
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/consulta-publica')}
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
                <p className="text-sm font-semibold text-slate-900">
                  {settings.prefeituraName || MUNICIPALITY_NAME}
                </p>
                <p className="text-xs text-slate-600">
                  {settings.secretariaResponsavel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Title Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    Bem Móvel
                  </Badge>
                  <Badge className={getSituacaoStyle(patrimonio.status)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {formatSituacao(patrimonio.status)}
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                    {patrimonio.descricao_bem}
                  </h1>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Hash className="h-4 w-4" />
                    <span className="font-medium">Patrimônio {patrimonio.numero_patrimonio}</span>
                  </div>
                </div>
              </div>

              <Card className="min-w-[220px]">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Valor</span>
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(patrimonio.valor_aquisicao)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(patrimonio.data_aquisicao)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Gallery */}
            <div>
              <Card>
                <CardContent className="p-6">
                  {fotos.length > 0 ? (
                    <div className="space-y-4">
                      {/* Main Image */}
                      <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden group">
                        <img
                          src={getCloudImageUrl(fotos[currentImageIndex])}
                          alt={`${patrimonio.descricao_bem} - ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="14"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                          }}
                        />

                        {fotos.length > 1 && (
                          <>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={nextImage}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>

                            <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded">
                              {currentImageIndex + 1}/{fotos.length}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Thumbnails */}
                      {fotos.length > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                          {fotos.map((foto, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`
                                aspect-square rounded overflow-hidden border-2 transition-all
                                ${index === currentImageIndex
                                  ? 'border-blue-500 opacity-100'
                                  : 'border-slate-200 opacity-60 hover:opacity-100'
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
                    <div className="aspect-[4/3] flex items-center justify-center bg-slate-100 rounded-lg">
                      <div className="text-center text-slate-400">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Sem fotos disponíveis</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <div className="space-y-6">
              
              {/* Identificação */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Identificação</h2>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Tipo</span>
                      <span className="font-semibold text-slate-900">
                        {/* ✅ CORREÇÃO: Usar tipoBem?.nome ou tipo */}
                        {(patrimonio as any).tipoBem?.nome || patrimonio.tipo || 'Não informado'}
                      </span>
                    </div>
                    {patrimonio.marca && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Marca</span>
                        <span className="font-semibold text-slate-900">{patrimonio.marca}</span>
                      </div>
                    )}
                    {patrimonio.modelo && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Modelo</span>
                        <span className="font-semibold text-slate-900">{patrimonio.modelo}</span>
                      </div>
                    )}
                    {patrimonio.serie && (
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Nº Série</span>
                        <span className="font-mono font-semibold text-slate-900">{patrimonio.serie}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Localização */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Localização</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-slate-400 mt-1" />
                      <div className="flex-1 text-sm">
                        <p className="text-slate-600 mb-1">Setor</p>
                        <p className="font-semibold text-slate-900">{patrimonio.setor_responsavel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                      <div className="flex-1 text-sm">
                        <p className="text-slate-600 mb-1">Local</p>
                        <p className="font-semibold text-slate-900">
                          {/* ✅ CORREÇÃO: Usar local_objeto ou local?.name */}
                          {(patrimonio as any).local?.name || patrimonio.local_objeto || 'Não informado'}
                        </p>
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
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Financeiro</h2>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Valor Aquisição</span>
                      <span className="font-bold text-slate-900">{formatCurrency(patrimonio.valor_aquisicao)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Data Aquisição</span>
                      <span className="font-semibold text-slate-900">{formatDate(patrimonio.data_aquisicao)}</span>
                    </div>
                    {patrimonio.forma_aquisicao && (
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Forma</span>
                        <span className="font-semibold text-slate-900">{patrimonio.forma_aquisicao}</span>
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
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Observações</h2>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">
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
