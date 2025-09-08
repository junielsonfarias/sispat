import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useUserReportConfigs } from '@/contexts/UserReportConfigContext';
import { toast } from '@/hooks/use-toast';
import {
    exportToCsv,
    exportToPdf,
    exportToXlsx,
    getColumnsWithLabels,
} from '@/lib/export-utils';
import { patrimonioFields } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Download,
    FileDigit,
    FileSpreadsheet,
    FileText,
    Loader2,
    Save,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center'>
              <Download className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                Exportação de Dados
              </h1>
              <p className='text-sm text-gray-600'>
                {patrimonios.length} patrimônios disponíveis
              </p>
            </div>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'>
              <div className='lg:col-span-2 space-y-6'>
                {/* Configurações Salvas - Card compacto */}
                <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg mb-4'>
                    <h2 className='text-lg font-semibold text-gray-800'>Configurações Salvas</h2>
                    <p className='text-sm text-gray-600'>Carregue uma configuração previamente salva</p>
                  </div>
                  <SearchableSelect
                    options={configOptions}
                    onChange={handleLoadConfig}
                    placeholder='Carregar uma configuração salva...'
                    isClearable
                  />
                </div>
                {/* Campos para Exportar - Card compacto */}
                <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg mb-4'>
                    <h2 className='text-lg font-semibold text-gray-800'>Campos para Exportar</h2>
                    <p className='text-sm text-gray-600'>Selecione os campos que deseja incluir na exportação</p>
                  </div>
                  <FormField
                    control={form.control}
                    name='fields'
                    render={() => (
                      <FormItem>
                        <ScrollArea className='h-48 w-full rounded-lg border border-gray-200'>
                          <div className='p-4 grid grid-cols-2 md:grid-cols-3 gap-3'>
                            {patrimonioFields.map(item => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name='fields'
                                render={({ field }) => (
                                  <FormItem className='flex flex-row items-start space-x-2 space-y-0'>
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
                                    <FormLabel className='font-normal text-sm'>
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
                </div>
                {/* Filtros - Card compacto */}
                <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg mb-4'>
                    <h2 className='text-lg font-semibold text-gray-800'>Filtros de Data</h2>
                    <p className='text-sm text-gray-600'>Filtre os patrimônios por período de aquisição</p>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='dateFrom'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium text-gray-700'>Data de Aquisição (De)</FormLabel>
                          <FormControl>
                            <Input type='date' {...field} className='rounded-lg border-gray-200' />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='dateTo'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium text-gray-700'>Data de Aquisição (Até)</FormLabel>
                          <FormControl>
                            <Input type='date' {...field} className='rounded-lg border-gray-200' />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
            </div>
              <div className='lg:col-span-1 space-y-6 sticky top-24'>
                {/* Formato do Arquivo - Card compacto */}
                <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg mb-4'>
                    <h2 className='text-lg font-semibold text-gray-800'>Formato do Arquivo</h2>
                    <p className='text-sm text-gray-600'>Escolha o formato de exportação</p>
                  </div>
                  <FormField
                    control={form.control}
                    name='format'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='grid grid-cols-1 gap-3'
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
                                  'border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors',
                                  'peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 [&:has([data-state=checked])]:border-green-500 [&:has([data-state=checked])]:bg-green-50'
                                )}
                              >
                                <FileText className='h-6 w-6 text-gray-600' />
                                <div>
                                  <p className='font-semibold text-sm'>CSV</p>
                                  <p className='text-xs text-gray-500'>Arquivo de texto</p>
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
                                  'border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors',
                                  'peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 [&:has([data-state=checked])]:border-green-500 [&:has([data-state=checked])]:bg-green-50'
                                )}
                              >
                                <FileSpreadsheet className='h-6 w-6 text-gray-600' />
                                <div>
                                  <p className='font-semibold text-sm'>Excel (XLSX)</p>
                                  <p className='text-xs text-gray-500'>Planilha Excel</p>
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
                                  'border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors',
                                  'peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 [&:has([data-state=checked])]:border-green-500 [&:has([data-state=checked])]:bg-green-50'
                                )}
                              >
                                <FileDigit className='h-6 w-6 text-gray-600' />
                                <div>
                                  <p className='font-semibold text-sm'>PDF</p>
                                  <p className='text-xs text-gray-500'>Documento PDF</p>
                                </div>
                              </Label>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className='pt-2' />
                      </FormItem>
                    )}
                  />
                  <div className='mt-6'>
                    <Button type='submit' className='w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200' disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : (
                        <Download className='mr-2 h-4 w-4' />
                      )}
                      {isLoading ? 'Exportando...' : 'Iniciar Exportação'}
                    </Button>
                  </div>
                </div>
                {/* Salvar Configuração - Card compacto */}
                <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg mb-4'>
                    <h2 className='text-lg font-semibold text-gray-800'>Salvar Configuração</h2>
                    <p className='text-sm text-gray-600'>Salve esta configuração para uso futuro</p>
                  </div>
                  <div className='space-y-4'>
                    <FormField
                      control={form.control}
                      name='configName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium text-gray-700'>Nome da Configuração</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Ex: Relatório Mensal'
                              {...field}
                              className='rounded-lg border-gray-200'
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg'
                      onClick={handleSaveConfig}
                    >
                      <Save className='mr-2 h-4 w-4' /> Salvar Configuração
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
