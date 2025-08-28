import { useAuth } from '@/hooks/useAuth';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

interface GlobalLogoContextType {
  globalLogoUrl: string;
  setGlobalLogoUrl: (url: string) => void;
  getLogoForSystem: (
    systemType: 'etiqueta' | 'ficha' | 'relatorio' | 'geral'
  ) => string;
}

const GlobalLogoContext = createContext<GlobalLogoContextType | null>(null);

const defaultLogoUrl =
  'https://img.usecurling.com/i?q=brazilian%20government&color=azure';

export const GlobalLogoProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [globalLogoUrl, setGlobalLogoUrlState] =
    useState<string>(defaultLogoUrl);
  const { user } = useAuth();

  // Carregar logo salva no localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('sispat_global_logo_url');
    if (savedLogo) {
      setGlobalLogoUrlState(savedLogo);
    }
  }, []);

  const setGlobalLogoUrl = (url: string) => {
    setGlobalLogoUrlState(url);
    localStorage.setItem('sispat_global_logo_url', url);
  };

  const getLogoForSystem = (
    systemType: 'etiqueta' | 'ficha' | 'relatorio' | 'geral'
  ) => {
    // Por enquanto, usa a mesma logo para todos os sistemas
    // No futuro, pode ser expandido para ter logos específicas por tipo
    return globalLogoUrl;
  };

  return (
    <GlobalLogoContext.Provider
      value={{
        globalLogoUrl,
        setGlobalLogoUrl,
        getLogoForSystem,
      }}
    >
      {children}
    </GlobalLogoContext.Provider>
  );
};

export const useGlobalLogo = () => {
  const context = useContext(GlobalLogoContext);
  if (!context) {
    throw new Error(
      'useGlobalLogo deve ser usado dentro de um GlobalLogoProvider'
    );
  }
  return context;
};
