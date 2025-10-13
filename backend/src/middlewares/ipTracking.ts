import { Request, Response, NextFunction } from 'express'

/**
 * Middleware para capturar IP do usuário
 * Lida com proxies, load balancers e diferentes configurações
 */
export const captureIP = (req: Request, res: Response, next: NextFunction): void => {
  // Ordem de prioridade para obter o IP real
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || // Proxy/Load Balancer
    (req.headers['x-real-ip'] as string) || // Nginx
    (req.headers['cf-connecting-ip'] as string) || // Cloudflare
    req.socket?.remoteAddress || // Conexão direta
    req.ip || // Express padrão
    'unknown'

  // Limpar IPv6 localhost
  const cleanIP = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip

  // Adicionar ao request para uso posterior
  req.clientIP = cleanIP

  next()
}

/**
 * Extend Express Request type
 */
declare global {
  namespace Express {
    interface Request {
      clientIP?: string
    }
  }
}

/**
 * Helper para obter informações de geolocalização (opcional)
 * Requer integração com serviço externo (MaxMind, IPStack, etc)
 */
export async function getIPGeolocation(ip: string): Promise<{
  country?: string
  city?: string
  region?: string
} | null> {
  // Implementar integração com serviço de geolocalização se necessário
  // Por exemplo: MaxMind GeoIP2, IPStack, IP-API
  
  // Placeholder
  return null
}

/**
 * Helper para verificar se IP está em lista negra
 */
export function isIPBlacklisted(ip: string): boolean {
  // Lista de IPs bloqueados (pode ser movida para banco de dados)
  const blacklist: string[] = [
    // Adicionar IPs maliciosos conhecidos
  ]

  return blacklist.includes(ip)
}

/**
 * Middleware para bloquear IPs da lista negra
 */
export const blockBlacklistedIPs = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.clientIP || req.ip || 'unknown'

  if (isIPBlacklisted(ip)) {
    res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Seu IP foi bloqueado devido a atividades suspeitas'
    })
    return
  }

  next()
}

