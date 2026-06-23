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
import { Gavel, PlusCircle, Trash2, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  createDesafetacaoSchema,
  type CreateDesafetacaoInput,
  type BaseLegalTipo,
  type StatusDesafetacao,
  type DestinacaoBem,
} from '@sispat/shared'

// ---- Tipos locais ----

interface Comissao {
  id: string
  tipo: string
  portariaNumero: string
}

interface PatrimonioInfo {
  numero_patrimonio: string
  descricao_bem: string
}

interface ImovelInfo {
  numero_patrimonio: string
  denominacao: string
}

interface Desafetacao {
  id: string
  patrimonioId?: string | null
  imovelId?: string | null
  comissaoId?: string | null
  baseLegalTipo: BaseLegalTipo
  baseLegalNumero: string
  baseLegalData: string
  justificativa: string
  destinacaoAnterior: DestinacaoBem
  status: StatusDesafetacao
  dataConclusao?: string | null
  comissao?: Comissao | null
  patrimonio?: PatrimonioInfo | null
  imovel?: ImovelInfo | null
  observacoes?: string | null
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface DesafetacoesResponse {
  desafetacoes: Desafetacao[]
  pagination: PaginationMeta
}

// ---- Labels pt-BR ----

const BASE_LEGAL_LABEL: Record<BaseLegalTipo, string> = {
  lei: 'Lei',
  decreto: 'Decreto',
  ato_administrativo: 'Ato Administrativo',
}

const STATUS_LABEL: Record<StatusDesafetacao, string> = {
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const DESTINACAO_LABEL: Record<DestinacaoBem, string> = {
  uso_comum: 'Uso Comum',
  uso_especial: 'Uso Especial',
  dominical: 'Dominical',
  nao_classificado: 'Não Classificado',
}

function statusBadgeVariant(status: StatusDesafetacao): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'concluida') return 'default'
  if (status === 'cancelada') return 'destructive'
  return 'secondary'
}

function bemLabel(d: Desafetacao): string {
  if (d.patrimonio) return `${d.patrimonio.numero_patrimonio} — ${d.patrimonio.descricao_bem}`
  if (d.imovel) return `${d.imovel.numero_patrimonio} — ${d.imovel.denominacao}`
  return '(bem não identificado)'
}

// ---- Formulário de criação ----

interface CreateFormProps {
  comissoes: Comissao[]
  onSuccess: () => void
  onClose: () => void
}

function CreateDesafetacaoForm({ comissoes, onSuccess, onClose }: CreateFormProps) {
  const form = useForm<CreateDesafetacaoInput>({
    resolver: zodResolver(createDesafetacaoSchema),
    defaultValues: {
      patrimonioId: '',
      imovelId: '',
      comissaoId: '',
      baseLegalTipo: 'lei',
      baseLegalNumero: '',
      baseLegalData: '',
      justificativa: '',
      observacoes: '',
    },
  })

  const [submitting, setSubmitting] = useState(false)
  const [bemTipo, setBemTipo] = useState<'patrimonio' | 'imovel'>('patrimonio')

  const onSubmit = useCallback(async (values: CreateDesafetacaoInput) => {
    setSubmitting(true)
    try {
      // Enviar somente o campo relevante ao tipo de bem selecionado
      const payload: CreateDesafetacaoInput = {
        ...values,
        patrimonioId: bemTipo === 'patrimonio' && values.patrimonioId ? values.patrimonioId : null,
        imovelId: bemTipo === 'imovel' && values.imovelId ? values.imovelId : null,
        comissaoId: values.comissaoId || null,
        observacoes: values.observacoes || null,
      }
      await api.post('/desafetacoes', payload)
      toast({ title: 'Desafetação registrada com sucesso.' })
      onSuccess()
      onClose()
    } catch (err) {
      logger.error('[DesafetacaoList] Erro ao criar desafetação', err)
      toast({ variant: 'destructive', title: 'Erro ao registrar desafetação', description: (err as Error)?.message })
    } finally {
      setSubmitting(false)
    }
  }, [bemTipo, onSuccess, onClose])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Tipo de bem */}
        <div className="space-y-1">
          <FormLabel>Tipo de Bem</FormLabel>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bemTipo"
                value="patrimonio"
                checked={bemTipo === 'patrimonio'}
                onChange={() => setBemTipo('patrimonio')}
                className="accent-primary"
              />
              Patrimônio Móvel
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bemTipo"
                value="imovel"
                checked={bemTipo === 'imovel'}
                onChange={() => setBemTipo('imovel')}
                className="accent-primary"
              />
              Imóvel
            </label>
          </div>
        </div>

        {bemTipo === 'patrimonio' ? (
          <FormField
            control={form.control}
            name="patrimonioId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Patrimônio (UUID)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="UUID do patrimônio" />
                </FormControl>
                <FormDescription className="text-xs">
                  Informe o ID (UUID) do bem patrimonial a ser desafetado.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="imovelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Imóvel (UUID)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="UUID do imóvel" />
                </FormControl>
                <FormDescription className="text-xs">
                  Informe o ID (UUID) do imóvel a ser desafetado.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Comissão responsável */}
        <FormField
          control={form.control}
          name="comissaoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comissão Responsável (opcional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar comissão..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Sem comissão</SelectItem>
                  {comissoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Portaria {c.portariaNumero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="baseLegalTipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo do Ato Legal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(BASE_LEGAL_LABEL) as BaseLegalTipo[]).map((t) => (
                      <SelectItem key={t} value={t}>{BASE_LEGAL_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseLegalNumero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número do Ato</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: 123/2025" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseLegalData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do Ato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
              <FormLabel>Justificativa</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Descreva a justificativa legal e fática para a desafetação (mínimo 10 caracteres)..."
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
                <Input {...field} value={field.value ?? ''} placeholder="Observações adicionais" />
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
            {submitting ? 'Registrando...' : 'Registrar Desafetação'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Página principal ----

export default function DesafetacaoList() {
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'superuser'
  const canDelete = user?.role === 'admin' || user?.role === 'superuser'

  const [desafetacoes, setDesafetacoes] = useState<Desafetacao[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  // Ação em progresso: { id, tipo }
  const [actionInProgress, setActionInProgress] = useState<{ id: string; tipo: 'concluir' | 'cancelar' | 'delete' } | null>(null)

  const fetchingRef = useRef(false)

  const fetchDesafetacoes = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      params.set('limit', '50')

      const data = await api.get<DesafetacoesResponse>(`/desafetacoes?${params.toString()}`)
      setDesafetacoes(data.desafetacoes)
    } catch (err) {
      logger.error('[DesafetacaoList] Erro ao carregar desafetações', err)
      setError('Não foi possível carregar as desafetações. Tente novamente.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [filterStatus])

  const fetchComissoes = useCallback(async () => {
    try {
      const data = await api.get<{ comissoes: Comissao[] }>('/comissoes?status=ativa&limit=100')
      setComissoes(data.comissoes)
    } catch (err) {
      logger.warn('[DesafetacaoList] Não foi possível carregar comissões para o formulário')
    }
  }, [])

  useEffect(() => {
    void fetchDesafetacoes()
    void fetchComissoes()
  }, [fetchDesafetacoes, fetchComissoes])

  const handleConcluir = useCallback(async (id: string) => {
    setActionInProgress({ id, tipo: 'concluir' })
    try {
      await api.post(`/desafetacoes/${id}/concluir`, {})
      toast({ title: 'Desafetação concluída. O bem foi classificado como dominical (alienável).' })
      void fetchDesafetacoes()
    } catch (err) {
      logger.error('[DesafetacaoList] Erro ao concluir desafetação', err)
      toast({ variant: 'destructive', title: 'Erro ao concluir', description: (err as Error)?.message })
    } finally {
      setActionInProgress(null)
    }
  }, [fetchDesafetacoes])

  const handleCancelar = useCallback(async (id: string) => {
    setActionInProgress({ id, tipo: 'cancelar' })
    try {
      await api.post(`/desafetacoes/${id}/cancelar`, {})
      toast({ title: 'Desafetação cancelada.' })
      void fetchDesafetacoes()
    } catch (err) {
      logger.error('[DesafetacaoList] Erro ao cancelar desafetação', err)
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: (err as Error)?.message })
    } finally {
      setActionInProgress(null)
    }
  }, [fetchDesafetacoes])

  const handleDelete = useCallback(async (id: string) => {
    setActionInProgress({ id, tipo: 'delete' })
    try {
      await api.delete(`/desafetacoes/${id}`)
      toast({ title: 'Desafetação excluída.' })
      void fetchDesafetacoes()
    } catch (err) {
      logger.error('[DesafetacaoList] Erro ao excluir desafetação', err)
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: (err as Error)?.message })
    } finally {
      setActionInProgress(null)
    }
  }, [fetchDesafetacoes])

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Desafetação de Bens</h1>
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreate(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Desafetação
          </Button>
        )}
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          A desafetação retira a destinação de uso comum ou especial, convertendo o bem à categoria
          <strong> dominical</strong> (passível de alienação). Ação irreversível pelo Art. 22 da Lei de Gestão Patrimonial.
          Ao <em>concluir</em> uma desafetação, o bem será marcado como <strong>dominical</strong> no sistema.
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
            {(Object.keys(STATUS_LABEL) as StatusDesafetacao[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void fetchDesafetacoes()} aria-label="Atualizar lista">
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Processos de Desafetação</CardTitle>
          <CardDescription>
            Acompanhe os processos de desafetação patrimonial conforme a legislação vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando desafetações...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={() => void fetchDesafetacoes()}>Tentar novamente</Button>
            </div>
          ) : desafetacoes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum processo de desafetação encontrado.
              {canWrite && (
                <p className="mt-2 text-sm">
                  <Button variant="link" onClick={() => setShowCreate(true)}>
                    Registrar primeira desafetação
                  </Button>
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bem</TableHead>
                  <TableHead>Base Legal</TableHead>
                  <TableHead>Destinação Anterior</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {desafetacoes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{bemLabel(d)}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{BASE_LEGAL_LABEL[d.baseLegalTipo]} nº {d.baseLegalNumero}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(d.baseLegalData)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{DESTINACAO_LABEL[d.destinacaoAnterior]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(d.status)}>
                        {STATUS_LABEL[d.status]}
                      </Badge>
                      {d.status === 'concluida' && d.dataConclusao && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(d.dataConclusao)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.comissao
                        ? `Portaria ${d.comissao.portariaNumero}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Concluir — só em_andamento e canWrite */}
                        {d.status === 'em_andamento' && canWrite && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionInProgress?.id === d.id}
                                aria-label="Concluir desafetação"
                                className="text-green-700 hover:text-green-800"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Concluir desafetação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ao concluir, o bem <strong>{bemLabel(d)}</strong> será
                                  reclassificado como <strong>dominical</strong> (passível de alienação).
                                  Esta ação não pode ser revertida pelo sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleConcluir(d.id)}>
                                  Confirmar Conclusão
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Cancelar — só em_andamento e canWrite */}
                        {d.status === 'em_andamento' && canWrite && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionInProgress?.id === d.id}
                                aria-label="Cancelar desafetação"
                                className="text-amber-700 hover:text-amber-800"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar este processo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O processo de desafetação de <strong>{bemLabel(d)}</strong> será
                                  marcado como cancelado. O bem manterá sua destinação anterior.
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

                        {/* Excluir — canDelete */}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={actionInProgress?.id === d.id}
                                aria-label="Excluir desafetação"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O registro de desafetação do bem <strong>{bemLabel(d)}</strong> será
                                  removido permanentemente. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleDelete(d.id)}>
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
          )}
        </CardContent>
      </Card>

      {/* Dialog: criar */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Desafetação</DialogTitle>
            <DialogDescription>
              Registre um novo processo de desafetação patrimonial. Informe o bem (patrimônio OU imóvel), a base legal e a justificativa.
            </DialogDescription>
          </DialogHeader>
          <CreateDesafetacaoForm
            comissoes={comissoes}
            onSuccess={() => void fetchDesafetacoes()}
            onClose={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
