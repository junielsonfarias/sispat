import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface CustomizationSettings {
  activeLogoUrl: string
  secondaryLogoUrl: string
  backgroundType: 'color' | 'image' | 'video'
  backgroundColor: string
  backgroundImageUrl: string
  backgroundVideoUrl: string
  videoLoop: boolean
  videoMuted: boolean
  layout: 'left' | 'center' | 'right'
  welcomeTitle: string
  welcomeSubtitle: string
  primaryColor: string
  buttonTextColor: string
  fontFamily: string
  browserTitle: string
  faviconUrl: string
  loginFooterText: string
  systemFooterText: string
  superUserFooterText?: string
}

interface CustomizationContextType {
  settings: CustomizationSettings
  getSettingsForMunicipality: (
    municipalityId: string | null,
  ) => CustomizationSettings
  saveSettingsForMunicipality: (
    municipalityId: string,
    settings: CustomizationSettings,
  ) => void
  resetSettingsForMunicipality: (municipalityId: string) => void
}

const CustomizationContext = createContext<CustomizationContextType | null>(
  null,
)

const defaultSettings: CustomizationSettings = {
  activeLogoUrl:
    'https://img.usecurling.com/i?q=brazilian%20government&color=azure',
  secondaryLogoUrl: '',
  backgroundType: 'color',
  backgroundColor: '#f1f5f9',
  backgroundImageUrl:
    'https://img.usecurling.com/p/1920/1080?q=abstract%20gradient',
  backgroundVideoUrl: '',
  videoLoop: true,
  videoMuted: true,
  layout: 'center',
  welcomeTitle: 'Bem-vindo ao SISPAT',
  welcomeSubtitle: 'Sistema de Gestão de Patrimônio',
  primaryColor: '#2563eb',
  buttonTextColor: '#ffffff',
  fontFamily: "'Inter var', sans-serif",
  browserTitle: 'SISPAT - Sistema de Gestão de Patrimônio',
  faviconUrl: '/favicon.ico',
  loginFooterText: '© 2025 Curling. Todos os direitos reservados.',
  systemFooterText: 'SISPAT - Desenvolvido por Curling',
  superUserFooterText: 'SISPAT Superusuário - Painel de Controle Global',
}

export const CustomizationProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { user } = useAuth()
  const [allSettings, setAllSettings] = useState<
    Record<string, CustomizationSettings>
  >({})

  useEffect(() => {
    const stored = localStorage.getItem('sispat_customization_settings')
    if (stored) {
      setAllSettings(JSON.parse(stored))
    }
  }, [])

  const persist = (newSettings: Record<string, CustomizationSettings>) => {
    localStorage.setItem(
      'sispat_customization_settings',
      JSON.stringify(newSettings),
    )
    setAllSettings(newSettings)
  }

  const getSettingsForMunicipality = useCallback(
    (municipalityId: string | null): CustomizationSettings => {
      const globalLoginSettings = allSettings['global_login_settings'] || {}

      if (!municipalityId) {
        return { ...defaultSettings, ...globalLoginSettings }
      }

      const municipalitySettings = allSettings[municipalityId] || {}
      const finalSettings = {
        ...defaultSettings,
        ...globalLoginSettings,
        ...municipalitySettings,
      }

      if (
        municipalitySettings.loginFooterText === undefined ||
        municipalitySettings.loginFooterText.trim() === ''
      ) {
        finalSettings.loginFooterText =
          globalLoginSettings.loginFooterText || defaultSettings.loginFooterText
      }

      if (municipalityId === 'superuser') {
        const superuserSettings = allSettings['superuser'] || {}
        finalSettings.superUserFooterText =
          superuserSettings.superUserFooterText ||
          defaultSettings.superUserFooterText
      }

      return finalSettings
    },
    [allSettings],
  )

  const saveSettingsForMunicipality = useCallback(
    (municipalityId: string, settings: CustomizationSettings) => {
      const key = municipalityId
      const newSettings = { ...allSettings, [key]: settings }
      persist(newSettings)
    },
    [allSettings],
  )

  const resetSettingsForMunicipality = useCallback(
    (municipalityId: string) => {
      const key = municipalityId
      const newSettings = { ...allSettings }
      delete newSettings[key]
      persist(newSettings)
    },
    [allSettings],
  )

  const settings = getSettingsForMunicipality(
    user?.role === 'superuser' ? 'superuser' : user?.municipalityId || null,
  )

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        getSettingsForMunicipality,
        saveSettingsForMunicipality,
        resetSettingsForMunicipality,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  )
}

export const useCustomization = () => {
  const context = useContext(CustomizationContext)
  if (!context) {
    throw new Error(
      'useCustomization must be used within a CustomizationProvider',
    )
  }
  return context
}
