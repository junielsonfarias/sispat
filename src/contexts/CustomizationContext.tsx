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
        console.log('[DEV] 🔍 CustomizationContext: Buscando customização...');
        
        // Tentar endpoint público primeiro (para tela de login)
        try {
          const publicResponse = await api.get<{ customization: CustomizationSettings }>('/customization/public')
          if (publicResponse.customization) {
            const loadedSettings = { ...defaultSettings, ...publicResponse.customization }
            setSettings(loadedSettings)
            localStorage.setItem('sispat_customization_settings', JSON.stringify(loadedSettings))
            console.log('[DEV] ✅ Customização carregada do endpoint público');
            setIsLoading(false)
            return
          }
        } catch (publicError) {
          console.log('[DEV] ℹ️ Endpoint público não disponível, tentando autenticado...');
        }
        
        // Tentar buscar do banco de dados (autenticado)
        const response = await api.get<{ customization: CustomizationSettings }>('/customization')
        if (response.customization) {
          const loadedSettings = { ...defaultSettings, ...response.customization }
          setSettings(loadedSettings)
          // Sincronizar com localStorage
          localStorage.setItem('sispat_customization_settings', JSON.stringify(loadedSettings))
          console.log('[DEV] ✅ Customização carregada do endpoint autenticado');
        }
      } catch (error) {
        console.log('[DEV] ⚠️ Banco de dados indisponível, usando localStorage')
        // Fallback para localStorage
        const stored = localStorage.getItem('sispat_customization_settings')
        if (stored) {
          try {
            const parsedSettings = JSON.parse(stored)
            setSettings({ ...defaultSettings, ...parsedSettings })
            console.log('[DEV] 📦 Customização carregada do localStorage');
          } catch {
            setSettings(defaultSettings)
            console.log('[DEV] ⚠️ Erro ao parsear localStorage, usando padrão');
          }
        } else {
          setSettings(defaultSettings)
          console.log('[DEV] ℹ️ Nenhuma customização encontrada, usando padrão');
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const saveSettings = useCallback(
    async (newSettings: CustomizationSettings) => {
      console.log('[DEV] 💾 CustomizationContext: Salvando configurações...');
      console.log('[DEV] 📋 Dados a salvar:', newSettings);
      
      try {
        // Salvar no banco de dados
        console.log('[DEV] 🌐 Enviando PUT /customization...');
        const response = await api.put('/customization', newSettings);
        console.log('[DEV] ✅ Resposta do backend:', response);
        console.log('✅ Customização salva no banco de dados');
        
        // Atualizar estado local
        setSettings(newSettings)
        
        // Manter backup no localStorage
        localStorage.setItem('sispat_customization_settings', JSON.stringify(newSettings))
        console.log('[DEV] 💾 Backup salvo no localStorage');
      } catch (error: any) {
        console.error('[DEV] ❌ ERRO DETALHADO ao salvar customização:');
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensagem:', error.message);
        console.error('   Response:', error.response?.data);
        console.error('   Status:', error.response?.status);
        console.error('   Erro completo:', error);
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
