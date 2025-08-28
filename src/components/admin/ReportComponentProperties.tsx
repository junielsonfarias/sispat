import { ReportComponent, ReportComponentStyle } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportComponentPropertiesProps {
  component: ReportComponent;
  onUpdate: (id: string, newProps: Partial<ReportComponent>) => void;
}

export const ReportComponentProperties = ({
  component,
  onUpdate,
}: ReportComponentPropertiesProps) => {
  const handleStyleChange = (
    key: keyof ReportComponentStyle,
    value: string | number
  ) => {
    onUpdate(component.id, {
      styles: { ...component.styles, [key]: value },
    });
  };

  const handlePropChange = (key: string, value: any) => {
    onUpdate(component.id, {
      props: { ...component.props, [key]: value },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propriedades: {component.type}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {component.type === 'TEXT' && (
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={component.props?.content || ''}
              onChange={e => handlePropChange('content', e.target.value)}
            />
          </div>
        )}
        <h4 className='font-semibold text-sm'>Estilos</h4>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <Label>Tam. Fonte (px)</Label>
            <Input
              type='number'
              value={component.styles?.fontSize || 12}
              onChange={e => handleStyleChange('fontSize', +e.target.value)}
            />
          </div>
          <div>
            <Label>Cor do Texto</Label>
            <Input
              type='color'
              value={component.styles?.color || '#000000'}
              onChange={e => handleStyleChange('color', e.target.value)}
            />
          </div>
          <div>
            <Label>Cor do Fundo</Label>
            <Input
              type='color'
              value={component.styles?.backgroundColor || '#ffffff'}
              onChange={e =>
                handleStyleChange('backgroundColor', e.target.value)
              }
            />
          </div>
          <div>
            <Label>Alinhamento</Label>
            <Select
              value={component.styles?.textAlign || 'left'}
              onValueChange={v => handleStyleChange('textAlign', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='left'>Esquerda</SelectItem>
                <SelectItem value='center'>Centro</SelectItem>
                <SelectItem value='right'>Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Peso da Fonte</Label>
            <Select
              value={component.styles?.fontWeight || 'normal'}
              onValueChange={v => handleStyleChange('fontWeight', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='normal'>Normal</SelectItem>
                <SelectItem value='bold'>Negrito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Espaçamento (px)</Label>
            <Input
              type='number'
              value={component.styles?.padding || 0}
              onChange={e => handleStyleChange('padding', +e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
