import { useState, useRef, KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
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

const FUNDOS_MAX = 30
const FUNDO_MAX_LEN = 50

const cnpjValidator = (cnpj: string | undefined) => {
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

  // Estado local dos fundos (gerenciado fora do react-hook-form pois é lista dinâmica)
  const [fundos, setFundos] = useState<string[]>(data?.fundos ?? [])
  const [fundoInput, setFundoInput] = useState('')
  const fundoInputRef = useRef<HTMLInputElement>(null)

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

  // Adiciona um fundo à lista (com trim, dedup e limite)
  const adicionarFundo = () => {
    const valor = fundoInput.trim().toUpperCase()
    if (!valor) return
    if (valor.length > FUNDO_MAX_LEN) {
      toast({
        variant: 'destructive',
        title: 'Fundo muito longo',
        description: `O nome do fundo deve ter no máximo ${FUNDO_MAX_LEN} caracteres.`,
      })
      return
    }
    if (fundos.includes(valor)) {
      toast({
        variant: 'destructive',
        title: 'Fundo duplicado',
        description: `"${valor}" já está na lista.`,
      })
      return
    }
    if (fundos.length >= FUNDOS_MAX) {
      toast({
        variant: 'destructive',
        title: 'Limite atingido',
        description: `Máximo de ${FUNDOS_MAX} fundos por setor.`,
      })
      return
    }
    setFundos((prev) => [...prev, valor])
    setFundoInput('')
    fundoInputRef.current?.focus()
  }

  const removerFundo = (fundo: string) => {
    setFundos((prev) => prev.filter((f) => f !== fundo))
  }

  const handleFundoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      adicionarFundo()
    }
    // Backspace no input vazio remove o último fundo
    if (e.key === 'Backspace' && fundoInput === '' && fundos.length > 0) {
      setFundos((prev) => prev.slice(0, -1))
    }
  }

  const handleSubmit = (values: FormValues) => {
    if (data && isCircularDependency(data.id, values.parentId, sectors)) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Um setor não pode ser filho de si mesmo.',
      })
      return
    }
    onSave({ ...values, fundos })
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
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder="Nenhum (Setor Raiz)"
                  isClearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo de Fundos de Recurso (tags/chips) */}
        <div className="space-y-2">
          <FormLabel htmlFor="fundo-input">Fundos de Recurso</FormLabel>

          {/* Área de chips + input inline */}
          <div
            className="flex flex-wrap gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            role="group"
            aria-label="Fundos de recurso do setor"
            onClick={() => fundoInputRef.current?.focus()}
          >
            {fundos.map((fundo) => (
              <Badge
                key={fundo}
                variant="secondary"
                className="flex items-center gap-1 pr-1 text-xs"
              >
                {fundo}
                <button
                  type="button"
                  aria-label={`Remover fundo ${fundo}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    removerFundo(fundo)
                  }}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              id="fundo-input"
              ref={fundoInputRef}
              type="text"
              value={fundoInput}
              onChange={(e) => setFundoInput(e.target.value.toUpperCase())}
              onKeyDown={handleFundoKeyDown}
              placeholder={fundos.length === 0 ? 'Digite e pressione Enter...' : ''}
              aria-label="Adicionar fundo de recurso"
              className="flex-1 min-w-24 bg-transparent outline-none placeholder:text-muted-foreground"
              maxLength={FUNDO_MAX_LEN}
              disabled={fundos.length >= FUNDOS_MAX}
            />
          </div>

          {/* Botão auxiliar de adição */}
          {fundoInput.trim().length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={adicionarFundo}
              className="h-7 px-2 text-xs"
            >
              Adicionar "{fundoInput.trim().toUpperCase()}"
            </Button>
          )}

          <FormDescription>
            Exemplos: FUNDEB, VAAT, VAAF, Salário-Educação, SUS, PNAE, PNATE.
            Pressione <kbd className="rounded border px-1 text-xs">Enter</kbd> para adicionar cada fundo.
            Máximo de {FUNDOS_MAX} itens.
          </FormDescription>

          {/* Contagem */}
          {fundos.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {fundos.length} de {FUNDOS_MAX} fundo{fundos.length !== 1 ? 's' : ''} adicionado{fundos.length !== 1 ? 's' : ''}.
            </p>
          )}
        </div>

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
