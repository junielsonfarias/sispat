import { api } from '@/services/api'
import { Local } from '@/types'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

interface LocalContextType {
  locals: Local[]
  userLocals: Local[]
  isLoading: boolean
  error: string | null
  fetchLocals: () => Promise<void>
  fetchUserLocals: () => Promise<void>
  fetchLocalsBySector: (sectorId: string) => Promise<Local[]>
  clearError: () => void
}

const LocalContext = createContext<LocalContextType | undefined>(undefined)

export const useLocals = () => {
  const context = useContext(LocalContext)
  if (!context) {
    throw new Error('useLocals deve ser usado dentro de um LocalProvider')
  }
  return context
}

interface LocalProviderProps {
  children: React.ReactNode
}

export const LocalProvider: React.FC<LocalProviderProps> = ({ children }) => {
  const [locals, setLocals] = useState<Local[]>([])
  const [userLocals, setUserLocals] = useState<Local[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchLocals = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Carregando todos os locais...')
      const data = await api.get<Local[]>('/locals')
      console.log('✅ Locais carregados:', data?.length || 0, 'locais')
      setLocals(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar locais:', error)
      setError('Erro ao carregar locais')
      setLocals([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const fetchUserLocals = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Carregando locais dos setores do usuário...')
      const data = await api.get<Local[]>('/locals/user-sectors')
      console.log('✅ Locais do usuário carregados:', data?.length || 0, 'locais')
      setUserLocals(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar locais do usuário:', error)
      setError('Erro ao carregar locais do usuário')
      setUserLocals([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const fetchLocalsBySector = useCallback(async (sectorId: string): Promise<Local[]> => {
    if (!user || !sectorId) return []

    try {
      console.log('🔍 Carregando locais do setor:', sectorId)
      const data = await api.get<Local[]>(`/locals/my-sector/${sectorId}`)
      console.log('✅ Locais do setor carregados:', data?.length || 0, 'locais')
      return data || []
    } catch (error) {
      console.error('❌ Erro ao carregar locais do setor:', error)
      setError('Erro ao carregar locais do setor')
      return []
    }
  }, [user])

  // Carregar locais automaticamente quando o usuário mudar
  useEffect(() => {
    if (user) {
      if (user.role === 'superuser' || user.role === 'supervisor') {
        fetchLocals()
      } else {
        fetchUserLocals()
      }
    }
  }, [user, fetchLocals, fetchUserLocals])

  const value: LocalContextType = {
    locals,
    userLocals,
    isLoading,
    error,
    fetchLocals,
    fetchUserLocals,
    fetchLocalsBySector,
    clearError
  }

  return (
    <LocalContext.Provider value={value}>
      {children}
    </LocalContext.Provider>
  )
}
