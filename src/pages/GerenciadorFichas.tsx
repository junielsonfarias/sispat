import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  FileText, 
  Edit, 
  Copy, 
  Trash2, 
  Star, 
  StarOff,
  Search,
  Filter,
  Building,
  Archive
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/http-api'

interface FichaTemplate {
  id: string
  name: string
  description?: string
  type: 'bens' | 'imoveis'
  isDefault: boolean
  isActive: boolean
  config: any
  createdAt: string
  updatedAt: string
}

export default function GerenciadorFichas() {
  const { user } = useAuth()
  const location = useLocation()
  const [templates, setTemplates] = useState<FichaTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'bens' | 'imoveis'>('all')

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/ficha-templates')
      console.log('[GerenciadorFichas] Templates recebidos:', response)
      setTemplates(Array.isArray(response) ? response : [])
      console.log('[GerenciadorFichas] Templates definidos:', Array.isArray(response) ? response.length : 0)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de mostrar erro
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
        console.log('⚠️  Backend não disponível - usando lista vazia de templates de ficha')
        setTemplates([])
      } else {
        setTemplates([]) // Garantir que sempre seja um array
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Recarregar quando receber state de reload
  useEffect(() => {
    console.log('[GerenciadorFichas] location.state:', location.state)
    if (location.state?.reload) {
      console.log('[GerenciadorFichas] Reload detectado! Recarregando templates...')
      loadTemplates()
      // Limpar o state para não recarregar novamente
      window.history.replaceState({}, document.title)
    }
  }, [location.state, loadTemplates])

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return
    
    try {
      await api.delete(`/ficha-templates/${id}`)
      setTemplates((templates || []).filter(t => t.id !== id))
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, remover apenas localmente
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
        console.log('⚠️  Backend não disponível. Removendo template apenas localmente.')
        setTemplates((templates || []).filter(t => t.id !== id))
      }
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.patch(`/ficha-templates/${id}/set-default`)
      loadTemplates() // Recarregar para atualizar os estados
    } catch (error) {
      console.error('Erro ao definir template padrão:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, atualizar apenas localmente
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
        console.log('⚠️  Backend não disponível. Definindo template padrão apenas localmente.')
        setTemplates(prev => prev?.map(t => ({
          ...t,
          isDefault: t.id === id
        })) || [])
      }
    }
  }

  const handleDuplicateTemplate = async (template: FichaTemplate) => {
    try {
      const duplicateData = {
        name: `${template.name} (Cópia)`,
        description: template.description,
        type: template.type,
        config: template.config
      }
      await api.post('/ficha-templates', duplicateData)
      loadTemplates()
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, adicionar apenas localmente
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
        console.log('⚠️  Backend não disponível. Adicionando template duplicado apenas localmente.')
        const localDuplicate = {
          id: `local-${Date.now()}`,
          ...duplicateData,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setTemplates(prev => [...(prev || []), localDuplicate])
      }
    }
  }

  const filteredTemplates = (templates || []).filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || template.type === filterType
    return matchesSearch && matchesFilter
  })
  
  console.log('[GerenciadorFichas] Total templates:', templates?.length || 0)
  console.log('[GerenciadorFichas] Filtered templates:', filteredTemplates.length)

  const getTypeIcon = (type: string) => {
    return type === 'bens' ? Archive : Building
  }

  const getTypeLabel = (type: string) => {
    return type === 'bens' ? 'Bens Móveis' : 'Imóveis'
  }

  const getTypeColor = (type: string) => {
    return type === 'bens' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciador de Fichas</h1>
          <p className="text-gray-600 mt-2">
            Crie e gerencie templates personalizados para fichas de patrimônio
          </p>
        </div>
        <Link to="/gerenciador-fichas/novo">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'bens' | 'imoveis')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="bens">Bens Móveis</option>
            <option value="imoveis">Imóveis</option>
          </select>
        </div>
      </div>

      {/* Lista de Templates */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? 'Nenhum template encontrado' : 'Nenhum template criado'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Crie seu primeiro template personalizado para começar'
              }
            </p>
            <Link to="/gerenciador-fichas/novo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const TypeIcon = getTypeIcon(template.type)
            return (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {getTypeLabel(template.type)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {template.isDefault && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                      <Badge className={getTypeColor(template.type)}>
                        {getTypeLabel(template.type)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-4">
                    Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Botão Editar em destaque */}
                    <Link to={`/gerenciador-fichas/editor/${template.id}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </Link>
                    
                    {/* Botões de ação secundários */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(template)}
                        title="Duplicar template"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          title="Definir como padrão"
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="Excluir template"
                        className={!template.isDefault ? '' : 'col-start-3'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
