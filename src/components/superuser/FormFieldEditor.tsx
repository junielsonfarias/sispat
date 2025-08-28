import { useForm, Controller } from 'react-hook-form'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FormFieldConfig, FormFieldType } from '@/types'
import { Textarea } from '@/components/ui/textarea'

const fieldSchema = z.object({
  label: z.string().min(1, 'O nome do campo é obrigatório.'),
  key: z
    .string()
    .min(1, 'A chave do campo é obrigatória.')
    .regex(
      /^[a-z0-9_]+$/,
      'A chave deve conter apenas letras minúsculas, números e underscores.',
    ),
  type: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'CURRENCY']),
  required: z.boolean(),
  options: z.string().optional(),
})

type FieldFormValues = z.infer<typeof fieldSchema>

interface FormFieldEditorProps {
  field?: FormFieldConfig
  onSave: (data: Omit<FormFieldConfig, 'id'>) => void
  onClose: () => void
}

export const FormFieldEditor = ({
  field,
  onSave,
  onClose,
}: FormFieldEditorProps) => {
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field?.label || '',
      key: field?.key || '',
      type: field?.type || 'TEXT',
      required: field?.required || false,
      options: field?.options?.join(', ') || '',
    },
  })

  const fieldType = form.watch('type')

  const handleSubmit = (data: FieldFormValues) => {
    onSave({
      ...data,
      options:
        data.type === 'SELECT'
          ? data.options?.split(',').map((o) => o.trim())
          : undefined,
      isCustom: field?.isCustom ?? true,
      isSystem: field?.isSystem ?? false,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>Nome do Campo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Cor do Veículo" {...formField} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="key"
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>Chave do Campo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: cor_veiculo"
                  {...formField}
                  disabled={field?.isSystem}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>Tipo de Campo</FormLabel>
              <Select
                onValueChange={formField.onChange}
                defaultValue={formField.value}
                disabled={field?.isSystem}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TEXT">Texto Curto</SelectItem>
                  <SelectItem value="TEXTAREA">Texto Longo</SelectItem>
                  <SelectItem value="NUMBER">Número</SelectItem>
                  <SelectItem value="CURRENCY">Moeda</SelectItem>
                  <SelectItem value="DATE">Data</SelectItem>
                  <SelectItem value="SELECT">Seleção</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {fieldType === 'SELECT' && (
          <FormField
            control={form.control}
            name="options"
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>Opções</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Opção 1, Opção 2, Opção 3"
                    {...formField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="required"
          render={({ field: formField }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Obrigatório</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={formField.value}
                  onCheckedChange={formField.onChange}
                  disabled={field?.isSystem}
                />
              </FormControl>
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
