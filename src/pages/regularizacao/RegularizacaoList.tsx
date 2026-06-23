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
import {
  PackagePlus,
  PlusCircle,
  Trash2,
  RefreshCw,
  CheckCheck,
  XCircle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSectors } from '@/contexts/SectorContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import {
  createRegularizacaoSchema,
  incorporarRegularizacaoSchema,
  type CreateRegularizacaoInput,
  type IncorporarRegularizacaoInput,
  type TipoOrigemBem,
  type StatusRegularizacao,
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
}

interface ComissaoRef {
  tipo: string
  portariaNumero: string
}

interface Regularizacao {
  id: string
  descricao: string
  caracteristicas?: string | null
  estadoConservacao?: string | null
  localizacao?: string | null
  tipoOrigem: TipoOrigemBem
  valorJusto: number
  comissaoId?: string | null
  termoConstatacao?: string | null
  observacoes?: string | null
  fotos: string[]
  status: StatusRegularizacao
  patrimonioId?: string | null
  dataConstatacao?: string | null
  dataIncorporacao?: string | null
  comissao?: ComissaoRef | null
  patrimonio?: PatrimonioRef | null
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface RegularizacoesResponse {
  regularizacoes: Regularizacao[]
  pagination: PaginationMeta
}

// ---- Utilitários ----

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function formatBRL(value: number): string {
  return brl.format(value)
}

const TIPO_ORIGEM_LABEL: Record<TipoOrigemBem, string> = {
  pre_existente: 'Pré-existente',
  origem_desconhecida: 'Origem desconhecida',
}

const STATUS_LABEL: Record<StatusRegularizacao, string> = {
  em_andamento: 'Em andamento',
  incorporado: 'Incorporado',
  cancelado: 'Cancelado',
}

function statusBadge(status: StatusRegularizacao) {
  if (status === 'incorporado') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        <CheckCheck className="h-3 w-3 mr-1" />
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

// ---- Formulário de constatação (criar) ----

interface ConstatacaoFormProps {
  onSuccess: () => void
  onClose: () => void
}

function ConstatacaoForm({ onSuccess, onClose }: ConstatacaoFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [comissoes, setComissoes] = useState<ComissaoItem[]>([])
  const [loadingComissoes, setLoadingComissoes] = useState(false)

  const form = useForm<CreateRegularizacaoInput>({
    resolver: zodResolver(createRegularizacaoSchema),
    defaultValues: {
      descricao: '',
      tipoOrigem: 'pre_existente',
      valorJusto: 0,
      caracteristicas: '',
      estadoConservacao: '',
      localizacao: '',
      termoConstatacao: '',
      observacoes: '',
      comissaoId: null,
      dataConstatacao: '',
    },
  })

  useEffect(() => {
    setLoadingComissoes(true)
    api
      .get<ComissoesResponse>('/comissoes?status=ativa&limit=100')
      .then((data) => setComissoes(data.comissoes ?? []))
      .catch((err) => {
        logger.warn('[RegularizacaoList] Erro ao buscar comissões', err)
      })
      .finally(() => setLoadingComissoes(false))
  }, [])

  const onSubmit = useCallback(
    async (values: CreateRegularizacaoInput) => {
      setSubmitting(true)
      // Limpar strings vazias para null em campos opcionais
      const payload: CreateRegularizacaoInput = {
        ...values,
        caracteristicas: values.caracteristicas || null,
        estadoConservacao: values.estadoConservacao || null,
        localizacao: values.localizacao || null,
        termoConstatacao: values.termoConstatacao || null,
        observacoes: values.observacoes || null,
        comissaoId: values.comissaoId || null,
        dataConstatacao: values.dataConstatacao || undefined,
      }
      try {
        await api.post('/regularizacoes', payload)
        toast({ title: 'Constatação registrada com sucesso.' })
        onSuccess()
        onClose()
      } catch (err) {
        logger.error('[RegularizacaoList] Erro ao criar regularização', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar constatação',
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
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800">
          <Info className="h-3 w-3 inline mr-1" />
          Registre bens encontrados sem procedência conhecida ou que existam fisicamente
          mas não constam no acervo. Após análise, poderão ser incorporados ao patrimônio.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do bem *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descreva o bem identificado" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tipoOrigem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de origem *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(TIPO_ORIGEM_LABEL) as TipoOrigemBem[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_ORIGEM_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valorJusto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor justo (R$) *</FormLabel>
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
                  Valor estimado para incorporação (será o valor do patrimônio).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estadoConservacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado de conservação</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Bom, regular, ruim..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="localizacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localização</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Onde o bem está localizado" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="termoConstatacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termo de constatação</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Nº do termo (opcional)" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataConstatacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de constatação</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="caracteristicas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Características</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="Cor, marca, modelo, número de série..." />
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
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="Observações adicionais" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comissaoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comissão responsável (opcional)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                value={field.value ?? '__none__'}
                disabled={loadingComissoes}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingComissoes ? 'Carregando...' : 'Sem comissão'} />
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
              <FormDescription className="text-xs">
                Preferencialmente uma comissão do tipo regularização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar Constatação'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Formulário de incorporação ----

interface IncorporarFormProps {
  regularizacao: Regularizacao
  onSuccess: () => void
  onClose: () => void
}

function IncorporarForm({ regularizacao, onSuccess, onClose }: IncorporarFormProps) {
  const { sectors } = useSectors()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<IncorporarRegularizacaoInput>({
    resolver: zodResolver(incorporarRegularizacaoSchema),
    defaultValues: {
      sectorId: '',
      localId: null,
      setor_responsavel: '',
      local_objeto: '',
      tipo: '',
      numero_patrimonio: null,
    },
  })

  const onSubmit = useCallback(
    async (values: IncorporarRegularizacaoInput) => {
      setSubmitting(true)
      const payload: IncorporarRegularizacaoInput = {
        ...values,
        localId: values.localId || null,
        numero_patrimonio: values.numero_patrimonio || null,
      }
      try {
        await api.post(`/regularizacoes/${regularizacao.id}/incorporar`, payload)
        toast({
          title: 'Bem incorporado ao patrimônio com sucesso.',
          description: 'O bem foi registrado no acervo patrimonial.',
        })
        onSuccess()
        onClose()
      } catch (err) {
        logger.error('[RegularizacaoList] Erro ao incorporar bem', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao incorporar bem',
          description: (err as Error)?.message,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [regularizacao.id, onSuccess, onClose],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800">
          <Info className="h-3 w-3 inline mr-1" />
          Incorporar cria um novo bem no patrimônio com o valor justo de{' '}
          <strong>{formatBRL(regularizacao.valorJusto)}</strong>. Esta ação não pode ser
          desfeita.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo / categoria do bem *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: Mobiliário, Equipamento..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="setor_responsavel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor responsável (texto) *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome do setor responsável" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="local_objeto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local do objeto *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: Sala 02, Depósito..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numero_patrimonio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de patrimônio (opcional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Deixe em branco para gerar automaticamente"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Se não informado, o sistema gerará o número automaticamente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Incorporando...' : 'Confirmar Incorporação'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Página principal ----

type DialogMode = 'none' | 'criar' | 'incorporar'

export default function RegularizacaoList() {
  const { user } = useAuth()

  // Leitura: admin/supervisor/usuario. Escrita (criar/incorporar): admin/supervisor/superuser.
  const canWrite =
    user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'superuser'
  const canDelete = user?.role === 'admin' || user?.role === 'superuser'

  const [regularizacoes, setRegularizacoes] = useState<Regularizacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterTipoOrigem, setFilterTipoOrigem] = useState<string>('')

  const [dialogMode, setDialogMode] = useState<DialogMode>('none')
  const [selectedItem, setSelectedItem] = useState<Regularizacao | null>(null)

  const fetchingRef = useRef(false)

  const fetchRegularizacoes = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterTipoOrigem) params.set('tipoOrigem', filterTipoOrigem)
      params.set('limit', '50')

      const data = await api.get<RegularizacoesResponse>(
        `/regularizacoes?${params.toString()}`,
      )
      setRegularizacoes(data.regularizacoes ?? [])
    } catch (err) {
      logger.error('[RegularizacaoList] Erro ao carregar regularizações', err)
      setError('Não foi possível carregar as regularizações. Tente novamente.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [filterStatus, filterTipoOrigem])

  useEffect(() => {
    void fetchRegularizacoes()
  }, [fetchRegularizacoes])

  const handleRefresh = useCallback(() => {
    fetchingRef.current = false
    void fetchRegularizacoes()
  }, [fetchRegularizacoes])

  const handleCancelar = useCallback(
    async (id: string) => {
      try {
        await api.post(`/regularizacoes/${id}/cancelar`, {})
        toast({ title: 'Regularização cancelada.' })
        handleRefresh()
      } catch (err) {
        logger.error('[RegularizacaoList] Erro ao cancelar regularização', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao cancelar',
          description: (err as Error)?.message,
        })
      }
    },
    [handleRefresh],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/regularizacoes/${id}`)
        toast({ title: 'Regularização excluída.' })
        handleRefresh()
      } catch (err) {
        logger.error('[RegularizacaoList] Erro ao excluir regularização', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: (err as Error)?.message,
        })
      }
    },
    [handleRefresh],
  )

  const openCriar = () => {
    setSelectedItem(null)
    setDialogMode('criar')
  }

  const openIncorporar = (item: Regularizacao) => {
    setSelectedItem(item)
    setDialogMode('incorporar')
  }

  const closeDialog = () => {
    setDialogMode('none')
    setSelectedItem(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Regularização de Bens</h1>
        </div>
        {canWrite && (
          <Button onClick={openCriar}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Constatação
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusRegularizacao[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTipoOrigem} onValueChange={setFilterTipoOrigem}>
          <SelectTrigger className="w-52" aria-label="Filtrar por tipo de origem">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            {(Object.keys(TIPO_ORIGEM_LABEL) as TipoOrigemBem[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_ORIGEM_LABEL[t]}
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
          <CardTitle>Bens em Regularização</CardTitle>
          <CardDescription>
            Bens pré-existentes ou de origem desconhecida identificados para incorporação
            ao acervo patrimonial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando regularizações...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            </div>
          ) : regularizacoes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma regularização encontrada.
              {canWrite && (
                <p className="mt-2 text-sm">
                  <Button variant="link" onClick={openCriar}>
                    Registrar a primeira constatação
                  </Button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo de origem</TableHead>
                    <TableHead className="text-right">Valor justo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Patrimônio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularizacoes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.descricao}</div>
                        {r.localizacao && (
                          <div className="text-xs text-muted-foreground">
                            {r.localizacao}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {TIPO_ORIGEM_LABEL[r.tipoOrigem]}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatBRL(r.valorJusto)}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm">
                        {r.patrimonio?.numero_patrimonio ? (
                          <Badge variant="outline">
                            {r.patrimonio.numero_patrimonio}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Incorporar: apenas em_andamento + canWrite */}
                          {r.status === 'em_andamento' && canWrite && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openIncorporar(r)}
                              aria-label="Incorporar ao patrimônio"
                              title="Incorporar ao patrimônio"
                            >
                              <CheckCheck className="h-4 w-4 mr-1" />
                              Incorporar
                            </Button>
                          )}

                          {/* Cancelar: apenas em_andamento + canWrite */}
                          {r.status === 'em_andamento' && canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-600 hover:text-amber-700"
                                  aria-label="Cancelar regularização"
                                  title="Cancelar regularização"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar regularização?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O registro <strong>{r.descricao}</strong> será marcado como
                                    cancelado. Esta ação pode ser revisada pelo administrador.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleCancelar(r.id)}
                                  >
                                    Cancelar regularização
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Excluir: canDelete + não incorporado */}
                          {canDelete && r.status !== 'incorporado' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  aria-label="Excluir regularização"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir regularização?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O registro <strong>{r.descricao}</strong> será excluído
                                    permanentemente. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(r.id)}
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

      {/* Dialog: nova constatação */}
      <Dialog
        open={dialogMode === 'criar'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Constatação de Bem</DialogTitle>
            <DialogDescription>
              Registre um bem pré-existente ou de origem desconhecida para avaliação e
              eventual incorporação ao patrimônio.
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'criar' && (
            <ConstatacaoForm
              onSuccess={() => {
                fetchingRef.current = false
                void fetchRegularizacoes()
              }}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: incorporar ao patrimônio */}
      <Dialog
        open={dialogMode === 'incorporar'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incorporar ao Patrimônio</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? `"${selectedItem.descricao}" — ${formatBRL(selectedItem.valorJusto)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'incorporar' && selectedItem && (
            <IncorporarForm
              regularizacao={selectedItem}
              onSuccess={() => {
                fetchingRef.current = false
                void fetchRegularizacoes()
              }}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
