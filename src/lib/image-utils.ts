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
 */
export const LOCAL_IMAGES = {
  // Avatars padrão
  AVATAR_MALE: '/src/assets/images/avatar-male.svg',
  AVATAR_FEMALE: '/src/assets/images/avatar-female.svg',
  AVATAR_DEFAULT: '/src/assets/images/avatar-default.svg',
  
  // Logos e ícones
  LOGO_GOVERNMENT: '/src/assets/images/logo-government.svg',
  LOGO_DEFAULT: '/src/assets/images/logo-default.svg',
  
  // Placeholders
  PLACEHOLDER_IMAGE: '/src/assets/images/placeholder.svg',
  PLACEHOLDER_PHOTO: '/src/assets/images/placeholder-photo.svg',
  PLACEHOLDER_MAP: '/src/assets/images/placeholder-map.svg',
  
  // Categorias de patrimônio
  PATRIMONIO_NOTEBOOK: '/src/assets/images/patrimonio-notebook.svg',
  PATRIMONIO_CHAIR: '/src/assets/images/patrimonio-chair.svg',
  PATRIMONIO_BUILDING: '/src/assets/images/patrimonio-building.svg',
  
  // Backgrounds
  BACKGROUND_GRADIENT: '/src/assets/images/background-gradient.svg',
  BACKGROUND_LOGIN: '/src/assets/images/background-login.svg',
  
  // Ícones do sistema
  ICON_WINDOWS: '/src/assets/images/icon-windows.svg',
  ICON_ERROR: '/src/assets/images/icon-error.svg',
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
