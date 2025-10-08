import { useEffect } from 'react'
import { useCustomization } from '@/contexts/CustomizationContext'

export const DynamicHead = () => {
  // Fallback para quando o contexto não estiver disponível
  let settings
  try {
    const customization = useCustomization()
    settings = customization.settings
  } catch (error) {
    // Se o contexto não estiver disponível, usar valores padrão
    settings = {
      browserTitle: 'SISPAT - Sistema de Gestão de Patrimônio',
      faviconUrl: '/favicon.ico'
    }
  }

  useEffect(() => {
    document.title = settings.browserTitle

    let link: HTMLLinkElement | null =
      document.querySelector("link[rel*='icon']")
    if (!link) {
      link = document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = settings.faviconUrl
  }, [settings.browserTitle, settings.faviconUrl])

  return null
}
