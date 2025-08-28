import { ImageUpload } from '@/components/bens/ImageUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useActivityLog } from '@/contexts/ActivityLogContext'
// import { useComponentLoading } from '@/contexts/LoadingContext'
import { useLocals } from '@/contexts/LocalContext'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSectors } from '@/contexts/SectorContext'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { patrimonioBaseSchema } from '@/lib/validations/patrimonioSchema'
import { api } from '@/services/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import * as z from 'zod'

type PatrimonioFormValues = z.infer<typeof patrimonioBaseSchema>

const BensCreate = () => {
  // Componente para cadastro de novos bens patrimoniais
  console.log('🏠 BensCreate - Componente montado')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patrimonios, addPatrimonio } = usePatrimonio()
  const { logActivity } = useActivityLog()
  const { sectors, fetchSectorsByMunicipality, isLoading: sectorsLoading } = useSectors()
  const { userLocals, fetchLocalsBySector, isLoading: localsLoading } = useLocals()
  const { municipalities } = useMunicipalities()
  // const { loading: isSubmitting, withLoading } = useComponentLoading('bens-create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const [generatedNumber, setGeneratedNumber] = useState<string | null>(null)
  
  console.log('👤 Usuário:', user?.name, 'Role:', user?.role, 'Municipality:', user?.municipalityId)
  console.log('📋 Setores disponíveis:', sectors.length)
  console.log('📋 Patrimônios carregados:', patrimonios.length)

  // Carregar setores automaticamente quando o componente for montado
  useEffect(() => {
    if (user?.municipalityId) {
      console.log('🔄 Carregando setores para município:', user.municipalityId)
      fetchSectorsByMunicipality(user.municipalityId)
    }
  }, [user?.municipalityId, fetchSectorsByMunicipality])

  const allowedSectors = useMemo(() => {
    if (!user) return []
    
    // Para supervisores e admins, mostrar todos os setores disponíveis
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.id, label: s.name }))
    }
    
    // Para usuários normais, apenas os setores atribuídos
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
      descricao: '',
      tipo: '',
      marca: '',
      modelo: '',
      cor: '',
      numero_serie: '',
      data_aquisicao: '',
      numero_nota_fiscal: '',
      forma_aquisicao: '',
      setor_responsavel: '',
      local_objeto: '',
      situacao_bem: undefined,
      fotos: [],
      documentos: [],
      metodo_depreciacao: 'Linear',
      vida_util_anos: 0,
      valor_residual: 0,
      quantidade: 1,
    },
  })

  // Para usuários normais, automaticamente selecionar o setor atribuído
  const selectedSectorName = form.watch('setor_responsavel')
  const selectedSector = sectors.find((s) => s.name === selectedSectorName)

  // Se o usuário é normal (não supervisor/superusuário) e tem setores atribuídos, selecionar automaticamente
  useEffect(() => {
    if (user && user.role === 'usuario' && user.sectors && user.sectors.length > 0 && !selectedSectorName) {
      // Buscar o setor primário ou o primeiro setor
      const primarySector = user.sectors.find(s => s.isPrimary) || user.sectors[0]
      console.log('🔍 Usuário normal com setores atribuídos - selecionando automaticamente:', primarySector.name)
      form.setValue('setor_responsavel', primarySector.name)
    }
  }, [user, selectedSectorName, form])
  
  // Usar apenas setores reais criados na área de gerenciamento

  useEffect(() => {
    if (selectedSector) {
      const generateNumber = async () => {
        try {
          console.log('🔍 Gerando número para setor:', selectedSector.name)
          
          // Usar o serviço de API existente que já tem autenticação
          const data = await api.get<{
            success: boolean
            numero_patrimonio: string
            sector: string
            sectorCode: string
            year: string
            nextSequence: string
            error?: string
          }>(`/patrimonios/generate-number/${selectedSector.id}`)
          
          if (data.success) {
            console.log('✅ Número gerado pelo backend:', data.numero_patrimonio)
            setGeneratedNumber(data.numero_patrimonio)
          } else {
            throw new Error(data.error || 'Erro ao gerar número')
          }
        } catch (error) {
          console.error('❌ Erro ao gerar número:', error)
          setGeneratedNumber('Erro ao gerar número')
          toast({
            variant: 'destructive',
            title: 'Erro',
            description:
              'Não foi possível gerar o número do patrimônio. Verifique se o setor possui um código definido.',
          })
        }
      }

      generateNumber()
    } else {
      setGeneratedNumber(null)
    }
  }, [selectedSector])

  const [sectorLocals, setSectorLocals] = useState<Local[]>([])

  // Carregar locais do setor selecionado
  useEffect(() => {
    if (selectedSector) {
      console.log('🔍 Carregando locais do setor:', selectedSector.name)
      fetchLocalsBySector(selectedSector.id).then((locals) => {
        setSectorLocals(locals)
        console.log('✅ Locais carregados para o setor:', locals.length)
      })
    } else {
      setSectorLocals([])
    }
  }, [selectedSector, fetchLocalsBySector])

  const locationOptions = useMemo(() => {
    return sectorLocals.map((l) => ({
      value: l.name,
      label: l.name,
    }))
  }, [sectorLocals])

  const onSubmit = async (data: PatrimonioFormValues) => {
    console.log('🔄 onSubmit - Iniciando criação de patrimônio')
    console.log('👤 Usuário:', user?.name)
    console.log('📋 Número gerado:', generatedNumber)
    
    if (!user || !generatedNumber) {
      console.log('❌ Usuário ou número não disponível')
      return
    }
    
    try {
      // Preparar dados para envio ao backend
      const patrimonioData = {
        numero_patrimonio: generatedNumber,
        descricao: data.descricao,
        tipo: data.tipo,
        marca: data.marca,
        modelo: data.modelo,
        cor: data.cor,
        numero_serie: data.numero_serie,
        data_aquisicao: data.data_aquisicao,
        valor_aquisicao: data.valor_aquisicao,
        quantidade: data.quantidade,
        numero_nota_fiscal: data.numero_nota_fiscal,
        forma_aquisicao: data.forma_aquisicao,
        setor_responsavel: data.setor_responsavel,
        local_objeto: data.local_objeto,
        situacao_bem: data.situacao_bem,
        fotos: data.fotos || [],
        documentos: data.documentos || [],
        metodo_depreciacao: data.metodo_depreciacao,
        vida_util_anos: data.vida_util_anos,
        valor_residual: data.valor_residual
      }

      console.log('📋 Dados do patrimônio:', patrimonioData)
      console.log('🔍 Setor responsável:', data.setor_responsavel)
      console.log('🔍 Local objeto:', data.local_objeto)

      // Chamar o backend para criar o patrimônio
      console.log('🔄 Chamando addPatrimonio...')
      const newPatrimonio = await addPatrimonio(patrimonioData)
      console.log('✅ Patrimônio criado:', newPatrimonio)
      
      // Exibir toast de sucesso
      toast({
        title: 'Sucesso!',
        description: 'Bem cadastrado com sucesso.',
      })
      
      // Redirecionar para a lista imediatamente
      console.log('🔄 Redirecionando para /bens-cadastrados')
      navigate('/bens-cadastrados', { replace: true })
      console.log('✅ Redirecionamento executado')
    } catch (error) {
      console.error('❌ Erro ao criar patrimônio:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Falha ao criar o bem.'
      console.log('❌ Mensagem de erro:', errorMessage)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const sectorTooltipContent = useMemo(() => {
    if (isSectorDisabled) {
      return 'Você só tem permissão para cadastrar bens neste setor.'
    }
    if (user?.role !== 'admin' && user?.role !== 'supervisor') {
      return 'Você só pode selecionar os setores aos quais está atribuído.'
    }
    return null
  }, [isSectorDisabled, user])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Cadastro de Bem</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormItem>
                <FormLabel>Número de Patrimônio</FormLabel>
                <FormControl>
                  <Input
                    value={generatedNumber || 'Selecione um setor para gerar'}
                    readOnly
                  />
                </FormControl>
                <FormDescription>
                  Este número é gerado automaticamente com base no setor
                  selecionado.
                </FormDescription>
              </FormItem>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mídia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Fotos do Bem</Label>
                <ImageUpload name="fotos" control={form.control} />
              </div>
              <div>
                <Label>Documentos (Nota Fiscal, Garantia, etc.)</Label>
                <ImageUpload name="documentos" control={form.control} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Bem</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Notebook Dell Vostro 15"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Eletrônico" {...field} />
                    </FormControl>
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
                      <Input placeholder="Ex: Dell" {...field} />
                    </FormControl>
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
                      <Input placeholder="Ex: Vostro 15" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Preto" {...field} />
                    </FormControl>
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
                      <Input placeholder="Ex: SN123456" {...field} />
                    </FormControl>
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
                name="valor_aquisicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Aquisição (R$)</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                      />
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
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero_nota_fiscal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota Fiscal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: NF-001" {...field} />
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
                    <FormControl>
                      <Input placeholder="Ex: Compra Direta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="setor_responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Setor Responsável
                      {sectorTooltipContent && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{sectorTooltipContent}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={allowedSectors.map((s) => ({
                          value: s.label,
                          label: s.label,
                        }))}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                          form.setValue('local_objeto', '')
                        }}
                        placeholder="Selecione um setor"
                        disabled={isSectorDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="local_objeto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local do Bem</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={locationOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione um local"
                        disabled={!selectedSectorName}
                        emptyMessage="Nenhum local encontrado para este setor."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="situacao_bem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação do Bem</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OTIMO">Ótimo</SelectItem>
                        <SelectItem value="BOM">Bom</SelectItem>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="RUIM">Ruim</SelectItem>
                        <SelectItem value="PESSIMO">Péssimo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informações de Depreciação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="metodo_depreciacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Depreciação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Linear">Linear</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_residual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Residual (R$)</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/bens-cadastrados')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <LoadingButton 
              type="submit" 
              loading={isSubmitting}
              disabled={!generatedNumber}
            >
              Salvar
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default BensCreate
