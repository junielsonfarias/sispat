import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { useExcelCsvTemplates } from '@/contexts/ExcelCsvTemplateContext'
import { ExcelCsvTemplate } from '@/types'
import { ExcelCsvTemplateForm } from '@/components/superuser/ExcelCsvTemplateForm'
import { useAuth } from '@/hooks/useAuth'

export default function ExcelCsvTemplateManagement() {
  const { templates, saveTemplate, deleteTemplate } = useExcelCsvTemplates()
  const { user } = useAuth()
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<
    ExcelCsvTemplate | undefined
  >()

  const handleCreate = () => {
    setEditingTemplate(undefined)
    setFormOpen(true)
  }

  const handleEdit = (template: ExcelCsvTemplate) => {
    setEditingTemplate(template)
    setFormOpen(true)
  }

  const handleSave = (
    data: Omit<ExcelCsvTemplate, 'id' | 'municipalityId'>,
  ) => {
    // Sistema single-municipality: sempre usar ID '1'
    const templateToSave = {
      ...data,
      id: editingTemplate?.id || '',
      municipalityId: '1',
    }
    saveTemplate(templateToSave)
    setFormOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modelos de Exportação</h1>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Modelo
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Modelos Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os modelos para exportação em CSV e Excel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Modelo</TableHead>
                <TableHead>Nº de Colunas</TableHead>
                <TableHead>Nº de Regras</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.columns.length}</TableCell>
                  <TableCell>{t.conditionalFormatting?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(t)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteTemplate(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Edite as informações do modelo de template.' 
                : 'Crie um novo modelo de template para exportação.'
              }
            </DialogDescription>
          </DialogHeader>
          <ExcelCsvTemplateForm
            template={editingTemplate}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
