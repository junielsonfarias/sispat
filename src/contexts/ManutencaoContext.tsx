import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import {
  ManutencaoTask,
  ManutencaoTaskPriority,
  ManutencaoTaskStatus,
  ManutencaoTaskTipo,
} from '@/types'
import { isConnectionDownError, extractApiError } from '@/lib/api-error'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'

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

// O backend (Prisma `model ManutencaoTask` + schemas @sispat/shared) fala PT em
// minúsculo (titulo/descricao/prioridade/status/responsavel/dataPrevista) e exige
// `tipo`. O modelo de domínio do front usa inglês + rótulos capitalizados. O
// `zodValidate` substitui o req.body e o update é `.strict()`, então enviar o
// objeto cru resultava em 400 (titulo/tipo ausentes, enum minúsculo, chaves
// extras). Adaptamos aqui, no boundary, mantendo o backend canônico.
const TIPO_TO: Record<ManutencaoTaskTipo, string> = {
  Preventiva: 'preventiva',
  Corretiva: 'corretiva',
  Preditiva: 'preditiva',
}
const TIPO_FROM: Record<string, ManutencaoTaskTipo> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
}
const PRIO_TO: Record<ManutencaoTaskPriority, string> = {
  Baixa: 'baixa',
  Média: 'media',
  Alta: 'alta',
  Urgente: 'urgente',
}
const PRIO_FROM: Record<string, ManutencaoTaskPriority> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}
const STATUS_TO: Record<ManutencaoTaskStatus, string> = {
  'A Fazer': 'pendente',
  'Em Progresso': 'em_andamento',
  Concluída: 'concluida',
  Cancelada: 'cancelada',
}
const STATUS_FROM: Record<string, ManutencaoTaskStatus> = {
  pendente: 'A Fazer',
  em_andamento: 'Em Progresso',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

// Linha crua devolvida pelo backend.
interface ApiManutencao {
  id: string
  imovelId?: string | null
  patrimonioId?: string | null
  tipo?: string
  titulo?: string
  descricao?: string
  prioridade?: string
  status?: string
  responsavel?: string | null
  dataPrevista?: string
  createdAt?: string
  municipalityId?: string
}

const fromApi = (row: ApiManutencao): ManutencaoTask => ({
  id: row.id,
  imovelId: row.imovelId || '',
  title: row.titulo || '',
  description: row.descricao || '',
  tipo: TIPO_FROM[row.tipo || ''] || 'Preventiva',
  priority: PRIO_FROM[row.prioridade || ''] || 'Média',
  status: STATUS_FROM[row.status || ''] || 'A Fazer',
  assignedTo: row.responsavel ?? undefined,
  dueDate: new Date(row.dataPrevista || Date.now()),
  attachments: [],
  createdAt: new Date(row.createdAt || Date.now()),
  municipalityId: row.municipalityId || '',
})

// Body do POST (createManutencaoSchema não tem `status` — default 'pendente').
const toCreateBody = (
  task: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>,
) => ({
  imovelId: task.imovelId,
  tipo: TIPO_TO[task.tipo],
  titulo: task.title,
  descricao: task.description,
  prioridade: PRIO_TO[task.priority],
  responsavel: task.assignedTo || undefined,
  dataPrevista: task.dueDate,
})

// Body do PUT (updateManutencaoSchema é .strict(); só campos PT presentes).
const toUpdateBody = (updates: Partial<ManutencaoTask>) => {
  const body: Record<string, unknown> = {}
  if (updates.tipo !== undefined) body.tipo = TIPO_TO[updates.tipo]
  if (updates.title !== undefined) body.titulo = updates.title
  if (updates.description !== undefined) body.descricao = updates.description
  if (updates.priority !== undefined) body.prioridade = PRIO_TO[updates.priority]
  if (updates.status !== undefined) body.status = STATUS_TO[updates.status]
  if (updates.assignedTo !== undefined) body.responsavel = updates.assignedTo || null
  if (updates.dueDate !== undefined) body.dataPrevista = updates.dueDate
  return body
}

export const ManutencaoProvider = ({ children }: { children: ReactNode }) => {
  const [allTasks, setAllTasks] = useState<ManutencaoTask[]>([])
  const { user } = useAuth()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    try {
      const response = await api.get<ApiManutencao[]>('/manutencoes')
      const tasksData = Array.isArray(response) ? response.map(fromApi) : []
      setAllTasks(tasksData)
    } catch (error) {
      logger.error('Failed to load maintenance tasks:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de mostrar erro
      if (isConnectionDownError(error) || extractApiError(error).status === 404) {
        logger.debug('Backend não disponível - usando lista vazia de tarefas de manutenção')
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
        const created = await api.post<ApiManutencao>('/manutencoes', toCreateBody(taskData))
        setAllTasks(prev => [...prev, fromApi(created)])
        toast({ description: 'Tarefa de manutenção criada com sucesso.' })
      } catch (error) {
        logger.error('Erro ao criar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, salvar apenas localmente
        if (isConnectionDownError(error) || extractApiError(error).status === 404) {
          logger.debug('Backend não disponível. Salvando tarefa apenas localmente.')
          
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
        const updated = await api.put<ApiManutencao>(`/manutencoes/${taskId}`, toUpdateBody(updates))
        setAllTasks(prev => prev.map(t => (t.id === taskId ? fromApi(updated) : t)))
        toast({ description: 'Tarefa atualizada com sucesso.' })
      } catch (error) {
        logger.error('Erro ao atualizar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, atualizar apenas localmente
        if (isConnectionDownError(error) || extractApiError(error).status === 404) {
          logger.debug('Backend não disponível. Atualizando tarefa apenas localmente.')
          
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
        logger.error('Erro ao deletar tarefa de manutenção:', error)
        
        // ✅ CORREÇÃO: Se for erro de conexão, deletar apenas localmente
        if (isConnectionDownError(error) || extractApiError(error).status === 404) {
          logger.debug('Backend não disponível. Deletando tarefa apenas localmente.')
          
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
