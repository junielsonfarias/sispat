import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Local } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { isConnectionDownError, extractApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

// Fonte única em React Query (cache compartilhado, sem fetch manual paralelo).
const LOCAIS_KEY = ['locais'] as const

interface LocalContextType {
  locais: Local[]
  isLoading: boolean
  setLocais: (locais: Local[]) => void
  getLocaisBySectorId: (sectorId: string) => Local[]
  addLocal: (name: string, sectorId: string) => Promise<void>
  updateLocal: (id: string, name: string, sectorId: string) => Promise<void>
  deleteLocal: (id: string) => Promise<void>
  refreshLocais: () => Promise<void>
}

const LocalContext = createContext<LocalContextType | null>(null)

export const LocalProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: LOCAIS_KEY,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await api.get<Local[] | { locais: Local[] }>('/locais')
        return Array.isArray(response) ? response : response.locais || []
      } catch (error) {
        if (isConnectionDownError(error)) {
          logger.debug('Backend não disponível - usando lista vazia de locais')
          return []
        }
        throw error
      }
    },
  })

  const locais = data ?? []

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: LOCAIS_KEY }),
    [queryClient],
  )

  const setLocais = useCallback(
    (next: Local[]) => queryClient.setQueryData(LOCAIS_KEY, next),
    [queryClient],
  )

  const getLocaisBySectorId = useCallback(
    (sectorId: string) => locais.filter((l) => l.sectorId === sectorId),
    [locais],
  )

  const addLocal = useCallback(
    async (name: string, sectorId: string) => {
      // municipalityId vem do token no backend — não enviar do cliente.
      await api.post<Local>('/locais', { name, sectorId })
      await invalidate()
      toast({ description: 'Local criado com sucesso.' })
    },
    [invalidate],
  )

  const updateLocal = useCallback(
    async (id: string, name: string, sectorId: string) => {
      try {
        await api.put<Local>(`/locais/${id}`, { name, sectorId })
        await invalidate()
        toast({ description: 'Local atualizado com sucesso.' })
      } catch (error) {
        if (extractApiError(error).status === 404) {
          await invalidate()
          toast({
            variant: 'destructive',
            title: 'Local não encontrado',
            description: 'Este local foi excluído. A lista será atualizada.',
          })
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar local.' })
          throw error
        }
      }
    },
    [invalidate],
  )

  const deleteLocal = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/locais/${id}`)
        await invalidate()
        toast({ description: 'Local excluído com sucesso.' })
      } catch (error) {
        if (extractApiError(error).status === 404) {
          await invalidate()
          toast({ description: 'Local já foi excluído anteriormente.' })
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir local.' })
          throw error
        }
      }
    },
    [invalidate],
  )

  const refreshLocais = useCallback(async () => {
    await invalidate()
  }, [invalidate])

  return (
    <LocalContext.Provider
      value={{
        locais,
        isLoading,
        setLocais,
        getLocaisBySectorId,
        addLocal,
        updateLocal,
        deleteLocal,
        refreshLocais,
      }}
    >
      {children}
    </LocalContext.Provider>
  )
}

export const useLocais = () => {
  const context = useContext(LocalContext)
  if (!context) {
    throw new Error('useLocais must be used within a LocalProvider')
  }
  return context
}
