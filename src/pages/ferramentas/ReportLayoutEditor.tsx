import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReportTemplates } from '@/contexts/ReportTemplateContext';
import { ReportTemplate, ReportComponent } from '@/types';
import { generateId } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Save, PlusCircle, Trash2, GalleryHorizontal } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { ReportComponentProperties } from '@/components/admin/ReportComponentProperties';
import { ReportTemplateGallery } from '@/components/admin/ReportTemplateGallery';

const ReportLayoutEditor = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { getTemplateById, saveTemplate } = useReportTemplates();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<ReportComponent | null>(null);
  const [isGalleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    if (templateId) {
      const existingTemplate = getTemplateById(templateId);
      if (existingTemplate) {
        setTemplate(JSON.parse(JSON.stringify(existingTemplate)));
      } else {
        navigate('/relatorios/templates');
      }
    }
  }, [templateId, getTemplateById, navigate]);

  const updateComponent = (
    componentId: string,
    newProps: Partial<ReportComponent>
  ) => {
    if (!template) return;
    const newLayout = template.layout.map(comp =>
      comp.id === componentId ? { ...comp, ...newProps } : comp
    );
    setTemplate({ ...template, layout: newLayout });
    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, ...newProps });
    }
  };

  const addComponent = (type: ReportComponent['type']) => {
    if (!template) return;
    const newComponent: ReportComponent = {
      id: generateId(),
      type,
      x: 0,
      y: template.layout.length,
      w: 12,
      h: type === 'TABLE' ? 4 : 1,
      styles: {},
      props: {},
    };
    setTemplate({ ...template, layout: [...template.layout, newComponent] });
  };

  const removeComponent = (componentId: string) => {
    if (!template) return;
    setTemplate({
      ...template,
      layout: template.layout.filter(comp => comp.id !== componentId),
    });
    setSelectedComponent(null);
  };

  const handleSave = () => {
    if (template) {
      saveTemplate(template);
      toast({ description: 'Layout do relatório salvo com sucesso!' });
      navigate(`/relatorios/ver/${template.id}`);
    }
  };

  if (!template) return <div>Carregando editor...</div>;

  return (
    <div className='flex flex-col gap-6'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to='/relatorios/templates'>Modelos de Relatório</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editor de Layout</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className='flex items-center justify-between'>
        <Input
          value={template.name}
          onChange={e => setTemplate({ ...template, name: e.target.value })}
          className='text-2xl font-bold h-auto p-0 border-none focus-visible:ring-0'
        />
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setGalleryOpen(true)}>
            <GalleryHorizontal className='mr-2 h-4 w-4' /> Modelos
          </Button>
          <Button onClick={handleSave}>
            <Save className='mr-2 h-4 w-4' /> Salvar Layout
          </Button>
        </div>
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-start'>
        <div className='lg:col-span-2 space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Layout do Relatório</CardTitle>
            </CardHeader>
            <CardContent className='p-4 bg-muted rounded-lg'>
              <div className='bg-white p-8 shadow-lg aspect-[1/1.414] report-grid'>
                {template.layout.map(comp => (
                  <div
                    key={comp.id}
                    className={cn(
                      'border-2 border-dashed rounded-lg flex items-center justify-center relative group cursor-pointer p-2',
                      selectedComponent?.id === comp.id
                        ? 'border-primary'
                        : 'border-muted-foreground/50'
                    )}
                    style={{
                      gridColumn: `span ${comp.w}`,
                      gridRow: `span ${comp.h}`,
                      ...comp.styles,
                    }}
                    onClick={() => setSelectedComponent(comp)}
                  >
                    <span className='text-muted-foreground font-semibold'>
                      {comp.type}
                    </span>
                    <div className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='destructive'
                        size='icon'
                        className='h-6 w-6'
                        onClick={e => {
                          e.stopPropagation();
                          removeComponent(comp.id);
                        }}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className='lg:col-span-1 sticky top-24 space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Componentes</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addComponent('HEADER')}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Cabeçalho
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addComponent('TABLE')}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Tabela
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addComponent('TEXT')}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Texto
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => addComponent('FOOTER')}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Rodapé
              </Button>
            </CardContent>
          </Card>
          {selectedComponent && (
            <ReportComponentProperties
              component={selectedComponent}
              onUpdate={updateComponent}
            />
          )}
        </div>
      </div>
      <ReportTemplateGallery
        open={isGalleryOpen}
        onOpenChange={setGalleryOpen}
        onSelectTemplate={selected =>
          setTemplate({ ...template, layout: selected.layout })
        }
      />
    </div>
  );
};

export default ReportLayoutEditor;
