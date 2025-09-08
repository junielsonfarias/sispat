import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Patrimonio } from '@/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useActivityLog } from './ActivityLogContext';

interface PatrimonioContextType {
  patrimonios: Patrimonio[];
  isLoading: boolean;
  error: string | null;
  setPatrimonios: (patrimonios: Patrimonio[]) => void;
  addPatrimonio: (
    patrimonio: Omit<
      Patrimonio,
      | 'id'
      | 'historico_movimentacao'
      | 'entityName'
      | 'notes'
      | 'municipalityId'
    >
  ) => Promise<Patrimonio>;
  updatePatrimonio: (updatedPatrimonio: Patrimonio) => Promise<void>;
  deletePatrimonio: (patrimonioId: string) => Promise<void>;
  getPatrimonioById: (patrimonioId: string) => Patrimonio | undefined;
  refreshPatrimonios: () => Promise<void>;
}

const PatrimonioContext = createContext<PatrimonioContextType | null>(null);

export const PatrimonioProvider = ({ children }: { children: ReactNode }) => {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const fetchPatrimonios = useCallback(async () => {
    if (!user) {
      return;
    }
    // Verificar token antes da chamada
    const token =
      localStorage.getItem('sispat_auth_token') ||
      sessionStorage.getItem('sispat_auth_token');

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: Patrimonio[];
        meta: any;
      }>('/patrimonios');

      // Extrair os dados da resposta paginada
      const data = response.data || [];
      // Log removido para melhor performance
      setPatrimonios(data);
    } catch (err) {
      console.error('❌ Erro ao buscar patrimônios:', err);
      // Detalhes do erro removidos para melhor performance
      setError('Falha ao carregar patrimônios.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshPatrimonios = useCallback(async () => {
    await fetchPatrimonios();
  }, [fetchPatrimonios]);

  useEffect(() => {
    if (user) {
      fetchPatrimonios();
    } else {
      setPatrimonios([]);
    }
  }, [user?.id, fetchPatrimonios]);

  const addPatrimonio = async (
    patrimonioData: Omit<
      Patrimonio,
      | 'id'
      | 'historico_movimentacao'
      | 'entityName'
      | 'notes'
      | 'municipalityId'
    >
  ): Promise<Patrimonio> => {
    try {
      console.log('🔄 Criando patrimônio:', patrimonioData.numero_patrimonio);
      console.log('📋 Dados do patrimônio:', patrimonioData);

      const newPatrimonio = await api.post<Patrimonio>(
        '/patrimonios',
        patrimonioData
      );

      console.log('✅ Patrimônio criado com sucesso:', newPatrimonio);

      // Forçar refresh completo para garantir sincronização
      console.log('🔄 Forçando refresh após criação...');
      await fetchPatrimonios();

      // Log activity
      if (logActivity) {
        await logActivity(
          {
            id: user?.id,
            name: user?.name,
            municipalityId: user?.municipality_id,
          },
          'PATRIMONIO_CREATE',
          `Patrimônio ${newPatrimonio.numero_patrimonio} criado`,
          newPatrimonio.setor_responsavel
        );
      }

      return newPatrimonio;
    } catch (error) {
      console.error('❌ Erro ao criar patrimônio:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar patrimônio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePatrimonio = async (updatedPatrimonio: Patrimonio) => {
    try {
      await api.put(`/patrimonios/${updatedPatrimonio.id}`, updatedPatrimonio);

      // Atualizar a lista imediatamente
      setPatrimonios(prev =>
        prev.map(p => (p.id === updatedPatrimonio.id ? updatedPatrimonio : p))
      );

      // Forçar refresh para garantir sincronização
      console.log('🔄 Forçando refresh após atualização...');
      await fetchPatrimonios();

      // Log activity
      if (logActivity) {
        await logActivity(
          {
            id: user?.id,
            name: user?.name,
            municipalityId: user?.municipality_id,
          },
          'PATRIMONIO_UPDATE',
          `Patrimônio ${updatedPatrimonio.numero_patrimonio} atualizado`,
          updatedPatrimonio.setor_responsavel
        );
      }

      toast({
        title: 'Sucesso',
        description: 'Patrimônio atualizado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar patrimônio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletePatrimonio = async (patrimonioId: string) => {
    try {
      const patrimonio = patrimonios.find(p => p.id === patrimonioId);
      await api.delete(`/patrimonios/${patrimonioId}`);

      // Atualizar a lista imediatamente
      setPatrimonios(prev => prev.filter(p => p.id !== patrimonioId));

      // Forçar refresh para garantir sincronização
      console.log('🔄 Forçando refresh após exclusão...');
      await fetchPatrimonios();

      // Log activity
      if (logActivity && patrimonio) {
        await logActivity(
          {
            id: user?.id,
            name: user?.name,
            municipalityId: user?.municipality_id,
          },
          'PATRIMONIO_DELETE',
          `Patrimônio ${patrimonio.numero_patrimonio} excluído`,
          patrimonio.setor_responsavel
        );
      }

      toast({
        title: 'Sucesso',
        description: 'Patrimônio excluído com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir patrimônio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getPatrimonioById = useCallback(
    (patrimonioId: string) => {
      return patrimonios.find(
        p => p.id === patrimonioId || p.numero_patrimonio === patrimonioId
      );
    },
    [patrimonios]
  );

  const value = useMemo(
    () => ({
      patrimonios,
      isLoading,
      error,
      setPatrimonios,
      addPatrimonio,
      updatePatrimonio,
      deletePatrimonio,
      getPatrimonioById,
      refreshPatrimonios,
    }),
    [
      patrimonios,
      isLoading,
      error,
      addPatrimonio,
      updatePatrimonio,
      deletePatrimonio,
      getPatrimonioById,
      refreshPatrimonios,
    ]
  );

  return (
    <PatrimonioContext.Provider value={value}>
      {children}
    </PatrimonioContext.Provider>
  );
};

export const usePatrimonio = () => {
  const context = useContext(PatrimonioContext);
  if (!context) {
    throw new Error('usePatrimonio must be used within a PatrimonioProvider');
  }
  return context;
};


