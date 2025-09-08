import { generateId } from '@/lib/utils';
import { api } from '@/services/api';
import { ActivityLog, ActivityLogAction, User } from '@/types';
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { toast } from 'sonner';

interface ActivityLogContextType {
  logs: ActivityLog[];
  setLogs: (logs: ActivityLog[]) => void;
  logActivity: (
    user: Partial<User>,
    action: ActivityLogAction,
    details: string,
    sector?: string
  ) => void;
  refreshLogs: () => Promise<void>;
  loading: boolean;
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null);

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    // Não buscar logs se não houver token de autenticação (página pública)
    const token =
      localStorage.getItem('sispat_auth_token') ||
      sessionStorage.getItem('sispat_auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/activity-log');
      setLogs(response.data);
    } catch (error) {
      console.error('Erro ao buscar logs de atividade:', error);
      // Não mostrar toast de erro em páginas públicas
      if (token) {
        toast.error('Erro ao carregar logs de atividade');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logActivity = useCallback(
    async (
      user: Partial<User>,
      action: ActivityLogAction,
      details: string,
      sector?: string
    ) => {
      try {
        const newLog: ActivityLog = {
          id: generateId(),
          timestamp: new Date(),
          userId: user.id || 'system',
          userName: user.name || 'System',
          action,
          details,
          sector: sector || user.sector,
          municipalityId: user.municipalityId,
        };

        // Adicionar localmente para feedback imediato
        setLogs(prev => [newLog, ...(Array.isArray(prev) ? prev : [])]);

        // Enviar para o servidor
        await api.post('/activity-log', {
          action,
          details,
          sector: sector || user.sector,
          municipalityId: user.municipalityId,
        });

        toast.success('Atividade registrada com sucesso');
      } catch (error) {
        console.error('Erro ao registrar atividade:', error);
        toast.error('Erro ao registrar atividade');
      }
    },
    []
  );

  return (
    <ActivityLogContext.Provider
      value={{ logs, setLogs, logActivity, refreshLogs, loading }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
};

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error(
      'useActivityLog must be used within an ActivityLogProvider'
    );
  }
  return context;
};


