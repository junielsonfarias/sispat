import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ImovelReportTemplate } from '@/types'
import { getImovelFields } from '@/lib/imovel-fields'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { ScrollArea } from '@/components/ui/scroll-area'

const reportSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  fields: z.array(z.string()).min(1, 'Selecione pelo menos um campo.'),
})

type FormValues = z.infer<typeof reportSchema>

interface ImovelReportTemplateFormProps {
  template: ImovelReportTemplate
  onSave: (data: Omit<ImovelReportTemplate, 'id'>) => void
}

export const ImovelReportTemplateForm = ({
  template,
  onSave,
}: ImovelReportTemplateFormProps) => {
  const { fields: customFields } = useImovelField()
  const allImovelFields = getImovelFields(customFields)

  const form = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      name: template.name,
      fields: template.fields,
    },
  })

  const onSubmit = (data: FormValues) => {
    onSave({
      ...template,
      ...data,
      fields: data.fields as any,
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
        <Controller
          name="fields"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campos do Relatório</FormLabel>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {allImovelFields.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="fields"
                      render={({ field: innerField }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={innerField.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? innerField.onChange([
                                      ...innerField.value,
                                      item.id,
                                    ])
                                  : innerField.onChange(
                                      innerField.value?.filter(
                                        (value) => value !== item.id,
                                      ),
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
              <FormMessage className="pt-2" />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit">Salvar Modelo</Button>
        </div>
      </form>
    </Form>
  )
}
