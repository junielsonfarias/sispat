import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  PlusCircle,
  Edit,
  Trash2,
  FileText,
  LayoutTemplate,
} from 'lucide-react'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import { ReportTemplate } from '@/types'
import { ReportTemplateForm } from '@/components/admin/ReportTemplateForm'
import { toast } from '@/hooks/use-toast'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function ReportTemplates() {
  const { templates, saveTemplate, deleteTemplate } = useReportTemplates()
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null)
  const navigate = useNavigate()

  const handleEdit = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setDialogOpen(true)
  }

  const handleSave = (template: ReportTemplate) => {
    saveTemplate(template)
    toast({
      title: 'Sucesso!',
      description: `Modelo "${template.name}" salvo com sucesso.`,
    })
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard/admin">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Modelos de Relatório</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modelos de Relatório</h1>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Modelo
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Modelos Salvos</CardTitle>
          <CardDescription>
            Gerencie seus modelos de relatório para agilizar a exportação de
            dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <div className="flex items-start gap-4">
                    <FileText className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>
                        {template.fields.length} campos selecionados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/relatorios/templates/editor/${template.id}`)
                    }
                  >
                    <LayoutTemplate className="mr-2 h-4 w-4" /> Design
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Campos
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá o
                          modelo "{template.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteTemplate(template.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Editar Modelo' : 'Criar Novo Modelo'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? 'Edite as informações do modelo de relatório.' 
                : 'Crie um novo modelo de relatório personalizado.'
              }
            </DialogDescription>
          </DialogHeader>
          <ReportTemplateForm template={selectedTemplate} onSave={handleSave} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
