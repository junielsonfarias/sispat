import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface PublicSearchSettings {
  isPublicSearchEnabled: boolean;
  publicMunicipalityIds: string[];
}

interface PublicSearchContextType {
  settings: PublicSearchSettings;
  togglePublicSearch: (enabled: boolean) => void;
  toggleMunicipality: (municipalityId: string, isPublic: boolean) => void;
}

const PublicSearchContext = createContext<PublicSearchContextType | null>(null);

const initialSettings: PublicSearchSettings = {
  isPublicSearchEnabled: true,
  publicMunicipalityIds: ['1'],
};

export const PublicSearchProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] =
    useState<PublicSearchSettings>(initialSettings);

  useEffect(() => {
    const stored = localStorage.getItem('sispat_public_search_settings');

    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('❌ Erro ao parsear configurações públicas:', error);
        setSettings(initialSettings);
      }
    } else {
      // Tentar obter municípios do cache para incluir todos por padrão
      const cachedMunicipalities = localStorage.getItem(
        'sispat_municipalities'
      );

      if (cachedMunicipalities) {
        try {
          const municipalities = JSON.parse(cachedMunicipalities);
          const allMunicipalityIds = municipalities.map((m: any) => m.id);
          const updatedSettings = {
            ...initialSettings,
            publicMunicipalityIds: allMunicipalityIds,
          };
          console.log(
            '✅ PublicSearchProvider - Creating new settings:',
            updatedSettings
          );
          localStorage.setItem(
            'sispat_public_search_settings',
            JSON.stringify(updatedSettings)
          );
          setSettings(updatedSettings);
        } catch (error) {
          console.error(
            '❌ Erro ao criar configurações a partir dos municípios:',
            error
          );
          localStorage.setItem(
            'sispat_public_search_settings',
            JSON.stringify(initialSettings)
          );
          setSettings(initialSettings);
        }
      } else {
        console.log(
          '⚠️ PublicSearchProvider - No cached municipalities, using initial settings'
        );
        localStorage.setItem(
          'sispat_public_search_settings',
          JSON.stringify(initialSettings)
        );
        setSettings(initialSettings);
      }
    }
  }, []);

  // Efeito adicional para sincronizar quando municípios são carregados
  useEffect(() => {
    const handleStorageChange = () => {
      const cachedMunicipalities = localStorage.getItem(
        'sispat_municipalities'
      );
      const currentSettings = localStorage.getItem(
        'sispat_public_search_settings'
      );

      if (cachedMunicipalities && currentSettings) {
        try {
          const municipalities = JSON.parse(cachedMunicipalities);
          const settings = JSON.parse(currentSettings);
          const allMunicipalityIds = municipalities.map((m: any) => m.id);

          // Se as configurações não incluem todos os municípios, atualizar
          const missingIds = allMunicipalityIds.filter(
            id => !settings.publicMunicipalityIds.includes(id)
          );
          if (missingIds.length > 0) {
            const updatedSettings = {
              ...settings,
              publicMunicipalityIds: [
                ...new Set([
                  ...settings.publicMunicipalityIds,
                  ...allMunicipalityIds,
                ]),
              ],
            };
            console.log(
              '🔄 PublicSearchProvider - Updating settings with new municipalities:',
              updatedSettings
            );
            localStorage.setItem(
              'sispat_public_search_settings',
              JSON.stringify(updatedSettings)
            );
            setSettings(updatedSettings);
          }
        } catch (error) {
          console.error('❌ Erro na sincronização automática:', error);
        }
      }
    };

    // Verificar imediatamente
    handleStorageChange();

    // Escutar mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);

    // Verificar periodicamente
    const interval = setInterval(handleStorageChange, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const persist = (newSettings: PublicSearchSettings) => {
    localStorage.setItem(
      'sispat_public_search_settings',
      JSON.stringify(newSettings)
    );
    setSettings(newSettings);
  };

  const togglePublicSearch = useCallback(
    (enabled: boolean) => {
      persist({ ...settings, isPublicSearchEnabled: enabled });
    },
    [settings]
  );

  const toggleMunicipality = useCallback(
    (municipalityId: string, isPublic: boolean) => {
      const currentIds = settings.publicMunicipalityIds;
      const newIds = isPublic
        ? [...currentIds, municipalityId]
        : currentIds.filter(id => id !== municipalityId);
      persist({ ...settings, publicMunicipalityIds: [...new Set(newIds)] });
    },
    [settings]
  );

  return (
    <PublicSearchContext.Provider
      value={{ settings, togglePublicSearch, toggleMunicipality }}
    >
      {children}
    </PublicSearchContext.Provider>
  );
};

export const usePublicSearch = () => {
  const context = useContext(PublicSearchContext);
  if (!context) {
    throw new Error(
      'usePublicSearch must be used within a PublicSearchProvider'
    );
  }
  return context;
};
