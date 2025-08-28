import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useInventory } from '@/contexts/InventoryContext';
import { useSectors } from '@/contexts/SectorContext';
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select';
import { Loader2 } from 'lucide-react';

const createSchema = z
  .object({
    name: z.string().min(1, 'O nome do inventário é obrigatório.'),
    sectorName: z.string().min(1, 'O setor é obrigatório.'),
    scope: z.enum(['sector', 'location'], {
      required_error: 'O escopo do inventário é obrigatório.',
    }),
    locationType: z.string().optional(),
  })
  .refine(
    data => {
      if (data.scope === 'location') {
        return !!data.locationType && data.locationType.length > 0;
      }
      return true;
    },
    {
      message:
        'O tipo de local é obrigatório quando o escopo é "Local Específico".',
      path: ['locationType'],
    }
  );

type CreateFormValues = z.infer<typeof createSchema>;

const locationTypeOptions: SearchableSelectOption[] = [
  { value: 'Escola', label: 'Escola' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Posto de Saúde', label: 'Posto de Saúde' },
  { value: 'Secretaria', label: 'Secretaria' },
  { value: 'Almoxarifado', label: 'Almoxarifado' },
];

export default function InventarioCreate() {
  const navigate = useNavigate();
  const { createInventory } = useInventory();
  const { sectors } = useSectors();
  const [isLoading, setIsLoading] = useState(false);

  const sectorOptions: SearchableSelectOption[] = sectors.map(s => ({
    value: s.name,
    label: s.name,
  }));

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      scope: 'sector',
    },
  });

  const scope = form.watch('scope');

  const onSubmit = (data: CreateFormValues) => {
    setIsLoading(true);
    const newInventory = createInventory(data);
    navigate(`/inventarios/${newInventory.id}`);
  };

  return (
    <div className='flex flex-col gap-6 max-w-2xl mx-auto'>
      <h1 className='text-2xl font-bold'>Criar Novo Inventário</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Inventário</CardTitle>
          <CardDescription>
            Forneça um nome e selecione o setor para iniciar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Inventário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ex: Inventário Anual 2024'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='sectorName'
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
              <FormField
                control={form.control}
                name='scope'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Escopo do Inventário</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-col space-y-1'
                      >
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='sector' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            Todo o Setor
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='location' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            Local Específico
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scope === 'location' && (
                <FormField
                  control={form.control}
                  name='locationType'
                  render={({ field }) => (
                    <FormItem className='animate-fade-in'>
                      <FormLabel>Tipo de Local</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={locationTypeOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='Selecione um tipo de local'
                        />
                      </FormControl>
                      <FormDescription>
                        O inventário incluirá bens do setor selecionado cujo
                        campo "Localização" contenha este termo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type='submit' disabled={isLoading} className='w-full'>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Iniciar Inventário
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
