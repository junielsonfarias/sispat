import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Info } from 'lucide-react'
import { ImageUpload } from '@/components/bens/ImageUpload'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { Patrimonio } from '@/types'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { useTiposBens } from '@/contexts/TiposBensContext'
import { useAcquisitionForms } from '@/contexts/AcquisitionFormContext'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { generatePatrimonialNumber } from '@/lib/asset-utils'
import { patrimonioBaseSchema } from '@/lib/validations/patrimonioSchema'
import { Label } from '@/components/ui/label'
import { generateSubPatrimonios } from '@/lib/sub-patrimonio-utils'

type PatrimonioFormValues = z.infer<typeof patrimonioBaseSchema>

const BensCreate = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patrimonios, addPatrimonio } = usePatrimonio()
  const { logActivity } = useActivityLog()
  const { sectors } = useSectors()
  const { getLocaisBySectorId } = useLocais()
  const { tiposBens } = useTiposBens()
  const { activeAcquisitionForms } = useAcquisitionForms()
  const [isLoading, setIsLoading] = useState(false)
  const [generatedNumber, setGeneratedNumber] = useState<string | null>(null)
  const [tempAssetId] = useState(() => `temp-${Date.now()}`)

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

  const isSectorDisabled = useMemo(
    () =>
      user?.role !== 'admin' &&
      user?.role !== 'supervisor' &&
      allowedSectors.length === 1,
    [user, allowedSectors],
  )

  const form = useForm<PatrimonioFormValues>({
    resolver: zodResolver(patrimonioBaseSchema),
    mode: 'onTouched',
    defaultValues: {
      descricao_bem: '',
      tipo: '',
      marca: '',
      modelo: '',
      cor: '',
      numero_serie: '',
      data_aquisicao: '',
      valor_aquisicao: 0,
      quantidade: 1,
      numero_nota_fiscal: '',
      forma_aquisicao: '',
      setor_responsavel: isSectorDisabled ? allowedSectors[0].label : '',
      local_objeto: '',
      situacao_bem: undefined,
      fotos: [],
      documentos: [],
      metodo_depreciacao: 'Linear',
      vida_util_anos: 5,
      valor_residual: 0,
      eh_kit: false,
      quantidade_unidades: 2,
      url_documentos: '',
      documentos_pdf: [],
    },
  })

  const selectedSectorName = form.watch('setor_responsavel')
  const selectedSector = sectors.find((s) => s.name === selectedSectorName)

  useEffect(() => {
    if (selectedSector) {
      try {
        const nextNumber = generatePatrimonialNumber(
          selectedSector.id,
          sectors,
          patrimonios,
        )
        setGeneratedNumber(nextNumber)
      } catch (error) {
        console.error('Erro ao gerar número de patrimônio:', error)
        console.log('Setor selecionado:', selectedSector)
        console.log('Código do setor:', selectedSector.codigo)
        setGeneratedNumber(null)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao gerar número de patrimônio',
        })
      }
    } else {
      setGeneratedNumber(null)
    }
  }, [selectedSector, sectors, patrimonios])

  // Limpar campo de local quando o setor mudar
  useEffect(() => {
    if (selectedSector) {
      // Verificar se o local atual pertence ao setor selecionado
      const currentLocal = form.getValues('local_objeto')
      const locaisDoSetor = getLocaisBySectorId(selectedSector.id)
      const localExiste = locaisDoSetor.some(local => local.name === currentLocal)
      
      if (currentLocal && !localExiste) {
        // Limpar o campo se o local não pertencer ao setor selecionado
        form.setValue('local_objeto', '')
      }
    }
  }, [selectedSector, form, getLocaisBySectorId])

  const onSubmit = async (data: PatrimonioFormValues) => {
    if (!user) return
    
    if (!generatedNumber) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar o número de patrimônio. Verifique se o setor possui código definido.',
      })
      return
    }
    
    setIsLoading(true)
    try {
      // Encontrar o setor pelo nome para pegar o ID
      const sectorData = sectors.find((s) => s.name === data.setor_responsavel)
      const sectorId = sectorData?.id
      
      // Encontrar o local pelo nome para pegar o ID (se houver)
      const locais = sectorData ? getLocaisBySectorId(sectorData.id) : []
      const localData = locais.find((l) => l.name === data.local_objeto)
      const localId = localData?.id
      
      // Encontrar o tipo de bem pelo nome para pegar o ID (se houver)
      const tipoData = tiposBens.find((t) => t.nome === data.tipo)
      const tipoId = tipoData?.id
      
      // Encontrar a forma de aquisição pelo nome para pegar o ID (se houver)
      const formaData = activeAcquisitionForms.find((f) => f.nome === data.forma_aquisicao)
      const acquisitionFormId = formaData?.id

      const newPatrimonioData = {
        ...data,
        numero_patrimonio: generatedNumber,
        data_aquisicao: new Date(data.data_aquisicao || data.dataAquisicao),
        status: 'ativo',
        fotos: data.fotos || [],
        documentos: data.documentos || [],
        municipalityId: user.municipalityId!,
        createdAt: new Date(),
        createdBy: user.nome || user.email,
        updatedAt: new Date(),
        updatedBy: user.nome || user.email,
        // Adicionar os IDs necessários
        sectorId,
        localId,
        tipoId,
        acquisitionFormId,
      } as Omit<
        Patrimonio,
        'id' | 'historico_movimentacao' | 'entityName' | 'notes'
      >

      const newPatrimonio = await addPatrimonio(newPatrimonioData)

      // Se for um kit, gerar sub-patrimônios automaticamente
      if ((data.eh_kit || data.ehKit) && (data.quantidade_unidades || data.quantidadeUnidades) && (data.quantidade_unidades || data.quantidadeUnidades) > 1) {
        try {
          const subPatrimonios = generateSubPatrimonios(
            newPatrimonio.id,
            newPatrimonio.numero_patrimonio || newPatrimonio.numeroPatrimonio,
            data.quantidade_unidades || data.quantidadeUnidades
          )
          
          // Em produção, aqui seria feita a chamada para a API para salvar os sub-patrimônios
          console.log('Sub-patrimônios gerados:', subPatrimonios)
          
          logActivity('SUB_PATRIMONIOS_CREATE', {
            record_id: newPatrimonio.id,
            new_value: { 
              patrimonio_id: newPatrimonio.id,
              quantidade: data.quantidade_unidades || data.quantidadeUnidades,
              sub_patrimonios: subPatrimonios 
            },
          })
        } catch (error) {
          console.error('Erro ao gerar sub-patrimônios:', error)
          // Não falha o cadastro principal se houver erro nos sub-patrimônios
        }
      }

      logActivity('PATRIMONIO_CREATE', {
        record_id: newPatrimonio.id,
        new_value: newPatrimonio,
      })
      
      const successMessage = (data.eh_kit || data.ehKit) && (data.quantidade_unidades || data.quantidadeUnidades) 
        ? `Bem cadastrado com sucesso. ${data.quantidade_unidades || data.quantidadeUnidades} sub-patrimônios gerados automaticamente.`
        : 'Bem cadastrado com sucesso.'
        
      toast({
        title: 'Sucesso!',
        description: successMessage,
      })
      navigate('/bens-cadastrados')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Falha ao criar o bem.'
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Cadastro de Bem
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
            Cadastre um novo bem patrimonial no sistema
          </p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_patrimonio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Patrimônio</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={generatedNumber || ''} 
                          disabled 
                          placeholder="Será gerado automaticamente"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="descricao_bem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Bem</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Computador Desktop Dell" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="situacao_bem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Situação do Bem</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a situação" />
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

                <FormField
                  control={form.control}
                  name="valor_aquisicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Aquisição</FormLabel>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_aquisicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Aquisição</FormLabel>
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

                <FormField
                  control={form.control}
                  name="forma_aquisicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Aquisição</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeAcquisitionForms.map((form) => (
                            <SelectItem key={form.id} value={form.nome}>
                              {form.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiposBens.filter(tipo => tipo.ativo).map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.nome}>
                              {tipo.nome}
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
                  name="marca"
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
                  name="modelo"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cor"
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

                <FormField
                  control={form.control}
                  name="numero_serie"
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
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
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
              </div>

              {/* Campos para Sub-Patrimônios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eh_kit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Este patrimônio é um kit/conjunto?</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Marque se este patrimônio contém múltiplas unidades
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('eh_kit') && (
                  <FormField
                    control={form.control}
                    name="quantidade_unidades"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de Unidades *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="2"
                            placeholder="2"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_nota_fiscal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Nota Fiscal</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Informações Financeiras */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                Informações Financeiras
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configurações para cálculo de depreciação do bem
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="metodo_depreciacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Depreciação</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Linear">Linear</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vida_util_anos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vida Útil (anos)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1"
                          max="50"
                          placeholder="Ex: 5"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Tempo de vida útil esperado do bem
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_residual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Residual</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="R$ 0,00"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Valor estimado ao final da vida útil
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview de Depreciação */}
              {form.watch('valor_aquisicao') && form.watch('vida_util_anos') && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">
                    Preview de Depreciação
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Taxa Anual:</span>
                      <div className="font-medium text-blue-900">
                        {form.watch('vida_util_anos') 
                          ? `${(100 / form.watch('vida_util_anos')).toFixed(1)}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Depreciação Anual:</span>
                      <div className="font-medium text-blue-900">
                        {form.watch('valor_aquisicao') && form.watch('vida_util_anos') && form.watch('valor_residual')
                          ? formatCurrency((form.watch('valor_aquisicao') - (form.watch('valor_residual') || 0)) / form.watch('vida_util_anos'))
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Depreciação Mensal:</span>
                      <div className="font-medium text-blue-900">
                        {form.watch('valor_aquisicao') && form.watch('vida_util_anos') && form.watch('valor_residual')
                          ? formatCurrency(((form.watch('valor_aquisicao') - (form.watch('valor_residual') || 0)) / form.watch('vida_util_anos')) / 12)
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Valor Contábil:</span>
                      <div className="font-medium text-green-600">
                        {form.watch('valor_aquisicao') ? formatCurrency(form.watch('valor_aquisicao')) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Localização */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Localização</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="setor_responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor Responsável</FormLabel>
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
                      <FormLabel>Local do Objeto</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!selectedSector}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue 
                              placeholder={
                                !selectedSector 
                                  ? "Selecione primeiro o setor" 
                                  : "Selecione o local"
                              } 
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedSector ? (
                            getLocaisBySectorId(selectedSector.id).map((local) => (
                              <SelectItem key={local.id} value={local.name}>
                                {local.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Selecione um setor primeiro
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {!selectedSector 
                          ? "Selecione o setor responsável primeiro" 
                          : `${getLocaisBySectorId(selectedSector.id).length} locais disponíveis para este setor`
                        }
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mídia */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Mídia e Documentos</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
              <div>
                <Label>Fotos do Bem</Label>
                <ImageUpload
                  name="fotos"
                  control={form.control}
                  assetId={tempAssetId}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="url_documentos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Documentos</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="url"
                          placeholder="https://drive.google.com/..."
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Link para Google Drive, OneDrive ou outros repositórios de documentos
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentos_pdf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documentos PDF</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            field.onChange(files)
                          }}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Notas fiscais, contratos e outros documentos em PDF
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            <Button type="submit" disabled={isLoading || !generatedNumber}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  )
}

export default BensCreate
