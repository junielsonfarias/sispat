import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/bens/ImageUpload'
import { useImovel } from '@/hooks/useImovel'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { Imovel } from '@/types'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { useSectors } from '@/contexts/SectorContext'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Link } from 'react-router-dom'
import {
  ImoveisBasicoFields,
  ImoveisDataAquisicaoField,
  ImoveisValorField,
  ImoveisAreaFields,
} from '@/components/imoveis/ImoveisSharedFields'

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
  area_terreno: z.coerce.number().optional(),
  area_construida: z.coerce.number().optional(),
  // Campos que existem no banco (Imovel) mas não eram editáveis pela tela de
  // edição — eram removidos do payload por não estarem no schema. Nullable
  // porque os registros podem ter esses campos vazios.
  tipo_imovel: z.string().max(50).optional().nullable(),
  situacao: z.string().max(50).optional().nullable(),
  descricao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  url_documentos: z.string().optional().nullable(),
  latitude: z
    .preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.coerce.number().min(-90).max(90).nullable(),
    )
    .optional(),
  longitude: z
    .preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.coerce.number().min(-180).max(180).nullable(),
    )
    .optional(),
  // Posse (Art. 13 §3): imóveis em cessão/comodato não integram o ativo.
  tipo_posse: z.enum(['proprio', 'cessao', 'comodato']).default('proprio'),
  fotos: z.array(z.any()).optional(),
  documentos: z.array(z.any()).optional(),
})

export default function ImoveisEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getImovelById, updateImovel } = useImovel()
  const { fields: customFieldConfigs } = useImovelField()
  const { sectors } = useSectors()

  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Criar schema dinâmico baseado nos campos customizados
  const imovelEditSchema = useMemo(() => {
    let schema: z.AnyZodObject = baseSchema

    customFieldConfigs.forEach((field) => {
      if (field.type === 'TEXT' || field.type === 'TEXTAREA') {
        schema = schema.extend({
          [field.id]: z.string().optional(),
        })
      } else if (field.type === 'NUMBER') {
        schema = schema.extend({
          [field.id]: z.coerce.number().optional(),
        })
      } else if (field.type === 'DATE') {
        schema = schema.extend({
          [field.id]: z.string().optional(),
        })
      } else if (field.type === 'CURRENCY') {
        schema = schema.extend({
          [field.id]: z.coerce.number().optional(),
        })
      }
    })

    return schema
  }, [customFieldConfigs])

  type ImovelFormValues = z.infer<typeof imovelEditSchema>

  const form = useForm<ImovelFormValues>({
    resolver: zodResolver(imovelEditSchema),
    defaultValues: {
      numero_patrimonio: '',
      denominacao: '',
      endereco: '',
      setor: '',
      data_aquisicao: '',
      valor_aquisicao: 0,
      area_terreno: undefined,
      area_construida: undefined,
      tipo_imovel: '',
      situacao: '',
      descricao: '',
      observacoes: '',
      url_documentos: '',
      latitude: undefined,
      longitude: undefined,
      tipo_posse: 'proprio',
      fotos: [],
      documentos: [],
    },
  })

  useEffect(() => {
    const fetchImovel = async () => {
      if (!id) {
        navigate('/imoveis')
        return
      }

      try {
        const data = await getImovelById(id)
        if (data) {
          setImovel(data)
          form.reset({
            ...data,
            data_aquisicao: data.data_aquisicao
              ? format(new Date(data.data_aquisicao), 'yyyy-MM-dd')
              : '',
            tipo_posse: data.tipo_posse || 'proprio',
            fotos: data.fotos || [],
            documentos: data.documentos || [],
          })
        } else {
          toast({
            title: 'Erro',
            description: 'Imóvel não encontrado.',
            variant: 'destructive',
          })
          navigate('/imoveis')
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar imóvel.',
          variant: 'destructive',
        })
        navigate('/imoveis')
      }
    }

    fetchImovel()
  }, [id, getImovelById, form, navigate])

  const onSubmit = async (data: ImovelFormValues) => {
    setIsLoading(true)
    try {
      // Converte itens vindos do ImageUpload ({id, file_url, file_name}) para
      // strings; o backend também sanitiza, mas evitamos o round-trip inválido.
      const toUrl = (item: string | { file_url?: string; url?: string }): string => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return item.file_url || item.url || ''
        return ''
      }
      const fotosProcessadas = (data.fotos || [])
        .map(toUrl)
        .filter((u: string) => u && !u.startsWith('blob:'))
      const documentosProcessados = (data.documentos || [])
        .map(toUrl)
        .filter((u: string) => u && !u.startsWith('blob:'))

      await updateImovel(id!, {
        ...data,
        fotos: fotosProcessadas,
        documentos: documentosProcessados,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id || '',
      } as unknown as Partial<Imovel>, user!)
      toast({
        title: 'Sucesso',
        description: 'Imóvel atualizado com sucesso.',
      })
      navigate('/imoveis')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar imóvel.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!imovel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-2">
            Editar Imóvel: {imovel.numero_patrimonio}
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground">
            Edite as informações do imóvel
          </p>
          <Link
            to="/imoveis"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para a lista
          </Link>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Básicas</CardTitle>
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
                          <Input {...field} placeholder="Ex: 12345" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ImoveisBasicoFields control={form.control} />

                  <FormField
                    control={form.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor Responsável</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={sectors.map(s => ({ value: s.name, label: s.name }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione o setor"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ImoveisDataAquisicaoField control={form.control} />

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
                            value={(field.value as string) ?? ''}
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
                            value={(field.value as string) ?? ''}
                            onChange={field.onChange}
                            placeholder="Selecione a situação"
                          />
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
                          <Textarea
                            {...field}
                            value={(field.value as string) ?? ''}
                            placeholder="Descrição detalhada do imóvel"
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
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImoveisValorField control={form.control} />
                </div>
              </CardContent>
            </Card>

            {/* Informações Técnicas */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Técnicas</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImoveisAreaFields control={form.control} />

                  <FormField
                    control={form.control}
                    name="tipo_posse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título de Posse</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={[
                              { value: 'proprio', label: 'Próprio (do município)' },
                              { value: 'cessao', label: 'Cessão (de terceiros)' },
                              { value: 'comodato', label: 'Comodato (de terceiros)' },
                            ]}
                            value={field.value as string}
                            onChange={field.onChange}
                            placeholder="Selecione a posse"
                          />
                        </FormControl>
                        <FormDescription>
                          Imóveis em cessão/comodato não integram o ativo do município (Art. 13 §3).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Localização Geográfica */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Localização Geográfica</CardTitle>
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
                            value={(field.value as number | undefined) ?? ''}
                            placeholder="Ex: -2.5489"
                            onChange={(e) => field.onChange(e.target.value)}
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
                            value={(field.value as number | undefined) ?? ''}
                            placeholder="Ex: -48.5544"
                            onChange={(e) => field.onChange(e.target.value)}
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
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Observações</CardTitle>
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
                          value={(field.value as string) ?? ''}
                          placeholder="Informações adicionais sobre o imóvel, histórico, particularidades, etc."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Mídia e Documentos */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Mídia e Documentos</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div>
                  <Label>Fotos do Imóvel</Label>
                  <ImageUpload
                    name="fotos"
                    control={form.control}
                    assetId={imovel.id}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="url_documentos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        URL de Documentos{' '}
                        <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={(field.value as string) ?? ''}
                          type="text"
                          placeholder="https://drive.google.com/... (opcional)"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Link para documentos externos (Google Drive, etc.)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Campos Customizados */}
            {customFieldConfigs.length > 0 && (
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-foreground">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFieldConfigs.map((field) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={field.id as string & keyof ImovelFormValues}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                              {field.type === 'TEXTAREA' ? (
                                <Textarea {...formField} placeholder={(field as unknown as { placeholder?: string }).placeholder} />
                              ) : field.type === 'NUMBER' || field.type === 'CURRENCY' ? (
                                <Input
                                  type="number"
                                  {...formField}
                                  onChange={(e) => formField.onChange(parseFloat(e.target.value) || undefined)}
                                  placeholder={(field as unknown as { placeholder?: string }).placeholder}
                                />
                              ) : field.type === 'DATE' ? (
                                <Input type="date" {...formField} />
                              ) : (
                                <Input {...formField} placeholder={(field as unknown as { placeholder?: string }).placeholder} />
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
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
