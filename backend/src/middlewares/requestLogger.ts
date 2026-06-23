import { Request, Response, NextFunction } from 'express'
import { logHttp, logInfo } from '../config/logger'
import { maskEmail } from '../utils/mask'

// Chaves cujo valor nunca deve ir para os logs (PII / credenciais)
const SENSITIVE_KEYS =
  /^(password|senha|token|accesstoken|refreshtoken|authorization|secret|apikey|currentpassword|newpassword|confirmpassword|email)$/i

/**
 * Redige recursivamente campos sensíveis de um objeto antes de logar.
 */
function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redactSensitive(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redactSensitive(v, depth + 1)
  }
  return out
}

/**
 * Middleware de logging de requisições HTTP
 * Registra todas as requisições com detalhes úteis
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  // Log da requisição inicial
  const requestData = {
    method: req.method,
    url: req.url,
    path: req.path,
    query: redactSensitive(req.query),
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    user: req.user ? {
      id: req.user.userId,
      email: maskEmail(req.user.email),
      role: req.user.role
    } : null,
  }

  logHttp(`${req.method} ${req.path}`, requestData)

  // Interceptar a resposta para logar o resultado
  const originalSend = res.send
  res.send = function (data: any) {
    res.send = originalSend

    const duration = Date.now() - startTime
    const responseData = {
      ...requestData,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    }

    // Log com base no status code
    if (res.statusCode >= 500) {
      logHttp(`${req.method} ${req.path} - ${res.statusCode} ERROR (${duration}ms)`, responseData)
    } else if (res.statusCode >= 400) {
      logHttp(`${req.method} ${req.path} - ${res.statusCode} CLIENT ERROR (${duration}ms)`, responseData)
    } else if (res.statusCode >= 300) {
      logHttp(`${req.method} ${req.path} - ${res.statusCode} REDIRECT (${duration}ms)`, responseData)
    } else {
      logHttp(`${req.method} ${req.path} - ${res.statusCode} SUCCESS (${duration}ms)`, responseData)
    }

    return originalSend.call(this, data)
  }

  next()
}

/**
 * Middleware para logar ações importantes do usuário
 */
export const auditLogger = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auditData = {
      action,
      user: req.user ? {
        id: req.user.userId,
        email: maskEmail(req.user.email),
        role: req.user.role
      } : null,
      ip: req.ip || req.socket.remoteAddress,
      timestamp: new Date().toISOString(),
      body: redactSensitive(req.body),
      params: req.params,
    }

    logInfo(`AUDIT: ${action}`, auditData)
    next()
  }
}
