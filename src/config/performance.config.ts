/**
 * Configuração de Performance para SISPAT
 */

export const performanceConfig = {
  // Configurações de debounce e throttle
  timing: {
    debounce: 300,
    throttle: 100,
    searchDelay: 500,
  },

  // Configurações de paginação
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Configurações de virtualização
  virtualization: {
    enabled: true,
    itemHeight: 50,
    overscan: 5,
  },

  // Configurações de lazy loading
  lazyLoading: {
    enabled: true,
    threshold: 0.1,
    rootMargin: '50px',
  },

  // Configurações de preload
  preload: {
    enabled: true,
    criticalRoutes: ['/dashboard', '/bens-cadastrados', '/imoveis'],
    preloadDelay: 1000,
  },

  // Configurações de service worker
  serviceWorker: {
    enabled: process.env.NODE_ENV === 'production',
    cacheStrategy: 'staleWhileRevalidate',
    cacheName: 'sispat-cache-v1',
  },

  // Configurações de bundle splitting
  bundleSplitting: {
    enabled: true,
    vendorChunks: ['react', 'radix', 'utils', 'charts', 'documents'],
    routeChunks: true,
  },

  // Configurações de compressão
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024,
  },
};

export default performanceConfig;
