import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { useSectors } from '@/contexts/SectorContext'
import { Sector } from '@/types'
import { isCircularDependency } from '@/lib/sector-utils'
import { toast } from '@/hooks/use-toast'
import { MaskedInput } from '@/components/ui/masked-input'

const cnpjValidator = (cnpj: string) => {
  if (!cnpj) return true
  cnpj = cnpj.replace(/[^\d]+/g, '')
  if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false
  const digits = cnpj.split('').map(Number)
  const validator = (slice: number[]) => {
    let factor = slice.length === 12 ? 5 : 6
    const sum = slice.reduce((sum, digit) => {
      sum += digit * factor
      factor = factor === 2 ? 9 : factor - 1
      return sum
    }, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return (
    validator(digits.slice(0, 12)) === digits[12] &&
    validator(digits.slice(0, 13)) === digits[13]
  )
}

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  sigla: z.string().min(1, 'A sigla é obrigatória.'),
  codigo: z
    .string()
    .length(2, 'O código deve ter exatamente 2 dígitos.')
    .regex(/^\d{2}$/, 'O código deve conter apenas números.'),
  endereco: z.string().optional(),
  cnpj: z.string().optional().refine(cnpjValidator, 'CNPJ inválido.'),
  responsavel: z.string().optional(),
  parentId: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface SectorFormProps {
  data?: Sector
  onSave: (values: Omit<Sector, 'id' | 'municipalityId'>) => void
  onClose: () => void
}

export const SectorForm = ({ data, onSave, onClose }: SectorFormProps) => {
  const { sectors } = useSectors()

  const sectorOptions: SearchableSelectOption[] = sectors
    .filter((s) => s.id !== data?.id)
    .map((s) => ({
      value: s.id,
      label: s.name,
    }))

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: data?.name || '',
      sigla: data?.sigla || '',
      codigo: data?.codigo || '',
      endereco: data?.endereco || '',
      cnpj: data?.cnpj || '',
      responsavel: data?.responsavel || '',
      parentId: data?.parentId || null,
    },
  })

  const handleSubmit = (values: FormValues) => {
    if (data && isCircularDependency(data.id, values.parentId, sectors)) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Um setor não pode ser filho de si mesmo.',
      })
      return
    }
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Nome do Setor</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sigla"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sigla</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Setor</FormLabel>
                <FormControl>
                  <Input maxLength={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <MaskedInput mask="cnpj" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responsavel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Responsável</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor Pai</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={sectorOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Nenhum (Setor Raiz)"
                  isClearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
