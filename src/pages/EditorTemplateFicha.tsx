import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Eye, Archive, Building, X, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/http-api'
import { FichaPreview } from '@/components/FichaPreview'

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

const availableFields = {
  patrimonioInfo: [
    { value: 'descricao_bem', label: 'Descrição do Bem' },
    { value: 'tipo', label: 'Tipo' },
    { value: 'marca', label: 'Marca' },
    { value: 'modelo', label: 'Modelo' },
    { value: 'cor', label: 'Cor' },
    { value: 'numero_serie', label: 'Número de Série' }
  ],
  acquisition: [
    { value: 'data_aquisicao', label: 'Data de Aquisição' },
    { value: 'valor_aquisicao', label: 'Valor de Aquisição' },
    { value: 'forma_aquisicao', label: 'Forma de Aquisição' }
  ],
  location: [
    { value: 'setor_responsavel', label: 'Setor Responsável' },
    { value: 'local_objeto', label: 'Local' },
    { value: 'status', label: 'Status' }
  ],
  depreciation: [
    { value: 'metodo_depreciacao', label: 'Método de Depreciação' },
    { value: 'vida_util_anos', label: 'Vida Útil (anos)' },
    { value: 'valor_residual', label: 'Valor Residual' }
  ]
}

const fontFamilies = [
  'Arial',
  'Times New Roman',
  'Helvetica',
  'Georgia',
  'Courier New',
  'Verdana'
]

export default function EditorTemplateFicha() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [template, setTemplate] = useState<FichaTemplate | null>(null)
  const [config, setConfig] = useState<TemplateConfig | null>(null)

  useEffect(() => {
    if (id) {
      loadTemplate()
    }
  }, [id])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/ficha-templates/${id}`)
      setTemplate(response)
      setConfig(response.config)
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      navigate('/gerenciador-fichas')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!template || !config) return

    try {
      setSaving(true)
      await api.put(`/ficha-templates/${id}`, {
        ...template,
        config
      })
      navigate('/gerenciador-fichas', { state: { reload: true } })
    } catch (error) {
      console.error('Erro ao salvar template:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (path: string, value: any) => {
    if (!config) return
    
    const keys = path.split('.')
    const newConfig = JSON.parse(JSON.stringify(config))
    let current = newConfig
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    setConfig(newConfig)
  }

  const toggleField = (section: string, field: string) => {
    if (!config) return
    
    const newConfig = { ...config }
    const sectionConfig = (newConfig.sections as any)[section]
    const fieldIndex = sectionConfig.fields.indexOf(field)
    
    if (fieldIndex > -1) {
      sectionConfig.fields = sectionConfig.fields.filter((f: string) => f !== field)
    } else {
      sectionConfig.fields = [...sectionConfig.fields, field]
    }
    
    setConfig(newConfig)
  }

  const updateSignatureLabel = (index: number, value: string) => {
    if (!config) return
    const newLabels = [...config.signatures.labels]
    newLabels[index] = value
    handleConfigChange('signatures.labels', newLabels)
  }

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
            <p className="text-gray-600">Carregando template...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!template || !config) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Template não encontrado</h1>
          <Button onClick={() => navigate('/gerenciador-fichas')}>
            Voltar ao Gerenciador
          </Button>
        </div>
      </div>
    )
  }

  const TypeIcon = getTypeIcon(template.type)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
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
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Editar Template</h1>
            {template.isDefault && (
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                Padrão
              </Badge>
            )}
            <Badge className={getTypeColor(template.type)}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {getTypeLabel(template.type)}
            </Badge>
          </div>
          <p className="text-gray-600">
            {template.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Configurações */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="header">Cabeçalho</TabsTrigger>
              <TabsTrigger value="sections">Seções</TabsTrigger>
              <TabsTrigger value="signatures">Assinaturas</TabsTrigger>
              <TabsTrigger value="styling">Estilo</TabsTrigger>
            </TabsList>

            {/* Aba Básico */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>
                    Configure o nome e descrição do template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Template *</Label>
                    <Input
                      id="name"
                      value={template.name}
                      onChange={(e) => setTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={template.description || ''}
                      onChange={(e) => setTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={3}
                      placeholder="Descreva o propósito deste template"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={template.isActive}
                      onChange={(e) => setTemplate(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                      className="rounded"
                    />
                    <Label htmlFor="isActive">Template ativo</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Cabeçalho */}
            <TabsContent value="header" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações do Cabeçalho</CardTitle>
                  <CardDescription>
                    Personalize o cabeçalho da ficha
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="secretariat">Nome da Secretaria</Label>
                      <Input
                        id="secretariat"
                        value={config.header.customTexts.secretariat}
                        onChange={(e) => handleConfigChange('header.customTexts.secretariat', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Nome do Departamento</Label>
                      <Input
                        id="department"
                        value={config.header.customTexts.department}
                        onChange={(e) => handleConfigChange('header.customTexts.department', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logoSize">Tamanho do Logo</Label>
                    <select
                      id="logoSize"
                      value={config.header.logoSize}
                      onChange={(e) => handleConfigChange('header.logoSize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="small">Pequeno</option>
                      <option value="medium">Médio</option>
                      <option value="large">Grande</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showLogo"
                        checked={config.header.showLogo}
                        onChange={(e) => handleConfigChange('header.showLogo', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showLogo">Mostrar Logo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showDate"
                        checked={config.header.showDate}
                        onChange={(e) => handleConfigChange('header.showDate', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showDate">Mostrar Data</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showSecretariat"
                        checked={config.header.showSecretariat}
                        onChange={(e) => handleConfigChange('header.showSecretariat', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showSecretariat">Mostrar Secretaria</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Seções */}
            <TabsContent value="sections" className="space-y-4">
              {/* Seção Patrimônio */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Informações do Patrimônio</CardTitle>
                      <CardDescription>Campos da seção principal</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="patrimonioEnabled"
                        checked={config.sections.patrimonioInfo.enabled}
                        onChange={(e) => handleConfigChange('sections.patrimonioInfo.enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="patrimonioEnabled">Habilitado</Label>
                    </div>
                  </div>
                </CardHeader>
                {config.sections.patrimonioInfo.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="layout">Layout</Label>
                        <select
                          id="layout"
                          value={config.sections.patrimonioInfo.layout}
                          onChange={(e) => handleConfigChange('sections.patrimonioInfo.layout', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="grid">Grade (2 colunas)</option>
                          <option value="list">Lista (1 coluna)</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="photoSize">Tamanho da Foto</Label>
                        <select
                          id="photoSize"
                          value={config.sections.patrimonioInfo.photoSize}
                          onChange={(e) => handleConfigChange('sections.patrimonioInfo.photoSize', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="small">Pequeno</option>
                          <option value="medium">Médio</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showPhoto"
                        checked={config.sections.patrimonioInfo.showPhoto}
                        onChange={(e) => handleConfigChange('sections.patrimonioInfo.showPhoto', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showPhoto">Mostrar Foto</Label>
                    </div>

                    <div>
                      <Label className="mb-2 block">Campos a Exibir</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableFields.patrimonioInfo.map((field) => (
                          <div key={field.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`field-${field.value}`}
                              checked={config.sections.patrimonioInfo.fields.includes(field.value)}
                              onChange={() => toggleField('patrimonioInfo', field.value)}
                              className="rounded"
                            />
                            <Label htmlFor={`field-${field.value}`} className="text-sm font-normal">
                              {field.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Seção Aquisição */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Informações de Aquisição</CardTitle>
                      <CardDescription>Dados sobre a compra do bem</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="acquisitionEnabled"
                        checked={config.sections.acquisition.enabled}
                        onChange={(e) => handleConfigChange('sections.acquisition.enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="acquisitionEnabled">Habilitado</Label>
                    </div>
                  </div>
                </CardHeader>
                {config.sections.acquisition.enabled && (
                  <CardContent>
                    <Label className="mb-2 block">Campos a Exibir</Label>
                    <div className="space-y-2">
                      {availableFields.acquisition.map((field) => (
                        <div key={field.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`field-${field.value}`}
                            checked={config.sections.acquisition.fields.includes(field.value)}
                            onChange={() => toggleField('acquisition', field.value)}
                            className="rounded"
                          />
                          <Label htmlFor={`field-${field.value}`} className="text-sm font-normal">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Seção Localização */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Localização e Estado</CardTitle>
                      <CardDescription>Onde está e como está o bem</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="locationEnabled"
                        checked={config.sections.location.enabled}
                        onChange={(e) => handleConfigChange('sections.location.enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="locationEnabled">Habilitado</Label>
                    </div>
                  </div>
                </CardHeader>
                {config.sections.location.enabled && (
                  <CardContent>
                    <Label className="mb-2 block">Campos a Exibir</Label>
                    <div className="space-y-2">
                      {availableFields.location.map((field) => (
                        <div key={field.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`field-${field.value}`}
                            checked={config.sections.location.fields.includes(field.value)}
                            onChange={() => toggleField('location', field.value)}
                            className="rounded"
                          />
                          <Label htmlFor={`field-${field.value}`} className="text-sm font-normal">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Seção Depreciação */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Informações de Depreciação</CardTitle>
                      <CardDescription>Dados de depreciação do bem</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="depreciationEnabled"
                        checked={config.sections.depreciation.enabled}
                        onChange={(e) => handleConfigChange('sections.depreciation.enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="depreciationEnabled">Habilitado</Label>
                    </div>
                  </div>
                </CardHeader>
                {config.sections.depreciation.enabled && (
                  <CardContent>
                    <Label className="mb-2 block">Campos a Exibir</Label>
                    <div className="space-y-2">
                      {availableFields.depreciation.map((field) => (
                        <div key={field.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`field-${field.value}`}
                            checked={config.sections.depreciation.fields.includes(field.value)}
                            onChange={() => toggleField('depreciation', field.value)}
                            className="rounded"
                          />
                          <Label htmlFor={`field-${field.value}`} className="text-sm font-normal">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Aba Assinaturas */}
            <TabsContent value="signatures" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Linhas de Assinatura</CardTitle>
                      <CardDescription>
                        Configure as assinaturas da ficha
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="signaturesEnabled"
                        checked={config.signatures.enabled}
                        onChange={(e) => handleConfigChange('signatures.enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="signaturesEnabled">Habilitado</Label>
                    </div>
                  </div>
                </CardHeader>
                {config.signatures.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signatureCount">Número de Assinaturas</Label>
                        <Input
                          id="signatureCount"
                          type="number"
                          min="1"
                          max="4"
                          value={config.signatures.count}
                          onChange={(e) => handleConfigChange('signatures.count', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="signatureLayout">Layout</Label>
                        <select
                          id="signatureLayout"
                          value={config.signatures.layout}
                          onChange={(e) => handleConfigChange('signatures.layout', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="horizontal">Horizontal (lado a lado)</option>
                          <option value="vertical">Vertical (empilhado)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showDates"
                        checked={config.signatures.showDates}
                        onChange={(e) => handleConfigChange('signatures.showDates', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showDates">Mostrar campo de data</Label>
                    </div>

                    <div>
                      <Label className="mb-2 block">Labels das Assinaturas</Label>
                      <div className="space-y-2">
                        {[...Array(config.signatures.count)].map((_, index) => (
                          <Input
                            key={index}
                            placeholder={`Label da assinatura ${index + 1}`}
                            value={config.signatures.labels[index] || ''}
                            onChange={(e) => updateSignatureLabel(index, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Aba Estilo */}
            <TabsContent value="styling" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Margens</CardTitle>
                  <CardDescription>
                    Configure as margens do documento (em pixels)
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marginTop">Margem Superior</Label>
                    <Input
                      id="marginTop"
                      type="number"
                      min="0"
                      max="100"
                      value={config.styling.margins.top}
                      onChange={(e) => handleConfigChange('styling.margins.top', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginBottom">Margem Inferior</Label>
                    <Input
                      id="marginBottom"
                      type="number"
                      min="0"
                      max="100"
                      value={config.styling.margins.bottom}
                      onChange={(e) => handleConfigChange('styling.margins.bottom', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginLeft">Margem Esquerda</Label>
                    <Input
                      id="marginLeft"
                      type="number"
                      min="0"
                      max="100"
                      value={config.styling.margins.left}
                      onChange={(e) => handleConfigChange('styling.margins.left', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginRight">Margem Direita</Label>
                    <Input
                      id="marginRight"
                      type="number"
                      min="0"
                      max="100"
                      value={config.styling.margins.right}
                      onChange={(e) => handleConfigChange('styling.margins.right', parseInt(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipografia</CardTitle>
                  <CardDescription>
                    Configure as fontes do documento
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fontFamily">Família da Fonte</Label>
                    <select
                      id="fontFamily"
                      value={config.styling.fonts.family}
                      onChange={(e) => handleConfigChange('styling.fonts.family', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {fontFamilies.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="fontSize">Tamanho da Fonte (px)</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      min="8"
                      max="24"
                      value={config.styling.fonts.size}
                      onChange={(e) => handleConfigChange('styling.fonts.size', parseInt(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview em Tempo Real */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview em Tempo Real</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Expandir
                </Button>
              </CardTitle>
              <CardDescription>
                Visualize como a ficha ficará
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white shadow-sm scale-75 origin-top-left" style={{ width: '133%' }}>
                <FichaPreview config={config} type={template.type} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Preview */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Preview da Ficha de {getTypeLabel(template.type)}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <FichaPreview config={config} type={template.type} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
