import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { isConnectionDownError, extractApiError } from '@/lib/api-error'
import { useAuth } from './AuthContext'
import { useActivityLog } from './ActivityLogContext'

// Fonte única em React Query (cache compartilhado, sem fetch manual paralelo).
const FORMAS_KEY = ['formas-aquisicao'] as const

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

// Normaliza datas (string ISO → Date) do payload do backend.
const withDates = (form: AcquisitionForm): AcquisitionForm => ({
  ...form,
  createdAt: new Date(form.createdAt),
  updatedAt: new Date(form.updatedAt),
})

export const AcquisitionFormProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const { logActivity } = useActivityLog()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: FORMAS_KEY,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await api.get<
          AcquisitionForm[] | { formasAquisicao: AcquisitionForm[] }
        >('/formas-aquisicao')
        const formsData = Array.isArray(response) ? response : response.formasAquisicao || []
        return formsData.map(withDates)
      } catch (error) {
        if (isConnectionDownError(error)) return []
        throw error
      }
    },
  })

  const acquisitionForms = data ?? []
  const activeAcquisitionForms = acquisitionForms.filter((form) => form.ativo)

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: FORMAS_KEY }),
    [queryClient],
  )

  const fetchAcquisitionForms = useCallback(async () => {
    await invalidate()
  }, [invalidate])

  const addAcquisitionForm = useCallback(
    async (formData: Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await api.post<AcquisitionForm>('/formas-aquisicao', formData)
        await invalidate()
        logActivity('ACQUISITION_FORM_CREATE', { details: `Adicionou a forma: ${formData.nome}` })
        toast({ title: 'Sucesso', description: 'Forma de aquisição adicionada com sucesso.' })
        return withDates(response)
      } catch (error) {
        toast({
          title: 'Erro',
          description: extractApiError(error).message || 'Não foi possível adicionar a forma de aquisição.',
          variant: 'destructive',
        })
        return undefined
      }
    },
    [invalidate, logActivity],
  )

  const updateAcquisitionForm = useCallback(
    async (
      id: string,
      formData: Partial<Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => {
      try {
        const response = await api.put<AcquisitionForm>(`/formas-aquisicao/${id}`, formData)
        await invalidate()
        logActivity('ACQUISITION_FORM_UPDATE', { details: `Atualizou a forma: ${formData.nome || id}` })
        toast({ title: 'Sucesso', description: 'Forma de aquisição atualizada com sucesso.' })
        return withDates(response)
      } catch (error) {
        toast({
          title: 'Erro',
          description: extractApiError(error).message || 'Não foi possível atualizar a forma de aquisição.',
          variant: 'destructive',
        })
        return undefined
      }
    },
    [invalidate, logActivity],
  )

  const deleteAcquisitionForm = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/formas-aquisicao/${id}`)
        await invalidate()
        logActivity('ACQUISITION_FORM_DELETE', { details: `Excluiu a forma com ID: ${id}` })
        toast({ title: 'Sucesso', description: 'Forma de aquisição excluída com sucesso.' })
        return true
      } catch (error) {
        toast({
          title: 'Erro',
          description: extractApiError(error).message || 'Não foi possível excluir a forma de aquisição.',
          variant: 'destructive',
        })
        return false
      }
    },
    [invalidate, logActivity],
  )

  const toggleAcquisitionFormStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      try {
        // A rota PATCH /toggle-status não existe (404). Usa o PUT (que agora
        // persiste `ativo`) invertendo o status atual recebido.
        await api.put<AcquisitionForm>(`/formas-aquisicao/${id}`, { ativo: !currentStatus })
        await invalidate()
        logActivity('ACQUISITION_FORM_UPDATE', {
          details: `${currentStatus ? 'Desativou' : 'Ativou'} a forma com ID: ${id}`,
        })
        toast({
          title: 'Sucesso',
          description: `Forma de aquisição ${currentStatus ? 'desativada' : 'ativada'} com sucesso.`,
        })
        return true
      } catch (error) {
        toast({
          title: 'Erro',
          description:
            extractApiError(error).message || 'Não foi possível alterar o status da forma de aquisição.',
          variant: 'destructive',
        })
        return false
      }
    },
    [invalidate, logActivity],
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
