import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Imovel, HistoricoEntry } from '@/types';
import { generateId } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { useSectors } from './SectorContext';
import { getSubSectorIds } from '@/lib/sector-utils';

interface ImovelContextType {
  imoveis: Imovel[];
  getImovelById: (id: string) => Imovel | undefined;
  addImovel: (data: Omit<Imovel, 'id' | 'historico'>, user: any) => void;
  updateImovel: (id: string, data: Partial<Imovel>, user: any) => void;
  deleteImovel: (id: string) => void;
}

const ImovelContext = createContext<ImovelContextType | null>(null);

const initialImoveis: Imovel[] = [
  {
    id: 'imovel-1',
    numero_patrimonio: 'IM-2024001',
    denominacao: 'Edifício Sede da Prefeitura',
    endereco: 'Praça da Matriz, S/N, Centro',
    setor: 'Administração',
    data_aquisicao: new Date('1990-05-20'),
    valor_aquisicao: 500000,
    area_terreno: 2000,
    area_construida: 1200,
    latitude: -1.7229,
    longitude: -49.6842,
    fotos: ['https://img.usecurling.com/p/800/600?q=city%20hall'],
    documentos: [],
    historico: [
      {
        date: new Date(),
        action: 'Criação',
        details: 'Imóvel cadastrado no sistema.',
        user: 'Admin',
      },
    ],
    municipalityId: '1',
    customFields: {
      matricula_imovel: '12345',
      cartorio: '1º Ofício de Registro de Imóveis',
    },
  },
];

export const ImovelProvider = ({ children }: { children: ReactNode }) => {
  const [allImoveis, setAllImoveis] = useState<Imovel[]>(initialImoveis);
  const { user } = useAuth();
  const { sectors } = useSectors();

  useEffect(() => {
    const stored = localStorage.getItem('sispat_imoveis');
    if (stored) {
      setAllImoveis(JSON.parse(stored));
    } else {
      localStorage.setItem('sispat_imoveis', JSON.stringify(initialImoveis));
    }
  }, []);

  const imoveis = useMemo(() => {
    if (!user) return [];
    if (user.role === 'superuser') return allImoveis;
    if (!user.municipalityId) return [];

    const municipalityImoveis = allImoveis.filter(
      i => i.municipalityId === user.municipalityId
    );

    if (user.role === 'supervisor' || user.role === 'admin') {
      return municipalityImoveis;
    }

    if (user.responsibleSectors && user.responsibleSectors.length > 0) {
      const accessibleSectorIds = new Set<string>();
      user.responsibleSectors.forEach(sectorName => {
        const sector = sectors.find(s => s.name === sectorName);
        if (sector) {
          const subSectorIds = getSubSectorIds(sector.id, sectors);
          subSectorIds.forEach(id => accessibleSectorIds.add(id));
        }
      });

      const accessibleSectorNames = new Set(
        Array.from(accessibleSectorIds)
          .map(id => sectors.find(s => s.id === id)?.name)
          .filter(Boolean)
      );

      return municipalityImoveis.filter(i =>
        accessibleSectorNames.has(i.setor)
      );
    }

    return [];
  }, [allImoveis, user, sectors]);

  const persist = (newImoveis: Imovel[]) => {
    localStorage.setItem('sispat_imoveis', JSON.stringify(newImoveis));
    setAllImoveis(newImoveis);
  };

  const getImovelById = useCallback(
    (id: string) => imoveis.find(i => i.id === id),
    [imoveis]
  );

  const addImovel = useCallback(
    (data: Omit<Imovel, 'id' | 'historico'>, user: any) => {
      const newHistoricoEntry: HistoricoEntry = {
        date: new Date(),
        action: 'Criação',
        details: 'Imóvel cadastrado no sistema.',
        user: user.name,
      };
      const newImovel: Imovel = {
        ...data,
        id: generateId(),
        historico: [newHistoricoEntry],
      };
      persist([...allImoveis, newImovel]);
      toast({ description: 'Imóvel cadastrado com sucesso.' });
    },
    [allImoveis]
  );

  const updateImovel = useCallback(
    (id: string, data: Partial<Imovel>, user: any) => {
      const newHistoricoEntry: HistoricoEntry = {
        date: new Date(),
        action: 'Atualização',
        details: 'Dados do imóvel atualizados.',
        user: user.name,
      };
      const newImoveis = allImoveis.map(i =>
        i.id === id
          ? { ...i, ...data, historico: [newHistoricoEntry, ...i.historico] }
          : i
      );
      persist(newImoveis);
      toast({ description: 'Imóvel atualizado com sucesso.' });
    },
    [allImoveis]
  );

  const deleteImovel = useCallback(
    (id: string) => {
      persist(allImoveis.filter(i => i.id !== id));
      toast({ description: 'Imóvel excluído com sucesso.' });
    },
    [allImoveis]
  );

  const value = useMemo(
    () => ({ imoveis, getImovelById, addImovel, updateImovel, deleteImovel }),
    [imoveis, getImovelById, addImovel, updateImovel, deleteImovel]
  );

  return (
    <ImovelContext.Provider value={value}>{children}</ImovelContext.Provider>
  );
};

export const useImovel = () => {
  const context = useContext(ImovelContext);
  if (!context) {
    throw new Error('useImovel must be used within an ImovelProvider');
  }
  return context;
};
