import React, { createContext, useContext, useCallback, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { isConnectionDownError } from '@/lib/api-error'
import { useAuth } from '@/hooks/useAuth'
import { TipoBem } from '@/types'

// Fonte única em React Query (cache compartilhado, sem fetch manual paralelo).
const TIPOS_BENS_KEY = ['tipos-bens'] as const

interface TiposBensContextType {
  tiposBens: TipoBem[]
  isLoading: boolean
  error: string | null
  fetchTiposBens: () => Promise<void>
  // `codigo` e `municipalityId` são gerados/derivados no backend (do token),
  // não são enviados pelo formulário.
  createTipoBem: (data: Omit<TipoBem, 'id' | 'codigo' | 'municipalityId' | 'createdAt' | 'updatedAt'>) => Promise<TipoBem>
  updateTipoBem: (id: string, data: Partial<TipoBem>) => Promise<TipoBem>
  deleteTipoBem: (id: string) => Promise<void>
  toggleTipoBemStatus: (id: string) => Promise<TipoBem>
}

const TiposBensContext = createContext<TiposBensContextType | undefined>(undefined)

export const TiposBensProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: TIPOS_BENS_KEY,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await api.get<TipoBem[] | { tiposBens: TipoBem[] }>('/tipos-bens')
        return Array.isArray(response) ? response : response.tiposBens || []
      } catch (err) {
        if (isConnectionDownError(err)) return []
        throw err
      }
    },
  })

  const tiposBens = data ?? []
  const error = queryError ? 'Erro ao carregar tipos de bens' : null

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: TIPOS_BENS_KEY }),
    [queryClient],
  )

  const fetchTiposBens = useCallback(async () => {
    await invalidate()
  }, [invalidate])

  const createTipoBem = useCallback(
    async (data: Omit<TipoBem, 'id' | 'codigo' | 'municipalityId' | 'createdAt' | 'updatedAt'>) => {
      const newTipoBem = await api.post<TipoBem>('/tipos-bens', data)
      await invalidate()
      return newTipoBem
    },
    [invalidate],
  )

  const updateTipoBem = useCallback(
    async (id: string, data: Partial<TipoBem>) => {
      const updated = await api.put<TipoBem>(`/tipos-bens/${id}`, data)
      await invalidate()
      return updated
    },
    [invalidate],
  )

  const deleteTipoBem = useCallback(
    async (id: string) => {
      await api.delete(`/tipos-bens/${id}`)
      await invalidate()
    },
    [invalidate],
  )

  const toggleTipoBemStatus = useCallback(
    async (id: string) => {
      // A rota PATCH /toggle não existe (404). Usa o PUT (que agora persiste
      // `ativo`) invertendo o valor atual da lista.
      const current = tiposBens.find((t) => t.id === id)
      const updated = await api.put<TipoBem>(`/tipos-bens/${id}`, {
        ativo: !(current?.ativo ?? true),
      })
      await invalidate()
      return updated
    },
    [invalidate, tiposBens],
  )

  return (
    <TiposBensContext.Provider
      value={{
        tiposBens,
        isLoading,
        error,
        fetchTiposBens,
        createTipoBem,
        updateTipoBem,
        deleteTipoBem,
        toggleTipoBemStatus,
      }}
    >
      {children}
    </TiposBensContext.Provider>
  )
}

export const useTiposBens = () => {
  const context = useContext(TiposBensContext)
  if (context === undefined) {
    throw new Error('useTiposBens deve ser usado dentro de um TiposBensProvider')
  }
  return context
}
