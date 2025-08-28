import { LabelElement } from '@/types'
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
import { patrimonioFields } from '@/lib/report-utils'

interface LabelElementPropertiesProps {
  element: LabelElement
  onUpdate: (id: string, newProps: Partial<LabelElement>) => void
}

export const LabelElementProperties = ({
  element,
  onUpdate,
}: LabelElementPropertiesProps) => {
  const handlePropChange = (key: keyof LabelElement, value: any) => {
    onUpdate(element.id, { [key]: value })
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Posição e Tamanho (%)</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>X</Label>
          <Input
            type="number"
            value={element.x}
            onChange={(e) => handlePropChange('x', +e.target.value)}
          />
        </div>
        <div>
          <Label>Y</Label>
          <Input
            type="number"
            value={element.y}
            onChange={(e) => handlePropChange('y', +e.target.value)}
          />
        </div>
        <div>
          <Label>Largura</Label>
          <Input
            type="number"
            value={element.width}
            onChange={(e) => handlePropChange('width', +e.target.value)}
          />
        </div>
        <div>
          <Label>Altura</Label>
          <Input
            type="number"
            value={element.height}
            onChange={(e) => handlePropChange('height', +e.target.value)}
          />
        </div>
      </div>

      <h4 className="font-semibold text-sm">Conteúdo</h4>
      {element.type === 'TEXT' && (
        <div>
          <Label>Texto</Label>
          <Textarea
            value={element.content}
            onChange={(e) => handlePropChange('content', e.target.value)}
          />
        </div>
      )}
      {element.type === 'PATRIMONIO_FIELD' && (
        <div>
          <Label>Campo do Patrimônio</Label>
          <Select
            value={element.content}
            onValueChange={(v) => handlePropChange('content', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {patrimonioFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <h4 className="font-semibold text-sm">Estilo do Texto</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tam. Fonte (px)</Label>
          <Input
            type="number"
            value={element.fontSize}
            onChange={(e) => handlePropChange('fontSize', +e.target.value)}
          />
        </div>
        <div>
          <Label>Peso da Fonte</Label>
          <Select
            value={element.fontWeight}
            onValueChange={(v) => handlePropChange('fontWeight', v)}
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
        <div className="col-span-2">
          <Label>Alinhamento</Label>
          <Select
            value={element.textAlign}
            onValueChange={(v) => handlePropChange('textAlign', v)}
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
      </div>
    </div>
  )
}
