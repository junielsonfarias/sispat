import { useAuth } from '@/hooks/useAuth'
import { forcePublicDataSync } from '@/lib/public-sync'
import { api } from '@/services/api'
import { Patrimonio } from '@/types'
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react'
import { toast } from 'sonner'
import { useActivityLog } from './ActivityLogContext'
import { useMunicipalities } from './MunicipalityContext'
import { usePatrimonio } from './PatrimonioContext'

interface SyncContextType {
  isSyncing: boolean
  lastSync: Date | null
  startSync: () => void
  cancelSync: () => void
}

const SyncContext = createContext<SyncContextType | null>(null)

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const { user } = useAuth()
  const { logActivity } = useActivityLog()
  const { setPatrimonios } = usePatrimonio()
  const { setMunicipalities } = useMunicipalities()
  const syncProcessRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | number | null>(null)

  const cancelSync = useCallback(() => {
    if (syncProcessRef.current) {
      clearTimeout(syncProcessRef.current)
      syncProcessRef.current = null
    }
    setIsSyncing(false)
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
    }
    if (user) {
      logActivity(
        user,
        'SYNC_CANCEL',
        'Sincronização de dados cancelada pelo usuário.',
      )
    }
    toast.info('Sincronização cancelada.')
  }, [user, logActivity])

  const startSync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    
    // Se não há usuário autenticado, usar sincronização pública
    if (!user) {
      toastIdRef.current = toast.loading('Sincronizando dados públicos...', {
        description: 'Buscando dados no servidor.',
        action: {
          label: 'Parar',
          onClick: cancelSync,
        },
      })

      try {
        await forcePublicDataSync()
        setLastSync(new Date())
        toast.success('Sincronização pública concluída!', {
          id: toastIdRef.current,
          description: 'Dados públicos atualizados.',
        })
        
        // Recarregar dados dos contextos
        window.location.reload()
      } catch (error) {
        toast.error('Falha na sincronização pública', {
          id: toastIdRef.current,
          description: 'Não foi possível sincronizar os dados públicos. Tente novamente.',
        })
      } finally {
        setIsSyncing(false)
      }
      return
    }

    // Sincronização para usuários autenticados
    logActivity(user, 'SYNC_START', 'Iniciada a sincronização manual de dados.')
    toastIdRef.current = toast.loading('Sincronizando dados...', {
      description: 'Buscando atualizações no servidor.',
      action: {
        label: 'Parar',
        onClick: cancelSync,
      },
    })

    try {
      const updatedPatrimonios =
        await api.get<Patrimonio[]>('/patrimonios/sync')
      setPatrimonios(updatedPatrimonios)
      setLastSync(new Date())
      toast.success('Sincronização concluída!', {
        id: toastIdRef.current,
        description: 'Seus dados estão atualizados.',
      })
      logActivity(
        user,
        'SYNC_SUCCESS',
        'Sincronização de dados concluída com sucesso.',
      )
    } catch (error) {
      toast.error('Falha na sincronização', {
        id: toastIdRef.current,
        description: 'Não foi possível sincronizar os dados. Tente novamente.',
      })
      logActivity(user, 'SYNC_FAIL', 'Falha na sincronização de dados.')
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, user, logActivity, setPatrimonios, cancelSync])

  return (
    <SyncContext.Provider
      value={{ isSyncing, lastSync, startSync, cancelSync }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export const useSync = () => {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}
