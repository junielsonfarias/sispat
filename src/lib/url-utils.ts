// Modo mock - URLs são tratadas como estáticas
/**
 * Converte uma URL relativa em absoluta (modo mock)
 */
export function getAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // Se já é uma URL absoluta, retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Em modo mock, URLs são tratadas como estáticas
  if (url.startsWith('/static/') || url.startsWith('/uploads/') || url.startsWith('/docs/') || url.startsWith('/fotos/')) {
    return url // Retornar como está para simular arquivos estáticos
  }
  
  // Para outros casos, retornar como está
  return url
}

/**
 * Converte uma URL de upload para URL absoluta
 */
export function getUploadUrl(filename: string): string {
  return getAbsoluteUrl(`/static/${filename}`)
}

/**
 * Converte uma URL de foto de patrimônio para URL absoluta
 */
export function getPatrimonioImageUrl(url: string | null | undefined): string {
  return getAbsoluteUrl(url)
}

/**
 * Converte uma URL de documento para URL absoluta
 */
export function getDocumentUrl(url: string | null | undefined): string {
  return getAbsoluteUrl(url)
}
