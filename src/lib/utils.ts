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
export function getCloudImageUrl(fileId: string): string {
  if (typeof fileId !== 'string') {
    return process.env.NODE_ENV === 'production' 
      ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
      : 'https://img.usecurling.com/p/400/300?q=error%20loading%20image'
  }
  if (fileId.startsWith('data:image')) {
    return fileId
  }
  if (fileId.startsWith('gdrive:')) {
    const id = fileId.replace('gdrive:', '')
    return process.env.NODE_ENV === 'production'
      ? LOCAL_IMAGES.PLACEHOLDER_PHOTO
      : `https://img.usecurling.com/p/400/300?q=cloud%20file&seed=${id}`
  }
  if (fileId.startsWith('http')) {
    return fileId
  }
  return process.env.NODE_ENV === 'production'
    ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
    : 'https://img.usecurling.com/p/400/300?q=invalid%20image%20id'
}
