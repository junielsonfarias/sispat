import { toast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { Inventory, InventoryItem, Patrimonio } from '@/types';
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
import { usePatrimonio } from './PatrimonioContext';

interface InventoryContextType {
  inventories: Inventory[];
  getInventoryById: (id: string) => Inventory | undefined;
  createInventory: (data: {
    name: string;
    sectorName: string;
    scope: 'sector' | 'location';
    locationType?: string;
  }) => Inventory;
  updateInventoryItemStatus: (
    inventoryId: string,
    patrimonioId: string,
    status: 'found' | 'not_found'
  ) => void;
  finalizeInventory: (inventoryId: string) => Promise<Patrimonio[]>;
  deleteInventory: (inventoryId: string) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [allInventories, setAllInventories] = useState<Inventory[]>([]);
  const { patrimonios, updatePatrimonio } = usePatrimonio();
  const { user } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('sispat_inventories');
    if (stored) {
      setAllInventories(JSON.parse(stored));
    }
  }, []);

  const inventories = useMemo(() => {
    if (user?.role === 'superuser') return allInventories;
    if (user?.municipalityId) {
      return allInventories.filter(
        i => i.municipalityId === user.municipalityId
      );
    }
    return [];
  }, [allInventories, user]);

  const persistInventories = (newInventories: Inventory[]) => {
    localStorage.setItem('sispat_inventories', JSON.stringify(newInventories));
    setAllInventories(newInventories);
  };

  const getInventoryById = useCallback(
    (id: string) => inventories.find(inv => inv.id === id),
    [inventories]
  );

  const createInventory = useCallback(
    (data: {
      name: string;
      sectorName: string;
      scope: 'sector' | 'location';
      locationType?: string;
    }) => {
      if (!user?.municipalityId) throw new Error('Município não selecionado.');
      const { name, sectorName, scope, locationType } = data;

      const patrimoniosInScope = patrimonios.filter(p => {
        const inSector = p.setor_responsavel === sectorName;
        if (!inSector) return false;
        if (scope === 'location') {
          return (
            locationType &&
            p.local_objeto.toLowerCase().includes(locationType.toLowerCase())
          );
        }
        return true;
      });

      const items: InventoryItem[] = patrimoniosInScope.map(p => ({
        patrimonioId: p.id,
        numero_patrimonio: p.numero_patrimonio,
        descricao: p.descricao,
        status: 'not_found',
      }));

      const newInventory: Inventory = {
        id: generateId(),
        name,
        sectorName,
        status: 'in_progress',
        createdAt: new Date(),
        items,
        scope,
        locationType,
        municipalityId: user.municipalityId,
      };
      persistInventories([...allInventories, newInventory]);
      return newInventory;
    },
    [allInventories, patrimonios, user]
  );

  const updateInventoryItemStatus = useCallback(
    (
      inventoryId: string,
      patrimonioId: string,
      status: 'found' | 'not_found'
    ) => {
      const newInventories = allInventories.map(inv => {
        if (inv.id === inventoryId) {
          return {
            ...inv,
            items: inv.items.map(item =>
              item.patrimonioId === patrimonioId ? { ...item, status } : item
            ),
          };
        }
        return inv;
      });
      persistInventories(newInventories);
    },
    [allInventories]
  );

  const finalizeInventory = useCallback(
    async (inventoryId: string): Promise<Patrimonio[]> => {
      const inventory = allInventories.find(inv => inv.id === inventoryId);
      if (!inventory) throw new Error('Inventário não encontrado.');

      const lastCompletedInventory = allInventories
        .filter(
          inv =>
            inv.sectorName === inventory.sectorName &&
            inv.status === 'completed'
        )
        .sort(
          (a, b) =>
            new Date(b.finalizedAt!).getTime() -
            new Date(a.finalizedAt!).getTime()
        )[0];

      const previouslyFoundIds = new Set(
        lastCompletedInventory
          ? lastCompletedInventory.items
              .filter(item => item.status === 'found')
              .map(item => item.patrimonioId)
          : patrimonios
              .filter(p => p.setor_responsavel === inventory.sectorName)
              .map(p => p.id)
      );

      const newlyMissingPatrimonios: Patrimonio[] = [];
      inventory.items.forEach(item => {
        if (
          item.status === 'not_found' &&
          previouslyFoundIds.has(item.patrimonioId)
        ) {
          const patrimonioToUpdate = patrimonios.find(
            p => p.id === item.patrimonioId
          );
          if (
            patrimonioToUpdate &&
            patrimonioToUpdate.status !== 'extraviado'
          ) {
            updatePatrimonio({ ...patrimonioToUpdate, status: 'extraviado' });
            newlyMissingPatrimonios.push(patrimonioToUpdate);
          }
        }
      });

      const newInventories = allInventories.map(inv =>
        inv.id === inventoryId
          ? { ...inv, status: 'completed', finalizedAt: new Date() }
          : inv
      );
      persistInventories(newInventories);
      return newlyMissingPatrimonios;
    },
    [allInventories, patrimonios, updatePatrimonio]
  );

  const deleteInventory = useCallback(
    (inventoryId: string) => {
      persistInventories(allInventories.filter(inv => inv.id !== inventoryId));
      toast({ description: 'Inventário excluído com sucesso.' });
    },
    [allInventories]
  );

  return (
    <InventoryContext.Provider
      value={{
        inventories,
        getInventoryById,
        createInventory,
        updateInventoryItemStatus,
        finalizeInventory,
        deleteInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
