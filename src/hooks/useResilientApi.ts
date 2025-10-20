import { useState, useCallback } from 'react'
import { api } from '@/services/api-adapter'
import { useBackendStatus } from './useBackendStatus'

interface ResilientApiOptions {
  endpoint: string
  fallbackData?: any
  enableRetry?: boolean
  retryDelay?: number
}

export const useResilientApi = <T = any>(options: ResilientApiOptions) => {
  const { endpoint, fallbackData = [], enableRetry = true, retryDelay = 5000 } = options
  const { isOnline } = useBackendStatus()
  const [data, setData] = useState<T>(fallbackData as T)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchData = useCallback(async (forceOnline = false) => {
    // Se backend está offline e não forçar online, usar dados locais
    if (!isOnline && !forceOnline) {
      console.log(`⚠️  Backend offline - usando dados locais para ${endpoint}`)
      setData(fallbackData as T)
      setError(null)
      return fallbackData as T
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 Buscando dados de ${endpoint}...`)
      const response = await api.get<T>(endpoint)
      
      setData(response)
      setLastFetched(new Date())
      console.log(`✅ Dados carregados de ${endpoint}:`, Array.isArray(response) ? response.length : 'objeto')
      
      return response
    } catch (error) {
      console.error(`❌ Erro ao buscar ${endpoint}:`, error)
      setError(error as Error)
      
      // Se falhou e temos dados locais, usar eles
      if (fallbackData) {
        console.log(`⚠️  Usando dados locais para ${endpoint} devido ao erro`)
        setData(fallbackData as T)
      }
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, fallbackData, isOnline])

  const retry = useCallback(() => {
    if (enableRetry) {
      setTimeout(() => {
        fetchData(true)
      }, retryDelay)
    }
  }, [fetchData, enableRetry, retryDelay])

  return {
    data,
    isLoading,
    error,
    lastFetched,
    fetchData,
    retry,
    isOnline,
  }
}
