import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useInventory } from '@/contexts/InventoryContext'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'

const createSchema = z
  .object({
    name: z.string().min(1, 'O nome do inventário é obrigatório.'),
    sectorName: z.string().min(1, 'O setor é obrigatório.'),
    scope: z.enum(['sector', 'location', 'specific_location'], {
      required_error: 'O escopo do inventário é obrigatório.',
    }),
    locationType: z.string().optional(),
    specificLocationId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.scope === 'location') {
        return !!data.locationType && data.locationType.length > 0
      }
      if (data.scope === 'specific_location') {
        return !!data.specificLocationId && data.specificLocationId.length > 0
      }
      return true
    },
    {
      message:
        'O local é obrigatório quando o escopo é "Local Específico".',
      path: ['specificLocationId'],
    },
  )

type CreateFormValues = z.infer<typeof createSchema>

const locationTypeOptions: SearchableSelectOption[] = [
  { value: 'Escola', label: 'Escola' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Posto de Saúde', label: 'Posto de Saúde' },
  { value: 'Secretaria', label: 'Secretaria' },
  { value: 'Almoxarifado', label: 'Almoxarifado' },
]

export default function InventarioCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createInventory } = useInventory()
  const { sectors } = useSectors()
  const { locais, getLocaisBySectorId } = useLocais()
  const [isLoading, setIsLoading] = useState(false)

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

  const sectorOptions: SearchableSelectOption[] = allowedSectors

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      scope: 'sector',
    },
  })

  const scope = form.watch('scope')
  const selectedSectorName = form.watch('sectorName')
  
  // Encontrar o setor selecionado para obter seus locais
  const selectedSector = sectors.find(s => s.name === selectedSectorName)
  const availableLocais = selectedSector ? getLocaisBySectorId(selectedSector.id) : []
  
  const locationOptions: SearchableSelectOption[] = availableLocais.map((local) => ({
    value: local.id,
    label: local.name,
  }))

  const onSubmit = async (data: CreateFormValues) => {
    setIsLoading(true)
    try {
      const newInventory = await createInventory(data)
      navigate(`/inventarios/${newInventory.id}`)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao criar inventário.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Criar Novo Inventário</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Inventário</CardTitle>
          <CardDescription>
            Forneça um nome e selecione o setor para iniciar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Inventário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Inventário Anual 2024"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sectorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={sectorOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione um setor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Escopo do Inventário</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sector" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Todo o Setor
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="location" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Local por Tipo
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="specific_location" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Local Específico
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scope === 'location' && (
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem className="animate-fade-in">
                      <FormLabel>Tipo de Local</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={locationTypeOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione um tipo de local"
                        />
                      </FormControl>
                      <FormDescription>
                        O inventário incluirá bens do setor selecionado cujo
                        campo "Localização" contenha este termo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {scope === 'specific_location' && (
                <FormField
                  control={form.control}
                  name="specificLocationId"
                  render={({ field }) => (
                    <FormItem className="animate-fade-in">
                      <FormLabel>Local Específico</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={locationOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione um local específico"
                          disabled={!selectedSectorName || availableLocais.length === 0}
                        />
                      </FormControl>
                      <FormDescription>
                        O inventário incluirá apenas bens do local selecionado.
                        {!selectedSectorName && " Selecione primeiro um setor."}
                        {selectedSectorName && availableLocais.length === 0 && " Nenhum local cadastrado para este setor."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Inventário
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
