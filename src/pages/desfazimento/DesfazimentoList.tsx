import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Recycle,
  PlusCircle,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  createDesfazimentoSchema,
  type CreateDesfazimentoInput,
  type ClassificacaoInservivel,
  type ModalidadeDesfazimento,
  type StatusDesfazimento,
} from '@sispat/shared'

// ---- Tipos locais ----

interface ComissaoItem {
  id: string
  tipo: string
  portariaNumero: string
  status: string
}

interface ComissoesResponse {
  comissoes: ComissaoItem[]
}

interface PatrimonioRef {
  numero_patrimonio: string
  descricao_bem: string
  status: string
}

interface ComissaoRef {
  tipo: string
  portariaNumero: string
}

interface Desfazimento {
  id: string
  patrimonioId: string
  classificacao: ClassificacaoInservivel
  modalidade: ModalidadeDesfazimento
  valorAvaliacao?: number | null
  justificativa: string
  laudo?: string | null
  comissaoId?: string | null
  status: StatusDesfazimento
  dataConclusao?: string | null
  observacoes?: string | null
  comissao?: ComissaoRef | null
  patrimonio?: PatrimonioRef | null
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface DesfazimentosResponse {
  desfazimentos: Desfazimento[]
  pagination: PaginationMeta
}

// ---- Labels pt-BR ----

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function formatBRL(value: number): string {
  return brl.format(value)
}

const CLASSIFICACAO_LABEL: Record<ClassificacaoInservivel, string> = {
  ocioso: 'Ocioso',
  recuperavel: 'Recuperável',
  antieconomico: 'Antieconômico',
  irrecuperavel: 'Irrecuperável',
}

const MODALIDADE_LABEL: Record<ModalidadeDesfazimento, string> = {
  doacao: 'Doação',
  leilao: 'Leilão',
  permuta: 'Permuta',
  transferencia: 'Transferência',
  cessao: 'Cessão',
  inutilizacao: 'Inutilização',
}

const STATUS_LABEL: Record<StatusDesfazimento, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function statusBadge(status: StatusDesfazimento) {
  if (status === 'concluido') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        {STATUS_LABEL[status]}
      </Badge>
    )
  }
  if (status === 'cancelado') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
        <XCircle className="h-3 w-3 mr-1" />
        {STATUS_LABEL[status]}
      </Badge>
    )
  }
  return <Badge variant="secondary">{STATUS_LABEL[status]}</Badge>
}

// ---- Formulário de criação ----

interface CreateFormProps {
  onSuccess: () => void
  onClose: () => void
}

function CreateDesfazimentoForm({ onSuccess, onClose }: CreateFormProps) {
  const { patrimonios } = usePatrimonio()
  const [submitting, setSubmitting] = useState(false)
  const [comissoes, setComissoes] = useState<ComissaoItem[]>([])
  const [loadingComissoes, setLoadingComissoes] = useState(false)
  const [search, setSearch] = useState('')

  // Apenas bens que não estão baixados podem ser submetidos ao desfazimento
  const patrimoniosDisponiveis = patrimonios.filter(
    (p) => p.status !== 'baixado',
  )

  const patrimoniosFiltrados = patrimoniosDisponiveis.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.numero_patrimonio.toLowerCase().includes(q) ||
      p.descricao_bem.toLowerCase().includes(q)
    )
  })

  const form = useForm<CreateDesfazimentoInput>({
    resolver: zodResolver(createDesfazimentoSchema),
    defaultValues: {
      patrimonioId: '',
      classificacao: 'ocioso',
      modalidade: 'doacao',
      valorAvaliacao: null,
      justificativa: '',
      laudo: null,
      comissaoId: null,
      observacoes: null,
    },
  })

  useEffect(() => {
    setLoadingComissoes(true)
    api
      .get<ComissoesResponse>('/comissoes?status=ativa&limit=100')
      .then((data) => setComissoes(data.comissoes ?? []))
      .catch((err) => {
        logger.warn('[DesfazimentoList] Erro ao buscar comissões', err)
      })
      .finally(() => setLoadingComissoes(false))
  }, [])

  const onSubmit = useCallback(
    async (values: CreateDesfazimentoInput) => {
      setSubmitting(true)
      const payload: CreateDesfazimentoInput = {
        ...values,
        valorAvaliacao: values.valorAvaliacao ?? null,
        laudo: values.laudo || null,
        comissaoId: values.comissaoId || null,
        observacoes: values.observacoes || null,
      }
      try {
        await api.post('/desfazimentos', payload)
        toast({ title: 'Desfazimento registrado com sucesso.' })
        onSuccess()
        onClose()
      } catch (err) {
        logger.error('[DesfazimentoList] Erro ao criar desfazimento', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar desfazimento',
          description: (err as Error)?.message,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [onSuccess, onClose],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800">
          <Info className="h-3 w-3 inline mr-1" />
          Registre um bem inservível para desfazimento patrimonial. Ao concluir o processo,
          o bem será dado como <strong>baixa definitiva</strong> do acervo.
        </div>

        {/* Seleção do patrimônio com busca */}
        <FormField
          control={form.control}
          name="patrimonioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bem Patrimonial *</FormLabel>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por número ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar patrimônio"
                />
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={patrimoniosFiltrados.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o bem patrimonial" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patrimoniosFiltrados.length === 0 ? (
                      <SelectItem value="__nenhum__" disabled>
                        {search ? 'Nenhum resultado' : 'Nenhum bem disponível'}
                      </SelectItem>
                    ) : (
                      patrimoniosFiltrados.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero_patrimonio} — {p.descricao_bem}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <FormDescription className="text-xs">
                Apenas bens não baixados são listados.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="classificacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Classificação *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classificação" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(CLASSIFICACAO_LABEL) as ClassificacaoInservivel[]).map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {CLASSIFICACAO_LABEL[c]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modalidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidade *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(MODALIDADE_LABEL) as ModalidadeDesfazimento[]).map(
                      (m) => (
                        <SelectItem key={m} value={m}>
                          {MODALIDADE_LABEL[m]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valorAvaliacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor de Avaliação (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Valor estimado pelo setor de patrimônio (opcional).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comissaoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão Responsável (opcional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                  value={field.value ?? '__none__'}
                  disabled={loadingComissoes}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingComissoes ? 'Carregando...' : 'Sem comissão'}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Sem comissão</SelectItem>
                    {comissoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.tipo} — Portaria {c.portariaNumero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="justificativa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Justificativa *</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Descreva os motivos que tornam o bem inservível (mínimo 10 caracteres)..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="laudo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Laudo Técnico (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Número ou referência do laudo técnico"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Observações adicionais"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar Desfazimento'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Página principal ----

type DialogMode = 'none' | 'criar'

export default function DesfazimentoList() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // RBAC: leitura todos autenticados; escrita admin/supervisor/superuser; delete admin/superuser
  const canWrite =
    user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'superuser'
  const canDelete = user?.role === 'admin' || user?.role === 'superuser'

  const [desfazimentos, setDesfazimentos] = useState<Desfazimento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterClassificacao, setFilterClassificacao] = useState<string>('')

  const [dialogMode, setDialogMode] = useState<DialogMode>('none')
  const [actionInProgress, setActionInProgress] = useState<{
    id: string
    tipo: 'concluir' | 'cancelar' | 'delete'
  } | null>(null)

  const fetchingRef = useRef(false)

  const fetchDesfazimentos = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterClassificacao) params.set('classificacao', filterClassificacao)
      params.set('limit', '50')

      const data = await api.get<DesfazimentosResponse>(
        `/desfazimentos?${params.toString()}`,
      )
      setDesfazimentos(data.desfazimentos ?? [])
    } catch (err) {
      logger.error('[DesfazimentoList] Erro ao carregar desfazimentos', err)
      setError('Não foi possível carregar os desfazimentos. Tente novamente.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [filterStatus, filterClassificacao])

  useEffect(() => {
    void fetchDesfazimentos()
  }, [fetchDesfazimentos])

  const handleRefresh = useCallback(() => {
    fetchingRef.current = false
    void fetchDesfazimentos()
  }, [fetchDesfazimentos])

  const handleConcluir = useCallback(
    async (id: string) => {
      setActionInProgress({ id, tipo: 'concluir' })
      try {
        await api.post(`/desfazimentos/${id}/concluir`, {})
        toast({
          title: 'Desfazimento concluído.',
          description: 'O bem foi dado como baixa definitiva no acervo patrimonial.',
        })
        handleRefresh()
      } catch (err) {
        logger.error('[DesfazimentoList] Erro ao concluir desfazimento', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao concluir',
          description: (err as Error)?.message,
        })
      } finally {
        setActionInProgress(null)
      }
    },
    [handleRefresh],
  )

  const handleCancelar = useCallback(
    async (id: string) => {
      setActionInProgress({ id, tipo: 'cancelar' })
      try {
        await api.post(`/desfazimentos/${id}/cancelar`, {})
        toast({ title: 'Desfazimento cancelado.' })
        handleRefresh()
      } catch (err) {
        logger.error('[DesfazimentoList] Erro ao cancelar desfazimento', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao cancelar',
          description: (err as Error)?.message,
        })
      } finally {
        setActionInProgress(null)
      }
    },
    [handleRefresh],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setActionInProgress({ id, tipo: 'delete' })
      try {
        await api.delete(`/desfazimentos/${id}`)
        toast({ title: 'Desfazimento excluído.' })
        handleRefresh()
      } catch (err) {
        logger.error('[DesfazimentoList] Erro ao excluir desfazimento', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: (err as Error)?.message,
        })
      } finally {
        setActionInProgress(null)
      }
    },
    [handleRefresh],
  )

  const openCriar = () => setDialogMode('criar')
  const closeDialog = () => setDialogMode('none')

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Recycle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Desfazimento de Inservíveis</h1>
        </div>
        {canWrite && (
          <Button onClick={openCriar}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Desfazimento
          </Button>
        )}
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          O desfazimento aplica-se a bens classificados como <strong>inservíveis</strong>.
          Ao <em>concluir</em> um processo, o bem é <strong>baixado definitivamente</strong>{' '}
          do acervo patrimonial — ação irreversível.
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusDesfazimento[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterClassificacao} onValueChange={setFilterClassificacao}>
          <SelectTrigger className="w-52" aria-label="Filtrar por classificação">
            <SelectValue placeholder="Todas as classificações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as classificações</SelectItem>
            {(Object.keys(CLASSIFICACAO_LABEL) as ClassificacaoInservivel[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CLASSIFICACAO_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleRefresh} aria-label="Atualizar lista">
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Processos de Desfazimento</CardTitle>
          <CardDescription>
            Gerencie os processos de desfazimento de bens inservíveis conforme a legislação
            patrimonial vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando desfazimentos...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            </div>
          ) : desfazimentos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum desfazimento encontrado.
              {canWrite && (
                <p className="mt-2 text-sm">
                  <Button variant="link" onClick={openCriar}>
                    Registrar o primeiro desfazimento
                  </Button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bem</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-right">Valor Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desfazimentos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.patrimonio ? (
                          <>
                            <div className="font-medium text-sm">
                              {d.patrimonio.numero_patrimonio}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {d.patrimonio.descricao_bem}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            ID: {d.patrimonioId.slice(0, 8)}…
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CLASSIFICACAO_LABEL[d.classificacao]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {MODALIDADE_LABEL[d.modalidade]}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {d.valorAvaliacao != null ? formatBRL(d.valorAvaliacao) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {statusBadge(d.status)}
                        {d.status === 'concluido' && d.dataConclusao && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(d.dataConclusao)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Concluir — somente em_andamento + canWrite */}
                          {d.status === 'em_andamento' && canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionInProgress?.id === d.id}
                                  aria-label="Concluir desfazimento"
                                  className="text-green-700 hover:text-green-800"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Concluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Concluir desfazimento — ação irreversível
                                  </AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div className="space-y-2 text-sm">
                                      <p>
                                        Ao confirmar, o bem{' '}
                                        <strong>
                                          {d.patrimonio
                                            ? `${d.patrimonio.numero_patrimonio} — ${d.patrimonio.descricao_bem}`
                                            : d.patrimonioId}
                                        </strong>{' '}
                                        será <strong>BAIXADO DEFINITIVAMENTE</strong> do acervo patrimonial.
                                      </p>
                                      <p className="text-destructive font-medium">
                                        Esta ação não pode ser desfeita. O bem deixará de constar
                                        no inventário ativo do município.
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => void handleConcluir(d.id)}
                                  >
                                    Confirmar baixa definitiva
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Cancelar — somente em_andamento + canWrite */}
                          {d.status === 'em_andamento' && canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionInProgress?.id === d.id}
                                  aria-label="Cancelar desfazimento"
                                  className="text-amber-700 hover:text-amber-800"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar processo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O processo de desfazimento será marcado como cancelado. O bem
                                    continuará ativo no acervo patrimonial.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => void handleCancelar(d.id)}>
                                    Confirmar Cancelamento
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Termo de Baixa — somente concluído */}
                          {d.status === 'concluido' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Gerar Termo de Baixa"
                              title="Gerar Termo de Baixa"
                              onClick={() =>
                                navigate(`/termos?patrimonioId=${d.patrimonioId}&tipo=baixa`)
                              }
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Termo de baixa
                            </Button>
                          )}

                          {/* Excluir — canDelete + não concluído */}
                          {canDelete && d.status !== 'concluido' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={actionInProgress?.id === d.id}
                                  aria-label="Excluir desfazimento"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O registro de desfazimento será excluído permanentemente.
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(d.id)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: novo desfazimento */}
      <Dialog
        open={dialogMode === 'criar'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Desfazimento de Inservível</DialogTitle>
            <DialogDescription>
              Registre um bem classificado como inservível para o processo de desfazimento
              patrimonial.
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'criar' && (
            <CreateDesfazimentoForm
              onSuccess={() => {
                fetchingRef.current = false
                void fetchDesfazimentos()
              }}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
