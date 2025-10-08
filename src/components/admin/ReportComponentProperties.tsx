import { ReportComponent, ReportComponentStyle } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Eye } from 'lucide-react'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { useCustomization } from '@/contexts/CustomizationContext'
import { formatDate } from '@/lib/utils'

interface ReportComponentPropertiesProps {
  component: ReportComponent
  onUpdate: (id: string, newProps: Partial<ReportComponent>) => void
}

export const ReportComponentProperties = ({
  component,
  onUpdate,
}: ReportComponentPropertiesProps) => {
  const { settings } = useCustomization()
  
  const handleStyleChange = (
    key: keyof ReportComponentStyle,
    value: string | number,
  ) => {
    onUpdate(component.id, {
      styles: { ...component.styles, [key]: value },
    })
  }

  const handlePropChange = (key: string, value: any) => {
    onUpdate(component.id, {
      props: { ...component.props, [key]: value },
    })
  }

  // Componente de visualização do cabeçalho
  const HeaderPreview = () => {
    const municipalityData = {
      name: settings.prefeituraName || MUNICIPALITY_NAME,
      logoUrl: settings.activeLogoUrl || '/logo-government.svg',
      secretaria: settings.secretariaResponsavel || '',
      departamento: settings.departamentoResponsavel || ''
    }

    return (
      <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Visualização do Cabeçalho
        </div>
        <div className="border-b-2 border-gray-300 pb-4 mb-4">
          {/* Cabeçalho Principal */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img
                src={municipalityData.logoUrl}
                alt="Logo"
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.src = '/logo-government.svg'
                }}
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800">{municipalityData.name}</h1>
                <p className="text-xs text-gray-500">
                  {component.props?.subtitle || 'Relatório de Patrimônio'}
                </p>
                
                {/* Informações Personalizadas - Logo abaixo do subtítulo */}
                {component.props?.customLines && component.props.customLines.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {component.props.customLines.map((line: string, index: number) => (
                      <p key={index} className={`text-xs ${line ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                        {line || `Linha ${index + 1} (vazia)`}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400 italic">
                      Nenhuma informação personalizada adicionada
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p>Data: {formatDate(new Date())}</p>
              <p>Horário: {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propriedades: {component.type}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {component.type === 'TEXT' && (
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={component.props?.content || ''}
              onChange={(e) => handlePropChange('content', e.target.value)}
            />
          </div>
        )}

        {component.type === 'HEADER' && (
          <div className="space-y-4">
            {/* Visualização do Cabeçalho */}
            <HeaderPreview />
            
            <div>
              <Label>Subtítulo do Município</Label>
              <p className="text-sm text-gray-500 mb-2">
                Texto que aparece logo abaixo do nome do município.
              </p>
              <Input
                value={component.props?.subtitle || ''}
                onChange={(e) => handlePropChange('subtitle', e.target.value)}
                placeholder="Ex: Relatório de Patrimônio, Inventário Geral, etc."
                className="mb-4"
              />
            </div>
            
            <div>
              <Label>Informações Personalizadas do Cabeçalho</Label>
              <p className="text-sm text-gray-500 mb-4">
                Adicione até 5 linhas de informações personalizadas que aparecerão logo abaixo do subtítulo do município.
              </p>
            </div>
            
            <div className="space-y-3">
              {(component.props?.customLines || []).map((line: string, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={line}
                    onChange={(e) => {
                      const newLines = [...(component.props?.customLines || [])]
                      newLines[index] = e.target.value
                      handlePropChange('customLines', newLines)
                    }}
                    placeholder={`Linha ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLines = (component.props?.customLines || []).filter((_, i) => i !== index)
                      handlePropChange('customLines', newLines)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {(component.props?.customLines || []).length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newLines = [...(component.props?.customLines || []), '']
                    handlePropChange('customLines', newLines)
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Linha
                </Button>
              )}
            </div>
          </div>
        )}

        {component.type === 'FOOTER' && (
          <div className="space-y-4">
            {/* Visualização do Footer */}
            <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-lg relative" style={{ minHeight: '120px' }}>
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Visualização do Footer
                {component.props?.position === 'page-bottom' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Final da Página
                  </span>
                )}
              </div>
              
              {/* Simulação do conteúdo da página */}
              <div className="text-xs text-gray-400 mb-4">
                <p>Conteúdo do relatório...</p>
                <p>Tabela de dados...</p>
                <p>Mais informações...</p>
              </div>
              
              <div 
                className={`text-xs ${component.props?.position === 'page-bottom' ? 'footer-page-bottom absolute bottom-0 left-0 right-0 bg-white border-t' : 'border-t pt-2'}`}
                style={{
                  textAlign: component.props?.alignment || 'center',
                  marginTop: component.props?.position === 'page-bottom' ? '0' : (component.props?.marginTop || '20px'),
                  padding: component.props?.padding || '10px 0',
                  borderTop: component.props?.showBorder ? '1px solid #e5e7eb' : 'none'
                }}
              >
                {/* Conteúdo personalizado */}
                {component.props?.customContent && (
                  <div className="mb-2">
                    {component.props.customContent.split('\n').map((line: string, index: number) => (
                      <p key={index} className="mb-1 text-gray-700">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                
                {/* Informações automáticas */}
                <div className="text-gray-500">
                  <p>Página 1 de 1 - Nome do Template - Gerado por SISPAT</p>
                  {component.props?.showDate && (
                    <p>Data de geração: {formatDate(new Date())}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label>Conteúdo Personalizado</Label>
              <p className="text-sm text-gray-500 mb-2">
                Adicione informações personalizadas para o footer (uma linha por vez).
              </p>
              <Textarea
                value={component.props?.customContent || ''}
                onChange={(e) => handlePropChange('customContent', e.target.value)}
                placeholder="Digite as informações do footer, uma por linha..."
                rows={4}
                className="mb-4"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alinhamento</Label>
                <Select
                  value={component.props?.alignment || 'center'}
                  onValueChange={(v) => handlePropChange('alignment', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Posição</Label>
                <Select
                  value={component.props?.position || 'relative'}
                  onValueChange={(v) => handlePropChange('position', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relative">Relativa (após tabela)</SelectItem>
                    <SelectItem value="page-bottom">Final da Página</SelectItem>
                    <SelectItem value="absolute">Absoluta</SelectItem>
                    <SelectItem value="fixed">Fixa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {component.props?.position === 'page-bottom' 
                    ? 'Footer fixo no final da página' 
                    : 'Footer aparece após o conteúdo'
                  }
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Margem Superior (px)</Label>
                <Input
                  type="number"
                  value={component.props?.marginTop || 20}
                  onChange={(e) => handlePropChange('marginTop', +e.target.value)}
                />
              </div>
              
              <div>
                <Label>Padding (px)</Label>
                <Input
                  type="number"
                  value={component.props?.padding || 10}
                  onChange={(e) => handlePropChange('padding', +e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showBorder"
                  checked={component.props?.showBorder || false}
                  onCheckedChange={(checked) => handlePropChange('showBorder', checked)}
                />
                <Label htmlFor="showBorder">Mostrar borda superior</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDate"
                  checked={component.props?.showDate || false}
                  onCheckedChange={(checked) => handlePropChange('showDate', checked)}
                />
                <Label htmlFor="showDate">Mostrar data de geração</Label>
              </div>
            </div>
          </div>
        )}
        <h4 className="font-semibold text-sm">Estilos</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tam. Fonte (px)</Label>
            <Input
              type="number"
              value={component.styles?.fontSize || 12}
              onChange={(e) => handleStyleChange('fontSize', +e.target.value)}
            />
          </div>
          <div>
            <Label>Cor do Texto</Label>
            <Input
              type="color"
              value={component.styles?.color || '#000000'}
              onChange={(e) => handleStyleChange('color', e.target.value)}
            />
          </div>
          <div>
            <Label>Cor do Fundo</Label>
            <Input
              type="color"
              value={component.styles?.backgroundColor || '#ffffff'}
              onChange={(e) =>
                handleStyleChange('backgroundColor', e.target.value)
              }
            />
          </div>
          <div>
            <Label>Alinhamento</Label>
            <Select
              value={component.styles?.textAlign || 'left'}
              onValueChange={(v) => handleStyleChange('textAlign', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Peso da Fonte</Label>
            <Select
              value={component.styles?.fontWeight || 'normal'}
              onValueChange={(v) => handleStyleChange('fontWeight', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Negrito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Espaçamento (px)</Label>
            <Input
              type="number"
              value={component.styles?.padding || 0}
              onChange={(e) => handleStyleChange('padding', +e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
