import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Sector } from '@/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

interface SectorContextType {
  sectors: Sector[];
  isLoading: boolean;
  setSectors: (sectors: Sector[]) => void;
  getSectorById: (id: string) => Sector | undefined;
  addSector: (data: Omit<Sector, 'id'>) => Promise<void>;
  updateSector: (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>
  ) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  fetchSectorsByMunicipality: (municipalityId: string) => Promise<void>;
  refreshSectors: () => Promise<void>;
}

const SectorContext = createContext<SectorContextType | null>(null);

export const SectorProvider = ({ children }: { children: ReactNode }) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchSectors = useCallback(
    async (municipalityId?: string) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let data;
        if (user.role === 'superuser' && municipalityId) {
          // Para superuser, buscar setores de um município específico
          console.log(
            '🔍 Superuser buscando setores para município:',
            municipalityId
          );
          data = await api.get<Sector[]>(
            `/sectors/municipality/${municipalityId}`
          );
        } else if (user.role === 'superuser') {
          // Para superuser sem município específico, não carregar
          console.log(
            '🔍 Superuser sem município específico - não carregando setores'
          );
          setIsLoading(false);
          return;
        } else {
          // Para outros usuários, buscar setores do seu município
          console.log('🔍 Usuário normal buscando setores do seu município');
          data = await api.get<Sector[]>('/sectors');
        }

        console.log('✅ Setores carregados:', data?.length || 0, 'setores');
        setSectors(data || []);
      } catch (error) {
        console.error('❌ Erro ao carregar setores:', error);
        // Só mostrar erro se não for superuser
        if (user.role !== 'superuser') {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Falha ao carregar setores. Tente novamente.',
          });
        }
        setSectors([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Removido o useEffect automático para evitar loops
  // useEffect(() => {
  //   fetchSectors()
  // }, [fetchSectors])

  const getSectorById = useCallback(
    (id: string) => sectors.find(s => s.id === id),
    [sectors]
  );

  const addSector = async (data: Omit<Sector, 'id'>) => {
    try {
      const newSector = await api.post<Sector>('/sectors', data);
      setSectors(prev => [...prev, newSector]);
      toast({
        title: 'Sucesso!',
        description: 'Setor criado com sucesso.',
      });

      // Forçar refresh da lista para garantir sincronização
      await fetchSectors();
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao criar setor. Tente novamente.',
      });
      throw error;
    }
  };

  const updateSector = async (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>
  ) => {
    try {
      const updatedSector = await api.put<Sector>(`/sectors/${id}`, data);
      setSectors(prev => prev.map(s => (s.id === id ? updatedSector : s)));
      toast({
        title: 'Sucesso!',
        description: 'Setor atualizado com sucesso.',
      });

      // Forçar refresh da lista para garantir sincronização
      await fetchSectors();
    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao atualizar setor. Tente novamente.',
      });
      throw error;
    }
  };

  const deleteSector = async (id: string) => {
    try {
      await api.delete(`/sectors/${id}`);
      setSectors(prev => prev.filter(s => s.id !== id));
      toast({
        title: 'Sucesso!',
        description: 'Setor excluído com sucesso.',
      });

      // Forçar refresh da lista para garantir sincronização
      await fetchSectors();
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao excluir setor. Tente novamente.',
      });
      throw error;
    }
  };

  const fetchSectorsByMunicipality = useCallback(
    async (municipalityId: string) => {
      console.log('🔄 Carregando setores para município:', municipalityId);

      if (!user) {
        // Se não há usuário autenticado, usar endpoint público
        try {
          setIsLoading(true);
          const data = await api.get<Sector[]>(
            `/sectors/public/${municipalityId}`
          );
          console.log(
            '✅ Setores carregados (público):',
            data?.length || 0,
            'setores'
          );
          setSectors(data || []);
        } catch (error) {
          console.error('❌ Erro ao carregar setores (público):', error);
          setSectors([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Se há usuário autenticado, usar função normal
        await fetchSectors(municipalityId);
      }
    },
    [fetchSectors, user]
  );

  const refreshSectors = useCallback(async () => {
    await fetchSectors();
  }, [fetchSectors]);

  return (
    <SectorContext.Provider
      value={{
        sectors,
        isLoading,
        setSectors,
        getSectorById,
        addSector,
        updateSector,
        deleteSector,
        fetchSectorsByMunicipality,
        refreshSectors,
      }}
    >
      {children}
    </SectorContext.Provider>
  );
};

export const useSectors = () => {
  const context = useContext(SectorContext);
  if (!context) {
    throw new Error('useSectors must be used within a SectorProvider');
  }
  return context;
};
