import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import { ReportTemplate, ReportComponent } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Save, PlusCircle, Trash2, GalleryHorizontal, GripVertical } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'
import { ReportComponentProperties } from '@/components/admin/ReportComponentProperties'
import { ReportTemplateGallery } from '@/components/admin/ReportTemplateGallery'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Componente sortable para elementos do layout
const SortableComponent = ({ 
  component, 
  isSelected, 
  onSelect, 
  onRemove 
}: { 
  component: ReportComponent
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-2 border-dashed rounded-lg flex items-center justify-center relative group cursor-pointer p-4 min-h-[60px] transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/50 hover:border-muted-foreground/80',
        isDragging && 'shadow-lg scale-105 border-primary bg-primary/10'
      )}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <span className="text-muted-foreground font-semibold text-sm">
        {component.type}
      </span>
      
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="destructive"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

const ReportLayoutEditor = () => {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { getTemplateById, saveTemplate } = useReportTemplates()
  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [selectedComponent, setSelectedComponent] =
    useState<ReportComponent | null>(null)
  const [isGalleryOpen, setGalleryOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (templateId) {
      const existingTemplate = getTemplateById(templateId)
      if (existingTemplate) {
        // Garantir que o template tenha um layout inicializado
        const templateWithLayout = {
          ...existingTemplate,
          layout: existingTemplate.layout || []
        }
        setTemplate(JSON.parse(JSON.stringify(templateWithLayout)))
      } else {
        navigate('/relatorios/templates')
      }
    }
  }, [templateId, getTemplateById, navigate])

  const updateComponent = (
    componentId: string,
    newProps: Partial<ReportComponent>,
  ) => {
    if (!template) return
    
    // Garantir que o template tenha um layout inicializado
    const currentLayout = template.layout || []
    
    const newLayout = currentLayout.map((comp) =>
      comp.id === componentId ? { ...comp, ...newProps } : comp,
    )
    setTemplate({ ...template, layout: newLayout })
    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, ...newProps })
    }
  }

  const addComponent = (type: ReportComponent['type']) => {
    if (!template) {
      console.error('Template não encontrado para adicionar componente')
      return
    }
    
    // Garantir que o template tenha um layout inicializado
    const currentLayout = template.layout || []
    console.log('Adicionando componente:', type, 'Layout atual:', currentLayout)
    
    const newComponent: ReportComponent = {
      id: generateId(),
      type,
      x: 0,
      y: currentLayout.length,
      w: 12,
      h: type === 'TABLE' ? 4 : 1,
      styles: {},
      props: {},
    }
    
    const newLayout = [...currentLayout, newComponent]
    console.log('Novo layout:', newLayout)
    
    setTemplate({ ...template, layout: newLayout })
  }

  const removeComponent = (componentId: string) => {
    if (!template) return
    
    // Garantir que o template tenha um layout inicializado
    const currentLayout = template.layout || []
    
    setTemplate({
      ...template,
      layout: currentLayout.filter((comp) => comp.id !== componentId),
    })
    setSelectedComponent(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && template) {
      const currentLayout = template.layout || []
      const oldIndex = currentLayout.findIndex((item) => item.id === active.id)
      const newIndex = currentLayout.findIndex((item) => item.id === over?.id)

      setTemplate({
        ...template,
        layout: arrayMove(currentLayout, oldIndex, newIndex),
      })
    }
  }

  const handleSave = () => {
    if (template) {
      console.log('Salvando template:', template)
      saveTemplate(template)
      toast({ description: 'Layout do relatório salvo com sucesso!' })
      navigate(`/relatorios/ver/${template.id}`)
    } else {
      console.error('Template não encontrado para salvar')
      toast({ 
        description: 'Erro: Template não encontrado', 
        variant: 'destructive' 
      })
    }
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/relatorios/templates">Modelos de Relatório</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editor de Layout</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <Input
          value={template.name}
          onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          className="text-2xl font-bold h-auto p-0 border-none focus-visible:ring-0"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGalleryOpen(true)}>
            <GalleryHorizontal className="mr-2 h-4 w-4" /> Modelos
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Salvar Layout
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout do Relatório</CardTitle>
              <p className="text-sm text-muted-foreground">
                Arraste os elementos para reorganizar a ordem. Use o ícone de arrastar (⋮⋮) que aparece ao passar o mouse.
              </p>
            </CardHeader>
            <CardContent className="p-4 bg-muted rounded-lg">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={template?.layout?.map(comp => comp.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="bg-white p-8 shadow-lg aspect-[1/1.414] report-grid space-y-4">
                    {template?.layout?.map((comp) => (
                      <SortableComponent
                        key={comp.id}
                        component={comp}
                        isSelected={selectedComponent?.id === comp.id}
                        onSelect={() => setSelectedComponent(comp)}
                        onRemove={() => removeComponent(comp.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 sticky top-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Componentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addComponent('HEADER')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Cabeçalho
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addComponent('TABLE')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Tabela
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addComponent('TEXT')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Texto
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addComponent('FOOTER')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Rodapé
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
        onSelectTemplate={(selected) =>
          setTemplate({ ...template, layout: selected.layout })
        }
      />
    </div>
  )
}

export default ReportLayoutEditor
