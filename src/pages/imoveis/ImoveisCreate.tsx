import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/bens/ImageUpload';
import { useImovel } from '@/contexts/ImovelContext';
import { useImovelField } from '@/contexts/ImovelFieldContext';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ImovelFieldConfig } from '@/types';
import { Label } from '@/components/ui/label';
import { useSectors } from '@/contexts/SectorContext';
import { SearchableSelect } from '@/components/ui/searchable-select';

const baseSchema = z.object({
  numero_patrimonio: z.string().min(1, 'O número de patrimônio é obrigatório.'),
  denominacao: z.string().min(1, 'A denominação é obrigatória.'),
  endereco: z.string().min(1, 'O endereço é obrigatório.'),
  setor: z.string().min(1, 'O setor é obrigatório.'),
  data_aquisicao: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  valor_aquisicao: z.coerce
    .number()
    .min(0.01, 'O valor deve ser maior que zero.'),
  area_terreno: z.coerce.number().optional(),
  area_construida: z.coerce.number().optional(),
  fotos: z.array(z.string()).optional(),
  documentos: z.array(z.string()).optional(),
});

const renderCustomField = (fieldConfig: ImovelFieldConfig, control: any) => {
  const key = `customFields.${fieldConfig.key}`;
  return (
    <FormField
      key={fieldConfig.id}
      control={control}
      name={key}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{fieldConfig.label}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default function ImoveisCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addImovel, imoveis } = useImovel();
  const { fields: customFields } = useImovelField();
  const { sectors } = useSectors();
  const [isLoading, setIsLoading] = useState(false);

  const sectorOptions = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map(s => ({ value: s.name, label: s.name }));
    }
    return (user.responsibleSectors || []).map(s => ({ value: s, label: s }));
  }, [sectors, user]);

  const imovelCreateSchema = useMemo(() => {
    const customFieldSchema = customFields.reduce(
      (acc, field) => {
        let validator: z.ZodTypeAny = z.any();
        if (field.required) {
          validator = z.string().min(1, `${field.label} é obrigatório.`);
        }
        acc[field.key] = validator.optional();
        return acc;
      },
      {} as Record<string, z.ZodTypeAny>
    );

    return baseSchema.extend({
      customFields: z.object(customFieldSchema).optional(),
    });
  }, [customFields]);

  type ImovelFormValues = z.infer<typeof imovelCreateSchema>;

  const form = useForm<ImovelFormValues>({
    resolver: zodResolver(imovelCreateSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: ImovelFormValues) => {
    if (!user?.municipalityId) return;
    setIsLoading(true);

    if (imoveis.some(i => i.numero_patrimonio === data.numero_patrimonio)) {
      form.setError('numero_patrimonio', {
        type: 'manual',
        message: 'Este número de patrimônio já existe.',
      });
      setIsLoading(false);
      return;
    }

    try {
      addImovel(
        {
          ...data,
          data_aquisicao: new Date(data.data_aquisicao),
          area_terreno: data.area_terreno || 0,
          area_construida: data.area_construida || 0,
          fotos: data.fotos || [],
          documentos: data.documentos || [],
          municipalityId: user.municipalityId,
          customFields: data.customFields || {},
        },
        user
      );
      navigate('/imoveis');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao cadastrar o imóvel.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>Cadastrar Novo Imóvel</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Informações Principais</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='numero_patrimonio'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Patrimônio</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex: IM-2024001' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='denominacao'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denominação</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ex: Edifício Sede da Prefeitura'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='endereco'
                render={({ field }) => (
                  <FormItem className='md:col-span-2'>
                    <FormLabel>Endereço Completo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Rua, número, bairro, cidade, estado, CEP'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='setor'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={sectorOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder='Selecione um setor'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Aquisição e Medidas</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='data_aquisicao'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Aquisição</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='valor_aquisicao'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Aquisição (R$)</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='area_terreno'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área do Terreno (m²)</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='area_construida'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Construída (m²)</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {customFields.filter(f => f.isCustom).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campos Personalizados</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 md:grid-cols-2'>
                {customFields
                  .filter(f => f.isCustom)
                  .map(field => renderCustomField(field, form.control))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mídia</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div>
                <Label>Fotos do Imóvel</Label>
                <ImageUpload name='fotos' control={form.control} />
              </div>
              <div>
                <Label>Documentos</Label>
                <ImageUpload name='documentos' control={form.control} />
              </div>
            </CardContent>
          </Card>

          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => navigate('/imoveis')}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Salvar Imóvel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
