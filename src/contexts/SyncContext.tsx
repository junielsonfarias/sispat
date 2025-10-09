import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useRef,
} from 'react'
import { toast, useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useActivityLog } from './ActivityLogContext'
import { usePatrimonio } from './PatrimonioContext'
import { api } from '@/services/api-adapter'
import { Patrimonio } from '@/types'

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
  const { dismiss } = useToast()
  const syncProcessRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | null>(null)

  const cancelSync = useCallback(() => {
    if (syncProcessRef.current) {
      clearTimeout(syncProcessRef.current)
      syncProcessRef.current = null
    }
    setIsSyncing(false)
    if (toastIdRef.current) {
      dismiss(toastIdRef.current)
    }
    if (user) {
      logActivity('SYNC_CANCEL', {
        details: 'Sincronização de dados cancelada pelo usuário.',
      })
    }
    toast({
      title: 'Sincronização cancelada.',
    })
  }, [user, logActivity])

  const startSync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    
    // ✅ Log apenas se usuário estiver autenticado
    if (user) {
      logActivity('SYNC_START', {
        details: 'Iniciada a sincronização manual de dados.',
      })
    }
    
    const toastResult = toast({
      title: 'Sincronizando dados...',
      description: 'Buscando atualizações no servidor.',
    })
    toastIdRef.current = toastResult.id

    try {
      // ✅ Se não estiver autenticado, usar endpoint público
      const endpoint = user ? '/patrimonios/sync' : '/public/patrimonios'
      
      // Buscar patrimônios atualizados do servidor
      const response = await api.get<{ patrimonios: Patrimonio[] } | Patrimonio[]>(endpoint)
      
      // Extrair os patrimônios da resposta (pode vir como array direto ou objeto)
      const updatedPatrimonios = Array.isArray(response) ? response : (response.patrimonios || [])
      
      console.log('✅ Sincronização: Recebidos', updatedPatrimonios.length, 'patrimônios do servidor')
      
      // Atualizar o estado com os dados do servidor
      setPatrimonios(updatedPatrimonios)
      setLastSync(new Date())
      
      toast({
        title: 'Sincronização concluída!',
        description: `${updatedPatrimonios.length} bens atualizados com sucesso.`,
      })
      logActivity('SYNC_SUCCESS', {
        details: `Sincronização de dados concluída com sucesso. ${updatedPatrimonios.length} bens sincronizados.`,
      })
      
      // Forçar re-render da página
      window.dispatchEvent(new Event('patrimonios-updated'))
    } catch (error) {
      console.error('❌ Erro na sincronização:', error)
      toast({
        title: 'Falha na sincronização',
        description: 'Não foi possível sincronizar os dados. Tente novamente.',
        variant: 'destructive',
      })
      logActivity('SYNC_FAIL', {
        details: 'Falha na sincronização de dados.',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, user, logActivity, setPatrimonios])

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
