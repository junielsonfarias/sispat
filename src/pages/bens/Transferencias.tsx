import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useSectors } from '@/contexts/SectorContext';
import { useTransfers } from '@/contexts/TransferContext';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { Transferencia, TransferenciaStatus } from '@/types';
import { Check, Plus, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Transferencias = () => {
  const { transferencias, updateTransferenciaStatus, createTransferencia } =
    useTransfers();
  const { user } = useAuth();
  const { patrimonios } = usePatrimonio();
  const { sectors } = useSectors();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedPatrimonio, setSelectedPatrimonio] = useState('');
  const [setorOrigem, setSetorOrigem] = useState('');
  const [setorDestino, setSetorDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  const [prazoDevolucao, setPrazoDevolucao] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-selecionar patrimônio se passado via URL
  useEffect(() => {
    const patrimonioId = searchParams.get('patrimonioId');
    if (patrimonioId) {
      setSelectedPatrimonio(patrimonioId);
      setShowForm(true);
    }
  }, [searchParams]);

  const filteredTransfers = (status: TransferenciaStatus) =>
    transferencias.filter(t => t.status === status);

  const handleUpdateStatus = async (
    id: string,
    status: 'aprovada' | 'rejeitada'
  ) => {
    if (!user) return;
    await updateTransferenciaStatus(id, status, {
      id: user.id,
      name: user.name,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !selectedPatrimonio ||
      !setorOrigem ||
      !setorDestino ||
      !motivo
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('patrimonioId', selectedPatrimonio);
      formData.append('setorOrigem', setorOrigem);
      formData.append('setorDestino', setorDestino);
      formData.append('motivo', motivo);
      if (prazoDevolucao) {
        formData.append('prazoDevolucao', prazoDevolucao);
      }
      if (documento) {
        formData.append('documento', documento);
      }

      await createTransferencia(formData);
      toast.success('Transferência solicitada com sucesso!');
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar transferência:', error);
      toast.error('Erro ao criar transferência');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatrimonio('');
    setSetorOrigem('');
    setSetorDestino('');
    setMotivo('');
    setDocumento(null);
    setPrazoDevolucao('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumento(file);
    }
  };

  const statusConfig: Record<
    TransferenciaStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' }
  > = {
    pendente: { label: 'Pendente', variant: 'secondary' },
    aprovada: { label: 'Aprovada', variant: 'default' },
    rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  };

  const renderTable = (data: Transferencia[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patrimônio</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead>Solicitante</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(t => (
          <TableRow key={t.id}>
            <TableCell>
              <Link
                to={`/bens-cadastrados/ver/${t.patrimonioId}`}
                className='text-primary hover:underline'
              >
                {t.patrimonioNumero}
              </Link>
            </TableCell>
            <TableCell className='capitalize'>{t.type}</TableCell>
            <TableCell>{t.setorOrigem}</TableCell>
            <TableCell>{t.setorDestino || t.destinatarioExterno}</TableCell>
            <TableCell>{t.solicitanteNome}</TableCell>
            <TableCell>{formatDate(t.dataSolicitacao)}</TableCell>
            <TableCell>
              <Badge variant={statusConfig[t.status].variant}>
                {statusConfig[t.status].label}
              </Badge>
            </TableCell>
            <TableCell>
              {t.status === 'pendente' && (
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    onClick={() => handleUpdateStatus(t.id, 'aprovada')}
                  >
                    <Check className='h-4 w-4' />
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => handleUpdateStatus(t.id, 'rejeitada')}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Nova Solicitação de Transferência</CardTitle>
        <CardDescription>
          Preencha os dados para solicitar a transferência de um bem
          patrimonial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='patrimonio'>Bem Patrimonial *</Label>
              <Select
                value={selectedPatrimonio}
                onValueChange={setSelectedPatrimonio}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Selecione o bem' />
                </SelectTrigger>
                <SelectContent>
                  {patrimonios.map(patrimonio => (
                    <SelectItem key={patrimonio.id} value={patrimonio.id}>
                      {patrimonio.numero_patrimonio} - {patrimonio.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='setorOrigem'>Setor de Origem *</Label>
              <Select value={setorOrigem} onValueChange={setSetorOrigem}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecione o setor de origem' />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(sector => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='setorDestino'>Setor de Destino *</Label>
              <Select value={setorDestino} onValueChange={setSetorDestino}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecione o setor de destino' />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(sector => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='prazoDevolucao'>Prazo para Devolução</Label>
              <Input
                type='date'
                value={prazoDevolucao}
                onChange={e => setPrazoDevolucao(e.target.value)}
                placeholder='Data de devolução prevista'
              />
            </div>
          </div>

          <div>
            <Label htmlFor='motivo'>Motivo da Transferência *</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder='Descreva o motivo da transferência...'
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor='documento'>Documento de Respaldo</Label>
            <div className='flex items-center gap-2'>
              <Input
                type='file'
                onChange={handleFileChange}
                accept='.pdf,.doc,.docx,.jpg,.jpeg,.png'
              />
              <Upload className='h-4 w-4 text-muted-foreground' />
            </div>
            <p className='text-sm text-muted-foreground mt-1'>
              Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
            </p>
          </div>

          <div className='flex gap-2'>
            <Button type='submit' disabled={loading}>
              {loading ? 'Salvando...' : 'Solicitar Transferência'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Gerenciamento de Transferências</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Nova Transferência
        </Button>
      </div>

      {showForm && renderForm()}

      <Tabs defaultValue='pendentes' className='w-full'>
        <TabsList>
          <TabsTrigger value='pendentes'>
            Pendentes ({filteredTransfers('pendente').length})
          </TabsTrigger>
          <TabsTrigger value='aprovadas'>
            Aprovadas ({filteredTransfers('aprovada').length})
          </TabsTrigger>
          <TabsTrigger value='rejeitadas'>
            Rejeitadas ({filteredTransfers('rejeitada').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='pendentes'>
          <Card>
            <CardHeader>
              <CardTitle>Transferências Pendentes</CardTitle>
              <CardDescription>
                Solicitações aguardando aprovação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(filteredTransfers('pendente'))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='aprovadas'>
          <Card>
            <CardHeader>
              <CardTitle>Transferências Aprovadas</CardTitle>
              <CardDescription>
                Solicitações que foram aprovadas e executadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(filteredTransfers('aprovada'))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='rejeitadas'>
          <Card>
            <CardHeader>
              <CardTitle>Transferências Rejeitadas</CardTitle>
              <CardDescription>
                Solicitações que foram rejeitadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(filteredTransfers('rejeitada'))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transferencias;
