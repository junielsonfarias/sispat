import { useCallback, useEffect, useState } from 'react';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  hasUpdate: boolean;
  error: string | null;
}

export interface CacheStats {
  [cacheName: string]: {
    size: number;
    urls: string[];
  };
}

export interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
  cacheUrls: (urls: string[]) => void;
  clearCache: () => void;
  getCacheStats: () => Promise<CacheStats>;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker(
  swUrl: string = '/sw.js',
  options: {
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onError?: (error: Error) => void;
    updateCheckInterval?: number;
  } = {}
): UseServiceWorkerReturn {
  const {
    onUpdate,
    onSuccess,
    onError,
    updateCheckInterval = 60000 // 1 minuto
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    hasUpdate: false,
    error: null
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateState = useCallback((updates: Partial<ServiceWorkerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const register = useCallback(async () => {
    if (!state.isSupported) {
      const error = new Error('Service Worker não é suportado neste navegador');
      updateState({ error: error.message });
      onError?.(error);
      return;
    }

    try {
      updateState({ isInstalling: true, error: null });

      const reg = await navigator.serviceWorker.register(swUrl);
      setRegistration(reg);

      // Configurar listeners
      if (reg.installing) {
        updateState({ isInstalling: true });
        reg.installing.addEventListener('statechange', handleStateChange);
      }

      if (reg.waiting) {
        updateState({ isWaiting: true, hasUpdate: true });
        onUpdate?.(reg);
      }

      if (reg.active) {
        updateState({ isActive: true, isRegistered: true });
        onSuccess?.(reg);
      }

      // Listener para atualizações
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', handleStateChange);
          updateState({ isInstalling: true });
        }
      });

      console.log('Service Worker registrado com sucesso');
      updateState({ isRegistered: true, isInstalling: false });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Erro ao registrar Service Worker:', err);
      updateState({ 
        error: err.message, 
        isInstalling: false, 
        isRegistered: false 
      });
      onError?.(err);
    }
  }, [state.isSupported, swUrl, onUpdate, onSuccess, onError, updateState]);

  const unregister = useCallback(async () => {
    if (!registration) return;

    try {
      const result = await registration.unregister();
      if (result) {
        setRegistration(null);
        updateState({
          isRegistered: false,
          isActive: false,
          isWaiting: false,
          hasUpdate: false
        });
        console.log('Service Worker desregistrado com sucesso');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Erro ao desregistrar Service Worker:', err);
      updateState({ error: err.message });
      onError?.(err);
    }
  }, [registration, updateState, onError]);

  const update = useCallback(async () => {
    if (!registration) return;

    try {
      await registration.update();
      console.log('Verificação de atualização do Service Worker iniciada');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Erro ao verificar atualização:', err);
      updateState({ error: err.message });
      onError?.(err);
    }
  }, [registration, updateState, onError]);

  const skipWaiting = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      updateState({ isWaiting: false, hasUpdate: false });
    }
  }, [registration, updateState]);

  const cacheUrls = useCallback((urls: string[]) => {
    if (registration?.active) {
      registration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
    }
  }, [registration]);

  const clearCache = useCallback(() => {
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }, [registration]);

  const getCacheStats = useCallback((): Promise<CacheStats> => {
    return new Promise((resolve, reject) => {
      if (!registration?.active) {
        reject(new Error('Service Worker não está ativo'));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATS') {
          resolve(event.data.payload);
        }
      };

      registration.active.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      );

      // Timeout após 5 segundos
      setTimeout(() => {
        reject(new Error('Timeout ao obter estatísticas de cache'));
      }, 5000);
    });
  }, [registration]);

  const handleStateChange = useCallback((event: Event) => {
    const worker = event.target as ServiceWorker;
    
    switch (worker.state) {
      case 'installing':
        updateState({ isInstalling: true });
        break;
      case 'installed':
        updateState({ 
          isInstalling: false,
          isWaiting: true,
          hasUpdate: true
        });
        if (registration) {
          onUpdate?.(registration);
        }
        break;
      case 'activating':
        updateState({ isWaiting: false });
        break;
      case 'activated':
        updateState({ 
          isActive: true, 
          hasUpdate: false,
          isWaiting: false
        });
        if (registration) {
          onSuccess?.(registration);
        }
        // Recarregar página para aplicar atualizações
        if (state.hasUpdate) {
          window.location.reload();
        }
        break;
      case 'redundant':
        updateState({ 
          isActive: false,
          isWaiting: false,
          hasUpdate: false
        });
        break;
    }
  }, [updateState, registration, onUpdate, onSuccess, state.hasUpdate]);

  // Auto-registrar na inicialização
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      register();
    }
  }, [state.isSupported, state.isRegistered, register]);

  // Verificar atualizações periodicamente
  useEffect(() => {
    if (!registration || !updateCheckInterval) return;

    const interval = setInterval(() => {
      update();
    }, updateCheckInterval);

    return () => clearInterval(interval);
  }, [registration, updateCheckInterval, update]);

  // Listener para mudanças de estado do navigator
  useEffect(() => {
    if (!state.isSupported) return;

    const handleControllerChange = () => {
      console.log('Service Worker controller mudou');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [state.isSupported]);

  // Verificar se já existe um SW registrado
  useEffect(() => {
    if (!state.isSupported) return;

    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        setRegistration(reg);
        updateState({
          isRegistered: true,
          isActive: !!reg.active,
          isWaiting: !!reg.waiting,
          hasUpdate: !!reg.waiting
        });

        if (reg.waiting) {
          onUpdate?.(reg);
        }
      }
    });
  }, [state.isSupported, updateState, onUpdate]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    cacheUrls,
    clearCache,
    getCacheStats,
    registration
  };
}
