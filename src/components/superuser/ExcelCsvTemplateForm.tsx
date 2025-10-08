import { useForm, useFieldArray } from 'react-hook-form'
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
import { ExcelCsvTemplate, ConditionalFormattingRule } from '@/types'
import { patrimonioFields } from '@/lib/report-utils'
import { Trash2, PlusCircle } from 'lucide-react'
import { generateId } from '@/lib/utils'

const columnSchema = z.object({
  key: z.string().min(1),
  header: z.string().min(1, 'O cabeçalho é obrigatório.'),
})

const ruleSchema = z.object({
  id: z.string(),
  column: z.string().min(1),
  operator: z.enum([
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'contains',
  ]),
  value: z.union([z.string(), z.number()]),
  style: z.enum(['highlight_yellow', 'highlight_red', 'bold_text', 'red_text']),
})

const templateSchema = z.object({
  name: z.string().min(1, 'O nome do modelo é obrigatório.'),
  columns: z.array(columnSchema).min(1, 'Selecione pelo menos uma coluna.'),
  conditionalFormatting: z.array(ruleSchema).optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface ExcelCsvTemplateFormProps {
  template?: ExcelCsvTemplate
  onSave: (data: Omit<ExcelCsvTemplate, 'id' | 'municipalityId'>) => void
}

export const ExcelCsvTemplateForm = ({
  template,
  onSave,
}: ExcelCsvTemplateFormProps) => {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      columns: template?.columns || [],
      conditionalFormatting: template?.conditionalFormatting || [],
    },
  })

  const {
    fields: columns,
    append: appendColumn,
    remove: removeColumn,
  } = useFieldArray({ control: form.control, name: 'columns' })
  const {
    fields: rules,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({ control: form.control, name: 'conditionalFormatting' })

  const onSubmit = (data: TemplateFormValues) => {
    onSave({
      ...data,
      columns: data.columns.map((c) => ({
        ...c,
        key: c.key as keyof any,
      })),
      conditionalFormatting: data.conditionalFormatting?.map((r) => ({
        ...r,
        column: r.column as keyof any,
      })),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Modelo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Colunas</FormLabel>
          <div className="space-y-2 mt-2">
            {columns.map((col, index) => (
              <div key={col.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`columns.${index}.key`}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {patrimonioFields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`columns.${index}.header`}
                  render={({ field }) => (
                    <Input placeholder="Cabeçalho customizado" {...field} />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeColumn(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              appendColumn({
                key: 'numero_patrimonio',
                header: 'Nº Patrimônio',
              })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Coluna
          </Button>
        </div>
        <div>
          <FormLabel>Formatação Condicional (Excel)</FormLabel>
          <div className="space-y-2 mt-2">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-2">
                {/* Rule fields would go here */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              appendRule({
                id: generateId(),
                column: 'status',
                operator: 'equals',
                value: 'ativo',
                style: 'highlight_yellow',
              })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Regra
          </Button>
        </div>
        <div className="flex justify-end">
          <Button type="submit">Salvar Modelo</Button>
        </div>
      </form>
    </Form>
  )
}
