import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, useParams, Link } from 'react-router-dom'
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
import { Loader2, Info, ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/bens/ImageUpload'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { Patrimonio } from '@/types'
import { format } from 'date-fns'
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
import { patrimonioEditSchema } from '@/lib/validations/patrimonioSchema'

type PatrimonioFormValues = z.infer<typeof patrimonioEditSchema>

const BensEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPatrimonioById, fetchPatrimonioById, updatePatrimonio } = usePatrimonio()
  const { logActivity } = useActivityLog()
  const { sectors } = useSectors()
  const { getLocaisBySectorId } = useLocais()
  const { tiposBens } = useTiposBens()
  const { activeAcquisitionForms } = useAcquisitionForms()
  const [isLoading, setIsLoading] = useState(false)
  const [patrimonio, setPatrimonio] = useState<Patrimonio | undefined>()

  const form = useForm<PatrimonioFormValues>({
    resolver: zodResolver(patrimonioEditSchema),
    mode: 'onTouched',
  })

  useEffect(() => {
    const loadPatrimonio = async () => {
      if (!id) return
      
      try {
        // ✅ CORREÇÃO: Buscar patrimônio com todos os relacionamentos
        const response = await fetchPatrimonioById(id)
        const data = response.patrimonio || response
        
        // ✅ DEBUG: Log da resposta completa
        console.log('Resposta completa da API:', JSON.stringify(response, null, 2))
        
        if (!data) {
          toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Você não tem permissão para acessar este bem.',
          })
          navigate('/bens-cadastrados')
          return
        }
        
        setPatrimonio(data)
        
        // ✅ DEBUG: Log dos dados do patrimônio
        console.log('Dados do patrimônio carregado:', JSON.stringify(data, null, 2))
        console.log('Relacionamentos:', {
          sector: data.sector,
          local: data.local,
          tipoBem: data.tipoBem,
          acquisitionForm: data.acquisitionForm
        })
        
        console.log('📸 DEBUG - Fotos do backend:', {
          fotos: data.fotos,
          fotosType: typeof data.fotos,
          fotosLength: data.fotos?.length,
          fotosDetalhes: data.fotos?.map((f: any, i: number) => ({
            index: i,
            tipo: typeof f,
            valor: f,
          })),
        })
        
        // ✅ CORREÇÃO: Converter strings de URLs para objetos que ImageUpload espera
        const fotosParaForm = (data.fotos || data.photos || []).map((foto: any, index: number) => {
          if (typeof foto === 'string') {
            // Converter string para objeto
            return {
              id: `existing-${index}`,
              file_url: foto,
              file_name: `foto-${index + 1}.jpg`,
            }
          }
          return foto // Já é objeto
        })
        
        console.log('📸 DEBUG - Fotos convertidas para form:', fotosParaForm)
        
        form.reset({
          ...data,
          data_aquisicao: data.data_aquisicao || data.dataAquisicao 
            ? format(new Date(data.data_aquisicao || data.dataAquisicao), 'yyyy-MM-dd')
            : '',
          data_baixa: (data.data_baixa || data.dataBaixa)
            ? format(new Date(data.data_baixa || data.dataBaixa), 'yyyy-MM-dd')
            : '',
          fotos: fotosParaForm,
          documentos: data.documentos || data.documents || [],
          // ✅ CORREÇÃO: Mapear relacionamentos para nomes
          setor_responsavel: data.sector?.name || data.setor_responsavel || '',
          local_objeto: data.local?.name || data.local_objeto || '',
          tipo: data.tipoBem?.nome || data.tipo || '',
          forma_aquisicao: data.acquisitionForm?.nome || data.forma_aquisicao || '',
        })
      } catch (error) {
        console.error('Erro ao carregar patrimônio:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Erro ao carregar dados do patrimônio.',
        })
        navigate('/bens-cadastrados')
      }
    }
    
    loadPatrimonio()
  }, [id, fetchPatrimonioById, form, navigate])

  const allowedSectors = useMemo(() => {
    if (!user) return []
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.name, label: s.name }))
    }
    const userSectors = user.responsibleSectors || []
    return sectors
      .filter((s) => userSectors.includes(s.name))
      .map((s) => ({ value: s.name, label: s.name }))
  }, [sectors, user])

  const isSectorDisabled = useMemo(
    () =>
      user?.role !== 'admin' &&
      user?.role !== 'supervisor' &&
      allowedSectors.length === 1,
    [user, allowedSectors],
  )

  const selectedSectorName = form.watch('setor_responsavel')
  const selectedSector = sectors.find((s) => s.name === selectedSectorName)

  const locationOptions = useMemo(() => {
    if (!selectedSector) return []
    return getLocaisBySectorId(selectedSector.id).map((l) => ({
      value: l.name,
      label: l.name,
    }))
  }, [selectedSector, getLocaisBySectorId])

  const status = form.watch('status')

  const onSubmit = async (data: PatrimonioFormValues) => {
    console.log('🎯 onSubmit CHAMADO! Data:', data)
    console.log('👤 User:', user)
    console.log('📦 Patrimonio:', patrimonio)
    
    if (!user || !patrimonio) {
      console.error('❌ Bloqueado: user ou patrimonio ausente')
      return
    }
    
    setIsLoading(true)
    console.log('⏳ Loading iniciado')

    try {
      // ✅ DEBUG: Log completo dos dados do formulário
      console.log('📝 DEBUG - Dados do formulário recebidos:', {
        ...data,
        fotos: data.fotos,
        fotosLength: data.fotos?.length,
        fotosType: typeof data.fotos,
        fotosExpandido: data.fotos?.map((f: any, i: number) => ({
          index: i,
          tipo: typeof f,
          isString: typeof f === 'string',
          isObject: typeof f === 'object',
          valor: f,
          file_url: f?.file_url,
        })),
      })
      console.log('📸 FOTOS ATUAIS DO PATRIMONIO:', patrimonio.fotos)
      
      // ✅ DEBUG: Log das informações do usuário e patrimônio
      console.log('🔍 DEBUG - Informações do usuário:', {
        id: user.id,
        role: user.role,
        email: user.email,
        responsibleSectors: user.responsibleSectors,
        municipalityId: user.municipalityId
      })
      console.log('🔍 DEBUG - Informações do patrimônio:', {
        id: patrimonio.id,
        sectorId: patrimonio.sectorId,
        setor_responsavel: patrimonio.setor_responsavel,
        municipalityId: patrimonio.municipalityId,
        fotosAtuais: patrimonio.fotos,
      })
      // Encontrar o setor pelo nome para pegar o ID
      const sectorData = sectors.find((s) => s.name === data.setor_responsavel)
      const sectorId = sectorData?.id || patrimonio.sectorId
      
      // Encontrar o local pelo nome para pegar o ID (se houver)
      const locais = sectorData ? getLocaisBySectorId(sectorData.id) : []
      const localData = locais.find((l) => l.name === data.local_objeto)
      const localId = localData?.id || patrimonio.localId
      
      // Encontrar o tipo de bem pelo nome para pegar o ID (se houver)
      const tipoData = tiposBens.find((t) => t.nome === data.tipo)
      const tipoId = tipoData?.id || patrimonio.tipoId
      
      // Encontrar a forma de aquisição pelo nome para pegar o ID (se houver)
      const formaData = activeAcquisitionForms.find((f) => f.nome === data.forma_aquisicao)
      const acquisitionFormId = formaData?.id || patrimonio.acquisitionFormId

      // ✅ CORREÇÃO: Enviar apenas os campos necessários, sem objetos de relacionamento
      const updatedPatrimonio: Patrimonio = {
        id: patrimonio.id,
        numero_patrimonio: data.numero_patrimonio || patrimonio.numero_patrimonio,
        descricao_bem: data.descricao_bem,
        tipo: data.tipo,
        marca: data.marca,
        modelo: data.modelo,
        cor: data.cor,
        numero_serie: data.numero_serie,
        data_aquisicao: new Date(data.data_aquisicao || data.dataAquisicao),
        data_baixa: (data.data_baixa || data.dataBaixa) ? new Date(data.data_baixa || data.dataBaixa) : undefined,
        valor_aquisicao: data.valor_aquisicao,
        quantidade: data.quantidade,
        numero_nota_fiscal: data.numero_nota_fiscal,
        forma_aquisicao: data.forma_aquisicao,
        setor_responsavel: data.setor_responsavel,
        local_objeto: data.local_objeto,
        status: data.status,
        situacao_bem: data.situacao_bem,
        observacoes: data.observacoes,
        // ✅ CORREÇÃO: Fotos já vêm como URLs do ImageUpload
        fotos: (() => {
          const fotosProcessadas = (data.fotos || []).map((f: any) => {
            // Se for string, já é URL - apenas limpar se necessário
            if (typeof f === 'string') {
              let url = f
              // Remover domínio se existir (http://localhost:3000/uploads/file.jpg → /uploads/file.jpg)
              if (url.startsWith('http')) {
                url = url.replace(/^https?:\/\/[^\/]+/, '')
              }
              // Remover /api/ se existir (/api/uploads/file.jpg → /uploads/file.jpg)
              if (url.startsWith('/api/')) {
                url = url.replace('/api/', '/')
              }
              return url
            }
            // Se for objeto, pegar file_url
            return f.file_url || f
          })
          
          console.log('🔄 DEBUG - Processamento de fotos:', {
            original: data.fotos,
            processadas: fotosProcessadas,
            originalLength: data.fotos?.length,
            processadasLength: fotosProcessadas.length,
          })
          
          return fotosProcessadas
        })(),
        documentos: (data.documentos || []).map((d: any) =>
          typeof d === 'string' ? d : d.file_url || d
        ),
        metodo_depreciacao: data.metodo_depreciacao,
        vida_util_anos: data.vida_util_anos,
        valor_residual: data.valor_residual,
        // Campos de relacionamento (apenas IDs)
        municipalityId: patrimonio.municipalityId,
        sectorId,
        localId,
        tipoId,
        acquisitionFormId,
        // Campos de auditoria
        createdAt: patrimonio.createdAt,
        createdBy: patrimonio.createdBy,
        updatedAt: patrimonio.updatedAt,
        updatedBy: patrimonio.updatedBy,
      } as Patrimonio

      // ✅ DEBUG: Log dos dados antes do envio
      console.log('📤 DEBUG - Dados que serão enviados para atualização:', {
        ...updatedPatrimonio,
        fotos: updatedPatrimonio.fotos,
        fotosLength: updatedPatrimonio.fotos?.length,
        fotosType: updatedPatrimonio.fotos?.map((f: any) => typeof f),
        fotosValor: updatedPatrimonio.fotos,
      })
      console.log('🔑 DEBUG - IDs encontrados:', { sectorId, localId, tipoId, acquisitionFormId })

      console.log('🚀 DEBUG - Chamando updatePatrimonio...')
      await updatePatrimonio(updatedPatrimonio)
      console.log('✅ DEBUG - updatePatrimonio concluído com sucesso!')
      
      // Forçar atualização dos dados no contexto
      if (id) {
        console.log('🔄 Recarregando dados atualizados do backend...')
        await fetchPatrimonioById(id)
      }
      
      logActivity('PATRIMONIO_UPDATE', {
        record_id: patrimonio.id,
        old_value: patrimonio,
        new_value: updatedPatrimonio,
      })
      toast({
        title: 'Sucesso!',
        description: 'Bem atualizado com sucesso.',
      })
      
      // Navegar para a visualização do bem para ver as alterações
      navigate(`/bens-cadastrados/ver/${patrimonio.id}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Falha ao atualizar o bem.'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }


  if (!patrimonio) {
    return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Editar Bem: {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
          </h1>
          <p className="text-base lg:text-lg text-gray-600">
            Edite as informações do bem patrimonial
          </p>
          <Link
            to="/bens-cadastrados"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para a lista
          </Link>
        </div>
      <Form {...form}>
        <form 
          onSubmit={(e) => {
            console.log('📤 Form submit event triggered')
            console.log('🔍 Form errors:', form.formState.errors)
            console.log('✅ Form isValid:', form.formState.isValid)
            console.log('📋 Form values:', form.getValues())
            console.log('🔴 Form dirtyFields:', form.formState.dirtyFields)
            console.log('🔴 Form touchedFields:', form.formState.touchedFields)
            
            // Verificar campos específicos que podem estar causando problema
            const values = form.getValues()
            console.log('🔎 Verificação de campos críticos:', {
              numero_patrimonio: values.numero_patrimonio,
              descricao_bem: values.descricao_bem,
              tipo: values.tipo,
              setor_responsavel: values.setor_responsavel,
              data_aquisicao: values.data_aquisicao,
              valor_aquisicao: values.valor_aquisicao,
            })
            
            form.handleSubmit(
              onSubmit,
              (errors) => {
                console.error('❌ Erros de validação detalhados:', errors)
                console.error('❌ motivo_baixa error:', errors.motivo_baixa)
                console.error('❌ Todos os erros expandidos:', JSON.stringify(errors, null, 2))
              }
            )(e)
          }} 
          className="space-y-6"
        >
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
                        <Input {...field} disabled />
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
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      <FormControl>
                        <Input {...field} placeholder="Ex: Sala 101, Almoxarifado" />
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
              <FormField
                control={form.control}
                name="fotos"
                render={() => (
                  <div>
                    <FormLabel>Fotos do Bem</FormLabel>
                    <ImageUpload
                      name="fotos"
                      control={form.control}
                      assetId={patrimonio.id}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/bens-cadastrados')}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={() => console.log('🖱️ Botão "Salvar Alterações" clicado!')}
            >
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

export default BensEdit
