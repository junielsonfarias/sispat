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
import { PlusCircle, Edit, Trash2, GripVertical, Lock } from 'lucide-react'
import { useFormFieldManager } from '@/contexts/FormFieldManagerContext'
import { FormFieldConfig } from '@/types'
import { FormFieldEditor } from '@/components/superuser/FormFieldEditor'
import { FormPreview } from '@/components/superuser/FormPreview'
import { cn } from '@/lib/utils'

export default function FormFieldManagement() {
  const { fields, addField, updateField, deleteField, reorderFields } =
    useFormFieldManager()
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleEdit = (field: FormFieldConfig) => {
    setEditingField(field)
    setEditorOpen(true)
  }

  const handleCreate = () => {
    setEditingField(null)
    setEditorOpen(true)
  }

  const handleSave = (data: Omit<FormFieldConfig, 'id'>) => {
    if (editingField) {
      updateField(editingField.id, data)
    } else {
      addField(data)
    }
    setEditorOpen(false)
  }

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newFields = [...fields]
    const [draggedItem] = newFields.splice(draggedIndex, 1)
    newFields.splice(index, 0, draggedItem)

    setDraggedIndex(index)
    reorderFields(newFields)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Campos do Formulário</h1>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Campo
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Campos do Formulário de Bens</CardTitle>
            <CardDescription>
              Arraste para reordenar, edite ou exclua os campos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    'flex items-center p-2 rounded-md border transition-all',
                    draggedIndex === index && 'bg-muted shadow-lg opacity-50',
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground mr-2 cursor-grab" />
                  <div className="flex-grow">
                    <p className="font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {field.type} {field.required && '(Obrigatório)'}
                    </p>
                  </div>
                  {field.isSystem && (
                    <Lock className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(field)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!field.isSystem && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteField(field.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle>Visualização do Formulário</CardTitle>
            </CardHeader>
            <CardContent>
              <FormPreview fields={fields} />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isEditorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Novo Campo'}
            </DialogTitle>
            <DialogDescription>
              Defina as propriedades do campo do formulário.
            </DialogDescription>
          </DialogHeader>
          <FormFieldEditor
            field={editingField || undefined}
            onSave={handleSave}
            onClose={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
