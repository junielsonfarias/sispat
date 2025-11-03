import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { api } from '@/services/api-adapter'
import { useAuth } from './AuthContext'

interface PublicSearchSettings {
  isPublicSearchEnabled: boolean
}

interface PublicSearchContextType {
  settings: PublicSearchSettings
  togglePublicSearch: (enabled: boolean) => void
}

const PublicSearchContext = createContext<PublicSearchContextType | null>(null)

const initialSettings: PublicSearchSettings = {
  isPublicSearchEnabled: true,
}

export const PublicSearchProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] =
    useState<PublicSearchSettings>(initialSettings)
  const { user } = useAuth()

  const fetchSettings = useCallback(async () => {
    if (!user) return
    
    try {
      const config = await api.get<any>('/public/system-configuration')
      if (config && config.allowPublicSearch !== undefined) {
        setSettings({ isPublicSearchEnabled: config.allowPublicSearch })
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

  const togglePublicSearch = useCallback(
    async (enabled: boolean) => {
      try {
        await api.put('/public/system-configuration', { allowPublicSearch: enabled })
        setSettings({ isPublicSearchEnabled: enabled })
      } catch (error) {
        // Reverter mudanças
        fetchSettings()
      }
    },
    [fetchSettings],
  )

  return (
    <PublicSearchContext.Provider
      value={{ settings, togglePublicSearch }}
    >
      {children}
    </PublicSearchContext.Provider>
  )
}

export const usePublicSearch = () => {
  const context = useContext(PublicSearchContext)
  if (!context) {
    throw new Error(
      'usePublicSearch must be used within a PublicSearchProvider',
    )
  }
  return context
}
