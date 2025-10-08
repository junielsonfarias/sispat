import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from 'react'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { useAuth } from './AuthContext'
import { useActivityLog } from './ActivityLogContext'

interface AcquisitionForm {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

interface AcquisitionFormContextType {
  acquisitionForms: AcquisitionForm[]
  activeAcquisitionForms: AcquisitionForm[]
  isLoading: boolean
  fetchAcquisitionForms: () => Promise<void>
  addAcquisitionForm: (
    form: Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<AcquisitionForm | undefined>
  updateAcquisitionForm: (
    id: string,
    form: Partial<Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<AcquisitionForm | undefined>
  deleteAcquisitionForm: (id: string) => Promise<boolean>
  toggleAcquisitionFormStatus: (id: string, currentStatus: boolean) => Promise<boolean>
}

const AcquisitionFormContext = createContext<
  AcquisitionFormContextType | undefined
>(undefined)

export const AcquisitionFormProvider = ({ children }: { children: ReactNode }) => {
  const [acquisitionForms, setAcquisitionForms] = useState<AcquisitionForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { logActivity } = useActivityLog()

  const municipalityId = '1' // ✅ CORREÇÃO: Sistema single-municipality

  const activeAcquisitionForms = acquisitionForms.filter((form) => form.ativo)

  const fetchAcquisitionForms = useCallback(async () => {
    if (!municipalityId) {
      toast({
        title: 'Erro',
        description: 'ID do município não disponível para buscar formas de aquisição.',
        variant: 'destructive',
      })
      return
    }
    console.log('🔍 AcquisitionFormContext: Iniciando busca de formas de aquisição...')
    setIsLoading(true)
    try {
      const response = await api.get<{ formasAquisicao: AcquisitionForm[]; pagination: any }>('/formas-aquisicao')
      console.log('🔍 AcquisitionFormContext: Resposta da API:', response)
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade formasAquisicao
      const formsData = Array.isArray(response) ? response : (response.formasAquisicao || [])
      const forms = formsData.map((form: any) => ({
        ...form,
        createdAt: new Date(form.createdAt),
        updatedAt: new Date(form.updatedAt),
      }))
      console.log('🔍 AcquisitionFormContext: Formas de aquisição carregadas:', forms.length)
      setAcquisitionForms(forms)
    } catch (error) {
      console.error('❌ AcquisitionFormContext: Erro ao buscar formas de aquisição:', error)
      // Error handled by error boundary
      toast({
        title: 'Erro ao carregar formas de aquisição',
        description: 'Não foi possível carregar as formas de aquisição.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [municipalityId])

  useEffect(() => {
    // ✅ CORREÇÃO: Só buscar formas de aquisição se o usuário estiver autenticado
    if (user && municipalityId) {
      fetchAcquisitionForms()
    }
  }, [user, municipalityId, fetchAcquisitionForms])

  const addAcquisitionForm = useCallback(
    async (formData: Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!municipalityId) {
        toast({
          title: 'Erro',
          description: 'ID do município não disponível para adicionar forma de aquisição.',
          variant: 'destructive',
        })
        return undefined
      }
      try {
        const response = await api.post<AcquisitionForm>('/formas-aquisicao', formData)
        const newForm = {
          ...response,
          createdAt: new Date(response.createdAt),
          updatedAt: new Date(response.updatedAt),
        }
        // Não adicionar novamente pois o mock API já adiciona à lista
        // setAcquisitionForms((prev) => [...prev, newForm])
        logActivity('Forma de Aquisição', `Adicionou a forma: ${formData.nome}`)
        toast({ title: 'Sucesso', description: 'Forma de aquisição adicionada com sucesso.' })
        return newForm
      } catch (error: any) {
        const errorMessage =
          error.message || 'Não foi possível adicionar a forma de aquisição.'
        toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
        return undefined
      }
    },
    [municipalityId, logActivity]
  )

  const updateAcquisitionForm = useCallback(
    async (
      id: string,
      formData: Partial<Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>>
    ) => {
      if (!municipalityId) {
        toast({
          title: 'Erro',
          description: 'ID do município não disponível para atualizar forma de aquisição.',
          variant: 'destructive',
        })
        return undefined
      }
      try {
        const response = await api.put<AcquisitionForm>(`/formas-aquisicao/${id}`, formData)
        const updatedForm = {
          ...response,
          createdAt: new Date(response.createdAt),
          updatedAt: new Date(response.updatedAt),
        }
        setAcquisitionForms((prev) =>
          prev.map((form) => (form.id === id ? updatedForm : form))
        )
        logActivity('Forma de Aquisição', `Atualizou a forma: ${formData.nome || id}`)
        toast({ title: 'Sucesso', description: 'Forma de aquisição atualizada com sucesso.' })
        return updatedForm
      } catch (error: any) {
        const errorMessage =
          error.message || 'Não foi possível atualizar a forma de aquisição.'
        toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
        return undefined
      }
    },
    [municipalityId, logActivity]
  )

  const deleteAcquisitionForm = useCallback(
    async (id: string) => {
      if (!municipalityId) {
        toast({
          title: 'Erro',
          description: 'ID do município não disponível para excluir forma de aquisição.',
          variant: 'destructive',
        })
        return false
      }
      try {
        await api.delete(`/formas-aquisicao/${id}`)
        setAcquisitionForms((prev) => prev.filter((form) => form.id !== id))
        logActivity('Forma de Aquisição', `Excluiu a forma com ID: ${id}`)
        toast({ title: 'Sucesso', description: 'Forma de aquisição excluída com sucesso.' })
        return true
      } catch (error: any) {
        const errorMessage =
          error.message || 'Não foi possível excluir a forma de aquisição.'
        toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
        return false
      }
    },
    [municipalityId, logActivity]
  )

  const toggleAcquisitionFormStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      if (!municipalityId) {
        toast({
          title: 'Erro',
          description: 'ID do município não disponível para alterar status da forma de aquisição.',
          variant: 'destructive',
        })
        return false
      }
      try {
        const response = await api.patch<AcquisitionForm>(
          `/formas-aquisicao/${id}/toggle-status`
        )
        const updatedForm = {
          ...response,
          createdAt: new Date(response.createdAt),
          updatedAt: new Date(response.updatedAt),
        }
        setAcquisitionForms((prev) =>
          prev.map((form) => (form.id === id ? updatedForm : form))
        )
        logActivity(
          'Forma de Aquisição',
          `${currentStatus ? 'Desativou' : 'Ativou'} a forma com ID: ${id}`
        )
        toast({
          title: 'Sucesso',
          description: `Forma de aquisição ${currentStatus ? 'desativada' : 'ativada'} com sucesso.`,
        })
        return true
      } catch (error: any) {
        const errorMessage =
          error.message ||
          'Não foi possível alterar o status da forma de aquisição.'
        toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
        return false
      }
    },
    [municipalityId, logActivity]
  )

  return (
    <AcquisitionFormContext.Provider
      value={{
        acquisitionForms,
        activeAcquisitionForms,
        isLoading,
        fetchAcquisitionForms,
        addAcquisitionForm,
        updateAcquisitionForm,
        deleteAcquisitionForm,
        toggleAcquisitionFormStatus,
      }}
    >
      {children}
    </AcquisitionFormContext.Provider>
  )
}

export const useAcquisitionForms = () => {
  const context = useContext(AcquisitionFormContext)
  if (context === undefined) {
    throw new Error(
      'useAcquisitionForms must be used within an AcquisitionFormProvider'
    )
  }
  return context
}

