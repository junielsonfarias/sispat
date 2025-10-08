import { useState } from 'react'
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
import { useTiposBens } from '@/contexts/TiposBensContext'
import { TipoBem } from '@/types'
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

const tipoBemSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  descricao: z
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .optional(),
  vidaUtilPadrao: z
    .number()
    .min(1, 'Vida útil deve ser no mínimo 1 ano')
    .max(100, 'Vida útil deve ser no máximo 100 anos')
    .optional(),
  taxaDepreciacao: z
    .number()
    .min(0, 'Taxa de depreciação deve ser no mínimo 0%')
    .max(100, 'Taxa de depreciação deve ser no máximo 100%')
    .optional(),
  ativo: z.boolean().default(true),
})

type TipoBemValues = z.infer<typeof tipoBemSchema>

const TipoBemManagement = () => {
  const {
    tiposBens,
    isLoading,
    createTipoBem,
    updateTipoBem,
    deleteTipoBem,
    toggleTipoBemStatus,
  } = useTiposBens()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoBem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TipoBemValues>({
    resolver: zodResolver(tipoBemSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      vidaUtilPadrao: 0,
      taxaDepreciacao: 0,
      ativo: true,
    },
  })

  const filteredTipos = tiposBens.filter((tipo) =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (tipo?: TipoBem) => {
    if (tipo) {
      setEditingTipo(tipo)
      form.reset({
        nome: tipo.nome,
        descricao: tipo.descricao || '',
        vidaUtilPadrao: tipo.vidaUtilPadrao || 0,
        taxaDepreciacao: tipo.taxaDepreciacao || 0,
        ativo: tipo.ativo,
      })
    } else {
      setEditingTipo(null)
      form.reset({
        nome: '',
        descricao: '',
        vidaUtilPadrao: 0,
        taxaDepreciacao: 0,
        ativo: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTipo(null)
    form.reset()
  }

  const onSubmit = async (data: TipoBemValues) => {
    setIsSubmitting(true)
    try {
      if (editingTipo) {
        await updateTipoBem(editingTipo.id, data)
        toast({
          title: 'Sucesso!',
          description: 'Tipo de bem atualizado com sucesso.',
        })
      } else {
        await createTipoBem(data)
        toast({
          title: 'Sucesso!',
          description: 'Tipo de bem criado com sucesso.',
        })
      }
      handleCloseDialog()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao salvar tipo de bem.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTipoBem(id)
      toast({
        title: 'Sucesso!',
        description: 'Tipo de bem excluído com sucesso.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao excluir tipo de bem.',
      })
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleTipoBemStatus(id)
      toast({
        title: 'Sucesso!',
        description: 'Status do tipo de bem alterado com sucesso.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao alterar status do tipo de bem.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando tipos de bens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Tipos de Bens</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTipo ? 'Editar Tipo de Bem' : 'Adicionar Tipo de Bem'}
              </DialogTitle>
              <DialogDescription>
                {editingTipo
                  ? 'Atualize as informações do tipo de bem.'
                  : 'Adicione um novo tipo de bem ao sistema.'}
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
                        <Input placeholder="Ex: Eletrônicos" {...field} />
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
                        <Input placeholder="Descrição do tipo de bem" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vidaUtilPadrao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vida Útil Padrão (anos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 5"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxaDepreciacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de Depreciação (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 20"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : editingTipo ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Bens Cadastrados</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipos de bens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTipos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum tipo de bem encontrado.' : 'Nenhum tipo de bem cadastrado.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vida Útil</TableHead>
                  <TableHead>Taxa Depreciação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell>{tipo.descricao || '-'}</TableCell>
                    <TableCell>{tipo.vidaUtilPadrao ? `${tipo.vidaUtilPadrao} anos` : '-'}</TableCell>
                    <TableCell>{tipo.taxaDepreciacao ? `${tipo.taxaDepreciacao}%` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativo ? 'default' : 'secondary'}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(tipo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(tipo.id)}
                        >
                          {tipo.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o tipo de bem "{tipo.nome}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tipo.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TipoBemManagement
