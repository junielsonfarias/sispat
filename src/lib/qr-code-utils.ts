import QRCode from 'qrcode'

/**
 * Utilitário para geração de códigos QR local
 */

export interface QRCodeOptions {
  size?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

const DEFAULT_OPTIONS: QRCodeOptions = {
  size: 150,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  errorCorrectionLevel: 'H',
}

/**
 * Gera um código QR como data URL
 */
export const generateQRCode = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
    
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    })
    
    return qrDataUrl
  } catch (error) {
    console.error('Erro ao gerar QR code:', error)
    throw new Error('Falha ao gerar código QR')
  }
}

/**
 * Gera um código QR como SVG
 */
export const generateQRCodeSVG = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
    
    const qrSvg = await QRCode.toString(data, {
      type: 'svg',
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      color: {
        dark: mergedOptions.color?.dark || '#000000',
        light: mergedOptions.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    })
    
    return qrSvg
  } catch (error) {
    console.error('Erro ao gerar QR code SVG:', error)
    throw new Error('Falha ao gerar código QR SVG')
  }
}

/**
 * Gera um código QR para consulta pública de patrimônio
 * @param patrimonioNumero - Número do patrimônio (ex: 2025-001)
 * @param assetType - Tipo do bem ('bem' para móveis, 'imovel' para imóveis)
 * @param baseUrl - URL base opcional (usa window.location.origin se não fornecido)
 * @returns Promise com data URL do QR code gerado
 */
export const generatePatrimonioQRCode = async (
  patrimonioNumero: string,
  assetType: 'bem' | 'imovel' = 'bem',
  baseUrl?: string
): Promise<string> => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const path = assetType === 'imovel' 
    ? `/consulta-publica/imovel/${patrimonioNumero}`
    : `/consulta-publica/bem/${patrimonioNumero}`
  
  const publicUrl = `${origin}${path}`
  
  return generateQRCode(publicUrl, {
    size: 150,
    errorCorrectionLevel: 'H',
  })
}

/**
 * Hook para geração de QR codes com cache
 */
export const useQRCodeCache = () => {
  const cache = new Map<string, string>()
  
  const getOrGenerateQRCode = async (
    data: string,
    options: QRCodeOptions = {}
  ): Promise<string> => {
    const cacheKey = `${data}-${JSON.stringify(options)}`
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!
    }
    
    const qrCode = await generateQRCode(data, options)
    cache.set(cacheKey, qrCode)
    
    return qrCode
  }
  
  const clearCache = () => {
    cache.clear()
  }
  
  return {
    getOrGenerateQRCode,
    clearCache,
  }
}
