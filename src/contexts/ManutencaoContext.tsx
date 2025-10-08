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

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_manutencao_tasks')
    if (stored) {
      setAllTasks(
        JSON.parse(stored).map((t: any) => ({
          ...t,
          dueDate: new Date(t.dueDate),
          createdAt: new Date(t.createdAt),
        })),
      )
    }
  }, [])

  const tasks = useMemo(() => {
    // Agora todas as tarefas são visíveis para todos os usuários
    // pois temos apenas um município
    return allTasks
  }, [allTasks])

  const persist = (newTasks: ManutencaoTask[]) => {
    // In a real app, this would be an API call
    localStorage.setItem('sispat_manutencao_tasks', JSON.stringify(newTasks))
    setAllTasks(newTasks)
  }

  const getTasksByImovelId = useCallback(
    (imovelId: string) => {
      return tasks.filter((t) => t.imovelId === imovelId)
    },
    [tasks],
  )

  const addTask = useCallback(
    (taskData: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>) => {
      const newTask: ManutencaoTask = {
        ...taskData,
        id: generateId(),
        createdAt: new Date(),
        municipalityId: '1', // Hardcoded para São Sebastião da Boa Vista
      }
      persist([...allTasks, newTask])
      toast({ description: 'Tarefa de manutenção criada com sucesso.' })
    },
    [allTasks],
  )

  const updateTask = useCallback(
    (taskId: string, updates: Partial<ManutencaoTask>) => {
      const newTasks = allTasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      )
      persist(newTasks)
      toast({ description: 'Tarefa atualizada com sucesso.' })
    },
    [allTasks],
  )

  const deleteTask = useCallback(
    (taskId: string) => {
      persist(allTasks.filter((t) => t.id !== taskId))
      toast({ description: 'Tarefa excluída com sucesso.' })
    },
    [allTasks],
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
