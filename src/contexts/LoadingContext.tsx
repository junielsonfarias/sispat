/**
 * Contexto Global de Loading States
 */

import { LoadingOverlay } from '@/components/ui/loading'
import { ReactNode, createContext, useCallback, useContext, useState } from 'react'

interface LoadingState {
  key: string
  message: string
  progress?: number
}

interface LoadingContextType {
  // Estados globais
  globalLoading: boolean
  loadingStates: LoadingState[]
  
  // Funções de controle
  setGlobalLoading: (loading: boolean, message?: string) => void
  addLoadingState: (key: string, message: string, progress?: number) => void
  updateLoadingState: (key: string, message?: string, progress?: number) => void
  removeLoadingState: (key: string) => void
  clearAllLoading: () => void
  
  // Função helper para operações com loading
  withGlobalLoading: <T,>(
    asyncFn: () => Promise<T>,
    message?: string
  ) => Promise<T | null>
}

const LoadingContext = createContext<LoadingContextType | null>(null)

interface LoadingProviderProps {
  children: ReactNode
}

export const LoadingProvider = ({ children }: LoadingProviderProps) => {
  const [globalLoading, setGlobalLoadingState] = useState(false)
  const [globalMessage, setGlobalMessage] = useState<string>('')
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([])

  const setGlobalLoading = useCallback((loading: boolean, message = 'Carregando...') => {
    setGlobalLoadingState(loading)
    setGlobalMessage(message)
  }, [])

  const addLoadingState = useCallback((key: string, message: string, progress?: number) => {
    setLoadingStates(prev => {
      const existing = prev.find(state => state.key === key)
      if (existing) {
        return prev.map(state => 
          state.key === key 
            ? { ...state, message, progress }
            : state
        )
      }
      return [...prev, { key, message, progress }]
    })
  }, [])

  const updateLoadingState = useCallback((key: string, message?: string, progress?: number) => {
    setLoadingStates(prev => 
      prev.map(state => 
        state.key === key 
          ? { 
              ...state, 
              ...(message && { message }),
              ...(progress !== undefined && { progress })
            }
          : state
      )
    )
  }, [])

  const removeLoadingState = useCallback((key: string) => {
    setLoadingStates(prev => prev.filter(state => state.key !== key))
  }, [])

  const clearAllLoading = useCallback(() => {
    setGlobalLoadingState(false)
    setLoadingStates([])
    setGlobalMessage('')
  }, [])

  const withGlobalLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    message = 'Carregando...'
  ): Promise<T | null> => {
    setGlobalLoading(true, message)
    
    try {
      const result = await asyncFn()
      return result
    } catch (error) {
      console.error('Error in withGlobalLoading:', error)
      return null
    } finally {
      setGlobalLoading(false)
    }
  }, [setGlobalLoading])

  const value: LoadingContextType = {
    globalLoading,
    loadingStates,
    setGlobalLoading,
    addLoadingState,
    updateLoadingState,
    removeLoadingState,
    clearAllLoading,
    withGlobalLoading
  }

  return (
    <LoadingContext.Provider value={value}>
      <LoadingOverlay loading={globalLoading} message={globalMessage}>
        {children}
      </LoadingOverlay>
    </LoadingContext.Provider>
  )
}

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading deve ser usado dentro de um LoadingProvider')
  }
  return context
}

// Hook para loading específico de componente com integração global
export const useComponentLoading = (componentKey: string) => {
  const { addLoadingState, updateLoadingState, removeLoadingState } = useGlobalLoading()
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const startLoading = useCallback((message: string, progress?: number) => {
    setLocalLoading(true)
    setLocalError(null)
    addLoadingState(componentKey, message, progress)
  }, [componentKey, addLoadingState])

  const updateLoading = useCallback((message?: string, progress?: number) => {
    updateLoadingState(componentKey, message, progress)
  }, [componentKey, updateLoadingState])

  const stopLoading = useCallback(() => {
    setLocalLoading(false)
    removeLoadingState(componentKey)
  }, [componentKey, removeLoadingState])

  const setError = useCallback((error: string | null) => {
    setLocalError(error)
    if (error) {
      stopLoading()
    }
  }, [stopLoading])

  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    message = 'Carregando...',
    options: {
      errorMessage?: string
      onSuccess?: (result: T) => void
      onError?: (error: Error) => void
    } = {}
  ): Promise<T | null> => {
    const { errorMessage, onSuccess, onError } = options

    startLoading(message)
    
    try {
      const result = await asyncFn()
      onSuccess?.(result)
      return result
    } catch (err) {
      const errorMsg = errorMessage || (err instanceof Error ? err.message : 'Erro desconhecido')
      setError(errorMsg)
      onError?.(err instanceof Error ? err : new Error(String(err)))
      return null
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, setError])

  return {
    loading: localLoading,
    error: localError,
    startLoading,
    updateLoading,
    stopLoading,
    setError,
    clearError: () => setError(null),
    withLoading
  }
}
