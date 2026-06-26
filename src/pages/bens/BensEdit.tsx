import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { AcquisitionForm, Patrimonio } from '@/types'
import { format } from 'date-fns'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { useTiposBens } from '@/contexts/TiposBensContext'
import { useAcquisitionForms } from '@/contexts/AcquisitionFormContext'
import { patrimonioEditSchema } from '@/lib/validations/patrimonioSchema'
import { logger } from '@/lib/logger'
import {
  BensIdentificacaoFields,
  BensAquisicaoFields,
  BensLicitacaoFields,
  BensNotaFiscalField,
} from '@/components/bens/BensSharedFields'

type PatrimonioFormValues = z.infer<typeof patrimonioEditSchema>

const BensEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchPatrimonioById, updatePatrimonio } = usePatrimonio()
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
        
        // ✅ CORREÇÃO: Converter strings de URLs para objetos que ImageUpload espera
        const fotosParaForm = (data.fotos || ((data as unknown as Record<string, unknown>).photos as string[]) || []).map((foto: any, index: number) => {
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
        
        const raw = data as unknown as Record<string, unknown>
        form.reset({
          ...data,
          data_aquisicao: (data.data_aquisicao || raw.dataAquisicao as Date | undefined)
            ? format(new Date((data.data_aquisicao || raw.dataAquisicao as Date)!), 'yyyy-MM-dd')
            : '',
          data_baixa: (data.data_baixa || raw.dataBaixa as Date | undefined)
            ? format(new Date((data.data_baixa || raw.dataBaixa as Date)!), 'yyyy-MM-dd')
            : '',
          fotos: fotosParaForm,
          documentos: data.documentos || (raw.documents as string[]) || [],
          // ✅ CORREÇÃO: Mapear relacionamentos para nomes
          setor_responsavel: (raw.sector as { name: string } | undefined)?.name || data.setor_responsavel || '',
          local_objeto: (raw.local as { name: string } | undefined)?.name || data.local_objeto || '',
          tipo: (raw.tipoBem as { nome: string } | undefined)?.nome || data.tipo || '',
          forma_aquisicao: (raw.acquisitionForm as { nome: string } | undefined)?.nome || data.forma_aquisicao || '',
          numero_licitacao: data.numero_licitacao || '',
          ano_licitacao: data.ano_licitacao,
          tipo_posse: data.tipo_posse || 'proprio',
          origem_recurso: data.origem_recurso || undefined,
          clausulas_reversao: data.clausulas_reversao || undefined,
        } as unknown as PatrimonioFormValues)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Erro ao carregar patrimônio:', error)
        }
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


  const onSubmit = async (data: PatrimonioFormValues) => {
    if (!user || !patrimonio) {
      return
    }
    
    setIsLoading(true)

    const patrimonioRaw = patrimonio as unknown as Record<string, unknown>
    try {
      // Encontrar o setor pelo nome para pegar o ID
      const sectorData = sectors.find((s) => s.name === data.setor_responsavel)
      const sectorId = sectorData?.id || (patrimonioRaw.sectorId as string | undefined)

      // Encontrar o local pelo nome para pegar o ID (se houver)
      const locais = sectorData ? getLocaisBySectorId(sectorData.id) : []
      const localData = locais.find((l) => l.name === data.local_objeto)
      const localId = localData?.id || (patrimonioRaw.localId as string | undefined)

      // Encontrar o tipo de bem pelo nome para pegar o ID (se houver)
      const tipoData = tiposBens.find((t) => t.nome === data.tipo)
      const tipoId = tipoData?.id || patrimonio.tipo

      // Encontrar a forma de aquisição pelo nome para pegar o ID (se houver)
      const formaData = activeAcquisitionForms.find((f) => f.nome === data.forma_aquisicao)
      const acquisitionFormId = formaData?.id || (patrimonioRaw.acquisitionFormId as string | undefined)

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
        data_aquisicao: new Date(data.data_aquisicao!),
        data_baixa: data.data_baixa ? new Date(data.data_baixa) : undefined,
        valor_aquisicao: data.valor_aquisicao,
        quantidade: data.quantidade,
        numero_nota_fiscal: data.numero_nota_fiscal,
        forma_aquisicao: data.forma_aquisicao,
        numero_licitacao: data.numero_licitacao,
        ano_licitacao: data.ano_licitacao,
        // Conformidade: posse (Art. 13 §3) e origem do recurso/reversão (Art. 4
        // Decreto / Art. 13 §2 Lei) — precisam ir no payload explícito de edição.
        tipo_posse: data.tipo_posse,
        origem_recurso: data.origem_recurso || null,
        clausulas_reversao: data.clausulas_reversao || null,
        setor_responsavel: data.setor_responsavel,
        local_objeto: data.local_objeto,
        status: data.status,
        // Converter situacao_bem para maiúsculas (backend espera: OTIMO, BOM, REGULAR, RUIM, PESSIMO)
        situacao_bem: data.situacao_bem && typeof data.situacao_bem === 'string' && data.situacao_bem.trim() !== '' 
          ? data.situacao_bem.toUpperCase() 
          : (data.situacao_bem || null),
        observacoes: data.observacoes,
        // ✅ CORREÇÃO: Fotos já vêm como URLs do ImageUpload
        fotos: (() => {
          const fotosProcessadas = (data.fotos || []).map((f: any) => {
            // Se for string, já é URL - apenas limpar se necessário
            if (typeof f === 'string') {
              let url = f
              // Remover domínio se existir (http://localhost:3000/uploads/file.jpg → /uploads/file.jpg)
              if (url.startsWith('http')) {
                url = url.replace(/^https?:\/\/[^/]+/, '')
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
          
          logger.debug('Processamento de fotos', {
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
      } as unknown as Patrimonio

      await updatePatrimonio(updatedPatrimonio)
      
      // Forçar atualização dos dados no contexto
      if (id) {
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
            Editar Bem: {patrimonio.numero_patrimonio}
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
            form.handleSubmit(
              onSubmit,
              (errors) => {
                // Mostrar toast com os erros encontrados
                const errorFields = Object.keys(errors)
                if (errorFields.length > 0) {
                  const firstError = errors[errorFields[0] as keyof typeof errors]
                  const errorMessage = firstError?.message || 'Por favor, verifique os campos obrigatórios.'
                  
                  toast({
                    variant: 'destructive',
                    title: 'Erro de Validação',
                    description: errorMessage,
                  })
                  
                  // Rolar até o primeiro campo com erro
                  const firstErrorField = document.querySelector(`[name="${errorFields[0]}"]`) as HTMLElement
                  if (firstErrorField) {
                    firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    firstErrorField.focus()
                  }
                }
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                          <SelectItem value="baixado">Baixado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Bem</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="manutencao">Em Manutenção</SelectItem>
                          <SelectItem value="baixado">Baixado</SelectItem>
                          <SelectItem value="extraviado">Extraviado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_posse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de Posse</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a posse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="proprio">Próprio (do município)</SelectItem>
                          <SelectItem value="cessao">Cessão (de terceiros)</SelectItem>
                          <SelectItem value="comodato">Comodato (de terceiros)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Bens em cessão/comodato não integram o ativo do município (Art. 13 §3).
                      </FormDescription>
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

              <BensAquisicaoFields control={form.control} activeAcquisitionForms={activeAcquisitionForms as unknown as AcquisitionForm[]} />

              <BensLicitacaoFields control={form.control} />

              <BensIdentificacaoFields control={form.control} tiposBens={tiposBens} />

              <BensNotaFiscalField control={form.control} />
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
              onClick={() => logger.debug('Botão "Salvar Alterações" clicado!')}
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
