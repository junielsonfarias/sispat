import { useState, useMemo } from 'react'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  FileSpreadsheet,
  FileDigit,
  FileText,
  Download,
  Loader2,
  Save,
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'
import { patrimonioFields } from '@/lib/report-utils'
// Mock data removido - usando dados reais do backend
import {
  exportToCsv,
  exportToPdf,
  exportToXlsx,
  getColumnsWithLabels,
} from '@/lib/export-utils'
import { toast } from '@/hooks/use-toast'
import { Patrimonio } from '@/types'
import { useUserReportConfigs } from '@/contexts/UserReportConfigContext'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'

const exportSchema = z.object({
  fields: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'Você deve selecionar pelo menos um campo para exportar.',
  }),
  format: z.enum(['csv', 'xlsx', 'pdf'], {
    required_error: 'Você deve selecionar um formato de arquivo.',
  }),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  configName: z.string().optional(),
})

type ExportFormValues = z.infer<typeof exportSchema>

const Exportacao = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { configs, saveConfig } = useUserReportConfigs()

  const configOptions: SearchableSelectOption[] = configs.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  const { patrimonios } = usePatrimonio()

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      fields: patrimonioFields.map((f) => f.id),
      format: 'csv',
      dateFrom: '',
      dateTo: '',
    },
  })

  const handleLoadConfig = (configId: string | null) => {
    if (!configId) return
    const config = configs.find((c) => c.id === configId)
    if (config) {
      form.reset({
        fields: config.columns as string[],
        format: config.format,
        dateFrom: config.filters.dateFrom,
        dateTo: config.filters.dateTo,
      })
    }
  }

  const handleSaveConfig = () => {
    const values = form.getValues()
    if (!values.configName) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, dê um nome para a configuração.',
      })
      return
    }
    saveConfig({
      name: values.configName,
      columns: values.fields as (keyof Patrimonio)[],
      format: values.format,
      filters: {
        dateFrom: values.dateFrom,
        dateTo: values.dateTo,
      },
    })
  }

  const onSubmit = async (data: ExportFormValues) => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      // Usar dados reais do contexto em vez de mocks
      const allData = patrimonios || []
      const columns = getColumnsWithLabels(data.fields as (keyof Patrimonio)[])
      const filename = `exportacao-sispat-${new Date().toISOString().split('T')[0]}`

      switch (data.format) {
        case 'csv':
          exportToCsv(`${filename}.csv`, allData, columns)
          break
        case 'xlsx':
          exportToXlsx(`${filename}.xlsx`, allData, columns)
          break
        case 'pdf':
          exportToPdf(`${filename}.pdf`, allData, columns)
          break
      }
      toast({
        title: 'Exportação Iniciada',
        description: `Seu arquivo ${data.format.toUpperCase()} está sendo baixado.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha na Exportação',
        description: 'Ocorreu um erro ao gerar o arquivo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/">Dashboard</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Exportação de Dados</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Exportação de Dados</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Salvas</CardTitle>
                  <SearchableSelect
                    options={configOptions}
                    onChange={handleLoadConfig}
                    placeholder="Carregar uma configuração salva..."
                    isClearable
                  />
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Campos para Exportar</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="fields"
                    render={() => (
                      <FormItem>
                        <ScrollArea className="h-64 w-full rounded-md border">
                          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {patrimonioFields.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="fields"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                item.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição (De)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição (Até)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1 space-y-6 sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Formato do Arquivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 gap-4"
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value="csv"
                                  id="csv"
                                  className="peer sr-only"
                                />
                              </FormControl>
                              <Label
                                htmlFor="csv"
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                                )}
                              >
                                <FileText className="h-8 w-8" />
                                <div>
                                  <p className="font-semibold">CSV</p>
                                </div>
                              </Label>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value="xlsx"
                                  id="xlsx"
                                  className="peer sr-only"
                                />
                              </FormControl>
                              <Label
                                htmlFor="xlsx"
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                                )}
                              >
                                <FileSpreadsheet className="h-8 w-8" />
                                <div>
                                  <p className="font-semibold">Excel (XLSX)</p>
                                </div>
                              </Label>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value="pdf"
                                  id="pdf"
                                  className="peer sr-only"
                                />
                              </FormControl>
                              <Label
                                htmlFor="pdf"
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                                )}
                              >
                                <FileDigit className="h-8 w-8" />
                                <div>
                                  <p className="font-semibold">PDF</p>
                                </div>
                              </Label>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="pt-2" />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Exportando...' : 'Iniciar Exportação'}
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Salvar Configuração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FormField
                    control={form.control}
                    name="configName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Configuração</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Relatório Mensal"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleSaveConfig}
                  >
                    <Save className="mr-2 h-4 w-4" /> Salvar
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default Exportacao
