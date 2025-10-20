import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react'
import { ActivityLogAction } from '@/types'
import { api } from '@/services/api-adapter'
import { useAuth } from './AuthContext'

interface ActivityLogEntry {
  id: string
  action: ActivityLogAction
  details?: string
  table_name?: string
  record_id?: string
  old_value?: unknown
  new_value?: unknown
  timestamp: string
  user_id: string
  user_name: string
}

interface ActivityLogContextType {
  logs: ActivityLogEntry[]
  logActivity: (
    action: ActivityLogAction,
    details: {
      details?: string
      table_name?: string
      record_id?: string
      old_value?: unknown
      new_value?: unknown
    },
  ) => void
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null)

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const { user } = useAuth()

  useEffect(() => {
    // Apenas carregar logs se o usuário estiver autenticado e tiver permissão
    if (!user) return
    const userRole = (user as any)?.role || (user as any)?.perfil || ''
    const isSupervisorOrAdmin = ['supervisor', 'admin'].includes(String(userRole))
    if (!isSupervisorOrAdmin) return

    const loadLogs = async () => {
      try {
        const response = await api.get<{ logs: ActivityLogEntry[] }>('/audit-logs')
        const logsData = Array.isArray(response) ? response : (response.logs || [])
        setLogs(logsData)
      } catch (error) {
        // erro silenciado
      }
    }
    loadLogs()
  }, [user])

  const logActivity = useCallback(
    async (
      action: ActivityLogAction,
      details: {
        details?: string
        table_name?: string
        record_id?: string
        old_value?: any
        new_value?: any
      },
    ) => {
      try {
        await api.post('/audit-logs', {
          action,
          entityType: details.table_name,
          entityId: details.record_id,
          details: details.details || JSON.stringify({
            old_value: details.old_value,
            new_value: details.new_value,
          }),
        })
      } catch (error) {
        // Failed to log activity - log locally as fallback
        if (import.meta.env.DEV) {
          console.log('Activity logged (fallback):', { action, ...details })
        }
      }
    },
    [],
  )

  return (
    <ActivityLogContext.Provider value={{ logs, logActivity }}>
      {children}
    </ActivityLogContext.Provider>
  )
}

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext)
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider')
  }
  return context
}
