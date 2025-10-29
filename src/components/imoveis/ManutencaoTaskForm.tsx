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
import { useAuth } from '@/hooks/useAuth'
import { DatePicker } from '@/components/ui/date-picker'

const taskSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().optional(),
  imovelId: z.string().min(1, 'O imóvel é obrigatório.'),
  priority: z.enum(['Baixa', 'Média', 'Alta']),
  status: z.enum(['A Fazer', 'Em Progresso', 'Concluída']),
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
  const { users } = useAuth()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo</FormLabel>
              <FormControl>
                <DatePicker date={field.value} onDateChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
