import { Request, Response, NextFunction } from 'express'
import { logHttp, logInfo } from '../config/logger'

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
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    user: req.user ? {
      id: req.user.userId,
      email: req.user.email,
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
        email: req.user.email,
        role: req.user.role
      } : null,
      ip: req.ip || req.socket.remoteAddress,
      timestamp: new Date().toISOString(),
      body: req.body,
      params: req.params,
    }

    logInfo(`AUDIT: ${action}`, auditData)
    next()
  }
}
