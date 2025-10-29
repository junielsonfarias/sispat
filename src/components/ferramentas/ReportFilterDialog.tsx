import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportFilters } from '@/types'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { useSectors } from '@/contexts/SectorContext'
import { useTiposBens } from '@/contexts/TiposBensContext'
import { useAuth } from '@/hooks/useAuth'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Filter } from 'lucide-react'

interface ReportFilterDialogProps {
  onApplyFilters: (filters: ReportFilters) => void
  onClose: () => void
}

export const ReportFilterDialog = ({
  onApplyFilters,
  onClose,
}: ReportFilterDialogProps) => {
  const { sectors } = useSectors()
  const { tiposBens } = useTiposBens()
  const { user } = useAuth()
  const form = useForm<ReportFilters>({
    defaultValues: {
      status: undefined,
      situacao_bem: undefined,
      setor: undefined,
      tipo: undefined,
      dateRange: undefined,
    }
  })

  // ✅ Filtrar setores baseado em role e responsibleSectors
  const allowedSectors = useMemo(() => {
    if (!user) return []
    // Admin e Supervisor veem TODOS os setores
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.name, label: s.name }))
    }
    // Usuário normal vê apenas seus setores responsáveis
    const userSectors = user.responsibleSectors || []
    return sectors
      .filter((s) => userSectors.includes(s.name))
      .map((s) => ({ value: s.name, label: s.name }))
  }, [sectors, user])

  const sectorOptions = allowedSectors
  const tipoOptions = tiposBens.map((t) => ({ value: t.nome, label: t.nome }))

  const onSubmit = (data: ReportFilters) => {
    // Remove campos vazios/undefined
    const cleanedFilters = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== '' && value !== 'todos')
    ) as ReportFilters
    
    onApplyFilters(cleanedFilters)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtrar Relatório
        </DialogTitle>
        <DialogDescription>
          Selecione os filtros desejados para gerar um relatório personalizado. 
          Deixe em branco para incluir todos os itens.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-4">
          {/* Filtro de Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status do Bem</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="baixado">Baixado</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Filtre por status operacional do bem
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Filtro de Situação do Bem */}
          <FormField
            control={form.control}
            name="situacao_bem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situação do Bem</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as situações" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="ruim">Ruim</SelectItem>
                    <SelectItem value="pessimo">Péssimo</SelectItem>
                    <SelectItem value="baixado">Baixado</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Filtre pela condição física do bem
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Filtro de Setor */}
          <FormField
            control={form.control}
            name="setor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor Responsável</FormLabel>
                <SearchableSelect
                  options={[
                    { value: 'todos', label: 'Todos os setores' },
                    ...sectorOptions
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione um setor"
                />
                <FormDescription className="text-xs">
                  Filtre por setor responsável
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Filtro de Tipo de Bem */}
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Bem</FormLabel>
                <SearchableSelect
                  options={[
                    { value: 'todos', label: 'Todos os tipos' },
                    ...tipoOptions
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione um tipo"
                />
                <FormDescription className="text-xs">
                  Filtre por categoria/tipo do bem
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Filtro de Período */}
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período de Aquisição</FormLabel>
                <DatePickerWithRange
                  date={field.value}
                  onDateChange={field.onChange}
                />
                <FormDescription className="text-xs">
                  Filtre por data de aquisição do bem
                </FormDescription>
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Filter className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
