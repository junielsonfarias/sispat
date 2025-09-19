/**
 * Configuração de Otimização de Imagens para SISPAT
 */

export const imageOptimization = {
  // Configurações de compressão
  compression: {
    quality: 85,
    progressive: true,
    mozjpeg: true,
  },

  // Formatos suportados
  formats: {
    input: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    output: ['jpeg', 'png', 'webp'],
  },

  // Tamanhos de thumbnail
  thumbnails: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 },
  },

  // Configurações de cache
  cache: {
    enabled: true,
    ttl: 7 * 24 * 60 * 60, // 7 dias
    maxSize: 1000,
  },

  // Configurações de lazy loading
  lazyLoading: {
    enabled: true,
    placeholder:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=',
    threshold: 0.1,
  },
};

export default imageOptimization;
