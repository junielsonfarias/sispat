import { api } from '@/services/api';
import { Municipality, User } from '@/types';
import React, {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

interface MunicipalityContextType {
  municipalities: Municipality[];
  isLoading: boolean;
  getMunicipalityById: (id: string) => Municipality | undefined;
  addMunicipality: (
    data: Omit<Municipality, 'id' | 'history'>,
    user: User
  ) => Promise<Municipality>;
  updateMunicipality: (
    id: string,
    data: Partial<Omit<Municipality, 'id' | 'history'>>,
    user: User
  ) => Promise<void>;
  deleteMunicipality: (id: string) => Promise<void>;
  refreshMunicipalities: () => Promise<void>;
}

const MunicipalityContext = createContext<MunicipalityContextType | null>(null);

export const MunicipalityProvider = ({ children }: { children: ReactNode }) => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debug log removido para melhor performance

  const fetchMunicipalities = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      const token =
        localStorage.getItem('sispat_auth_token') ||
        sessionStorage.getItem('sispat_auth_token');
      if (!token) {
        // Try to fetch without auth for login page
        try {
          const response = await fetch('/api/municipalities/public');
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              setMunicipalities(data);
              localStorage.setItem(
                'sispat_municipalities',
                JSON.stringify(data)
              );
            }
          }
        } catch (error) {
          // Silently handle error for better performance
        }
        setIsLoading(false);
        return;
      }

      const data = await api.get<Municipality[]>('/municipalities');
      console.log('Municipalities API response:', data);
      if (Array.isArray(data)) {
        setMunicipalities(data);
        console.log('Municipalities set successfully:', data);
        // Store in localStorage for persistence
        localStorage.setItem('sispat_municipalities', JSON.stringify(data));
      } else {
        console.error('API for municipalities did not return an array:', data);
        setMunicipalities([]);
        localStorage.removeItem('sispat_municipalities');
      }
    } catch (error) {
      console.error('Failed to fetch municipalities', error);
      setMunicipalities([]);
      localStorage.removeItem('sispat_municipalities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to load from localStorage first
    const cachedMunicipalities = localStorage.getItem('sispat_municipalities');
    if (cachedMunicipalities) {
      try {
        const parsed = JSON.parse(cachedMunicipalities);
        if (Array.isArray(parsed)) {
          setMunicipalities(parsed);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to parse cached municipalities:', error);
        localStorage.removeItem('sispat_municipalities');
      }
    }

    // Always fetch fresh data
    fetchMunicipalities();

    // Set up auto-refresh every 5 minutes (more reasonable)
    const interval = setInterval(() => {
      fetchMunicipalities();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const getMunicipalityById = useCallback(
    (id: string) => municipalities.find(m => m.id === id),
    [municipalities]
  );

  const addMunicipality = async (
    data: Omit<Municipality, 'id' | 'history'>,
    user: User
  ): Promise<Municipality> => {
    try {
      const newMunicipality = await api.post<Municipality>(
        '/municipalities',
        data
      );

      // Add to local state immediately
      setMunicipalities(prev => [...prev, newMunicipality]);

      // Update localStorage
      const updatedMunicipalities = [...municipalities, newMunicipality];
      localStorage.setItem(
        'sispat_municipalities',
        JSON.stringify(updatedMunicipalities)
      );

      // Also refresh from server to ensure consistency
      await fetchMunicipalities();

      return newMunicipality;
    } catch (error) {
      console.error('Error adding municipality:', error);
      throw error;
    }
  };

  const updateMunicipality = async (
    id: string,
    data: Partial<Omit<Municipality, 'id' | 'history'>>,
    user: User
  ) => {
    try {
      const updated = await api.put<Municipality>(
        `/municipalities/${id}`,
        data
      );

      // Update local state immediately
      setMunicipalities(prev => prev.map(m => (m.id === id ? updated : m)));

      // Update localStorage
      const updatedMunicipalities = municipalities.map(m =>
        m.id === id ? updated : m
      );
      localStorage.setItem(
        'sispat_municipalities',
        JSON.stringify(updatedMunicipalities)
      );

      // Also refresh from server to ensure consistency
      await fetchMunicipalities();
    } catch (error) {
      console.error('Error updating municipality:', error);
      throw error;
    }
  };

  const deleteMunicipality = async (id: string, force: boolean = false) => {
    try {
      const endpoint = force
        ? `/municipalities/${id}?force=true`
        : `/municipalities/${id}`;
      await api.delete(endpoint);

      // Remove from local state immediately
      setMunicipalities(prev => prev.filter(m => m.id !== id));

      // Update localStorage
      const updatedMunicipalities = municipalities.filter(m => m.id !== id);
      localStorage.setItem(
        'sispat_municipalities',
        JSON.stringify(updatedMunicipalities)
      );

      // Also refresh from server to ensure consistency
      await fetchMunicipalities();
    } catch (error) {
      console.error('Error deleting municipality:', error);
      throw error;
    }
  };

  const refreshMunicipalities = async () => {
    await fetchMunicipalities();
  };

  return (
    <MunicipalityContext.Provider
      value={{
        municipalities,
        isLoading,
        getMunicipalityById,
        addMunicipality,
        updateMunicipality,
        deleteMunicipality,
        refreshMunicipalities,
      }}
    >
      {children}
    </MunicipalityContext.Provider>
  );
};

export const useMunicipalities = () => {
  const context = useContext(MunicipalityContext);
  if (!context) {
    throw new Error(
      'useMunicipalities must be used within a MunicipalityProvider'
    );
  }
  return context;
};


