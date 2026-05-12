import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { formatDate } from '@/lib/utils'
import { differenceInDays, isBefore } from 'date-fns'
import { AlertTriangle, CheckCircle, Clock, RotateCcw } from 'lucide-react'
import { logger } from '@/lib/logger'

interface EmprestimoAPI {
  id: string
  patrimonioId: string
  numero_patrimonio: string
  descricao_bem: string
  responsavel: string
  setor: string
  dataEmprestimo: string
  dataPrevDevolucao: string
  dataDevolucao: string | null
  motivo: string
  observacoes: string | null
  status: 'ativo' | 'devolvido' | 'atrasado'
  patrimonio?: {
    id: string
    numero_patrimonio: string
    descricao_bem: string
    status: string
  }
}

interface DevolucaoState {
  open: boolean
  emprestimo: EmprestimoAPI | null
  observacoes: string
  dataDevolucao: string
  submitting: boolean
}

const getLoanStatus = (e: EmprestimoAPI) => {
  if (e.status === 'devolvido') {
    return { label: 'Devolvido', variant: 'outline' as const, icon: CheckCircle }
  }
  const now = new Date()
  const dueDate = new Date(e.dataPrevDevolucao)
  const daysRemaining = differenceInDays(dueDate, now)

  if (isBefore(dueDate, now)) {
    return { label: 'Atrasado', variant: 'destructive' as const, icon: AlertTriangle }
  }
  if (daysRemaining <= 7) {
    return { label: 'Vence em breve', variant: 'secondary' as const, icon: Clock }
  }
  return { label: 'Em dia', variant: 'default' as const, icon: CheckCircle }
}

const Emprestimos = () => {
  const [emprestimos, setEmprestimos] = useState<EmprestimoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [devolucao, setDevolucao] = useState<DevolucaoState>({
    open: false,
    emprestimo: null,
    observacoes: '',
    dataDevolucao: new Date().toISOString().slice(0, 10),
    submitting: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ emprestimos: EmprestimoAPI[] }>(
        '/emprestimos?status=ativo&limit=100',
      )
      setEmprestimos(data.emprestimos ?? [])
    } catch (err) {
      logger.error('Erro ao listar empréstimos', err)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar empréstimos.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openDevolucao = (e: EmprestimoAPI) => {
    setDevolucao({
      open: true,
      emprestimo: e,
      observacoes: '',
      dataDevolucao: new Date().toISOString().slice(0, 10),
      submitting: false,
    })
  }

  const closeDevolucao = () => {
    setDevolucao((s) => ({ ...s, open: false }))
  }

  const confirmDevolucao = async () => {
    if (!devolucao.emprestimo) return
    setDevolucao((s) => ({ ...s, submitting: true }))
    try {
      await api.post(`/emprestimos/${devolucao.emprestimo.id}/devolver`, {
        dataDevolucao: devolucao.dataDevolucao,
        observacoes: devolucao.observacoes || undefined,
      })
      toast({
        title: 'Devolução registrada',
        description: `Patrimônio ${devolucao.emprestimo.numero_patrimonio} liberado.`,
      })
      closeDevolucao()
      void load()
    } catch (err) {
      logger.error('Erro ao registrar devolução', err)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar a devolução.',
      })
      setDevolucao((s) => ({ ...s, submitting: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Gerenciamento de Empréstimos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Empréstimos Ativos</CardTitle>
          <CardDescription>
            Acompanhe todos os bens emprestados e registre devoluções.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Carregando empréstimos...
            </p>
          ) : emprestimos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum empréstimo ativo no momento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Patrimônio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Empréstimo</TableHead>
                  <TableHead>Devolução Prevista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprestimos.map((e) => {
                  const status = getLoanStatus(e)
                  const Icon = status.icon
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link
                          to={`/bens-cadastrados/ver/${e.patrimonioId}`}
                          className="text-primary hover:underline"
                        >
                          {e.numero_patrimonio}
                        </Link>
                      </TableCell>
                      <TableCell>{e.descricao_bem}</TableCell>
                      <TableCell>{e.responsavel}</TableCell>
                      <TableCell>{formatDate(e.dataEmprestimo)}</TableCell>
                      <TableCell>{formatDate(e.dataPrevDevolucao)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          <Icon className="mr-2 h-4 w-4" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {e.status !== 'devolvido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDevolucao(e)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Devolver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={devolucao.open} onOpenChange={(o) => !o && closeDevolucao()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>
              {devolucao.emprestimo && (
                <>
                  Patrimônio <strong>{devolucao.emprestimo.numero_patrimonio}</strong>
                  {' — '}
                  {devolucao.emprestimo.descricao_bem}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="dataDevolucao">Data da devolução</Label>
              <Input
                id="dataDevolucao"
                type="date"
                value={devolucao.dataDevolucao}
                onChange={(ev) =>
                  setDevolucao((s) => ({ ...s, dataDevolucao: ev.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                rows={3}
                placeholder="Condições do bem na devolução, danos, etc."
                value={devolucao.observacoes}
                onChange={(ev) =>
                  setDevolucao((s) => ({ ...s, observacoes: ev.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDevolucao} disabled={devolucao.submitting}>
              Cancelar
            </Button>
            <Button onClick={confirmDevolucao} disabled={devolucao.submitting}>
              {devolucao.submitting ? 'Registrando...' : 'Confirmar devolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Emprestimos
