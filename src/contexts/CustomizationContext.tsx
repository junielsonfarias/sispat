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
import { logger } from '@/lib/logger'

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

export interface CustomizationContextType {
  settings: CustomizationSettings
  saveSettings: (settings: CustomizationSettings) => void
  resetSettings: () => void
}

export const CustomizationContext = createContext<CustomizationContextType | null>(
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
  const [_isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      
      // Verificar localStorage primeiro (cache)
      const stored = localStorage.getItem('sispat_customization_settings')
      if (stored) {
        try {
          const parsedSettings = JSON.parse(stored)
          setSettings({ ...defaultSettings, ...parsedSettings })
        } catch {
          setSettings(defaultSettings)
        }
      }
      
      try {
        // Tentar endpoint público primeiro (para tela de login)
        try {
          const publicResponse = await api.get<{ customization: CustomizationSettings }>('/customization/public')
          if (publicResponse.customization) {
            const loadedSettings = { ...defaultSettings, ...publicResponse.customization }
            setSettings(loadedSettings)
            localStorage.setItem('sispat_customization_settings', JSON.stringify(loadedSettings))
            setIsLoading(false)
            return
          }
        } catch (publicError) {
          // Endpoint público não existe - ignorar silenciosamente
        }
        
        // Tentar buscar do banco de dados (autenticado) somente se houver token
        const tokenData = localStorage.getItem('sispat_token')
        if (!tokenData) {
          // Sem token: não tentar rota autenticada; manter cache/default
          setIsLoading(false)
          return
        }
        const response = await api.get<{ customization: CustomizationSettings }>('/customization')
        if (response.customization) {
          const loadedSettings = { ...defaultSettings, ...response.customization }
          setSettings(loadedSettings)
          localStorage.setItem('sispat_customization_settings', JSON.stringify(loadedSettings))
        }
      } catch (error) {
        // Usar configurações do localStorage ou padrão (já carregado acima)
        // Silenciar erro se não estiver autenticado
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const saveSettings = useCallback(
    async (newSettings: CustomizationSettings) => {
      logger.debug('CustomizationContext: Salvando configurações...', { newSettings });

      try {
        // Salvar no banco de dados
        logger.debug('Enviando PUT /customization...');
        const response = await api.put('/customization', newSettings);
        logger.debug('Customização salva no banco de dados', { response });

        // Atualizar estado local
        setSettings(newSettings)

        // Manter backup no localStorage
        localStorage.setItem('sispat_customization_settings', JSON.stringify(newSettings))
        logger.debug('Backup salvo no localStorage');
      } catch (error: unknown) {
        // Em produção: mensagem curta sem response.data (evita vazar IDs/schema)
        // Em dev: bloco completo via logger.debug (terser strip console.log em prod)
        const err = error as { message?: string; response?: { status?: number; data?: unknown } }
        logger.warn('Falha ao salvar customização no banco; usando fallback localStorage', {
          message: err.message,
          status: err.response?.status,
        })
        logger.debug('Detalhes completos da falha', { error: err, response: err.response?.data })

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
      logger.debug('Customização resetada no banco de dados')
      
      // Atualizar estado local
      setSettings(defaultSettings)
      
      // Limpar localStorage
      localStorage.removeItem('sispat_customization_settings')
    } catch (error) {
      logger.error('Erro ao resetar no banco, resetando apenas no localStorage:', error)
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
