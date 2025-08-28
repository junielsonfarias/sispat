import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { useSectors } from '@/contexts/SectorContext'
import { Sector, Local } from '@/types'
import { isCircularDependency } from '@/lib/sector-utils'
import { toast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  parentId: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface SectorLocalFormProps {
  type: 'sector' | 'local'
  data?: Sector | Local
  parentId?: string | null
  onSave: (values: { name: string; parentId: string | null }) => void
  onClose: () => void
}

export const SectorLocalForm = ({
  type,
  data,
  parentId,
  onSave,
  onClose,
}: SectorLocalFormProps) => {
  const { sectors } = useSectors()

  const sectorOptions: SearchableSelectOption[] = sectors.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: data?.name || '',
      parentId:
        type === 'sector'
          ? ((data as Sector)?.parentId ?? parentId)
          : ((data as Local)?.sectorId ?? parentId),
    },
  })

  const handleSubmit = (values: FormValues) => {
    if (
      type === 'sector' &&
      data &&
      isCircularDependency(data.id, values.parentId, sectors)
    ) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Um setor não pode ser filho de si mesmo.',
      })
      return
    }
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nome do {type === 'sector' ? 'Setor' : 'Local'}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{type === 'sector' ? 'Setor Pai' : 'Setor'}</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={sectorOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={
                    type === 'sector'
                      ? 'Nenhum (Setor Raiz)'
                      : 'Selecione um setor'
                  }
                  isClearable={type === 'sector'}
                  disabled={type === 'local' && !!data}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
