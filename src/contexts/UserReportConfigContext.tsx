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
import { useAuth } from './AuthContext'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'

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

  const fetchConfigs = useCallback(async () => {
    if (!user) return
    
    try {
      const configs = await api.get<UserReportConfig[]>('/config/user-report-configs')
      setAllConfigs(configs)
    } catch (error) {
      // Silenciar erro se não houver configurações
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchConfigs()
    }
  }, [user, fetchConfigs])

  const configs = useMemo(() => {
    if (!user) return []
    return allConfigs.filter((c) => c.userId === user.id)
  }, [allConfigs, user])

  const saveConfig = useCallback(
    async (config: Omit<UserReportConfig, 'id' | 'userId'>) => {
      if (!user) return
      
      try {
        await api.post('/config/user-report-configs', config)
        await fetchConfigs()
        toast({ description: 'Configuração de relatório salva.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar configuração de relatório.',
        })
      }
    },
    [user, fetchConfigs],
  )

  const deleteConfig = useCallback(
    async (configId: string) => {
      try {
        await api.delete(`/config/user-report-configs/${configId}`)
        await fetchConfigs()
        toast({ description: 'Configuração de relatório excluída.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir configuração de relatório.',
        })
      }
    },
    [fetchConfigs],
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
