import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Archive, Building, ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/http-api'

interface TemplateConfig {
  header: {
    showLogo: boolean
    logoSize: 'small' | 'medium' | 'large'
    showDate: boolean
    showSecretariat: boolean
    customTexts: {
      secretariat: string
      department: string
    }
  }
  sections: {
    patrimonioInfo: {
      enabled: boolean
      layout: 'grid' | 'list'
      fields: string[]
      showPhoto: boolean
      photoSize: 'small' | 'medium' | 'large'
    }
    acquisition: { enabled: boolean; fields: string[] }
    location: { enabled: boolean; fields: string[] }
    depreciation: { enabled: boolean; fields: string[] }
  }
  signatures: {
    enabled: boolean
    count: number
    layout: 'horizontal' | 'vertical'
    labels: string[]
    showDates: boolean
  }
  styling: {
    margins: { top: number; bottom: number; left: number; right: number }
    fonts: { family: string; size: number }
  }
}

const defaultConfig: TemplateConfig = {
  header: {
    showLogo: true,
    logoSize: 'medium',
    showDate: true,
    showSecretariat: true,
    customTexts: {
      secretariat: 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS',
      department: 'DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO'
    }
  },
  sections: {
    patrimonioInfo: {
      enabled: true,
      layout: 'grid',
      fields: ['descricao_bem', 'tipo', 'marca', 'modelo', 'cor', 'numero_serie'],
      showPhoto: true,
      photoSize: 'medium'
    },
    acquisition: { enabled: true, fields: ['data_aquisicao', 'valor_aquisicao', 'forma_aquisicao'] },
    location: { enabled: true, fields: ['setor_responsavel', 'local_objeto', 'status'] },
    depreciation: { enabled: true, fields: ['metodo_depreciacao', 'vida_util_anos', 'valor_residual'] }
  },
  signatures: {
    enabled: true,
    count: 2,
    layout: 'horizontal',
    labels: ['Responsável pelo Setor', 'Responsável pelo Patrimônio'],
    showDates: true
  },
  styling: {
    margins: { top: 40, bottom: 20, left: 15, right: 15 },
    fonts: { family: 'Arial', size: 12 }
  }
}

export default function NovoTemplateFicha() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'bens' as 'bens' | 'imoveis',
    config: defaultConfig
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setLoading(true)
      await api.post('/ficha-templates', formData)
      // Redirecionar e forçar recarregamento
      navigate('/gerenciador-fichas', { state: { reload: true } })
    } catch (error) {
      console.error('Erro ao criar template:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (path: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        ...setNestedValue(prev.config, path, value)
      }
    }))
  }

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.')
    const result = { ...obj }
    let current = result
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] }
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    return result
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/gerenciador-fichas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Template de Ficha</h1>
          <p className="text-gray-600 mt-2">
            Configure um novo template personalizado para fichas de patrimônio
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Defina o nome, descrição e tipo do template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Modelo Padrão, Modelo Simplificado"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito deste template"
                rows={3}
              />
            </div>

            <div>
              <Label>Tipo de Patrimônio *</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'bens' | 'imoveis' }))}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bens" id="bens" />
                  <Label htmlFor="bens" className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Bens Móveis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="imoveis" id="imoveis" />
                  <Label htmlFor="imoveis" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Imóveis
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Configurações do Header */}
        <Card>
          <CardHeader>
            <CardTitle>Cabeçalho</CardTitle>
            <CardDescription>
              Configure o cabeçalho da ficha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secretariat">Nome da Secretaria</Label>
                <Input
                  id="secretariat"
                  value={formData.config.header.customTexts.secretariat}
                  onChange={(e) => handleConfigChange('header.customTexts.secretariat', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="department">Nome do Departamento</Label>
                <Input
                  id="department"
                  value={formData.config.header.customTexts.department}
                  onChange={(e) => handleConfigChange('header.customTexts.department', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="logoSize">Tamanho do Logo</Label>
                <select
                  id="logoSize"
                  value={formData.config.header.logoSize}
                  onChange={(e) => handleConfigChange('header.logoSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações das Seções */}
        <Card>
          <CardHeader>
            <CardTitle>Seções da Ficha</CardTitle>
            <CardDescription>
              Escolha quais seções incluir na ficha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="patrimonioInfo"
                  checked={formData.config.sections.patrimonioInfo.enabled}
                  onChange={(e) => handleConfigChange('sections.patrimonioInfo.enabled', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="patrimonioInfo">Informações do Patrimônio</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="acquisition"
                  checked={formData.config.sections.acquisition.enabled}
                  onChange={(e) => handleConfigChange('sections.acquisition.enabled', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="acquisition">Informações de Aquisição</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="location"
                  checked={formData.config.sections.location.enabled}
                  onChange={(e) => handleConfigChange('sections.location.enabled', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="location">Localização e Estado</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="depreciation"
                  checked={formData.config.sections.depreciation.enabled}
                  onChange={(e) => handleConfigChange('sections.depreciation.enabled', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="depreciation">Informações de Depreciação</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas</CardTitle>
            <CardDescription>
              Configure as linhas de assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="signatures"
                checked={formData.config.signatures.enabled}
                onChange={(e) => handleConfigChange('signatures.enabled', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="signatures">Incluir linhas de assinatura</Label>
            </div>

            {formData.config.signatures.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signatureCount">Número de Assinaturas</Label>
                  <Input
                    id="signatureCount"
                    type="number"
                    min="1"
                    max="4"
                    value={formData.config.signatures.count}
                    onChange={(e) => handleConfigChange('signatures.count', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="signatureLayout">Layout</Label>
                  <select
                    id="signatureLayout"
                    value={formData.config.signatures.layout}
                    onChange={(e) => handleConfigChange('signatures.layout', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/gerenciador-fichas')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !formData.name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </form>
    </div>
  )
}
