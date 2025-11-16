import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format as formatDateFns, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LOCAL_IMAGES } from './image-utils'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`
}

export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  if (!mimeMatch) {
    throw new Error('Invalid data URL')
  }
  const mime = mimeMatch[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(
  date: Date | string | number,
  formatStr = 'dd/MM/yyyy',
) {
  try {
    const dateObj = new Date(date)
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida'
    }
    
    return formatDateFns(dateObj, formatStr, { locale: ptBR })
  } catch (error) {
    console.error('Erro ao formatar data:', error)
    return 'Data inválida'
  }
}

export function formatRelativeDate(date: Date | string | number) {
  try {
    const dateObj = new Date(date)
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida'
    }
    
    return formatDistanceToNowStrict(dateObj, {
      addSuffix: true,
      locale: ptBR,
    })
  } catch (error) {
    console.error('Erro ao formatar data relativa:', error)
    return 'Data inválida'
  }
}

/**
 * Generates an image URL from a cloud storage file ID.
 * @param fileId The file ID, potentially prefixed (e.g., 'gdrive:123') or a data URL.
 * @returns A direct image URL or a placeholder if the ID is invalid.
 */
export function getCloudImageUrl(fileId: string | object | undefined): string {
  // ✅ CORREÇÃO: Converter objetos para string primeiro
  if (typeof fileId === 'object' && fileId !== null) {
    // Se for objeto com file_url, usar file_url
    if ('file_url' in fileId && fileId.file_url) {
      fileId = String(fileId.file_url)
    }
    // Se for objeto com id, usar id
    else if ('id' in fileId && fileId.id) {
      fileId = String(fileId.id)
    }
    else {
      return process.env.NODE_ENV === 'production' 
        ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
        : 'https://img.usecurling.com/p/400/300?q=error%20loading%20image'
    }
  }
  
  if (typeof fileId !== 'string' || !fileId) {
    return process.env.NODE_ENV === 'production' 
      ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
      : 'https://img.usecurling.com/p/400/300?q=error%20loading%20image'
  }
  
  // ✅ URLs base64 (inline images)
  if (fileId.startsWith('data:image')) {
    return fileId
  }
  
  // ✅ URLs do Google Drive
  if (fileId.startsWith('gdrive:')) {
    const id = fileId.replace('gdrive:', '')
    return process.env.NODE_ENV === 'production'
      ? LOCAL_IMAGES.PLACEHOLDER_PHOTO
      : `https://img.usecurling.com/p/400/300?q=cloud%20file&seed=${id}`
  }
  
  // ✅ URLs absolutas (http/https)
  if (fileId.startsWith('http')) {
    return fileId
  }
  
  // ✅ CORREÇÃO: Detectar URLs blob inválidas (sem extensão de arquivo)
  // URLs como "/uploads/blob-1762350703887-169450413" não são válidas
  if (fileId.startsWith('/uploads/') || fileId.startsWith('uploads/')) {
    const cleanPath = fileId.startsWith('/') ? fileId : `/${fileId}`
    const filename = cleanPath.split('/').pop() || ''
    
    // Verificar se é uma URL blob inválida (sem extensão de arquivo)
    // Blob URLs válidas devem ter extensão (.jpg, .png, etc)
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(filename)
    const isBlobUrl = filename.startsWith('blob-')
    
    // Se for blob URL sem extensão, retornar placeholder
    if (isBlobUrl && !hasValidExtension) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ URL blob inválida detectada (sem extensão):', cleanPath)
      }
      return process.env.NODE_ENV === 'production'
        ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
        : 'https://img.usecurling.com/p/400/300?q=invalid%20blob%20url'
    }
    
    // Construir URL completa para arquivos válidos
    const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    return `${BACKEND_URL}${cleanPath}`
  }
  
  // ✅ Fallback para placeholder
  return process.env.NODE_ENV === 'production'
    ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
    : 'https://img.usecurling.com/p/400/300?q=invalid%20image%20id'
}
