import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MapPin, 
  Building2, 
  Info, 
  Download, 
  Share2, 
  Layers,
  Navigation,
  Globe,
  Smartphone
} from 'lucide-react'
import { MapView } from '@/components/MapView'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface Imovel {
  id: string
  numero_patrimonio: string
  endereco: string
  descricao: string
  area_total?: number
  area_construida?: number
  valor_aquisicao?: number
  data_aquisicao?: string
  municipality_id: string
  municipality_name: string
  latitude?: number
  longitude?: number
  tipo?: string
  setor?: string
}

export const MapaInterativo: React.FC = () => {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [selectedImovel, setSelectedImovel] = useState<Imovel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Carregar imóveis
  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/imoveis`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar imóveis')
        }

        const data = await response.json()
        setImoveis(data)
      } catch (err) {
        console.error('Erro ao carregar imóveis:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os imóveis',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchImoveis()
  }, [])

  const handleImovelSelect = (imovel: Imovel) => {
    setSelectedImovel(imovel)
  }

  const exportMapData = () => {
    try {
      const data = imoveis.map(imovel => ({
        numero_patrimonio: imovel.numero_patrimonio,
        descricao: imovel.descricao,
        endereco: imovel.endereco,
        tipo: imovel.tipo || 'Não informado',
        setor: imovel.setor || 'Não informado',
        area_total: imovel.area_total || 'Não informado',
        latitude: imovel.latitude || 'Não informado',
        longitude: imovel.longitude || 'Não informado'
      }))

      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `imoveis_mapa_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Exportação Concluída',
        description: 'Dados do mapa exportados com sucesso'
      })
    } catch (error) {
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar os dados',
        variant: 'destructive'
      })
    }
  }

  const shareMap = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mapa de Imóveis - SISPAT',
        text: 'Visualize os imóveis no mapa interativo',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Link Copiado',
        description: 'Link do mapa copiado para a área de transferência'
      })
    }
  }

  const openInMobile = () => {
    const mobileUrl = `${window.location.origin}/mobile/mapa`
    window.open(mobileUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao Carregar Mapa</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa Interativo de Imóveis</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os imóveis em um mapa interativo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportMapData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={shareMap}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button variant="outline" onClick={openInMobile}>
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total de Imóveis</p>
                <p className="text-2xl font-bold">{imoveis.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Com Coordenadas</p>
                <p className="text-2xl font-bold">
                  {imoveis.filter(i => i.latitude && i.longitude).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tipos Diferentes</p>
                <p className="text-2xl font-bold">
                  {new Set(imoveis.map(i => i.tipo).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Municípios</p>
                <p className="text-2xl font-bold">
                  {new Set(imoveis.map(i => i.municipality_name)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa Principal */}
      <Card>
        <CardContent className="p-0">
          <MapView 
            imoveis={imoveis}
            onImovelSelect={handleImovelSelect}
            className="h-[600px]"
          />
        </CardContent>
      </Card>

      {/* Detalhes do Imóvel Selecionado */}
      {selectedImovel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalhes do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{selectedImovel.numero_patrimonio}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-sm">{selectedImovel.descricao}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                    <p className="text-sm">{selectedImovel.endereco}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Município</label>
                    <p className="text-sm">{selectedImovel.municipality_name}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {selectedImovel.tipo && (
                      <Badge variant="secondary">{selectedImovel.tipo}</Badge>
                    )}
                    {selectedImovel.setor && (
                      <Badge variant="outline">{selectedImovel.setor}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedImovel.area_total && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Área Total</label>
                        <p className="text-sm">{selectedImovel.area_total}m²</p>
                      </div>
                    )}
                    {selectedImovel.area_construida && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Área Construída</label>
                        <p className="text-sm">{selectedImovel.area_construida}m²</p>
                      </div>
                    )}
                    {selectedImovel.valor_aquisicao && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Valor de Aquisição</label>
                        <p className="text-sm">
                          R$ {selectedImovel.valor_aquisicao.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {selectedImovel.data_aquisicao && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Aquisição</label>
                        <p className="text-sm">
                          {new Date(selectedImovel.data_aquisicao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedImovel.latitude && selectedImovel.longitude && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coordenadas</label>
                      <p className="text-sm">
                        {selectedImovel.latitude.toFixed(6)}, {selectedImovel.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Informações do Mapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Funcionalidades</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visualização interativa de imóveis</li>
                <li>• Filtros por tipo e setor</li>
                <li>• Busca por número ou descrição</li>
                <li>• Informações detalhadas no hover</li>
                <li>• Diferentes tipos de mapa</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Controles</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Zoom com scroll do mouse</li>
                <li>• Arrastar para navegar</li>
                <li>• Clique nos marcadores</li>
                <li>• Botão de localização atual</li>
                <li>• Alternar tipo de mapa</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dicas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use os filtros para encontrar imóveis específicos</li>
                <li>• Clique em um imóvel para ver detalhes</li>
                <li>• Exporte dados para análise externa</li>
                <li>• Compartilhe o mapa com outros usuários</li>
                <li>• Acesse a versão mobile para campo</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
