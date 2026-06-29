import { useState, useMemo, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useInventory } from '@/contexts/InventoryContext'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { useSectorFilter } from '@/hooks/useSectorFilter'
import { toast } from '@/hooks/use-toast'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

const TIPO_INVENTARIO_LABEL: Record<string, string> = {
  anual: 'Anual (data-base 31/12)',
  transferencia: 'Transferência de responsável',
  extraordinario: 'Extraordinário',
  inicial: 'Inicial (implantação)',
}

const createSchema = z
  .object({
    name: z.string().min(1, 'O nome do inventário é obrigatório.'),
    sectorName: z.string().min(1, 'O setor é obrigatório.'),
    scope: z.enum(['sector', 'location', 'specific_location'], {
      required_error: 'O escopo do inventário é obrigatório.',
    }),
    locationType: z.string().optional(),
    specificLocationId: z.string().optional(),
    // Campos opcionais de tipo de inventário
    tipo: z.enum(['anual', 'transferencia', 'extraordinario', 'inicial']).optional(),
    exercicio: z.coerce.number().int().min(2000).max(2100).optional(),
    dataBase: z.string().optional(),
    agenteAnterior: z.string().max(150).optional(),
    agenteNovo: z.string().max(150).optional(),
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
      message: 'Para inventários por localização, é necessário especificar o tipo ou local específico.',
      path: ['specificLocationId'],
    },
  )
  .refine((d) => d.tipo !== 'anual' || !!d.exercicio, {
    message: 'Inventário anual requer o exercício (ano).',
    path: ['exercicio'],
  })

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
  const { canViewAllData, userSectors } = useSectorFilter()
  const { createInventory } = useInventory()
  const { sectors } = useSectors()
  const { getLocaisBySectorId } = useLocais()
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Filtrar setores por papel (superuser/admin/supervisor veem todos;
  // usuario/visualizador só os vinculados). Reusa o mesmo critério do backend
  // via useSectorFilter (canViewAllData inclui superuser).
  const allowedSectors = useMemo(() => {
    const visible = canViewAllData
      ? sectors
      : sectors.filter((s) => userSectors.includes(s.name))
    return visible.map((s) => ({ value: s.name, label: s.name }))
  }, [sectors, canViewAllData, userSectors])

  const sectorOptions: SearchableSelectOption[] = allowedSectors

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      scope: 'sector',
      tipo: undefined,
      exercicio: undefined,
      dataBase: '',
      agenteAnterior: '',
      agenteNovo: '',
    },
  })

  const scope = form.watch('scope')
  const selectedSectorName = form.watch('sectorName')
  const tipoInventario = form.watch('tipo')
  const exercicioValue = form.watch('exercicio')
  
  // Encontrar o setor selecionado para obter seus locais
  const selectedSector = sectors.find(s => s.name === selectedSectorName)
  const availableLocais = selectedSector ? getLocaisBySectorId(selectedSector.id) : []
  
  const locationOptions: SearchableSelectOption[] = availableLocais.map((local) => ({
    value: local.id,
    label: local.name,
  }))

  // Para inventário anual: auto-preenche data-base como 31/12 do exercício informado
  useEffect(() => {
    if (tipoInventario === 'anual' && exercicioValue && exercicioValue >= 2000) {
      form.setValue('dataBase', `${exercicioValue}-12-31`)
    }
  }, [tipoInventario, exercicioValue, form])

  const onSubmit = async (data: CreateFormValues) => {
    logger.debug('Formulário submetido', { data })
    setIsLoading(true)

    try {
      logger.debug('Chamando createInventory...')
      const newInventory = await createInventory({
        name: data.name,
        sectorName: data.sectorName,
        scope: data.scope,
        locationType: data.locationType,
        specificLocationId: data.specificLocationId,
        tipo: data.tipo,
        dataBase: data.dataBase,
        exercicio: data.exercicio,
        agenteAnterior: data.agenteAnterior,
        agenteNovo: data.agenteNovo,
      })
      logger.debug('Inventário criado com sucesso', {
        newInventory,
        tipo: typeof newInventory,
        idPresente: newInventory?.id,
      })

      // Verificar se o inventário foi criado corretamente
      if (!newInventory) {
        logger.error('[InventarioCreate] Inventário retornado é null ou undefined')
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Inventário não foi criado. Tente novamente.',
        })
        return
      }

      if (!newInventory.id) {
        logger.error('[InventarioCreate] Inventário criado mas sem ID válido', { newInventory })
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Inventário criado mas com dados inválidos.',
        })
        navigate('/inventarios')
        return
      }

      logger.debug('Navegando para', { url: `/inventarios/${newInventory.id}` })
      toast({
        title: 'Sucesso',
        description: 'Inventário criado com sucesso!',
      })
      navigate(`/inventarios/${newInventory.id}`)
    } catch (error) {
      logger.error('[InventarioCreate] Erro ao criar inventário', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao criar inventário: ${errorMessage}`,
      })
      // Não navegar em caso de erro, deixar o usuário tentar novamente
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
              {/* Tipo de inventário */}
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de inventário (opcional)</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? undefined : v)
                      }
                      value={field.value ?? '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Extraordinário (padrão)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Extraordinário (padrão)</SelectItem>
                        {(
                          Object.keys(TIPO_INVENTARIO_LABEL) as Array<
                            keyof typeof TIPO_INVENTARIO_LABEL
                          >
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_INVENTARIO_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Conforme Lei de Responsabilidade Fiscal (Cap. VII). Se não
                      selecionado, o inventário será classificado como extraordinário.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos condicionais: anual */}
              {tipoInventario === 'anual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <FormField
                    control={form.control}
                    name="exercicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercício (ano) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2000}
                            max={2100}
                            placeholder={String(new Date().getFullYear())}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === '' ? undefined : e.target.valueAsNumber,
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Ano de referência do inventário anual (obrigatório).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataBase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data-base</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ''}
                            readOnly={
                              tipoInventario === 'anual' &&
                              !!exercicioValue &&
                              exercicioValue >= 2000
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Para inventário anual deve ser 31/12 — preenchida automaticamente
                          ao informar o exercício.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Campos condicionais: transferencia */}
              {tipoInventario === 'transferencia' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <FormField
                    control={form.control}
                    name="agenteAnterior"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agente anterior</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="Nome do responsável anterior"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agenteNovo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agente novo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="Nome do novo responsável"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
