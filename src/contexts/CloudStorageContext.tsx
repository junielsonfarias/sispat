import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { useAuth } from './AuthContext'

interface CloudStorageSettings {
  isConnected: boolean
}

interface CloudStorageContextType {
  settings: CloudStorageSettings
  connect: () => Promise<void>
  disconnect: () => void
}

const CloudStorageContext = createContext<CloudStorageContextType | null>(null)

export const CloudStorageProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<CloudStorageSettings>({
    isConnected: false,
  })
  const { user } = useAuth()

  const fetchSettings = useCallback(async () => {
    if (!user) return
    
    try {
      const cloudStorage = await api.get<any>('/config/cloud-storage')
      if (cloudStorage) {
        setSettings({ isConnected: cloudStorage.isConnected || false })
      }
    } catch (error) {
      // Usar settings padrão se falhar
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user, fetchSettings])

  const connect = useCallback(async () => {
    try {
      toast({ description: 'Conectando ao Google Drive...' })
      await api.put('/config/cloud-storage', {
        provider: 'google_drive',
        isConnected: true,
      })
      setSettings({ isConnected: true })
      toast({
        title: 'Sucesso!',
        description: 'Conectado ao Google Drive com sucesso.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao conectar ao Google Drive.',
      })
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await api.put('/config/cloud-storage', { isConnected: false })
      setSettings({ isConnected: false })
      toast({ description: 'Desconectado do Google Drive.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao desconectar.',
      })
    }
  }, [])

  return (
    <CloudStorageContext.Provider value={{ settings, connect, disconnect }}>
      {children}
    </CloudStorageContext.Provider>
  )
}

export const useCloudStorage = () => {
  const context = useContext(CloudStorageContext)
  if (!context) {
    throw new Error(
      'useCloudStorage must be used within a CloudStorageProvider',
    )
  }
  return context
}
