import { useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Plus, Trash2, Upload, Download } from 'lucide-react'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { CurrencyInput } from '@/components/ui/currency-input'
import { generatePatrimonialNumber } from '@/lib/asset-utils'
import { Patrimonio } from '@/types'

const bulkPatrimonioSchema = z.object({
  setor_responsavel: z.string().min(1, 'Setor é obrigatório'),
  local_objeto: z.string().min(1, 'Localização é obrigatória'),
  forma_aquisicao: z.string().min(1, 'Forma de aquisição é obrigatória'),
  data_aquisicao: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  patrimonio_items: z.array(
    z.object({
      descricao_bem: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
      tipo: z.string().min(1, 'Tipo é obrigatório'),
      marca: z.string().optional(),
      modelo: z.string().optional(),
      cor: z.string().optional(),
      numero_serie: z.string().optional(),
      valor_aquisicao: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
      quantidade: z.coerce.number().int().min(1, 'Quantidade deve ser no mínimo 1').default(1),
      numero_nota_fiscal: z.string().min(1, 'Nota fiscal é obrigatória'),
      situacao_bem: z.enum(['ÓTIMO', 'BOM', 'REGULAR', 'RUIM', 'EM_MANUTENCAO'], {
        required_error: 'Situação é obrigatória.',
      }),
    })
  ).min(1, 'Adicione pelo menos um item'),
})

type BulkPatrimonioFormValues = z.infer<typeof bulkPatrimonioSchema>

const BensBulkCreate = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patrimonios, addPatrimonio } = usePatrimonio()
  const { logActivity } = useActivityLog()
  const { sectors } = useSectors()
  const { getLocaisBySectorId } = useLocais()
  const [isLoading, setIsLoading] = useState(false)

  const allowedSectors = useMemo(() => {
    if (!user) return []
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.id, label: s.name }))
    }
    const userSectors = user.responsibleSectors || []
    return sectors
      .filter((s) => userSectors.includes(s.name))
      .map((s) => ({ value: s.id, label: s.name }))
  }, [sectors, user])

  const form = useForm<BulkPatrimonioFormValues>({
    resolver: zodResolver(bulkPatrimonioSchema),
    defaultValues: {
      setor_responsavel: '',
      local_objeto: '',
      forma_aquisicao: '',
      data_aquisicao: new Date().toISOString().split('T')[0],
      patrimonio_items: [
        {
          descricao_bem: '',
          tipo: '',
          marca: '',
          modelo: '',
          cor: '',
          numero_serie: '',
          valor_aquisicao: 0,
          quantidade: 1,
          numero_nota_fiscal: '',
          situacao_bem: 'BOM',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'patrimonio_items',
  })

  const selectedSectorName = form.watch('setor_responsavel')
  const selectedSector = sectors.find((s) => s.name === selectedSectorName)

  const addNewItem = () => {
    append({
      descricao_bem: '',
      tipo: '',
      marca: '',
      modelo: '',
      cor: '',
      numero_serie: '',
      valor_aquisicao: 0,
      quantidade: 1,
      numero_nota_fiscal: '',
      situacao_bem: 'BOM',
    })
  }

  const onSubmit = async (data: BulkPatrimonioFormValues) => {
    if (!user || !selectedSector) return
    setIsLoading(true)
    
    try {
      const createdPatrimonios: Patrimonio[] = []
      
      for (const item of data.patrimonio_items) {
        // Gerar número de patrimônio para cada item
        const patrimonioNumber = generatePatrimonialNumber(
          selectedSector.id,
          sectors,
          patrimonios
        )

        const newPatrimonioData = {
          ...item,
          numero_patrimonio: patrimonioNumber,
          data_aquisicao: new Date(data.data_aquisicao),
          setor_responsavel: data.setor_responsavel,
          local_objeto: data.local_objeto,
          forma_aquisicao: data.forma_aquisicao,
          status: 'ativo' as const,
          fotos: [],
          documentos: [],
          historico_movimentacao: [],
          entityName: 'Patrimonio',
          municipalityId: user.municipalityId!,
        } as Omit<Patrimonio, 'id' | 'notes'>

        const newPatrimonio = await addPatrimonio(newPatrimonioData)
        createdPatrimonios.push(newPatrimonio)

        logActivity('PATRIMONIO_CREATE', {
          record_id: newPatrimonio.id,
          new_value: newPatrimonio,
        })
      }

      toast({
        title: 'Sucesso!',
        description: `${createdPatrimonios.length} patrimônios cadastrados com sucesso.`,
      })
      navigate('/bens-cadastrados')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Falha ao criar os patrimônios.'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Cadastro em Lote de Patrimônios
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
            Cadastre múltiplos patrimônios para o mesmo setor e local
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Comuns */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Informações Comuns
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="setor_responsavel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor Responsável *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allowedSectors.map((sector) => (
                              <SelectItem key={sector.value} value={sector.label}>
                                {sector.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="local_objeto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local do Objeto *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Sala 101, Almoxarifado" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="forma_aquisicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Aquisição *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a forma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Compra">Compra</SelectItem>
                            <SelectItem value="Doação">Doação</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                            <SelectItem value="Comodato">Comodato</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_aquisicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Itens de Patrimônio */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Itens de Patrimônio
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNewItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border border-gray-200">
                    <CardHeader className="pb-3 px-4 pt-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-medium">
                          Item {index + 1}
                        </CardTitle>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.descricao_bem`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição do Bem *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Computador Desktop Dell" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.tipo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Equipamento de Informática" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.marca`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marca</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Dell, HP, Samsung" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.modelo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modelo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: OptiPlex 3080" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.cor`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Preto, Branco" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.numero_serie`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Série</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: ABC123456789" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.valor_aquisicao`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor de Aquisição *</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="R$ 0,00"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.quantidade`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="1"
                                  placeholder="1"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`patrimonio_items.${index}.situacao_bem`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Situação *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bom">Bom</SelectItem>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="ruim">Ruim</SelectItem>
                                  <SelectItem value="pessimo">Péssimo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`patrimonio_items.${index}.numero_nota_fiscal`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número da Nota Fiscal *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: 123456" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/bens-cadastrados')}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar {fields.length} Patrimônio{fields.length > 1 ? 's' : ''}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default BensBulkCreate
