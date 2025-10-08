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

  useEffect(() => {
    // Activity logs endpoint not implemented yet
    // const loadLogs = async () => {
    //   try {
    //     const data = await api.get<ActivityLogEntry[]>('/audit_logs')
    //     setLogs(data)
    //   } catch (error) {
    //     // Failed to load activity logs - handled by error boundary
    //   }
    // }
    // loadLogs()
  }, [])

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
      // Activity logs endpoint not implemented yet
      // try {
      //   await api.post('/audit_logs', { action, ...details })
      // } catch (error) {
      //   // Failed to log activity - handled by error boundary
      // }
      
      // Log activity locally for now
      console.log('Activity logged:', { action, ...details })
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
