import { toast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { ManutencaoTask } from '@/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

interface ManutencaoContextType {
  tasks: ManutencaoTask[];
  getTasksByImovelId: (imovelId: string) => ManutencaoTask[];
  addTask: (
    task: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>
  ) => void;
  updateTask: (taskId: string, updates: Partial<ManutencaoTask>) => void;
  deleteTask: (taskId: string) => void;
}

const ManutencaoContext = createContext<ManutencaoContextType | null>(null);

const initialTasks: ManutencaoTask[] = [];

export const ManutencaoProvider = ({ children }: { children: ReactNode }) => {
  const [allTasks, setAllTasks] = useState<ManutencaoTask[]>(initialTasks);
  const { user } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('sispat_manutencao_tasks');
    if (stored) {
      setAllTasks(
        JSON.parse(stored).map((t: any) => ({
          ...t,
          dueDate: new Date(t.dueDate),
          createdAt: new Date(t.createdAt),
        }))
      );
    } else {
      localStorage.setItem(
        'sispat_manutencao_tasks',
        JSON.stringify(initialTasks)
      );
    }
  }, []);

  const tasks = useMemo(() => {
    if (user?.role === 'superuser') return allTasks;
    if (user?.municipalityId) {
      return allTasks.filter(t => t.municipalityId === user.municipalityId);
    }
    return [];
  }, [allTasks, user]);

  const persist = (newTasks: ManutencaoTask[]) => {
    localStorage.setItem('sispat_manutencao_tasks', JSON.stringify(newTasks));
    setAllTasks(newTasks);
  };

  const getTasksByImovelId = useCallback(
    (imovelId: string) => {
      return tasks.filter(t => t.imovelId === imovelId);
    },
    [tasks]
  );

  const addTask = useCallback(
    (taskData: Omit<ManutencaoTask, 'id' | 'createdAt' | 'municipalityId'>) => {
      if (!user?.municipalityId) return;
      const newTask: ManutencaoTask = {
        ...taskData,
        id: generateId(),
        createdAt: new Date(),
        municipalityId: user.municipalityId,
      };
      persist([...allTasks, newTask]);
      toast({ description: 'Tarefa de manutenção criada com sucesso.' });
    },
    [allTasks, user]
  );

  const updateTask = useCallback(
    (taskId: string, updates: Partial<ManutencaoTask>) => {
      const newTasks = allTasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      persist(newTasks);
      toast({ description: 'Tarefa atualizada com sucesso.' });
    },
    [allTasks]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      persist(allTasks.filter(t => t.id !== taskId));
      toast({ description: 'Tarefa excluída com sucesso.' });
    },
    [allTasks]
  );

  return (
    <ManutencaoContext.Provider
      value={{ tasks, getTasksByImovelId, addTask, updateTask, deleteTask }}
    >
      {children}
    </ManutencaoContext.Provider>
  );
};

export const useManutencao = () => {
  const context = useContext(ManutencaoContext);
  if (!context) {
    throw new Error('useManutencao must be used within a ManutencaoProvider');
  }
  return context;
};
