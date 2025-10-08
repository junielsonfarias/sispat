import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PatrimonioStatus, PatrimonioSituacao } from '@/types'

export interface PublicFilterValues {
  tipo?: string
  status?: PatrimonioStatus
  situacao?: PatrimonioSituacao
  setor?: string
  dataAquisicaoInicio?: string
  dataAquisicaoFim?: string
}

interface PublicAssetsFilterSheetProps {
  onApplyFilters: (filters: PublicFilterValues) => void
  onClearFilters: () => void
  initialFilters: PublicFilterValues
  onClose: () => void
}

export const PublicAssetsFilterSheet = ({
  onApplyFilters,
  onClearFilters,
  initialFilters,
  onClose,
}: PublicAssetsFilterSheetProps) => {
  const form = useForm<PublicFilterValues>({
    defaultValues: initialFilters,
  })

  const onSubmit = (data: PublicFilterValues) => {
    onApplyFilters(data)
    onClose()
  }

  const handleClear = () => {
    form.reset({
      tipo: '',
      status: undefined,
      situacao: undefined,
      setor: '',
      dataAquisicaoInicio: '',
      dataAquisicaoFim: '',
    })
    onClearFilters()
  }

  return (
    <SheetContent className="w-[400px] sm:w-[540px]">
      <SheetHeader>
        <SheetTitle>Filtros Avançados</SheetTitle>
        <SheetDescription>
          Refine sua busca de bens públicos. Esta funcionalidade aplica-se
          apenas a bens móveis.
        </SheetDescription>
      </SheetHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="py-4 space-y-4 h-full flex flex-col"
        >
          <div className="grid grid-cols-2 gap-4 flex-grow">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Eletrônico" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="setor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Educação" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="baixado">Baixado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="situacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação do Bem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OTIMO">Ótimo</SelectItem>
                      <SelectItem value="BOM">Bom</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="RUIM">Ruim</SelectItem>
                      <SelectItem value="PESSIMO">Péssimo</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataAquisicaoInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aquisição (Início)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataAquisicaoFim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aquisição (Fim)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <SheetFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={handleClear}>
              Limpar Filtros
            </Button>
            <Button type="submit">Aplicar Filtros</Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  )
}
