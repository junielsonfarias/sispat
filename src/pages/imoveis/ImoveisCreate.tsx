import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import { ImageUpload } from '@/components/bens/ImageUpload'
import { useImovel } from '@/hooks/useImovel'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { CurrencyInput } from '@/components/ui/currency-input'
import { ImovelFieldConfig } from '@/types'
import { Label } from '@/components/ui/label'
import { useSectors } from '@/contexts/SectorContext'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { api } from '@/services/http-api'

const baseSchema = z.object({
  numero_patrimonio: z.string().min(1, 'O número de patrimônio é obrigatório.'),
  denominacao: z.string().min(1, 'A denominação é obrigatória.'),
  endereco: z.string().min(1, 'O endereço é obrigatório.'),
  setor: z.string().min(1, 'O setor é obrigatório.'),
  data_aquisicao: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  valor_aquisicao: z.coerce
    .number()
    .min(0, 'O valor deve ser maior ou igual a zero.'),
  area_terreno: z.coerce.number().min(0, 'A área do terreno deve ser maior ou igual a zero.').optional(),
  area_construida: z.coerce.number().min(0, 'A área construída deve ser maior ou igual a zero.').optional(),
  latitude: z.coerce.number().min(-90).max(90, 'Latitude deve estar entre -90 e 90.').optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180, 'Longitude deve estar entre -180 e 180.').optional().or(z.literal('')),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  tipo_imovel: z.string().optional(),
  situacao: z.string().optional(),
  fotos: z.array(z.any()).optional(),
  documentos: z.array(z.any()).optional(),
  url_documentos: z
    .string()
    .url('URL inválida.')
    .optional(),
  // Campos de endereço adicionais
  cep: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  documentos_pdf: z.array(z.any()).optional(),
})

export default function ImoveisCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addImovel } = useImovel()
  const { fields: customFields } = useImovelField()
  const { sectors } = useSectors()
  const [isLoading, setIsLoading] = useState(false)
  const [tempAssetId] = useState(() => `temp-${Date.now()}`)

  const sectorOptions = useMemo(() => {
    if (!user) return []
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.name, label: s.name }))
    }
    return (user.responsibleSectors || []).map((s) => ({ value: s, label: s }))
  }, [sectors, user])

  const imovelCreateSchema = useMemo(() => {
    const customFieldSchema = customFields.reduce(
      (acc, field) => {
        let validator: z.ZodTypeAny = z.any()
        if (field.required) {
          validator = z.string().min(1, `${field.label} é obrigatório.`)
        }
        acc[field.key] = validator.optional()
        return acc
      },
      {} as Record<string, z.ZodTypeAny>,
    )

    return baseSchema.extend({
      customFields: z.object(customFieldSchema).optional(),
    })
  }, [customFields])

  type ImovelFormValues = z.infer<typeof imovelCreateSchema>

  const form = useForm<ImovelFormValues>({
    resolver: zodResolver(imovelCreateSchema),
    defaultValues: {
      numero_patrimonio: '',
      denominacao: '',
      endereco: '',
      setor: '',
      data_aquisicao: '',
      valor_aquisicao: 0,
      area_terreno: undefined,
      area_construida: undefined,
      latitude: '',
      longitude: '',
      descricao: '',
      observacoes: '',
      tipo_imovel: '',
      situacao: '',
      fotos: [],
      documentos: [],
      url_documentos: '',
      documentos_pdf: [],
      customFields: {},
    },
  })

  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const selectedSector = form.watch('setor')

  // Função para gerar número do imóvel
  const handleGenerateNumber = async () => {
    const sectorName = form.getValues('setor')
    
    if (!sectorName) {
      toast({
        title: 'Atenção',
        description: 'Selecione um setor antes de gerar o número',
        variant: 'destructive',
      })
      return
    }

    // Encontrar o ID do setor pelo nome
    const sector = sectors.find(s => s.name === sectorName)
    if (!sector) {
      toast({
        title: 'Erro',
        description: 'Setor não encontrado',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingNumber(true)
    try {
      const response = await api.get('/imoveis/gerar-numero', {
        params: { sectorId: sector.id }
      })
      
      form.setValue('numero_patrimonio', response.numero)
      
      toast({
        title: 'Número Gerado',
        description: `Número: ${response.numero}`,
      })
    } catch (error) {
      console.error('Erro ao gerar número:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao gerar número do imóvel',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingNumber(false)
    }
  }

  // Gerar número automaticamente quando o setor for selecionado
  useEffect(() => {
    const currentNumber = form.getValues('numero_patrimonio')
    
    // Só gera automaticamente se:
    // 1. Um setor foi selecionado
    // 2. O campo de número está vazio
    if (selectedSector && !currentNumber && sectors.length > 0) {
      handleGenerateNumber()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, sectors])

  const onSubmit = async (data: ImovelFormValues) => {
    if (!user) return

    setIsLoading(true)
    try {
      await addImovel(
        {
          ...data,
          data_aquisicao: new Date(data.data_aquisicao),
          area_terreno: data.area_terreno || 0,
          area_construida: data.area_construida || 0,
          latitude: data.latitude ? parseFloat(data.latitude.toString()) : undefined,
          longitude: data.longitude ? parseFloat(data.longitude.toString()) : undefined,
          fotos: data.fotos || [],
          documentos: data.documentos || [],
          url_documentos: data.url_documentos || '',
          documentos_pdf: data.documentos_pdf || [],
          municipalityId: user.municipalityId || '1',
          customFields: data.customFields || {},
        },
        user,
      )
      toast({
        title: 'Sucesso!',
        description: 'Imóvel cadastrado com sucesso.',
      })
      navigate('/imoveis')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao cadastrar o imóvel.',
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
            Cadastrar Novo Imóvel
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
            Preencha as informações do novo imóvel
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/imoveis')}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numero_patrimonio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Patrimônio</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} placeholder="Ex: IML2025010001" />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateNumber}
                            disabled={isGeneratingNumber || !form.getValues('setor')}
                            title="Gerar número automaticamente"
                          >
                            {isGeneratingNumber ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formato: IML + Ano + Cód.Setor + Sequencial
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="denominacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denominação</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Escola Municipal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Endereço completo do imóvel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Descrição detalhada do imóvel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor Responsável</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={sectorOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione o setor"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_aquisicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_imovel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Imóvel</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={[
                              { value: 'residencial', label: 'Residencial' },
                              { value: 'comercial', label: 'Comercial' },
                              { value: 'industrial', label: 'Industrial' },
                              { value: 'rural', label: 'Rural' },
                              { value: 'publico', label: 'Público' },
                              { value: 'educacional', label: 'Educacional' },
                              { value: 'saude', label: 'Saúde' },
                              { value: 'outros', label: 'Outros' },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione o tipo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="situacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={[
                              { value: 'ativo', label: 'Ativo' },
                              { value: 'inativo', label: 'Inativo' },
                              { value: 'manutencao', label: 'Em Manutenção' },
                              { value: 'reforma', label: 'Em Reforma' },
                              { value: 'demolido', label: 'Demolido' },
                              { value: 'vendido', label: 'Vendido' },
                              { value: 'alugado', label: 'Alugado' },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione a situação"
                          />
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
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="area_terreno"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área do Terreno (m²)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            placeholder="Ex: 1000.50"
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Área total do terreno em metros quadrados
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area_construida"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Construída (m²)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            placeholder="Ex: 500.25"
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Área total construída em metros quadrados
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Localização Geográfica */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Localização Geográfica
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            {...field}
                            placeholder="Ex: -2.5489"
                            onChange={(e) => field.onChange(e.target.value || '')}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Coordenada de latitude (opcional)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            {...field}
                            placeholder="Ex: -48.5544"
                            onChange={(e) => field.onChange(e.target.value || '')}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Coordenada de longitude (opcional)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Informações adicionais sobre o imóvel, histórico, particularidades, etc."
                          rows={4}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Campo livre para observações e informações adicionais
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Mídia e Documentos */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Mídia e Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div>
                  <Label>Fotos do Imóvel</Label>
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
                          Link para documentos externos (Google Drive, etc.)
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
                          Contratos, escrituras e outros documentos em PDF
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campos Personalizados */}
            {customFields.length > 0 && (
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Campos Personalizados
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field: ImovelFieldConfig) => (
                      <FormField
                        key={field.key}
                        control={form.control}
                        name={`customFields.${field.key}` as any}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              {field.type === 'textarea' ? (
                                <Textarea {...formField} placeholder={field.placeholder} />
                              ) : (
                                <Input {...formField} placeholder={field.placeholder} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/imoveis')}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Imóvel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
