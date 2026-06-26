import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { Building2, Pencil, Plus, Trash2, Users, Layers, Package, Home } from 'lucide-react'
import { api } from '@/services/api-adapter'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface MunicipalityCount {
  users: number
  patrimonios: number
  sectors: number
  imoveis: number
}

interface MunicipalityItem {
  id: string
  name: string
  state: string
  logoUrl?: string
  footerText?: string
  primaryColor?: string
  createdAt: string
  updatedAt: string
  _count: MunicipalityCount
}

interface MunicipalityPayload {
  name: string
  state: string
  logoUrl?: string
  footerText?: string
  primaryColor?: string
}

// ─── Schema de validação ─────────────────────────────────────────────────────

const municipalitySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  state: z
    .string()
    .length(2, 'UF deve ter exatamente 2 letras')
    .regex(/^[A-Za-z]{2}$/, 'UF deve conter apenas letras')
    .transform((v) => v.toUpperCase()),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB')
    .optional()
    .or(z.literal('')),
  footerText: z.string().optional(),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
})

type MunicipalityFormValues = z.infer<typeof municipalitySchema>

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchMunicipalities(): Promise<MunicipalityItem[]> {
  return api.get<MunicipalityItem[]>('/municipalities')
}

async function createMunicipality(data: MunicipalityPayload): Promise<MunicipalityItem> {
  return api.post<MunicipalityItem>('/municipalities', data)
}

async function updateMunicipality(id: string, data: Partial<MunicipalityPayload>): Promise<MunicipalityItem> {
  return api.put<MunicipalityItem>(`/municipalities/${id}`, data)
}

async function deleteMunicipality(id: string): Promise<void> {
  return api.delete<void>(`/municipalities/${id}`)
}

// ─── Componente de linha skeleton ─────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

// ─── Dialog de criação/edição ─────────────────────────────────────────────────

interface MunicipalityDialogProps {
  open: boolean
  editing: MunicipalityItem | null
  onClose: () => void
  onSuccess: () => void
}

function MunicipalityDialog({ open, editing, onClose, onSuccess }: MunicipalityDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MunicipalityFormValues>({
    resolver: zodResolver(municipalitySchema),
    defaultValues: {
      name: editing?.name ?? '',
      state: editing?.state ?? '',
      primaryColor: editing?.primaryColor ?? '',
      footerText: editing?.footerText ?? '',
      logoUrl: editing?.logoUrl ?? '',
    },
  })

  // Resetar valores quando editing muda
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset()
      onClose()
    }
  }

  const onSubmit = async (values: MunicipalityFormValues) => {
    const payload: MunicipalityPayload = {
      name: values.name,
      state: values.state,
      ...(values.primaryColor ? { primaryColor: values.primaryColor } : {}),
      ...(values.footerText ? { footerText: values.footerText } : {}),
      ...(values.logoUrl ? { logoUrl: values.logoUrl } : {}),
    }

    try {
      if (editing) {
        await updateMunicipality(editing.id, payload)
        toast({ description: 'Município atualizado com sucesso.' })
      } else {
        await createMunicipality(payload)
        toast({ description: 'Município criado com sucesso.' })
      }
      reset()
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar município.'
      toast({ variant: 'destructive', title: 'Erro', description: message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Município' : 'Novo Município'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Atualize as informações do município.'
              : 'Preencha os dados para criar um novo município.'}
          </DialogDescription>
        </DialogHeader>

        <form id="municipality-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex.: Município de Exemplo"
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">
              UF <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="state"
              {...register('state')}
              placeholder="Ex.: SP"
              maxLength={2}
              className="uppercase"
              aria-describedby={errors.state ? 'state-error' : undefined}
            />
            {errors.state && (
              <p id="state-error" className="text-sm text-destructive" role="alert">
                {errors.state.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Cor Primária</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="primaryColor"
                {...register('primaryColor')}
                placeholder="#1a73e8"
                aria-describedby={errors.primaryColor ? 'color-error' : undefined}
              />
            </div>
            {errors.primaryColor && (
              <p id="color-error" className="text-sm text-destructive" role="alert">
                {errors.primaryColor.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Input
              id="footerText"
              {...register('footerText')}
              placeholder="Ex.: Prefeitura Municipal de Exemplo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL do Logo</Label>
            <Input
              id="logoUrl"
              {...register('logoUrl')}
              placeholder="https://exemplo.gov.br/logo.png"
              aria-describedby={errors.logoUrl ? 'logo-error' : undefined}
            />
            {errors.logoUrl && (
              <p id="logo-error" className="text-sm text-destructive" role="alert">
                {errors.logoUrl.message}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button form="municipality-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Município'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MunicipalityManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MunicipalityItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MunicipalityItem | null>(null)

  const {
    data: municipalities = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['municipalities'],
    queryFn: fetchMunicipalities,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMunicipality(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalities'] })
      toast({ description: 'Município excluído com sucesso.' })
      setDeleteTarget(null)
    },
    onError: (err: unknown) => {
      // Backend retorna 400 com { error } quando há dados vinculados
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }
      const message =
        axiosErr?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Erro ao excluir município.')
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: message,
      })
      setDeleteTarget(null)
    },
  })

  const handleEdit = (municipality: MunicipalityItem) => {
    setEditing(municipality)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['municipalities'] })
    setDialogOpen(false)
    setEditing(null)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Municípios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todos os municípios cadastrados na plataforma SISPAT.
          </p>
        </div>
        <Button onClick={handleNew} aria-label="Criar novo município">
          <Plus className="mr-2 h-4 w-4" />
          Novo Município
        </Button>
      </div>

      {/* Cartão de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Municípios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : municipalities.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                municipalities.reduce((acc, m) => acc + m._count.users, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                municipalities.reduce((acc, m) => acc + m._count.patrimonios, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                municipalities.reduce((acc, m) => acc + m._count.imoveis, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Municípios Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os municípios com suas respectivas contagens de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Erro ao carregar municípios. Verifique sua conexão e tente novamente.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Usuários
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Layers className="h-3.5 w-3.5" /> Setores
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Bens
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Home className="h-3.5 w-3.5" /> Imóveis
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : municipalities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum município cadastrado. Clique em &ldquo;Novo Município&rdquo; para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  municipalities.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.state}</TableCell>
                      <TableCell className="text-center">{m._count.users}</TableCell>
                      <TableCell className="text-center">{m._count.sectors}</TableCell>
                      <TableCell className="text-center">{m._count.patrimonios}</TableCell>
                      <TableCell className="text-center">{m._count.imoveis}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(m)}
                            aria-label={`Editar município ${m.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(m)}
                            aria-label={`Excluir município ${m.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <MunicipalityDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        editing={editing}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
      />

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir município</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>{deleteTarget?.name}</strong>? Esta ação é irreversível.
              Se houver dados vinculados (usuários, bens, imóveis), a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
