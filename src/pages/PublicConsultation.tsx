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
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { formatCurrency, formatDate, getCloudImageUrl } from '@/lib/utils'
import { Patrimonio } from '@/types'
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    Image as ImageIcon,
    Loader2,
    MapPin,
    ServerCrash,
    Shield,
    Tag,
    Building,
    Package,
    Hash,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const DetailItem = ({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) => (
  <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200">
    {Icon && (
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-blue-900 mb-1">{label}</p>
      <div className="text-sm text-gray-700 font-medium">{value}</div>
    </div>
  </div>
)

export default function PublicConsultation() {
  const { id } = useParams<{ id: string }>()
  const { getPatrimonioById } = usePatrimonio()
  const { municipalities } = useMunicipalities()
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null | undefined>(
    undefined,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPatrimonio = async () => {
      if (!id) return
      
      setIsLoading(true)
      
      // Primeiro, tentar buscar localmente
      let foundPatrimonio = getPatrimonioById(id)
      
      // Se não encontrou localmente, tentar buscar na API pública
      if (!foundPatrimonio) {
        try {
          console.log(`🔍 Buscando patrimônio ${id} na API pública...`)
          const response = await fetch(`/api/patrimonios/public/${id}`)
          if (response.ok) {
            foundPatrimonio = await response.json()
            console.log('✅ Patrimônio encontrado na API pública:', foundPatrimonio)
          }
        } catch (error) {
          console.log('❌ Erro ao buscar patrimônio na API pública:', error)
        }
      }
      
      setPatrimonio(foundPatrimonio)
      setIsLoading(false)
    }

    fetchPatrimonio()
  }, [id, getPatrimonioById])

  const municipality = useMemo(() => {
    if (!patrimonio) return null
    return municipalities.find((m) => m.id === patrimonio.municipalityId)
  }, [patrimonio, municipalities])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Carregando informações do patrimônio...</p>
        </div>
      </div>
    )
  }

  if (!patrimonio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ServerCrash className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-800">Patrimônio não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              O bem que você está procurando não foi encontrado. Verifique o
              número e tente novamente.
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link to="/consulta-publica">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Consulta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {municipality?.logoUrl && (
                <div className="w-16 h-16 bg-white rounded-lg p-2 shadow-md">
                  <img
                    src={municipality.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  Consulta Pública de Patrimônio
                </h1>
                <p className="text-blue-100">{municipality?.name}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/consulta-publica">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Card principal com sombra e bordas arredondadas */}
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                  {patrimonio.descricao || patrimonio.descricao || 'Sem descrição'}
                </CardTitle>
                <CardDescription className="text-lg">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Hash className="w-4 h-4 mr-1" />
                    Nº {patrimonio.numero_patrimonio}
                  </span>
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="w-3 h-3 mr-1" />
                  {patrimonio.status || 'Ativo'}
                </Badge>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                  <Package className="w-3 h-3 mr-1" />
                  {patrimonio.situacao_bem || 'Em uso'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="grid gap-8 lg:grid-cols-5">
              {/* Seção de imagens */}
              <div className="lg:col-span-3 p-6">
                {patrimonio.fotos && Array.isArray(patrimonio.fotos) && patrimonio.fotos.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Galeria de Fotos
                    </h3>
                    <Carousel className="w-full">
                      <CarouselContent>
                        {patrimonio.fotos.map((fotoId, index) => (
                          <CarouselItem key={index}>
                            <div className="relative group">
                              <img
                                src={getCloudImageUrl(fotoId)}
                                alt={`${patrimonio.descricao} - Foto ${
                                  index + 1
                                }`}
                                className="rounded-xl object-cover w-full aspect-video shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl"></div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-4 bg-white/90 hover:bg-white shadow-lg" />
                      <CarouselNext className="right-4 bg-white/90 hover:bg-white shadow-lg" />
                    </Carousel>
                  </div>
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="mx-auto h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nenhuma foto disponível</p>
                      <p className="text-sm">Este patrimônio ainda não possui imagens cadastradas</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de detalhes */}
              <div className="lg:col-span-2 p-6 bg-gradient-to-b from-gray-50 to-white">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-blue-600" />
                  Informações do Patrimônio
                </h3>
                
                <div className="space-y-4">
                  <DetailItem
                    label="Descrição do Bem"
                    value={patrimonio.descricao || patrimonio.descricao || 'Sem descrição'}
                    icon={Package}
                  />
                  
                  <DetailItem
                    label="Tipo"
                    value={patrimonio.tipo || 'Não informado'}
                    icon={Tag}
                  />
                  
                  <DetailItem
                    label="Setor Responsável"
                    value={patrimonio.setor_responsavel || 'Não informado'}
                    icon={Building}
                  />
                  
                  <DetailItem 
                    label="Localização" 
                    value={patrimonio.local_objeto || 'Não informado'}
                    icon={MapPin}
                  />
                  
                  <DetailItem
                    label="Data de Aquisição"
                    value={patrimonio.data_aquisicao ? formatDate(new Date(patrimonio.data_aquisicao)) : 'Não informado'}
                    icon={Calendar}
                  />
                  
                  <DetailItem
                    label="Valor de Aquisição"
                    value={patrimonio.valor_aquisicao ? formatCurrency(patrimonio.valor_aquisicao) : 'Não informado'}
                    icon={DollarSign}
                  />
                  
                  {patrimonio.marca && (
                    <DetailItem
                      label="Marca"
                      value={patrimonio.marca}
                      icon={Tag}
                    />
                  )}
                  
                  {patrimonio.modelo && (
                    <DetailItem
                      label="Modelo"
                      value={patrimonio.modelo}
                      icon={Package}
                    />
                  )}
                  
                  {patrimonio.numero_serie && (
                    <DetailItem
                      label="Número de Série"
                      value={patrimonio.numero_serie}
                      icon={Hash}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
