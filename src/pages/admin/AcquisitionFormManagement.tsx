import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAcquisitionForms } from '@/contexts/AcquisitionFormContext'

const acquisitionFormSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  descricao: z
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .optional(),
  ativo: z.boolean().default(true),
})

type AcquisitionForm = z.infer<typeof acquisitionFormSchema> & {
  id: string
  createdAt: Date
  updatedAt: Date
}

type AcquisitionFormValues = z.infer<typeof acquisitionFormSchema>

const AcquisitionFormManagement = () => {
  const {
    acquisitionForms,
    isLoading,
    addAcquisitionForm,
    updateAcquisitionForm,
    deleteAcquisitionForm,
    toggleAcquisitionFormStatus,
  } = useAcquisitionForms()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<AcquisitionForm | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AcquisitionFormValues>({
    resolver: zodResolver(acquisitionFormSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      ativo: true,
    },
  })

  const filteredForms = acquisitionForms.filter((form) =>
    form.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (acquisitionForm?: AcquisitionForm) => {
    if (acquisitionForm) {
      setEditingForm(acquisitionForm)
      form.reset({
        nome: acquisitionForm.nome,
        descricao: acquisitionForm.descricao || '',
        ativo: acquisitionForm.ativo,
      })
    } else {
      setEditingForm(null)
      form.reset({
        nome: '',
        descricao: '',
        ativo: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingForm(null)
    form.reset()
  }

  const onSubmit = async (data: AcquisitionFormValues) => {
    setIsSubmitting(true)
    if (editingForm) {
      const success = await updateAcquisitionForm(editingForm.id, data)
      if (success) {
        handleCloseDialog()
      }
    } else {
      const success = await addAcquisitionForm(data)
      if (success) {
        handleCloseDialog()
      }
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta forma de aquisição?')) {
      return
    }
    await deleteAcquisitionForm(id)
  }

  const handleToggleStatus = async (id: string) => {
    const form = acquisitionForms.find((f) => f.id === id)
    if (form) {
      await toggleAcquisitionFormStatus(id, form.ativo)
    }
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Gerenciamento de Formas de Aquisição
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
            Gerencie as formas de aquisição disponíveis para cadastro de patrimônios
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-4 px-6 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                Formas de Aquisição
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar formas de aquisição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Forma
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingForm ? 'Editar Forma de Aquisição' : 'Nova Forma de Aquisição'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingForm
                          ? 'Atualize as informações da forma de aquisição.'
                          : 'Adicione uma nova forma de aquisição ao sistema.'}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="nome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Compra, Doação, Transferência" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Descrição opcional da forma de aquisição" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={isSubmitting}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : editingForm ? 'Atualizar' : 'Criar'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhuma forma de aquisição encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.nome}</TableCell>
                        <TableCell>{form.descricao || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={form.ativo ? 'default' : 'secondary'}>
                            {form.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(form.id)}
                            >
                              {form.ativo ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(form)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(form.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AcquisitionFormManagement
