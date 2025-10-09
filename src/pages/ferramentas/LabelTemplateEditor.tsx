import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLabelTemplates } from '@/contexts/LabelTemplateContext'
import { LabelTemplate, LabelElement } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Save,
  Trash2,
  Text,
  QrCode,
  Image as ImageIcon,
  FileText,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { LabelPreview } from '@/components/LabelPreview'
// Mock data removido - usando dados reais do backend
import { useAuth } from '@/hooks/useAuth'
import { LabelElementProperties } from '@/components/admin/LabelElementProperties'
import { Label } from '@/components/ui/label'

const LabelTemplateEditor = () => {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTemplateById, saveTemplate, templates } = useLabelTemplates()
  
  console.log('LabelTemplateEditor render:', { templateId, user, templates: templates.length })
  const [template, setTemplate] = useState<LabelTemplate | null>(null)
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(
    null,
  )
  const [zoom, setZoom] = useState(1)
  // Dados de exemplo para preview (substituído por dados reais)
  const mockPatrimonio = {
    id: 'example',
    numero_patrimonio: '20240200001',
    descricao_bem: 'Exemplo de Bem',
    tipo: 'Eletrônico',
    marca: 'Exemplo',
    modelo: 'Modelo Exemplo',
    cor: 'Preto',
    numero_serie: 'SN123456',
    data_aquisicao: new Date('2024-01-15'),
    valor_aquisicao: 4500.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-001',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Sala 101',
    status: 'ativo',
    situacao_bem: 'OTIMO',
    fotos: [],
    documentos: [],
    historico_movimentacao: [],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 450,
  }

  useEffect(() => {
    console.log('LabelTemplateEditor useEffect:', { templateId, user, municipalityId: user?.municipalityId })
    
    if (templateId) {
      if (templateId === 'novo') {
        if (!user?.municipalityId) {
          console.log('User municipalityId not found, using default...')
          // Usar um ID padrão se não houver municipalityId
          setTemplate({
            id: generateId(),
            name: 'Novo Modelo de Etiqueta',
            width: 60,
            height: 40,
            elements: [],
            municipalityId: '1', // ID padrão
          })
          return
        }
        console.log('Creating new template with municipalityId:', user.municipalityId)
        setTemplate({
          id: generateId(),
          name: 'Novo Modelo de Etiqueta',
          width: 60,
          height: 40,
          elements: [],
          municipalityId: user.municipalityId,
        })
      } else {
        console.log('Loading existing template:', templateId)
        const existingTemplate = getTemplateById(templateId)
        if (existingTemplate) {
          console.log('Template found, setting template')
          setTemplate(JSON.parse(JSON.stringify(existingTemplate)))
        } else {
          console.log('Template not found, navigating back')
          navigate('/etiquetas/templates')
        }
      }
    }
  }, [templateId, getTemplateById, navigate, user])

  const handleSave = () => {
    console.log('handleSave called with template:', template)
    if (!template) {
      console.log('No template to save')
      return
    }
    
    // Validar nome vazio
    if (!template.name || template.name.trim() === '') {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, dê um nome para o modelo de etiqueta.',
        variant: 'destructive'
      })
      return
    }
    
    console.log('Calling saveTemplate...')
    saveTemplate(template)
    toast({ 
      title: 'Sucesso!',
      description: 'Modelo de etiqueta salvo com sucesso!' 
    })
    navigate('/etiquetas/templates')
  }

  const updateElement = (
    elementId: string,
    newProps: Partial<LabelElement>,
  ) => {
    if (!template) return
    const newElements = template.elements.map((el) =>
      el.id === elementId ? { ...el, ...newProps } : el,
    )
    const updatedTemplate = { ...template, elements: newElements }
    setTemplate(updatedTemplate)
    if (selectedElement?.id === elementId) {
      setSelectedElement({ ...selectedElement, ...newProps })
    }
  }

  const addElement = (type: LabelElement['type']) => {
    if (!template) return
    const newElement: LabelElement = {
      id: generateId(),
      type,
      x: 10,
      y: 10,
      width: 30,
      height: 15,
      content: type === 'TEXT' ? 'Texto' : 'numero_patrimonio',
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'left',
    }
    setTemplate({ ...template, elements: [...template.elements, newElement] })
    setSelectedElement(newElement)
  }

  const removeElement = () => {
    if (!template || !selectedElement) return
    setTemplate({
      ...template,
      elements: template.elements.filter((el) => el.id !== selectedElement.id),
    })
    setSelectedElement(null)
  }

  if (!template) {
    console.log('Template not loaded yet:', { templateId, user, templates: templates.length })
    return <div>Carregando editor...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/etiquetas/templates">Modelos de Etiqueta</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editor</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full space-y-2">
          <Label htmlFor="template-name" className="text-sm font-medium text-gray-700">
            Nome do Modelo de Etiqueta
          </Label>
          <Input
            id="template-name"
            placeholder="Ex: Etiqueta Padrão 60x40mm, Placa para Imóveis 100x150mm..."
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-xl sm:text-2xl font-bold"
          />
        </div>
        <Button onClick={handleSave} size="lg" className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> Salvar Modelo
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visualização da Etiqueta</CardTitle>
            </CardHeader>
            <CardContent
              className="flex justify-center items-center p-8 bg-muted overflow-auto min-h-[400px]"
              onClick={() => setSelectedElement(null)}
            >
              <div style={{ transform: `scale(${zoom})` }}>
                <LabelPreview
                  patrimonio={mockPatrimonio}
                  template={template}
                  onElementClick={setSelectedElement}
                  selectedElementId={selectedElement?.id}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Controles da Visualização</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setZoom(1)}>
                Restaurar Zoom
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 sticky top-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Propriedades da Etiqueta</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Largura (mm)</Label>
                <Input
                  type="number"
                  value={template.width}
                  onChange={(e) =>
                    setTemplate({ ...template, width: +e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Altura (mm)</Label>
                <Input
                  type="number"
                  value={template.height}
                  onChange={(e) =>
                    setTemplate({ ...template, height: +e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Componentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addElement('TEXT')}
              >
                <Text className="mr-2 h-4 w-4" /> Texto
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addElement('PATRIMONIO_FIELD')}
              >
                <FileText className="mr-2 h-4 w-4" /> Campo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addElement('QR_CODE')}
              >
                <QrCode className="mr-2 h-4 w-4" /> QR Code
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addElement('LOGO')}
              >
                <ImageIcon className="mr-2 h-4 w-4" /> Logo
              </Button>
            </CardContent>
          </Card>
          {selectedElement && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Propriedades do Elemento</CardTitle>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={removeElement}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <LabelElementProperties
                  element={selectedElement}
                  onUpdate={updateElement}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default LabelTemplateEditor
