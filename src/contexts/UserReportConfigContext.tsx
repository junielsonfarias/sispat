import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { UserReportConfig } from '@/types'
import { generateId } from '@/lib/utils'
import { useAuth } from './AuthContext'
import { toast } from '@/hooks/use-toast'

interface UserReportConfigContextType {
  configs: UserReportConfig[]
  saveConfig: (config: Omit<UserReportConfig, 'id' | 'userId'>) => void
  deleteConfig: (configId: string) => void
}

const UserReportConfigContext =
  createContext<UserReportConfigContextType | null>(null)

export const UserReportConfigProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allConfigs, setAllConfigs] = useState<UserReportConfig[]>([])
  const { user } = useAuth()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_report_configs')
    if (stored) {
      setAllConfigs(JSON.parse(stored))
    }
  }, [])

  const configs = useMemo(() => {
    if (!user) return []
    return allConfigs.filter((c) => c.userId === user.id)
  }, [allConfigs, user])

  const persist = (newConfigs: UserReportConfig[]) => {
    // In a real app, this would be an API call
    localStorage.setItem('sispat_report_configs', JSON.stringify(newConfigs))
    setAllConfigs(newConfigs)
  }

  const saveConfig = useCallback(
    (config: Omit<UserReportConfig, 'id' | 'userId'>) => {
      if (!user) return
      const newConfig: UserReportConfig = {
        ...config,
        id: generateId(),
        userId: user.id,
      }
      persist([...allConfigs, newConfig])
      toast({ description: 'Configuração de relatório salva.' })
    },
    [allConfigs, user],
  )

  const deleteConfig = useCallback(
    (configId: string) => {
      persist(allConfigs.filter((c) => c.id !== configId))
      toast({ description: 'Configuração de relatório excluída.' })
    },
    [allConfigs],
  )

  return (
    <UserReportConfigContext.Provider
      value={{ configs, saveConfig, deleteConfig }}
    >
      {children}
    </UserReportConfigContext.Provider>
  )
}

export const useUserReportConfigs = () => {
  const context = useContext(UserReportConfigContext)
  if (!context) {
    throw new Error(
      'useUserReportConfigs must be used within a UserReportConfigProvider',
    )
  }
  return context
}
