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
import { useImovel } from '@/contexts/ImovelContext'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Imovel, ImovelFieldConfig } from '@/types'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { useSectors } from '@/contexts/SectorContext'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Link } from 'react-router-dom'

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
    .min(0.01, 'O valor deve ser maior que zero.'),
  area_terreno: z.coerce.number().optional(),
  area_construida: z.coerce.number().optional(),
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
    let schema = baseSchema

    customFieldConfigs.forEach((field) => {
      if (field.type === 'text' || field.type === 'textarea') {
        schema = schema.extend({
          [field.id]: z.string().optional(),
        })
      } else if (field.type === 'number') {
        schema = schema.extend({
          [field.id]: z.coerce.number().optional(),
        })
      } else if (field.type === 'date') {
        schema = schema.extend({
          [field.id]: z.string().optional(),
        })
      } else if (field.type === 'currency') {
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
            data_aquisicao: data.data_aquisicao || data.dataAquisicao 
              ? format(new Date(data.data_aquisicao || data.dataAquisicao), 'yyyy-MM-dd')
              : '',
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
      await updateImovel(id!, {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id || '',
      })
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
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Editar Imóvel: {imovel.numero_patrimonio}
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
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
                          <Input {...field} placeholder="Ex: 12345" />
                        </FormControl>
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
                </div>
              </CardContent>
            </Card>

            {/* Informações Financeiras */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Financeiras</CardTitle>
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
                </div>
              </CardContent>
            </Card>

            {/* Informações Técnicas */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Técnicas</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="area_terreno"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área do Terreno (m²)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            placeholder="Ex: 500"
                          />
                        </FormControl>
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
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            placeholder="Ex: 300"
                          />
                        </FormControl>
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
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Mídia</CardTitle>
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
              </CardContent>
            </Card>

            {/* Campos Customizados */}
            {customFieldConfigs.length > 0 && (
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFieldConfigs.map((field) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={field.id as keyof ImovelFormValues}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                              {field.type === 'textarea' ? (
                                <Textarea {...formField} placeholder={field.placeholder} />
                              ) : field.type === 'number' || field.type === 'currency' ? (
                                <Input
                                  type="number"
                                  {...formField}
                                  onChange={(e) => formField.onChange(parseFloat(e.target.value) || undefined)}
                                  placeholder={field.placeholder}
                                />
                              ) : field.type === 'date' ? (
                                <Input type="date" {...formField} />
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