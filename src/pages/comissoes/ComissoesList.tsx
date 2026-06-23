import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
  UsersRound,
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  createComissaoSchema,
  updateComissaoSchema,
  addComissaoMembroSchema,
  type CreateComissaoInput,
  type UpdateComissaoInput,
  type AddComissaoMembroInput,
  type TipoComissao,
  type StatusComissao,
  type PapelMembro,
} from '@sispat/shared'
import { useEffect, useRef } from 'react'

// ---- Tipos locais ----

interface ComissaoMembro {
  id: string
  nome: string
  matricula?: string | null
  cargo?: string | null
  papel: PapelMembro
  userId?: string | null
}

interface Comissao {
  id: string
  tipo: TipoComissao
  nome?: string | null
  portariaNumero: string
  portariaData: string
  mandatoInicio: string
  mandatoFim: string
  status: StatusComissao
  observacoes?: string | null
  membros: ComissaoMembro[]
  _count?: { membros: number; desafetacoes: number }
}

interface AlertasResponse {
  mandatoVencido: AlertaItem[]
  mandatoVencendo: AlertaItem[]
  membrosInsuficientes: AlertaItem[]
  total: number
}

interface AlertaItem {
  id: string
  tipo: TipoComissao
  portariaNumero: string
  mandatoFim?: string
  diasParaFim?: number
  membros?: number
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ComissoesResponse {
  comissoes: Comissao[]
  pagination: PaginationMeta
}

// ---- Labels pt-BR ----

const TIPO_LABEL: Record<TipoComissao, string> = {
  inventario: 'Comissão de Inventário Patrimonial',
  avaliacao: 'Comissão de Avaliação',
  regularizacao: 'Comissão de Regularização',
  desfazimento_desafetacao: 'Comissão de Desfazimento / Desafetação',
}

const STATUS_LABEL: Record<StatusComissao, string> = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  suspensa: 'Suspensa',
}

const PAPEL_LABEL: Record<PapelMembro, string> = {
  presidente: 'Presidente',
  secretario: 'Secretário(a)',
  membro: 'Membro',
}

function statusBadgeVariant(status: StatusComissao): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ativa') return 'default'
  if (status === 'suspensa') return 'secondary'
  return 'outline'
}

function mandatoBadge(mandatoFim: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const fim = new Date(mandatoFim)
  const hoje = new Date()
  const diffMs = fim.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return { label: 'Vencido', variant: 'destructive' }
  if (diffDias <= 30) return { label: `Vence em ${diffDias}d`, variant: 'secondary' }
  return { label: formatDate(mandatoFim), variant: 'outline' }
}

// ---- Componente de Alertas ----

function PainelAlertas({ alertas, onRefresh }: { alertas: AlertasResponse | null; onRefresh: () => void }) {
  if (!alertas || alertas.total === 0) return null

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Alertas de Conformidade ({alertas.total})
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={onRefresh} aria-label="Atualizar alertas">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-1 text-xs text-amber-800 dark:text-amber-300">
        {alertas.mandatoVencido.map((a) => (
          <div key={a.id} className="flex items-center gap-1">
            <span className="font-medium">[Mandato Vencido]</span>
            <span>{TIPO_LABEL[a.tipo]} — Portaria {a.portariaNumero}</span>
          </div>
        ))}
        {alertas.mandatoVencendo.map((a) => (
          <div key={a.id} className="flex items-center gap-1">
            <span className="font-medium">[Vence em {a.diasParaFim}d]</span>
            <span>{TIPO_LABEL[a.tipo]} — Portaria {a.portariaNumero}</span>
          </div>
        ))}
        {alertas.membrosInsuficientes.map((a) => (
          <div key={a.id} className="flex items-center gap-1">
            <span className="font-medium">[Membros insuficientes: {a.membros ?? 0}/3]</span>
            <span>{TIPO_LABEL[a.tipo]} — Portaria {a.portariaNumero}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---- Formulário de criação de comissão ----

interface ComissaoCreateFormProps {
  onSuccess: () => void
  onClose: () => void
}

function ComissaoCreateForm({ onSuccess, onClose }: ComissaoCreateFormProps) {
  const form = useForm<CreateComissaoInput>({
    resolver: zodResolver(createComissaoSchema),
    defaultValues: {
      tipo: 'inventario',
      nome: '',
      portariaNumero: '',
      portariaData: '',
      mandatoInicio: '',
      mandatoFim: '',
      observacoes: '',
      membros: [],
    },
  })

  const { fields: membroFields, append, remove } = useFieldArray({
    control: form.control,
    name: 'membros',
  })

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = useCallback(async (values: CreateComissaoInput) => {
    setSubmitting(true)
    try {
      await api.post('/comissoes', values)
      toast({ title: 'Comissão criada com sucesso.' })
      onSuccess()
      onClose()
    } catch (err) {
      logger.error('[ComissoesList] Erro ao criar comissão', err)
      toast({ variant: 'destructive', title: 'Erro ao criar comissão', description: (err as Error)?.message })
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
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Comissão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as TipoComissao[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome personalizado (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Nome da comissão" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portariaNumero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Portaria</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: 001/2025" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portariaData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da Portaria</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mandatoInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início do Mandato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mandatoFim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fim do Mandato</FormLabel>
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
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="Observações opcionais" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Membros ({membroFields.length}/3 mínimo por lei)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nome: '', papel: 'membro', matricula: '', cargo: '', userId: undefined })}
            >
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar membro
            </Button>
          </div>
          {membroFields.map((mf, idx) => (
            <div key={mf.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name={`membros.${idx}.nome`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nome</FormLabel>
                      <FormControl><Input {...field} placeholder="Nome completo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`membros.${idx}.cargo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cargo</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ''} placeholder="Cargo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`membros.${idx}.papel`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Papel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(PAPEL_LABEL) as PapelMembro[]).map((p) => (
                            <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} aria-label="Remover membro">
                  <UserMinus className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {membroFields.length < 3 && (
            <p className="text-xs text-amber-600">Recomenda-se pelo menos 3 membros (Art. 19).</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Criar Comissão'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Formulário de edição de comissão ----

interface ComissaoEditFormProps {
  initial: Comissao
  onSuccess: () => void
  onClose: () => void
}

function ComissaoEditForm({ initial, onSuccess, onClose }: ComissaoEditFormProps) {
  const form = useForm<UpdateComissaoInput>({
    resolver: zodResolver(updateComissaoSchema),
    defaultValues: {
      tipo: initial.tipo,
      nome: initial.nome ?? '',
      portariaNumero: initial.portariaNumero,
      portariaData: initial.portariaData?.slice(0, 10) ?? '',
      mandatoInicio: initial.mandatoInicio?.slice(0, 10) ?? '',
      mandatoFim: initial.mandatoFim?.slice(0, 10) ?? '',
      status: initial.status,
      observacoes: initial.observacoes ?? '',
    },
  })

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = useCallback(async (values: UpdateComissaoInput) => {
    setSubmitting(true)
    try {
      await api.put(`/comissoes/${initial.id}`, values)
      toast({ title: 'Comissão atualizada com sucesso.' })
      onSuccess()
      onClose()
    } catch (err) {
      logger.error('[ComissoesList] Erro ao atualizar comissão', err)
      toast({ variant: 'destructive', title: 'Erro ao salvar comissão', description: (err as Error)?.message })
    } finally {
      setSubmitting(false)
    }
  }, [initial.id, onSuccess, onClose])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Comissão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as TipoComissao[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome personalizado (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Nome da comissão" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portariaNumero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Portaria</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Ex.: 001/2025" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portariaData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da Portaria</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mandatoInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início do Mandato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mandatoFim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fim do Mandato</FormLabel>
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Status atual" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as StatusComissao[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input {...field} value={field.value ?? ''} placeholder="Observações opcionais" />
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
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---- Dialog de membros de uma comissão (gerenciar após criação) ----

interface MembrosDialogProps {
  comissao: Comissao
  onUpdated: () => void
  onClose: () => void
}

function MembrosDialog({ comissao, onUpdated, onClose }: MembrosDialogProps) {
  const form = useForm<AddComissaoMembroInput>({
    resolver: zodResolver(addComissaoMembroSchema),
    defaultValues: { nome: '', papel: 'membro', matricula: '', cargo: '', userId: undefined },
  })

  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleAddMembro = useCallback(async (values: AddComissaoMembroInput) => {
    setAdding(true)
    try {
      await api.post(`/comissoes/${comissao.id}/membros`, values)
      toast({ title: 'Membro adicionado.' })
      form.reset()
      onUpdated()
    } catch (err) {
      logger.error('[ComissoesList] Erro ao adicionar membro', err)
      toast({ variant: 'destructive', title: 'Erro ao adicionar membro', description: (err as Error)?.message })
    } finally {
      setAdding(false)
    }
  }, [comissao.id, form, onUpdated])

  const handleRemoveMembro = useCallback(async (membroId: string) => {
    setRemovingId(membroId)
    try {
      await api.delete(`/comissoes/${comissao.id}/membros/${membroId}`)
      toast({ title: 'Membro removido.' })
      onUpdated()
    } catch (err) {
      logger.error('[ComissoesList] Erro ao remover membro', err)
      toast({ variant: 'destructive', title: 'Erro ao remover membro', description: (err as Error)?.message })
    } finally {
      setRemovingId(null)
    }
  }, [comissao.id, onUpdated])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Membros atuais ({comissao.membros.length})</h3>
        {comissao.membros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comissao.membros.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell>{m.cargo ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PAPEL_LABEL[m.papel]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={removingId === m.id} aria-label="Remover membro">
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover <strong>{m.nome}</strong> da comissão?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveMembro(m.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Adicionar membro</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddMembro)} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Nome</FormLabel>
                    <FormControl><Input {...field} placeholder="Nome completo" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-3">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Cargo</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="Cargo" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-3">
              <FormField
                control={form.control}
                name="papel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Papel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PAPEL_LABEL) as PapelMembro[]).map((p) => (
                          <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" size="sm" disabled={adding} className="w-full">
                {adding ? '...' : <><UserPlus className="h-4 w-4 mr-1" />Adicionar</>}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}

// ---- Página principal ----

export default function ComissoesList() {
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || user?.role === 'superuser'

  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [alertas, setAlertas] = useState<AlertasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filterTipo, setFilterTipo] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterSearch, setFilterSearch] = useState('')

  // Dialogs
  const [dialogMode, setDialogMode] = useState<'none' | 'create' | 'edit' | 'membros'>('none')
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null)

  // Evitar double-fetch em StrictMode
  const fetchingRef = useRef(false)

  const fetchComissoes = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterTipo) params.set('tipo', filterTipo)
      if (filterStatus) params.set('status', filterStatus)
      if (filterSearch) params.set('search', filterSearch)
      params.set('limit', '50')

      const data = await api.get<ComissoesResponse>(`/comissoes?${params.toString()}`)
      setComissoes(data.comissoes)
    } catch (err) {
      logger.error('[ComissoesList] Erro ao carregar comissões', err)
      setError('Não foi possível carregar as comissões. Tente novamente.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [filterTipo, filterStatus, filterSearch])

  const fetchAlertas = useCallback(async () => {
    try {
      const data = await api.get<AlertasResponse>('/comissoes/alertas')
      setAlertas(data)
    } catch (err) {
      logger.warn('[ComissoesList] Erro ao carregar alertas')
    }
  }, [])

  useEffect(() => {
    void fetchComissoes()
    void fetchAlertas()
  }, [fetchComissoes, fetchAlertas])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/comissoes/${id}`)
      toast({ title: 'Comissão excluída.' })
      void fetchComissoes()
    } catch (err) {
      logger.error('[ComissoesList] Erro ao excluir comissão', err)
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: (err as Error)?.message })
    }
  }, [fetchComissoes])

  const openCreate = () => {
    setSelectedComissao(null)
    setDialogMode('create')
  }

  const openEdit = (c: Comissao) => {
    setSelectedComissao(c)
    setDialogMode('edit')
  }

  const openMembros = (c: Comissao) => {
    setSelectedComissao(c)
    setDialogMode('membros')
  }

  const closeDialog = () => {
    setDialogMode('none')
    setSelectedComissao(null)
  }

  const handleFormSuccess = () => {
    void fetchComissoes()
    void fetchAlertas()
  }

  // Atualizar comissão selecionada após mudança de membros
  const handleMembrosUpdated = useCallback(async () => {
    if (!selectedComissao) return
    try {
      const updated = await api.get<Comissao>(`/comissoes/${selectedComissao.id}`)
      setSelectedComissao(updated)
      setComissoes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      logger.error('[ComissoesList] Erro ao recarregar comissão', err)
      void fetchComissoes()
    }
  }, [selectedComissao, fetchComissoes])

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UsersRound className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Comissões Patrimoniais</h1>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Comissão
          </Button>
        )}
      </div>

      {/* Painel de alertas */}
      <PainelAlertas alertas={alertas} onRefresh={fetchAlertas} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por portaria ou nome..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Buscar comissões"
        />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-52" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            {(Object.keys(TIPO_LABEL) as TipoComissao[]).map((t) => (
              <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusComissao[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void fetchComissoes()} aria-label="Atualizar lista">
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Comissões Cadastradas</CardTitle>
          <CardDescription>
            Gerencie as comissões de gestão patrimonial conforme a legislação vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando comissões...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={() => void fetchComissoes()}>Tentar novamente</Button>
            </div>
          ) : comissoes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma comissão encontrada.
              {canWrite && (
                <p className="mt-2 text-sm">
                  <Button variant="link" onClick={openCreate}>Criar a primeira comissão</Button>
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Portaria</TableHead>
                  <TableHead>Mandato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((c) => {
                  const mb = mandatoBadge(c.mandatoFim)
                  const memCount = c._count?.membros ?? c.membros.length
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{TIPO_LABEL[c.tipo]}</div>
                        {c.nome && <div className="text-xs text-muted-foreground">{c.nome}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{c.portariaNumero}</TableCell>
                      <TableCell>
                        <Badge variant={mb.variant}>{mb.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(c.status)}>
                          {STATUS_LABEL[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={memCount < 3 ? 'destructive' : 'outline'}>
                          {memCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMembros(c)}
                            aria-label="Gerenciar membros"
                          >
                            <UsersRound className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(c)}
                                aria-label="Editar comissão"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    aria-label="Excluir comissão"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir comissão?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. A comissão{' '}
                                      <strong>{c.portariaNumero}</strong> será removida permanentemente.
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
          )}
        </CardContent>
      </Card>

      {/* Dialog: criar */}
      <Dialog open={dialogMode === 'create'} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Comissão</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova comissão patrimonial.
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'create' && (
            <ComissaoCreateForm
              onSuccess={handleFormSuccess}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: editar */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Comissão</DialogTitle>
            <DialogDescription>
              Altere os dados da comissão selecionada.
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'edit' && selectedComissao && (
            <ComissaoEditForm
              initial={selectedComissao}
              onSuccess={handleFormSuccess}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: membros */}
      <Dialog open={dialogMode === 'membros'} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membros da Comissão</DialogTitle>
            <DialogDescription>
              {selectedComissao
                ? `${TIPO_LABEL[selectedComissao.tipo]} — Portaria ${selectedComissao.portariaNumero}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'membros' && selectedComissao && (
            <MembrosDialog
              comissao={selectedComissao}
              onUpdated={handleMembrosUpdated}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
