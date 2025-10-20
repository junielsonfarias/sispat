import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { ManutencaoTask } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface ManutencaoContextType {
  tasks: ManutencaoTask[]
  getTasksByImovelId: (imovelId: string) => ManutencaoTask[]
  addTask: (
    task: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>,
  ) => void
  updateTask: (taskId: string, updates: Partial<ManutencaoTask>) => void
  deleteTask: (taskId: string) => void
}

const ManutencaoContext = createContext<ManutencaoContextType | null>(null)

export const ManutencaoProvider = ({ children }: { children: ReactNode }) => {
  const [allTasks, setAllTasks] = useState<ManutencaoTask[]>([])
  const { user } = useAuth()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    try {
      const response = await api.get<ManutencaoTask[]>('/manutencoes')
      const tasksData = Array.isArray(response) ? response : []
      setAllTasks(tasksData.map(t => ({
        ...t,
        dueDate: new Date(t.dueDate || t.dataPrevista),
        createdAt: new Date(t.createdAt),
      })))
    } catch (error) {
      console.error('Failed to load maintenance tasks:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de mostrar erro
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
        console.log('⚠️  Backend não disponível - usando lista vazia de tarefas de manutenção')
        setAllTasks([])
        return
      }
      
      // Tentar carregar do localStorage como fallback
      const stored = localStorage.getItem('sispat_manutencao_tasks')
      if (stored) {
        setAllTasks(JSON.parse(stored).map((t: any) => ({
          ...t,
          dueDate: new Date(t.dueDate),
          createdAt: new Date(t.createdAt),
        })))
      }
    }
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const tasks = useMemo(() => {
    return allTasks
  }, [allTasks])

  const getTasksByImovelId = useCallback(
    (imovelId: string) => {
      return tasks.filter((t) => t.imovelId === imovelId)
    },
    [tasks],
  )

  const addTask = useCallback(
    async (taskData: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>) => {
      try {
        const newTask = await api.post<ManutencaoTask>('/manutencoes', {
          ...taskData,
          dataPrevista: taskData.dueDate,
        })
        setAllTasks(prev => [...prev, {
          ...newTask,
          dueDate: new Date(newTask.dataPrevista || newTask.dueDate),
          createdAt: new Date(newTask.createdAt),
        }])
        toast({ description: 'Tarefa de manutenção criada com sucesso.' })
      } catch (error) {
        console.error('❌ Erro ao criar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, salvar apenas localmente
        if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
          console.log('⚠️  Backend não disponível. Salvando tarefa apenas localmente.')
          
          const localTask = {
            id: `local-${Date.now()}`,
            ...taskData,
            dueDate: taskData.dueDate,
            createdAt: new Date(),
            municipalityId: user?.municipalityId || '',
          }
          
          setAllTasks(prev => [...prev, localTask])
          
          toast({
            title: 'Aviso',
            description: 'Tarefa salva localmente (backend indisponível).',
            variant: 'default',
          })
          return
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao criar tarefa de manutenção.',
        })
      }
    },
    [],
  )

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<ManutencaoTask>) => {
      try {
        const updatedTask = await api.put<ManutencaoTask>(`/manutencoes/${taskId}`, {
          ...updates,
          dataPrevista: updates.dueDate,
        })
        setAllTasks(prev => prev.map(t =>
          t.id === taskId ? {
            ...updatedTask,
            dueDate: new Date(updatedTask.dataPrevista || updatedTask.dueDate),
            createdAt: new Date(updatedTask.createdAt),
          } : t
        ))
        toast({ description: 'Tarefa atualizada com sucesso.' })
      } catch (error) {
        console.error('❌ Erro ao atualizar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, atualizar apenas localmente
        if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
          console.log('⚠️  Backend não disponível. Atualizando tarefa apenas localmente.')
          
          setAllTasks(prev => prev.map(t =>
            t.id === taskId ? {
              ...t,
              ...updates,
              dueDate: updates.dueDate || t.dueDate,
            } : t
          ))
          
          toast({
            title: 'Aviso',
            description: 'Tarefa atualizada localmente (backend indisponível).',
            variant: 'default',
          })
          return
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar tarefa.',
        })
      }
    },
    [],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await api.delete(`/manutencoes/${taskId}`)
        setAllTasks(prev => prev.filter(t => t.id !== taskId))
        toast({ description: 'Tarefa excluída com sucesso.' })
      } catch (error) {
        console.error('❌ Erro ao deletar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, deletar apenas localmente
        if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED' || error?.response?.status === 404) {
          console.log('⚠️  Backend não disponível. Deletando tarefa apenas localmente.')
          
          setAllTasks(prev => prev.filter(t => t.id !== taskId))
          
          toast({
            title: 'Aviso',
            description: 'Tarefa removida localmente (backend indisponível).',
            variant: 'default',
          })
          return
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir tarefa.',
        })
      }
    },
    [],
  )

  return (
    <ManutencaoContext.Provider
      value={{ tasks, getTasksByImovelId, addTask, updateTask, deleteTask }}
    >
      {children}
    </ManutencaoContext.Provider>
  )
}

export const useManutencao = () => {
  const context = useContext(ManutencaoContext)
  if (!context) {
    throw new Error('useManutencao must be used within a ManutencaoProvider')
  }
  return context
}
