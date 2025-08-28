import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { toast } from '@/hooks/use-toast'

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

  useEffect(() => {
    const storedSettings = localStorage.getItem('sispat_cloud_storage')
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    }
  }, [])

  const persistSettings = (newSettings: CloudStorageSettings) => {
    localStorage.setItem('sispat_cloud_storage', JSON.stringify(newSettings))
    setSettings(newSettings)
  }

  const connect = useCallback(async () => {
    toast({ description: 'Conectando ao Google Drive...' })
    await new Promise((resolve) => setTimeout(resolve, 1500))
    persistSettings({ isConnected: true })
    toast({
      title: 'Sucesso!',
      description: 'Conectado ao Google Drive com sucesso.',
    })
  }, [])

  const disconnect = useCallback(() => {
    persistSettings({ isConnected: false })
    toast({ description: 'Desconectado do Google Drive.' })
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
