import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Imovel, User } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { isConnectionDownError, extractApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

// Cache compartilhado de imóveis (React Query). Fonte ÚNICA — o Context é uma
// fachada fina por cima, sem o fetch manual (useState/useEffect) que duplicava
// estado fora do React Query.
const IMOVEIS_KEY = ['imoveis'] as const

interface ImovelContextType {
  imoveis: Imovel[]
  isLoading: boolean
  error: string | null
  getImovelById: (id: string) => Imovel | undefined
  addImovel: (
    data: Omit<Imovel, 'id' | 'historico'>,
    user: User,
  ) => Promise<void>
  updateImovel: (id: string, data: Partial<Imovel>, user: User) => Promise<void>
  deleteImovel: (id: string) => Promise<void>
}

const ImovelContext = createContext<ImovelContextType | null>(null)

export const ImovelProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: IMOVEIS_KEY,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await api.get<Imovel[] | { imoveis: Imovel[] }>('/imoveis')
        return Array.isArray(response) ? response : response.imoveis || []
      } catch (err) {
        if (isConnectionDownError(err)) {
          logger.debug('Backend não disponível - usando lista vazia de imóveis')
          return []
        }
        throw err
      }
    },
  })

  const imoveis = data ?? []
  const error = queryError ? extractApiError(queryError).message : null

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: IMOVEIS_KEY }),
    [queryClient],
  )

  const getImovelById = useCallback(
    (id: string) => imoveis.find((i) => i.id === id),
    [imoveis],
  )

  const addImovel = useCallback(
    async (data: Omit<Imovel, 'id' | 'historico'>, _user: User) => {
      logger.debug('ImovelContext: Criando imóvel', { data })
      await api.post<Imovel>('/imoveis', data)
      await invalidate()
      toast({ description: 'Imóvel cadastrado com sucesso.' })
    },
    [invalidate],
  )

  const updateImovel = useCallback(
    async (id: string, data: Partial<Imovel>, _user: User) => {
      logger.debug('ImovelContext: Atualizando imóvel', { id, data })
      await api.put<Imovel>(`/imoveis/${id}`, data)
      await invalidate()
      toast({ description: 'Imóvel atualizado com sucesso.' })
    },
    [invalidate],
  )

  const deleteImovel = useCallback(
    async (id: string) => {
      await api.delete(`/imoveis/${id}`)
      await invalidate()
      toast({ description: 'Imóvel excluído com sucesso.' })
    },
    [invalidate],
  )

  const value = useMemo(
    () => ({
      imoveis,
      isLoading,
      error,
      getImovelById,
      addImovel,
      updateImovel,
      deleteImovel,
    }),
    [imoveis, isLoading, error, getImovelById, addImovel, updateImovel, deleteImovel],
  )

  return (
    <ImovelContext.Provider value={value}>{children}</ImovelContext.Provider>
  )
}

export const useImovel = () => {
  const context = useContext(ImovelContext)
  if (!context) {
    throw new Error('useImovel must be used within an ImovelProvider')
  }
  return context
}
