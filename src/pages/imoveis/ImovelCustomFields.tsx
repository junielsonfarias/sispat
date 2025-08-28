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
import { PlusCircle, Edit, Trash2, Lock } from 'lucide-react'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { ImovelFieldConfig } from '@/types'
import { ImovelFormFieldEditor } from '@/components/imoveis/ImovelFormFieldEditor'
import { Badge } from '@/components/ui/badge'

export default function ImovelCustomFields() {
  const { fields, addField, updateField, deleteField } = useImovelField()
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState<ImovelFieldConfig | null>(
    null,
  )

  const handleEdit = (field: ImovelFieldConfig) => {
    setEditingField(field)
    setEditorOpen(true)
  }

  const handleCreate = () => {
    setEditingField(null)
    setEditorOpen(true)
  }

  const handleSave = (data: Omit<ImovelFieldConfig, 'id'>) => {
    if (editingField) {
      updateField(editingField.id, data)
    } else {
      addField(data)
    }
    setEditorOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campos Personalizados de Imóveis</h1>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Campo
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Campos do Formulário de Imóveis</CardTitle>
          <CardDescription>
            Gerencie os campos de dados para o cadastro de imóveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center p-2 rounded-md border"
              >
                <div className="flex-grow">
                  <p className="font-medium flex items-center gap-2">
                    {field.label}
                    {field.isSystem && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{field.type}</Badge>
                    {field.required && (
                      <Badge variant="secondary">Obrigatório</Badge>
                    )}
                  </div>
                </div>
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
      <Dialog open={isEditorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}
            </DialogTitle>
            <DialogDescription>
              Defina as propriedades do campo do formulário de imóveis.
            </DialogDescription>
          </DialogHeader>
          <ImovelFormFieldEditor
            field={editingField || undefined}
            onSave={handleSave}
            onClose={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
