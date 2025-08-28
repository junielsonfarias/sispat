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
import { Textarea } from '@/components/ui/textarea';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { formatDate } from '@/lib/utils';
import { api } from '@/services/api';
import { differenceInDays, isBefore } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Emprestimos = () => {
  const { patrimonios } = usePatrimonio();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedPatrimonio, setSelectedPatrimonio] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-selecionar patrimônio se passado via URL
  useEffect(() => {
    const patrimonioId = searchParams.get('patrimonioId');
    if (patrimonioId) {
      setSelectedPatrimonio(patrimonioId);
      setShowForm(true);
    }
  }, [searchParams]);

  const activeLoans = useMemo(() => {
    return patrimonios
      .filter(p => p.emprestimo_ativo)
      .map(p => ({
        patrimonio: p,
        loan: p.emprestimo_ativo!,
      }));
  }, [patrimonios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatrimonio || !destinatario || !dataDevolucao || !motivo) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('patrimonioId', selectedPatrimonio);
      formData.append('destinatario', destinatario);
      formData.append('dataDevolucao', dataDevolucao);
      formData.append('motivo', motivo);
      if (documento) {
        formData.append('documento', documento);
      }

      await api.post('/emprestimos', formData);
      toast.success('Empréstimo registrado com sucesso!');
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error);
      toast.error('Erro ao criar empréstimo');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatrimonio('');
    setDestinatario('');
    setDataDevolucao('');
    setMotivo('');
    setDocumento(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumento(file);
    }
  };

  const getLoanStatus = (loan: { data_devolucao_prevista: Date }) => {
    const now = new Date();
    const dueDate = new Date(loan.data_devolucao_prevista);
    const daysRemaining = differenceInDays(dueDate, now);

    if (isBefore(dueDate, now)) {
      return {
        label: 'Atrasado',
        variant: 'destructive',
        icon: AlertTriangle,
      };
    }
    if (daysRemaining <= 7) {
      return {
        label: 'Vence em breve',
        variant: 'secondary',
        icon: Clock,
      };
    }
    return {
      label: 'Em dia',
      variant: 'default',
      icon: CheckCircle,
    };
  };

  const renderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Novo Empréstimo</CardTitle>
        <CardDescription>
          Preencha os dados para registrar o empréstimo de um bem patrimonial.
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
                  {patrimonios
                    .filter(p => !p.emprestimo_ativo) // Apenas bens não emprestados
                    .map(patrimonio => (
                      <SelectItem key={patrimonio.id} value={patrimonio.id}>
                        {patrimonio.numero_patrimonio} - {patrimonio.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='destinatario'>Destinatário *</Label>
              <Input
                value={destinatario}
                onChange={e => setDestinatario(e.target.value)}
                placeholder='Nome do destinatário'
              />
            </div>

            <div>
              <Label htmlFor='dataDevolucao'>
                Data de Devolução Prevista *
              </Label>
              <Input
                type='date'
                value={dataDevolucao}
                onChange={e => setDataDevolucao(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <Label htmlFor='motivo'>Motivo do Empréstimo *</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder='Descreva o motivo do empréstimo...'
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
              {loading ? 'Salvando...' : 'Registrar Empréstimo'}
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
        <h1 className='text-2xl font-bold'>Gerenciamento de Empréstimos</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Novo Empréstimo
        </Button>
      </div>

      {showForm && renderForm()}

      <Card>
        <CardHeader>
          <CardTitle>Empréstimos Ativos</CardTitle>
          <CardDescription>
            Acompanhe todos os bens que estão atualmente emprestados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Descrição do Bem</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Data do Empréstimo</TableHead>
                <TableHead>Devolução Prevista</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLoans.map(({ patrimonio, loan }) => {
                const status = getLoanStatus(loan);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={patrimonio.id}>
                    <TableCell>
                      <Link
                        to={`/bens-cadastrados/ver/${patrimonio.id}`}
                        className='text-primary hover:underline'
                      >
                        {patrimonio.numero_patrimonio}
                      </Link>
                    </TableCell>
                    <TableCell>{patrimonio.descricao}</TableCell>
                    <TableCell>{loan.destinatario}</TableCell>
                    <TableCell>{formatDate(loan.data_emprestimo)}</TableCell>
                    <TableCell>
                      {formatDate(loan.data_devolucao_prevista)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        <StatusIcon className='mr-1 h-3 w-3' />
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Emprestimos;
