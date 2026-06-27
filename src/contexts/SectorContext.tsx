import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Sector } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { isConnectionDownError, extractApiError } from '@/lib/api-error'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'

// Chave única do cache de setores — COMPARTILHADA com o hook de query
// `src/hooks/queries/use-sectors.ts`. Manter igual para que Context e hook usem
// o MESMO cache do React Query (sem fetch duplicado).
const SECTORS_KEY = ['sectors'] as const

interface SectorContextType {
  sectors: Sector[]
  isLoading: boolean
  setSectors: (sectors: Sector[]) => void
  getSectorById: (id: string) => Sector | undefined
  addSector: (data: Omit<Sector, 'id'>) => Promise<void>
  updateSector: (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>,
  ) => Promise<void>
  deleteSector: (id: string) => Promise<void>
  refreshSectors: () => Promise<void>
}

const SectorContext = createContext<SectorContextType | null>(null)

export const SectorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fonte ÚNICA de setores: React Query. O Context é uma fachada fina por cima —
  // os consumidores (useSectors) seguem iguais, mas sem o fetch paralelo que o
  // provider antigo fazia (que duplicava com o hook de query).
  const { data, isLoading } = useQuery({
    queryKey: SECTORS_KEY,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // setores mudam raramente
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await api.get<Sector[] | { sectors: Sector[] }>('/sectors')
        // A API pode devolver array direto ou { sectors, pagination }.
        return Array.isArray(response) ? response : response.sectors || []
      } catch (error) {
        // Backend fora do ar → lista vazia silenciosa (mesmo comportamento do antigo).
        if (isConnectionDownError(error)) {
          logger.debug('Backend não disponível - usando lista vazia de setores')
          return []
        }
        throw error
      }
    },
  })

  const sectors = data ?? []

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SECTORS_KEY }),
    [queryClient],
  )

  const setSectors = useCallback(
    (next: Sector[]) => queryClient.setQueryData(SECTORS_KEY, next),
    [queryClient],
  )

  const getSectorById = useCallback(
    (id: string) => sectors.find((s) => s.id === id),
    [sectors],
  )

  const addSector = useCallback(
    async (data: Omit<Sector, 'id'>) => {
      await api.post<Sector>('/sectors', data)
      await invalidate()
      toast({ description: 'Setor criado com sucesso.' })
    },
    [invalidate],
  )

  const updateSector = useCallback(
    async (id: string, data: Omit<Sector, 'id' | 'municipalityId'>) => {
      logger.debug('SectorContext.updateSector', { id, data })
      try {
        await api.put<Sector>(`/sectors/${id}`, data)
        await invalidate()
        toast({ description: 'Setor atualizado com sucesso.' })
      } catch (error) {
        if (extractApiError(error).status === 404) {
          await invalidate()
          toast({
            variant: 'destructive',
            title: 'Setor não encontrado',
            description: 'Este setor foi excluído. A lista será atualizada.',
          })
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar setor.' })
          throw error
        }
      }
    },
    [invalidate],
  )

  const deleteSector = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/sectors/${id}`)
        await invalidate()
        toast({ description: 'Setor excluído com sucesso.' })
      } catch (error) {
        // Já deletado (404): apenas sincroniza a lista.
        if (extractApiError(error).status === 404) {
          await invalidate()
          toast({ description: 'Setor já foi excluído anteriormente.' })
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir setor.' })
          throw error
        }
      }
    },
    [invalidate],
  )

  const refreshSectors = useCallback(async () => {
    await invalidate()
  }, [invalidate])

  const value = useMemo(
    () => ({
      sectors,
      isLoading,
      setSectors,
      getSectorById,
      addSector,
      updateSector,
      deleteSector,
      refreshSectors,
    }),
    [sectors, isLoading, setSectors, getSectorById, addSector, updateSector, deleteSector, refreshSectors],
  )

  return <SectorContext.Provider value={value}>{children}</SectorContext.Provider>
}

export const useSectors = () => {
  const context = useContext(SectorContext)
  if (!context) {
    throw new Error('useSectors must be used within a SectorProvider')
  }
  return context
}
