import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ManutencaoTask } from '@/types'
import { useManutencao } from '@/contexts/ManutencaoContext'
import { useImovel } from '@/hooks/useImovel'
import { DatePicker } from '@/components/ui/date-picker'

// Os rótulos casam com o tipo de domínio; o ManutencaoContext mapeia para o
// contrato do backend (minúsculo / PT) no boundary.
const taskSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  tipo: z.enum(['Preventiva', 'Corretiva', 'Preditiva']),
  imovelId: z.string().min(1, 'O imóvel é obrigatório.'),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Urgente']),
  status: z.enum(['A Fazer', 'Em Progresso', 'Concluída', 'Cancelada']),
  dueDate: z.date(),
  assignedTo: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface ManutencaoTaskFormProps {
  task?: ManutencaoTask
  onClose: () => void
}

export const ManutencaoTaskForm = ({
  task,
  onClose,
}: ManutencaoTaskFormProps) => {
  const { addTask, updateTask } = useManutencao()
  const { imoveis } = useImovel()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      tipo: task?.tipo || 'Preventiva',
      imovelId: task?.imovelId || '',
      priority: task?.priority || 'Média',
      status: task?.status || 'A Fazer',
      dueDate: task?.dueDate || new Date(),
      assignedTo: task?.assignedTo || '',
    },
  })

  const onSubmit = (data: TaskFormValues) => {
    const taskData = { ...data, attachments: task?.attachments || [] }
    if (task) {
      updateTask(task.id, taskData)
    } else {
      addTask(taskData)
    }
    onClose()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o serviço de manutenção" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Preventiva">Preventiva</SelectItem>
                    <SelectItem value="Corretiva">Corretiva</SelectItem>
                    <SelectItem value="Preditiva">Preditiva</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imovelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imóvel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {imoveis.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.denominacao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A Fazer">A Fazer</SelectItem>
                    <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Prazo</FormLabel>
              <FormControl>
                <DatePicker date={field.value} onDateChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignedTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável</FormLabel>
              <FormControl>
                <Input placeholder="Opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
