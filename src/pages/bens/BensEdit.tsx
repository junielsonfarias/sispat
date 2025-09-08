import { AssetTransferForm } from '@/components/bens/AssetTransferForm';
import { ImageUpload } from '@/components/bens/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import { useLocals } from '@/contexts/LocalContext';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useSectors } from '@/contexts/SectorContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { patrimonioEditSchema } from '@/lib/validations/patrimonioSchema';
import { Local, Patrimonio, TransferenciaType } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, Gift, Info, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as z from 'zod';

type PatrimonioFormValues = z.infer<typeof patrimonioEditSchema>;

const BensEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getPatrimonioById, updatePatrimonio, patrimonios } = usePatrimonio();
  const { logActivity } = useActivityLog();
  const { sectors } = useSectors();
  const { fetchLocalsBySector } = useLocals();
  const [isLoading, setIsLoading] = useState(false);
  const [patrimonio, setPatrimonio] = useState<Patrimonio | undefined>();
  const [isTransferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferType, setTransferType] =
    useState<TransferenciaType>('transferencia');

  const form = useForm<PatrimonioFormValues>({
    resolver: zodResolver(patrimonioEditSchema),
    mode: 'onTouched',
    defaultValues: {
      numero_patrimonio: '',
      descricao: '',
      tipo: '',
      marca: '',
      modelo: '',
      cor: '',
      numero_serie: '',
      data_aquisicao: '',
      valor_aquisicao: 0,
      quantidade: 1,
      numero_nota_fiscal: '',
      forma_aquisicao: '',
      setor_responsavel: '',
      local_objeto: '',
      status: 'ativo',
      situacao_bem: 'BOM',
      fotos: [],
      documentos: [],
      data_baixa: '',
      motivo_baixa: '',
    },
  });

  useEffect(() => {
    if (id) {
      const data = getPatrimonioById(id);
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: 'Você não tem permissão para acessar este bem.',
        });
        navigate('/bens-cadastrados');
        return;
      }

      console.log('🔄 Carregando dados do patrimônio:', data);
      setPatrimonio(data);

      // Mapear campos corretamente
      const formData = {
        numero_patrimonio: data.numero_patrimonio || '',
        descricao: data.descricao || '',
        tipo: data.tipo || '',
        marca: data.marca || '',
        modelo: data.modelo || '',
        cor: data.cor || '',
        numero_serie: data.numero_serie || '',
        data_aquisicao: data.data_aquisicao
          ? format(new Date(data.data_aquisicao), 'yyyy-MM-dd')
          : '',
        valor_aquisicao: data.valor_aquisicao || 0,
        quantidade: data.quantidade || 1,
        numero_nota_fiscal: data.numero_nota_fiscal || '',
        forma_aquisicao: data.forma_aquisicao || '',
        setor_responsavel: data.setor_responsavel || '',
        local_objeto: data.local_objeto || '',
        status: data.status || 'ativo',
        situacao_bem: data.situacao_bem || 'BOM',
        fotos: data.fotos || [],
        documentos: data.documentos || [],
        data_baixa: data.data_baixa
          ? format(new Date(data.data_baixa), 'yyyy-MM-dd')
          : '',
        motivo_baixa: data.motivo_baixa || '',
      };

      console.log('📋 Dados mapeados para o formulário:', formData);
      form.reset(formData);
    }
  }, [id, getPatrimonioById, form, navigate]);

  const allowedSectors = useMemo(() => {
    if (!user) return [];

    // Para superusuários, supervisores e admins, mostrar todos os setores
    if (
      user.role === 'superuser' ||
      user.role === 'admin' ||
      user.role === 'supervisor'
    ) {
      return sectors.map(s => ({ value: s.name, label: s.name }));
    }

    // Para usuários normais, usar os setores atribuídos
    if (user.sectors && user.sectors.length > 0) {
      return user.sectors.map(s => ({ value: s.name, label: s.name }));
    }

    // Fallback para responsibleSectors (legacy)
    const userSectors = user.responsibleSectors || [];
    return sectors
      .filter(s => userSectors.includes(s.name))
      .map(s => ({ value: s.name, label: s.name }));
  }, [sectors, user]);

  const isSectorDisabled = useMemo(
    () =>
      user?.role !== 'admin' &&
      user?.role !== 'supervisor' &&
      allowedSectors.length === 1,
    [user, allowedSectors]
  );

  const [sectorLocals, setSectorLocals] = useState<Local[]>([]);

  const selectedSectorName = form.watch('setor_responsavel');
  const selectedSector = sectors.find(s => s.name === selectedSectorName);

  // Para usuários normais, automaticamente selecionar o setor atribuído se não estiver selecionado
  useEffect(() => {
    if (
      user &&
      user.role === 'usuario' &&
      user.sectors &&
      user.sectors.length === 1 &&
      !selectedSectorName
    ) {
      const primarySector =
        user.sectors.find(s => s.isPrimary) || user.sectors[0];
      console.log(
        '🔍 Usuário normal com apenas um setor - selecionando automaticamente:',
        primarySector.name
      );
      form.setValue('setor_responsavel', primarySector.name);
    }
  }, [user, selectedSectorName, form]);

  // Carregar locais do setor selecionado
  useEffect(() => {
    if (selectedSector) {
      console.log('🔍 Carregando locais do setor:', selectedSector.name);
      fetchLocalsBySector(selectedSector.id).then(locals => {
        setSectorLocals(locals);
        console.log('✅ Locais carregados para o setor:', locals.length);
      });
    } else {
      setSectorLocals([]);
    }
  }, [selectedSector, fetchLocalsBySector]);

  const locationOptions = useMemo(() => {
    return sectorLocals.map(l => ({
      value: l.name,
      label: l.name,
    }));
  }, [sectorLocals]);

  const status = form.watch('status');

  const onSubmit = async (data: PatrimonioFormValues) => {
    if (!user || !patrimonio) return;
    setIsLoading(true);

    if (
      patrimonios.some(
        p =>
          p.id !== patrimonio.id &&
          p.numero_patrimonio === data.numero_patrimonio
      )
    ) {
      form.setError('numero_patrimonio', {
        type: 'manual',
        message: 'Este número de patrimônio já existe.',
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Enviando dados para atualização:', data);
      console.log('📋 Campos específicos sendo enviados:', {
        descricao: data.descricao,
        numero_nota_fiscal: data.numero_nota_fiscal,
        setor_responsavel: data.setor_responsavel,
        local_objeto: data.local_objeto,
        situacao_bem: data.situacao_bem,
        status: data.status,
      });

      const updatedPatrimonio: Patrimonio = {
        ...patrimonio,
        ...data,
        data_aquisicao: new Date(data.data_aquisicao),
        data_baixa: data.data_baixa ? new Date(data.data_baixa) : undefined,
        fotos: data.fotos || [],
        documentos: data.documentos || [],
      };

      console.log('📋 Patrimônio atualizado completo:', updatedPatrimonio);
      await updatePatrimonio(updatedPatrimonio);
      logActivity(
        user,
        'PATRIMONIO_UPDATE',
        `Atualizou o patrimônio ${updatedPatrimonio.numero_patrimonio} (${updatedPatrimonio.descricao}).`,
        data.setor_responsavel
      );
      toast({
        title: 'Sucesso!',
        description: 'Bem atualizado com sucesso.',
      });

      // Aguardar um momento para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      navigate('/bens-cadastrados');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Falha ao atualizar o bem.';
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sectorTooltipContent = useMemo(() => {
    if (isSectorDisabled) {
      return 'Você só tem permissão para cadastrar bens neste setor.';
    }
    return '';
  }, [isSectorDisabled]);

  if (!patrimonio) {
    return <Loader2 className='h-8 w-8 animate-spin mx-auto mt-10' />;
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <Link
            to='/bens-cadastrados'
            className='flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
            <span>Voltar</span>
          </Link>
          <div>
            <h1 className='text-3xl font-bold'>Editar Bem</h1>
            <p className='text-muted-foreground'>
              Patrimônio: {patrimonio.numero_patrimonio}
            </p>
          </div>
        </div>
        <div className='flex space-x-2'>
          <Button
            variant='outline'
            onClick={() => {
              setTransferType('transferencia');
              setTransferDialogOpen(true);
            }}
          >
            <Send className='h-4 w-4 mr-2' />
            Transferir
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setTransferType('doacao');
              setTransferDialogOpen(true);
            }}
          >
            <Gift className='h-4 w-4 mr-2' />
            Doar
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <FormField
                control={form.control}
                name='numero_patrimonio'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Patrimônio</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='descricao'
                render={({ field }) => (
                  <FormItem className='lg:col-span-2'>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='tipo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='marca'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='modelo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='cor'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='numero_serie'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Série</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
                name='quantidade'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='numero_nota_fiscal'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota Fiscal</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='forma_aquisicao'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Aquisição</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Localização e Status</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-6 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='setor_responsavel'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center'>
                      Setor Responsável
                      {sectorTooltipContent && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className='h-4 w-4 ml-2 text-muted-foreground' />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{sectorTooltipContent}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={allowedSectors}
                        value={field.value}
                        onChange={value => {
                          field.onChange(value);
                          form.setValue('local_objeto', '');
                        }}
                        placeholder='Selecione um setor'
                        disabled={isSectorDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='local_objeto'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local do Bem</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={locationOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder='Selecione um local'
                        disabled={!selectedSectorName}
                        emptyMessage='Nenhum local encontrado para este setor.'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selecione o status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='ativo'>Ativo</SelectItem>
                        <SelectItem value='inativo'>Inativo</SelectItem>
                        <SelectItem value='manutencao'>
                          Em Manutenção
                        </SelectItem>
                        <SelectItem value='baixado'>Baixado</SelectItem>
                        <SelectItem value='extraviado'>Extraviado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='situacao_bem'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação do Bem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selecione a situação' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='OTIMO'>Ótimo</SelectItem>
                        <SelectItem value='BOM'>Bom</SelectItem>
                        <SelectItem value='REGULAR'>Regular</SelectItem>
                        <SelectItem value='RUIM'>Ruim</SelectItem>
                        <SelectItem value='PESSIMO'>Péssimo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Mídia e Documentos</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='fotos'
                render={({ field }) => (
                  <div>
                    <FormLabel className='text-sm'>Fotos do Bem</FormLabel>
                    <ImageUpload name='fotos' control={form.control} />
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name='documentos'
                render={({ field }) => (
                  <div>
                    <FormLabel className='text-sm'>
                      Documentos (Nota Fiscal, Garantia, etc.)
                    </FormLabel>
                    <ImageUpload name='documentos' control={form.control} />
                  </div>
                )}
              />
            </CardContent>
          </Card>
          <div className='flex justify-end space-x-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => navigate('/bens-cadastrados')}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isTransferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {transferType === 'transferencia' ? 'Transferir' : 'Doar'} Bem
            </DialogTitle>
            <DialogDescription>
              {transferType === 'transferencia'
                ? 'Transferir este bem para outro setor ou local.'
                : 'Doar este bem para uma entidade externa.'}
            </DialogDescription>
          </DialogHeader>
          <AssetTransferForm
            patrimonio={patrimonio}
            type={transferType}
            onSuccess={() => {
              setTransferDialogOpen(false);
              navigate('/bens-cadastrados');
            }}
            onCancel={() => setTransferDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BensEdit;
