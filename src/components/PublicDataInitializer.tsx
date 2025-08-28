import { checkPublicDataSync, forcePublicDataSync } from '@/lib/public-sync'
import { useEffect } from 'react'

/**
 * Componente para inicializar dados públicos na primeira carga
 */
export const PublicDataInitializer = () => {
  useEffect(() => {
    const initializePublicData = async () => {
      console.log('🔄 Verificando dados públicos...')
      
      const status = checkPublicDataSync()
      console.log('📊 Status dos dados públicos:', status)
      
      // Se não há municípios ou configurações, forçar sincronização
      if (!status.municipalities || !status.publicSettings) {
        console.log('⚠️ Dados públicos incompletos, forçando sincronização...')
        await forcePublicDataSync()
      } else {
        console.log('✅ Dados públicos já sincronizados')
      }
    }

    // Executar na primeira carga da página
    initializePublicData()

    // Configurar sincronização periódica (a cada 30 minutos)
    const interval = setInterval(async () => {
      console.log('🔄 Sincronização automática de dados públicos...')
      await forcePublicDataSync()
    }, 30 * 60 * 1000) // 30 minutos

    return () => clearInterval(interval)
  }, [])

  return null // Componente invisível
}
