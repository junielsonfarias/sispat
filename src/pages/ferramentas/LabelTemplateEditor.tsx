import { LabelPreview } from '@/components/LabelPreview';
import { LabelElementProperties } from '@/components/admin/LabelElementProperties';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLabelTemplates } from '@/contexts/LabelTemplateContext';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/utils';
import { LabelElement, LabelTemplate } from '@/types';
import {
  FileText,
  Image as ImageIcon,
  QrCode,
  Save,
  Text,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const LabelTemplateEditor = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTemplateById, saveTemplate } = useLabelTemplates();
  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(
    null
  );
  const [zoom, setZoom] = useState(1);
  const { patrimonios } = usePatrimonio();
  const mockPatrimonio = patrimonios[0] || {
    id: 'mock',
    numero_patrimonio: '001',
    descricao: 'Exemplo de Patrimônio',
    tipo: 'Equipamento',
    marca: 'Marca Exemplo',
    modelo: 'Modelo Exemplo',
    estado: 'BOM',
    valor_aquisicao: 1000,
    data_aquisicao: new Date().toISOString(),
    local: 'Local Exemplo',
    sector: 'Setor Exemplo',
  };

  useEffect(() => {
    if (templateId) {
      if (templateId === 'novo') {
        if (!user?.municipalityId) return;
        setTemplate({
          id: generateId(),
          name: 'Novo Modelo de Etiqueta',
          width: 60,
          height: 40,
          elements: [],
          municipalityId: user.municipalityId,
        });
      } else {
        const existingTemplate = getTemplateById(templateId);
        if (existingTemplate) {
          setTemplate(JSON.parse(JSON.stringify(existingTemplate)));
        } else {
          navigate('/etiquetas/templates');
        }
      }
    }
  }, [templateId, getTemplateById, navigate, user]);

  const handleSave = () => {
    if (template) {
      saveTemplate(template);
      toast({ description: 'Modelo de etiqueta salvo com sucesso!' });
      navigate('/etiquetas/templates');
    }
  };

  const updateElement = (
    elementId: string,
    newProps: Partial<LabelElement>
  ) => {
    if (!template) return;
    const newElements = template.elements.map(el =>
      el.id === elementId ? { ...el, ...newProps } : el
    );
    const updatedTemplate = { ...template, elements: newElements };
    setTemplate(updatedTemplate);
    if (selectedElement?.id === elementId) {
      setSelectedElement({ ...selectedElement, ...newProps });
    }
  };

  const addElement = (type: LabelElement['type']) => {
    if (!template) return;
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
    };
    setTemplate({ ...template, elements: [...template.elements, newElement] });
    setSelectedElement(newElement);
  };

  const removeElement = () => {
    if (!template || !selectedElement) return;
    setTemplate({
      ...template,
      elements: template.elements.filter(el => el.id !== selectedElement.id),
    });
    setSelectedElement(null);
  };

  if (!template) return <div>Carregando editor...</div>;

  return (
    <div className='flex flex-col gap-4'>
      <Breadcrumb className='py-2'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to='/etiquetas/templates'>Modelos de Etiqueta</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editor</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className='flex items-center justify-between gap-4'>
        <Input
          value={template.name}
          onChange={e => setTemplate({ ...template, name: e.target.value })}
          className='text-xl font-bold h-8 p-0 border-none focus-visible:ring-0 flex-1'
        />
        <Button onClick={handleSave} size='sm'>
          <Save className='mr-2 h-4 w-4' /> Salvar
        </Button>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1', display: 'flex', gap: '12px' }}>
          <Card style={{ flex: '1', minWidth: '400px' }}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>
                Visualização da Etiqueta
              </CardTitle>
            </CardHeader>
            <CardContent
              className='flex justify-center items-center p-2 bg-muted overflow-auto min-h-[250px]'
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
          <Card style={{ flex: '1', minWidth: '300px' }}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>
                Propriedades da Etiqueta
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <Label className='text-xs'>Largura (mm)</Label>
                <Input
                  type='number'
                  size='sm'
                  value={template.width}
                  onChange={e =>
                    setTemplate({ ...template, width: +e.target.value })
                  }
                />
              </div>
              <div>
                <Label className='text-xs'>Altura (mm)</Label>
                <Input
                  type='number'
                  size='sm'
                  value={template.height}
                  onChange={e =>
                    setTemplate({ ...template, height: +e.target.value })
                  }
                />
              </div>
              <div className='pt-2 border-t'>
                <Label className='text-xs'>Controles de Zoom</Label>
                <div className='flex items-center gap-1 flex-wrap mt-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                  >
                    <ZoomOut className='h-3 w-3 mr-1' /> -
                  </Button>
                  <span className='text-xs font-medium w-10 text-center'>
                    {(zoom * 100).toFixed(0)}%
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                  >
                    <ZoomIn className='h-3 w-3 mr-1' /> +
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setZoom(1)}
                  >
                    100%
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div
          style={{ width: '300px', position: 'sticky', top: '96px' }}
          className='space-y-2'
        >
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Componentes</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-2 gap-1'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addElement('TEXT')}
                className='text-xs'
              >
                <Text className='mr-1 h-3 w-3' /> Texto
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addElement('PATRIMONIO_FIELD')}
                className='text-xs'
              >
                <FileText className='mr-1 h-3 w-3' /> Campo
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addElement('QR_CODE')}
                className='text-xs'
              >
                <QrCode className='mr-1 h-3 w-3' /> QR Code
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addElement('LOGO')}
                className='text-xs'
              >
                <ImageIcon className='mr-1 h-3 w-3' /> Logo
              </Button>
            </CardContent>
          </Card>
          {selectedElement && (
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-base'>
                  Propriedades do Elemento
                </CardTitle>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={removeElement}
                  className='text-xs'
                >
                  <Trash2 className='h-3 w-3 mr-1' /> Remover
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
  );
};

export default LabelTemplateEditor;
