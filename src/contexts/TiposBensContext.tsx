import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/services/api-adapter'
import { useAuth } from '@/hooks/useAuth'
import { TipoBem } from '@/types'

interface TiposBensContextType {
  tiposBens: TipoBem[]
  isLoading: boolean
  error: string | null
  fetchTiposBens: () => Promise<void>
  createTipoBem: (data: Omit<TipoBem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TipoBem>
  updateTipoBem: (id: string, data: Partial<TipoBem>) => Promise<TipoBem>
  deleteTipoBem: (id: string) => Promise<void>
  toggleTipoBemStatus: (id: string) => Promise<TipoBem>
}

const TiposBensContext = createContext<TiposBensContextType | undefined>(undefined)

export const TiposBensProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tiposBens, setTiposBens] = useState<TipoBem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchTiposBens = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ tiposBens: TipoBem[]; pagination: any }>('/tipos-bens')
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade tiposBens
      const tiposData = Array.isArray(response) ? response : (response.tiposBens || [])
      setTiposBens(tiposData)
    } catch (err) {
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de erro
      if (err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
        setTiposBens([])
        setError(null)
      } else {
        setError('Erro ao carregar tipos de bens')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createTipoBem = async (data: Omit<TipoBem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Usuário não encontrado')

    const newTipoBem = await api.post<TipoBem>('/tipos-bens', data)
    
    // Adicionar o novo tipo à lista local
    setTiposBens(prev => [...prev, newTipoBem])
    
    // Recarregar a lista completa do servidor para garantir sincronização
    await fetchTiposBens()
    
    return newTipoBem
  }

  const updateTipoBem = async (id: string, data: Partial<TipoBem>) => {
    if (!user) throw new Error('Usuário não encontrado')

    const updatedTipoBem = await api.put<TipoBem>(`/tipos-bens/${id}`, data)
    setTiposBens(prev => prev.map(tipo => tipo.id === id ? updatedTipoBem : tipo))
    return updatedTipoBem
  }

  const deleteTipoBem = async (id: string) => {
    if (!user) throw new Error('Usuário não encontrado')

    await api.delete(`/tipos-bens/${id}`)
    setTiposBens(prev => prev.filter(tipo => tipo.id !== id))
  }

  const toggleTipoBemStatus = async (id: string) => {
    if (!user) throw new Error('Usuário não encontrado')

    const updatedTipoBem = await api.patch<TipoBem>(`/tipos-bens/${id}/toggle`)
    setTiposBens(prev => prev.map(tipo => tipo.id === id ? updatedTipoBem : tipo))
    return updatedTipoBem
  }

  useEffect(() => {
    if (user) {
      fetchTiposBens()
    }
  }, [user])

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
