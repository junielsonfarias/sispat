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
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportFilters, PatrimonioStatus } from '@/types'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { useSectors } from '@/contexts/SectorContext'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface ReportFilterDialogProps {
  onApplyFilters: (filters: ReportFilters) => void
  onClose: () => void
}

export const ReportFilterDialog = ({
  onApplyFilters,
  onClose,
}: ReportFilterDialogProps) => {
  const { sectors } = useSectors()
  const form = useForm<ReportFilters>()

  const sectorOptions = sectors.map((s) => ({ value: s.name, label: s.name }))

  const onSubmit = (data: ReportFilters) => {
    onApplyFilters(data)
    onClose()
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Filtrar Relatório</DialogTitle>
        <DialogDescription>
          Selecione os filtros para gerar um relatório mais específico.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
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
            name="dateRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Aquisição</FormLabel>
                <DatePickerWithRange
                  date={field.value}
                  onDateChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Gerar Relatório</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
