import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  FileText,
  FileSpreadsheet,
  FileDigit,
  Download,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useUserReportConfigs } from '@/contexts/UserReportConfigContext';
import {
  exportToCsv,
  exportToXlsx,
  exportToPdf,
  getColumnsWithLabels,
} from '@/lib/export-utils';
import { patrimonioFields } from '@/lib/report-utils';
import { toast } from '@/hooks/use-toast';

console.log('🔍 Exportacao.tsx - Componente carregado');

const exportSchema = z.object({
  fields: z.array(z.string()).min(1, 'Selecione pelo menos um campo'),
  format: z.enum(['csv', 'xlsx', 'pdf']),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  configName: z.string().optional(),
});

type ExportFormData = z.infer<typeof exportSchema>;

export default function Exportacao() {
  console.log('🔍 Exportacao - Função render iniciada');

  const { patrimonios, isLoading: patrimoniosLoading } = usePatrimonio();
  const { configs, saveConfig } = useUserReportConfigs();
  const [isLoading, setIsLoading] = useState(false);

  console.log('🔍 Exportacao - Patrimônios carregados:', patrimonios.length);
  console.log('🔍 Exportacao - Configurações carregadas:', configs.length);

  const form = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      fields: ['numero_patrimonio', 'descricao', 'tipo', 'setor_responsavel'],
      format: 'csv',
    },
  });

  console.log('🔍 Exportacao - Form inicializado');

  const configOptions = configs.map(config => ({
    value: config.id,
    label: config.name,
  }));

  const handleLoadConfig = (configId: string | null) => {
    if (!configId) return;
    const config = configs.find(c => c.id === configId);
    if (config) {
      form.setValue('fields', config.columns);
      form.setValue('format', config.format);
      toast({ description: 'Configuração carregada.' });
    }
  };

  const handleSaveConfig = () => {
    const configName = form.getValues('configName');
    if (!configName) {
      toast({
        variant: 'destructive',
        description: 'Digite um nome para a configuração.',
      });
      return;
    }

    const fields = form.getValues('fields');
    const format = form.getValues('format');

    saveConfig({
      name: configName,
      columns: fields,
      filters: {},
      format,
    });

    form.setValue('configName', '');
  };

  const onSubmit = async (data: ExportFormData) => {
    console.log('🔍 Exportacao - onSubmit iniciado com dados:', data);

    if (patrimonios.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Exportação Falhou',
        description: 'Não há patrimônios para exportar.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Aplicar filtros
      let filteredData = [...patrimonios];

      if (data.dateFrom) {
        filteredData = filteredData.filter(
          p => p.data_aquisicao >= data.dateFrom!
        );
      }

      if (data.dateTo) {
        filteredData = filteredData.filter(
          p => p.data_aquisicao <= data.dateTo!
        );
      }

      console.log('🔍 Exportacao - Dados filtrados:', filteredData.length);

      const columns = getColumnsWithLabels(data.fields);
      const filename = `patrimonios-${new Date().toISOString().split('T')[0]}`;

      console.log('🔍 Exportacao - Colunas selecionadas:', columns.length);

      switch (data.format) {
        case 'csv':
          exportToCsv(`${filename}.csv`, filteredData, columns);
          break;
        case 'xlsx':
          exportToXlsx(`${filename}.xlsx`, filteredData, columns);
          break;
        case 'pdf':
          exportToPdf(`${filename}.pdf`, filteredData, columns);
          break;
      }

      toast({
        title: 'Exportação Concluída',
        description: `Arquivo exportado com sucesso.`,
      });
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: 'Ocorreu um erro ao exportar os dados.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  console.log('🔍 Exportacao - Renderizando JSX');

  if (patrimoniosLoading) {
    console.log('🔍 Exportacao - Mostrando loader');
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  console.log('🔍 Exportacao - Renderizando conteúdo principal');

  return (
    <div className='flex flex-col gap-6'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to='/'>Dashboard</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Exportação de Dados</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className='text-2xl font-bold'>Exportação de Dados</h1>
      <div className='text-sm text-muted-foreground mb-4'>
        {patrimonios.length} patrimônios disponíveis para exportação
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'>
            <div className='lg:col-span-2 space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Salvas</CardTitle>
                  <SearchableSelect
                    options={configOptions}
                    onChange={handleLoadConfig}
                    placeholder='Carregar uma configuração salva...'
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
                    name='fields'
                    render={() => (
                      <FormItem>
                        <ScrollArea className='h-64 w-full rounded-md border'>
                          <div className='p-4 grid grid-cols-2 md:grid-cols-3 gap-4'>
                            {patrimonioFields.map(item => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name='fields'
                                render={({ field }) => (
                                  <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={checked => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                item.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  value => value !== item.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className='font-normal'>
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                        <FormMessage className='pt-2' />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='dateFrom'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição (De)</FormLabel>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='dateTo'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição (Até)</FormLabel>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <div className='lg:col-span-1 space-y-6 sticky top-24'>
              <Card>
                <CardHeader>
                  <CardTitle>Formato do Arquivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name='format'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='grid grid-cols-1 gap-4'
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value='csv'
                                  id='csv'
                                  className='peer sr-only'
                                />
                              </FormControl>
                              <Label
                                htmlFor='csv'
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                                )}
                              >
                                <FileText className='h-8 w-8' />
                                <div>
                                  <p className='font-semibold'>CSV</p>
                                </div>
                              </Label>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value='xlsx'
                                  id='xlsx'
                                  className='peer sr-only'
                                />
                              </FormControl>
                              <Label
                                htmlFor='xlsx'
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                                )}
                              >
                                <FileSpreadsheet className='h-8 w-8' />
                                <div>
                                  <p className='font-semibold'>Excel (XLSX)</p>
                                </div>
                              </Label>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem
                                  value='pdf'
                                  id='pdf'
                                  className='peer sr-only'
                                />
                              </FormControl>
                              <Label
                                htmlFor='pdf'
                                className={cn(
                                  'border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-accent',
                                  'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                                )}
                              >
                                <FileDigit className='h-8 w-8' />
                                <div>
                                  <p className='font-semibold'>PDF</p>
                                </div>
                              </Label>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className='pt-2' />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type='submit' className='w-full' disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Download className='mr-2 h-4 w-4' />
                    )}
                    {isLoading ? 'Exportando...' : 'Iniciar Exportação'}
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Salvar Configuração</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <FormField
                    control={form.control}
                    name='configName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Configuração</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Ex: Relatório Mensal'
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button
                    type='button'
                    variant='secondary'
                    className='w-full'
                    onClick={handleSaveConfig}
                  >
                    <Save className='mr-2 h-4 w-4' /> Salvar
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
