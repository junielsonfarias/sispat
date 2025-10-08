import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'

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

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_public_search_settings')
    if (stored) {
      setSettings(JSON.parse(stored))
    }
  }, [])

  const persist = (newSettings: PublicSearchSettings) => {
    // In a real app, this would be an API call
    localStorage.setItem(
      'sispat_public_search_settings',
      JSON.stringify(newSettings),
    )
    setSettings(newSettings)
  }

  const togglePublicSearch = useCallback(
    (enabled: boolean) => {
      persist({ ...settings, isPublicSearchEnabled: enabled })
    },
    [settings],
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
