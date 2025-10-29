import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SubPatrimonio, SubPatrimonioStatus } from '@/types'

const subPatrimonioSchema = z.object({
  localizacao_especifica: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'baixado', 'manutencao']),
})

type SubPatrimonioFormValues = z.infer<typeof subPatrimonioSchema>

interface SubPatrimonioFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SubPatrimonioFormValues) => Promise<void>
  editingSubPatrimonio: SubPatrimonio | null
  isLoading: boolean
}

export function SubPatrimonioForm({
  isOpen,
  onClose,
  onSubmit,
  editingSubPatrimonio,
  isLoading,
}: SubPatrimonioFormProps) {
  const form = useForm<SubPatrimonioFormValues>({
    resolver: zodResolver(subPatrimonioSchema),
    defaultValues: {
      localizacao_especifica: '',
      observacoes: '',
      status: 'ativo',
    },
  })

  const handleSubmit = async (data: SubPatrimonioFormValues) => {
    await onSubmit(data)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingSubPatrimonio ? 'Editar Sub-Patrimônio' : 'Novo Sub-Patrimônio'}
          </DialogTitle>
          <DialogDescription>
            {editingSubPatrimonio
              ? 'Atualize as informações do sub-patrimônio.'
              : 'Adicione um novo sub-patrimônio ao kit.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="baixado">Baixado</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="localizacao_especifica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização Específica</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Sala 101 - Mesa 1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações sobre o sub-patrimônio" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : editingSubPatrimonio ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
