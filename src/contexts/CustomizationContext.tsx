import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { generateLogoUrl, generateBackgroundUrl } from '@/lib/image-utils'
import { api } from '@/services/api-adapter'

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
  // Informações do Município
  prefeituraName: string
  secretariaResponsavel: string
  departamentoResponsavel: string
}

interface CustomizationContextType {
  settings: CustomizationSettings
  saveSettings: (settings: CustomizationSettings) => void
  resetSettings: () => void
}

const CustomizationContext = createContext<CustomizationContextType | null>(
  null,
)

const defaultSettings: CustomizationSettings = {
  activeLogoUrl: generateLogoUrl('government'),
  secondaryLogoUrl: '',
  backgroundType: 'color',
  backgroundColor: '#f1f5f9',
  backgroundImageUrl: generateBackgroundUrl('login'),
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
  // Informações do Município
  prefeituraName: 'PREFEITURA DE SÃO SEBASTIÃO DA BOA VISTA',
  secretariaResponsavel: 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO',
  departamentoResponsavel: 'DEPARTAMENTO DE PATRIMÔNIO',
}

export const CustomizationProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [settings, setSettings] = useState<CustomizationSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      try {
        // Tentar buscar do banco de dados
        const response = await api.get<{ customization: CustomizationSettings }>('/customization')
        if (response.customization) {
          const loadedSettings = { ...defaultSettings, ...response.customization }
          setSettings(loadedSettings)
          // Sincronizar com localStorage
          localStorage.setItem('sispat_customization_settings', JSON.stringify(loadedSettings))
        }
      } catch (error) {
        console.log('⚠️ Banco de dados indisponível, usando localStorage')
        // Fallback para localStorage
        const stored = localStorage.getItem('sispat_customization_settings')
        if (stored) {
          try {
            const parsedSettings = JSON.parse(stored)
            setSettings({ ...defaultSettings, ...parsedSettings })
          } catch {
            setSettings(defaultSettings)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const saveSettings = useCallback(
    async (newSettings: CustomizationSettings) => {
      try {
        // Salvar no banco de dados
        await api.put('/customization', newSettings)
        console.log('✅ Customização salva no banco de dados')
        
        // Atualizar estado local
        setSettings(newSettings)
        
        // Manter backup no localStorage
        localStorage.setItem('sispat_customization_settings', JSON.stringify(newSettings))
      } catch (error) {
        console.error('⚠️ Erro ao salvar no banco, salvando apenas no localStorage:', error)
        // Fallback: salvar apenas no localStorage
        localStorage.setItem('sispat_customization_settings', JSON.stringify(newSettings))
        setSettings(newSettings)
      }
    },
    [],
  )

  const resetSettings = useCallback(async () => {
    try {
      // Resetar no banco de dados
      await api.post('/customization/reset', {})
      console.log('✅ Customização resetada no banco de dados')
      
      // Atualizar estado local
      setSettings(defaultSettings)
      
      // Limpar localStorage
      localStorage.removeItem('sispat_customization_settings')
    } catch (error) {
      console.error('⚠️ Erro ao resetar no banco, resetando apenas no localStorage:', error)
      // Fallback: resetar apenas localStorage
      localStorage.removeItem('sispat_customization_settings')
      setSettings(defaultSettings)
    }
  }, [])

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        saveSettings,
        resetSettings,
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
