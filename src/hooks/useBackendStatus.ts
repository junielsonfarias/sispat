import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api-adapter'

interface BackendStatus {
  isOnline: boolean
  isLoading: boolean
  lastChecked: Date | null
}

export const useBackendStatus = () => {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: false,
    isLoading: false,
    lastChecked: null,
  })

  const checkBackendStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Tentar fazer uma requisição simples para verificar se o backend está online
      await api.get('/health')
      
      setStatus({
        isOnline: true,
        isLoading: false,
        lastChecked: new Date(),
      })
    } catch (error) {
      setStatus({
        isOnline: false,
        isLoading: false,
        lastChecked: new Date(),
      })
    }
  }, [])

  // Verificar status inicial
  useEffect(() => {
    checkBackendStatus()
  }, [checkBackendStatus])

  // Verificar periodicamente (a cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(checkBackendStatus, 30000)
    return () => clearInterval(interval)
  }, [checkBackendStatus])

  return {
    ...status,
    checkBackendStatus,
  }
}
