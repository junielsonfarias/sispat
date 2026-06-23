import { useState, useCallback, useEffect, useRef } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Info,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import {
  createConciliacaoSchema,
  type CreateConciliacaoInput,
  type CategoriaConciliacao,
  type StatusConciliacao,
} from '@sispat/shared'

// ---- Tipos locais ----

interface ItemConformidade {
  chave: string
  categoria: string
  descricao: string
  status: 'conforme' | 'atencao' | 'nao_conforme'
  detalhe: string
  referenciaLegal: string
}

interface ResumoConformidade {
  conforme: number
  atencao: number
  naoConforme: number
  total: number
}

interface ChecklistResponse {
  geradoEm: string
  resumo: ResumoConformidade
  itens: ItemConformidade[]
}

interface AlertasConformidadeResponse {
  total: number
  naoConforme: ItemConformidade[]
  atencao: ItemConformidade[]
}

interface Conciliacao {
  id: string
  competencia: string
  dataBase: string
  categoria: CategoriaConciliacao
  valorContabil: number
  valorFisico: number
  divergencia: number
  status: StatusConciliacao
  observacoes?: string | null
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ConciliacoesResponse {
  conciliacoes: Conciliacao[]
  pagination: PaginationMeta
}

// ---- Labels pt-BR ----

const CATEGORIA_LABEL: Record<CategoriaConciliacao, string> = {
  bens_moveis: 'Bens Móveis',
  bens_imoveis: 'Bens Imóveis',
}

const STATUS_CONCILIACAO_LABEL: Record<StatusConciliacao, string> = {
  conciliada: 'Conciliada',
  divergente: 'Divergente',
}

const STATUS_CONFORMIDADE_LABEL: Record<ItemConformidade['status'], string> = {
  conforme: 'Conforme',
  atencao: 'Atenção',
  nao_conforme: 'Não Conforme',
}

// ---- Utilitários de formatação ----

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatBRL(value: number): string {
  return brl.format(value)
}

function formatCompetencia(competencia: string): string {
  // "2026-06" -> "Jun/2026"
  const [year, month] = competencia.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
}

function formatDateBR(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-BR')
}

// ---- Badges ----

function conformidadeBadge(status: ItemConformidade['status']) {
  if (status === 'conforme') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {STATUS_CONFORMIDADE_LABEL[status]}
      </Badge>
    )
  }
  if (status === 'atencao') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {STATUS_CONFORMIDADE_LABEL[status]}
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
      <XCircle className="h-3 w-3 mr-1" />
      {STATUS_CONFORMIDADE_LABEL[status]}
    </Badge>
  )
}

function conciliacaoStatusBadge(status: StatusConciliacao) {
  if (status === 'conciliada') {
    return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{STATUS_CONCILIACAO_LABEL[status]}</Badge>
  }
  return <Badge variant="destructive">{STATUS_CONCILIACAO_LABEL[status]}</Badge>
}

// ---- Seção Checklist de Conformidade ----

interface ChecklistSectionProps {
  canWrite: boolean
}

function ChecklistSection({ canWrite: _canWrite }: ChecklistSectionProps) {
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null)
  const [alertas, setAlertas] = useState<AlertasConformidadeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRef = useRef(false)

  const fetchChecklist = useCallback(async () => {
    if (fetchRef.current) return
    fetchRef.current = true
    setLoading(true)
    setError(null)
    try {
      const [checklistData, alertasData] = await Promise.all([
        api.get<ChecklistResponse>('/conformidade/checklist'),
        api.get<AlertasConformidadeResponse>('/conformidade/alertas'),
      ])
      setChecklist(checklistData)
      setAlertas(alertasData)
    } catch (err) {
      logger.error('[Conformidade] Erro ao carregar checklist', err)
      setError('Não foi possível carregar o checklist de conformidade. Tente novamente.')
    } finally {
      setLoading(false)
      fetchRef.current = false
    }
  }, [])

  useEffect(() => {
    void fetchChecklist()
  }, [fetchChecklist])

  const handleRefresh = useCallback(() => {
    fetchRef.current = false
    void fetchChecklist()
  }, [fetchChecklist])

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando checklist...</div>
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!checklist) return null

  const { resumo, itens } = checklist

  // Agrupar itens por categoria
  const categorias = Array.from(new Set(itens.map((i) => i.categoria)))

  return (
    <div className="space-y-6">
      {/* Painel de alertas */}
      {alertas && alertas.total > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Itens que requerem atenção ({alertas.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-1 text-xs text-amber-800 dark:text-amber-300">
            {alertas.naoConforme.slice(0, 5).map((a) => (
              <div key={a.chave} className="flex items-start gap-1">
                <XCircle className="h-3 w-3 mt-0.5 text-red-600 flex-shrink-0" />
                <span><span className="font-medium">Não conforme:</span> {a.descricao}</span>
              </div>
            ))}
            {alertas.atencao.slice(0, 5).map((a) => (
              <div key={a.chave} className="flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><span className="font-medium">Atenção:</span> {a.descricao}</span>
              </div>
            ))}
            {alertas.total > 10 && (
              <p className="text-xs text-muted-foreground">...e mais {alertas.total - 10} itens no checklist abaixo.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{resumo.conforme}</p>
            <p className="text-xs text-green-600 font-medium">Conforme</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{resumo.atencao}</p>
            <p className="text-xs text-yellow-600 font-medium">Atenção</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{resumo.naoConforme}</p>
            <p className="text-xs text-red-600 font-medium">Não Conforme</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Info className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{resumo.total}</p>
            <p className="text-xs text-muted-foreground font-medium">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de itens por categoria */}
      <div className="space-y-4">
        {categorias.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum item de conformidade encontrado.
          </div>
        ) : (
          categorias.map((cat) => {
            const itensCat = itens.filter((i) => i.categoria === cat)
            return (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Detalhe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensCat.map((item) => (
                        <TableRow key={item.chave}>
                          <TableCell>
                            <div className="font-medium text-sm">{item.descricao}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 md:hidden">{item.detalhe}</div>
                            {item.referenciaLegal && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.referenciaLegal}</div>
                            )}
                          </TableCell>
                          <TableCell>{conformidadeBadge(item.status)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.detalhe}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Rodapé com timestamp e botão de atualizar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Gerado em: {formatDateBR(checklist.geradoEm)}</span>
        <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Recarregar checklist">
          <RefreshCw className="h-3 w-3 mr-1" />
          Recarregar
        </Button>
      </div>
    </div>
  )
}

// ---- Formulário de criação de conciliação ----

interface ConciliacaoCreateFormProps {
  onSuccess: () => void
  onClose: () => void
}

function ConciliacaoCreateForm({ onSuccess, onClose }: ConciliacaoCreateFormProps) {
  const form = useForm<CreateConciliacaoInput>({
    resolver: zodResolver(createConciliacaoSchema),
    defaultValues: {
      competencia: '',
      dataBase: '',
      categoria: 'bens_moveis',
      valorContabil: 0,
      observacoes: '',
    },
  })

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = useCallback(async (values: CreateConciliacaoInput) => {
    setSubmitting(true)
    try {
      await api.post('/conciliacoes', values)
      toast({ title: 'Conciliação criada com sucesso.' })
      onSuccess()
      onClose()
    } catch (err) {
      logger.error('[Conformidade] Erro ao criar conciliação', err)
      toast({ variant: 'destructive', title: 'Erro ao criar conciliação', description: (err as Error)?.message })
    } finally {
      setSubmitting(false)
    }
  }, [onSuccess, onClose])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="competencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competência (AAAA-MM)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: 2026-06" />
                </FormControl>
                <FormDescription className="text-xs">
                  Mês e ano de referência no formato AAAA-MM.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataBase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data-base</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Data de referência do balanço.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(CATEGORIA_LABEL) as CategoriaConciliacao[]).map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valorContabil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo Contábil (SIAFIC)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Valor informado pelo SIAFIC. O saldo físico é calculado automaticamente pelo sistema.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="Observações sobre esta conciliação" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800">
          <Info className="h-3 w-3 inline mr-1" />
          O <strong>saldo físico</strong> é calculado automaticamente com base no acervo patrimonial registrado no sistema. Você informa apenas o saldo contábil do SIAFIC.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Criar Conciliação'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Seção Conciliação contábil ----

interface ConciliacaoSectionProps {
  canWrite: boolean
}

function ConciliacaoSection({ canWrite }: ConciliacaoSectionProps) {
  const [conciliacoes, setConciliacoes] = useState<Conciliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recalculandoId, setRecalculandoId] = useState<string | null>(null)

  const [filterCategoria, setFilterCategoria] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchRef = useRef(false)

  const fetchConciliacoes = useCallback(async () => {
    if (fetchRef.current) return
    fetchRef.current = true
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterCategoria) params.set('categoria', filterCategoria)
      if (filterStatus) params.set('status', filterStatus)
      params.set('limit', '50')

      const data = await api.get<ConciliacoesResponse>(`/conciliacoes?${params.toString()}`)
      setConciliacoes(data.conciliacoes)
    } catch (err) {
      logger.error('[Conformidade] Erro ao carregar conciliações', err)
      setError('Não foi possível carregar as conciliações. Tente novamente.')
    } finally {
      setLoading(false)
      fetchRef.current = false
    }
  }, [filterCategoria, filterStatus])

  useEffect(() => {
    void fetchConciliacoes()
  }, [fetchConciliacoes])

  const handleRefresh = useCallback(() => {
    fetchRef.current = false
    void fetchConciliacoes()
  }, [fetchConciliacoes])

  const handleRecalcular = useCallback(async (id: string) => {
    setRecalculandoId(id)
    try {
      await api.post(`/conciliacoes/${id}/recalcular`, {})
      toast({ title: 'Conciliação recalculada com sucesso.' })
      fetchRef.current = false
      void fetchConciliacoes()
    } catch (err) {
      logger.error('[Conformidade] Erro ao recalcular conciliação', err)
      toast({ variant: 'destructive', title: 'Erro ao recalcular', description: (err as Error)?.message })
    } finally {
      setRecalculandoId(null)
    }
  }, [fetchConciliacoes])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/conciliacoes/${id}`)
      toast({ title: 'Conciliação excluída.' })
      fetchRef.current = false
      void fetchConciliacoes()
    } catch (err) {
      logger.error('[Conformidade] Erro ao excluir conciliação', err)
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: (err as Error)?.message })
    }
  }, [fetchConciliacoes])

  const handleCreateSuccess = useCallback(() => {
    fetchRef.current = false
    void fetchConciliacoes()
  }, [fetchConciliacoes])

  return (
    <div className="space-y-4">
      {/* Filtros e ação */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por categoria">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {(Object.keys(CATEGORIA_LABEL) as CategoriaConciliacao[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-36" aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_CONCILIACAO_LABEL) as StatusConciliacao[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONCILIACAO_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} aria-label="Atualizar lista">
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
        {canWrite && (
          <Button className="ml-auto" onClick={() => setDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Conciliação
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Conciliações Físico-Contábeis (SIAFIC)</CardTitle>
          <CardDescription>
            Compare o saldo físico (acervo) com o saldo contábil registrado no SIAFIC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando conciliações...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={handleRefresh}>Tentar novamente</Button>
            </div>
          ) : conciliacoes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma conciliação encontrada.
              {canWrite && (
                <p className="mt-2 text-sm">
                  <Button variant="link" onClick={() => setDialogOpen(true)}>Criar a primeira conciliação</Button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Saldo Contábil</TableHead>
                    <TableHead className="text-right">Saldo Físico</TableHead>
                    <TableHead className="text-right">Divergência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conciliacoes.map((c) => {
                    const hasDivergencia = c.divergencia !== 0
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{formatCompetencia(c.competencia)}</div>
                          <div className="text-xs text-muted-foreground">{formatDateBR(c.dataBase)}</div>
                        </TableCell>
                        <TableCell className="text-sm">{CATEGORIA_LABEL[c.categoria]}</TableCell>
                        <TableCell className="text-right text-sm">{formatBRL(c.valorContabil)}</TableCell>
                        <TableCell className="text-right text-sm">{formatBRL(c.valorFisico)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={hasDivergencia ? 'text-red-600 font-semibold' : 'text-green-600'}>
                            {formatBRL(c.divergencia)}
                          </span>
                        </TableCell>
                        <TableCell>{conciliacaoStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canWrite && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={recalculandoId === c.id}
                                  onClick={() => void handleRecalcular(c.id)}
                                  aria-label="Recalcular saldo físico"
                                  title="Recalcular saldo físico"
                                >
                                  <RotateCw className={`h-4 w-4 ${recalculandoId === c.id ? 'animate-spin' : ''}`} />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      aria-label="Excluir conciliação"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir conciliação?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A conciliação de{' '}
                                        <strong>{formatCompetencia(c.competencia)} — {CATEGORIA_LABEL[c.categoria]}</strong>{' '}
                                        será removida permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => void handleDelete(c.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: criar conciliação */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conciliação Físico-Contábil</DialogTitle>
            <DialogDescription>
              Informe os dados do SIAFIC. O saldo físico é calculado automaticamente.
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && (
            <ConciliacaoCreateForm
              onSuccess={handleCreateSuccess}
              onClose={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Página principal ----

export default function Conformidade() {
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || user?.role === 'superuser'

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Conformidade Legal</h1>
      </div>

      {/* Abas */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist de Conformidade</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação Contábil (SIAFIC)</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <ChecklistSection canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="conciliacao" className="mt-4">
          <ConciliacaoSection canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
