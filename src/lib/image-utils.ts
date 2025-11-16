/**
 * Utilitário para gerenciamento de imagens locais e fallbacks
 */

import imageCompression from 'browser-image-compression'

export interface ImageConfig {
  src: string
  fallback?: string
  alt: string
  loading?: 'lazy' | 'eager'
}

export interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  quality?: number
}

/**
 * Comprime uma imagem antes do upload
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    quality: 0.9,
  }

  const compressionOptions = { ...defaultOptions, ...options }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)
    
    // Log da compressão
    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)
    const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2)
    const reductionPercent = ((1 - compressedFile.size / file.size) * 100).toFixed(1)
    
    if (import.meta.env.DEV) {
      console.log(`📸 Imagem comprimida: ${originalSizeMB}MB → ${compressedSizeMB}MB (↓${reductionPercent}%)`)
    }

    return compressedFile
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error)
    // Retornar arquivo original se compressão falhar
    return file
  }
}

/**
 * Comprime múltiplas imagens
 */
export const compressImages = async (
  files: File[],
  options?: CompressionOptions
): Promise<File[]> => {
  return Promise.all(files.map(file => compressImage(file, options)))
}

/**
 * Verifica se arquivo é uma imagem
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

/**
 * Cria thumbnail de uma imagem
 */
export const createThumbnail = async (file: File): Promise<File> => {
  return compressImage(file, {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 300,
    quality: 0.8,
  })
}

/**
 * URLs das imagens locais padrão
 * ✅ CORREÇÃO: Usar data URLs SVG inline para funcionar em produção
 */
export const LOCAL_IMAGES = {
  // Avatars padrão (data URLs SVG)
  AVATAR_MALE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TTwvdGV4dD48L3N2Zz4=',
  AVATAR_FEMALE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0U5M0Y4RCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RjwvdGV4dD48L3N2Zz4=',
  AVATAR_DEFAULT: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzk0YTNhOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QTwvdGV4dD48L3N2Zz4=',
  
  // Logos e ícones (data URLs SVG)
  LOGO_GOVERNMENT: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Hb3Y8L3RleHQ+PC9zdmc+',
  LOGO_DEFAULT: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5MT0dPPC90ZXh0Pjwvc3ZnPg==',
  
  // Placeholders (data URLs SVG) - ✅ CORREÇÃO: Funcionam em produção
  PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBpbmRpc3BvbsOtdmVsPC90ZXh0Pjwvc3ZnPg==',
  PLACEHOLDER_PHOTO: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZvdG8gaW5kaXNwb27DrXZlbDwvdGV4dD48L3N2Zz4=',
  PLACEHOLDER_MAP: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1hcGEgaW5kaXNwb27DrXZlbDwvdGV4dD48L3N2Zz4=',
  
  // Categorias de patrimônio (data URLs SVG)
  PATRIMONIO_NOTEBOOK: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vdGVib29rPC90ZXh0Pjwvc3ZnPg==',
  PATRIMONIO_CHAIR: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhZGVpcmE8L3RleHQ+PC9zdmc+',
  PATRIMONIO_BUILDING: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltw7N2ZWw8L3RleHQ+PC9zdmc+',
  
  // Backgrounds (data URLs SVG)
  BACKGROUND_GRADIENT: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwMCIgaGVpZ2h0PSIxMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzM3NDE1MTtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZjI5Mzc7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==',
  BACKGROUND_LOGIN: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwMCIgaGVpZ2h0PSIxMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0ibCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFmMjkzNztzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMzNzQxNTE7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNsKSIvPjwvc3ZnPg==',
  
  // Ícones do sistema (data URLs SVG)
  ICON_WINDOWS: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDA3OEQ3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5XPC90ZXh0Pjwvc3ZnPg==',
  ICON_ERROR: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2VmNDQ0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+ITwvdGV4dD48L3N2Zz4=',
} as const

/**
 * Gera URL de avatar baseada em gênero e seed
 */
export const generateAvatarUrl = (gender: 'male' | 'female' | 'default' = 'default', seed?: string): string => {
  // Sempre usar imagens locais, independente do seed
  switch (gender) {
    case 'male':
      return LOCAL_IMAGES.AVATAR_MALE
    case 'female':
      return LOCAL_IMAGES.AVATAR_FEMALE
    default:
      return LOCAL_IMAGES.AVATAR_DEFAULT
  }
}

/**
 * Gera URL de placeholder para imagens
 */
export const generatePlaceholderUrl = (category: string, width = 400, height = 300): string => {
  // Sempre usar imagens locais
  return LOCAL_IMAGES.PLACEHOLDER_IMAGE
}

/**
 * Gera URL de logo baseada no tipo
 */
export const generateLogoUrl = (type: 'government' | 'default' = 'default'): string => {
  // Sempre usar imagens locais
  return type === 'government' ? LOCAL_IMAGES.LOGO_GOVERNMENT : LOCAL_IMAGES.LOGO_DEFAULT
}

/**
 * Gera URL de background
 */
export const generateBackgroundUrl = (type: 'gradient' | 'login' = 'gradient'): string => {
  // Sempre usar imagens locais
  return type === 'login' ? LOCAL_IMAGES.BACKGROUND_LOGIN : LOCAL_IMAGES.BACKGROUND_GRADIENT
}

/**
 * Componente de imagem com fallback automático
 */
export const createImageConfig = (
  src: string,
  alt: string,
  fallback?: string
): ImageConfig => {
  return {
    src,
    fallback: fallback || LOCAL_IMAGES.PLACEHOLDER_IMAGE,
    alt,
    loading: 'lazy',
  }
}

/**
 * Verifica se uma URL é externa
 */
export const isExternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Gera URL de imagem de patrimônio baseada no tipo
 */
export const generatePatrimonioImageUrl = (tipo: string, seed?: string): string => {
  const category = tipo.toLowerCase()
  
  // Sempre usar imagens locais baseadas no tipo
  if (category.includes('notebook') || category.includes('computador')) {
    return LOCAL_IMAGES.PATRIMONIO_NOTEBOOK
  }
  if (category.includes('cadeira') || category.includes('mesa')) {
    return LOCAL_IMAGES.PATRIMONIO_CHAIR
  }
  if (category.includes('prédio') || category.includes('imóvel')) {
    return LOCAL_IMAGES.PATRIMONIO_BUILDING
  }
  return LOCAL_IMAGES.PLACEHOLDER_IMAGE
}

/**
 * Gera URL de mapa placeholder
 */
export const generateMapUrl = (): string => {
  // Sempre usar imagens locais
  return LOCAL_IMAGES.PLACEHOLDER_MAP
}
