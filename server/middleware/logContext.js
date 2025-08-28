/**
 * Middleware para configurar contexto de logging
 */

import { clearUserContext, setUserContext } from '../utils/logger.js'

/**
 * Middleware para configurar contexto de usuário nos logs
 */
export const setupLogContext = (req, res, next) => {
  // Limpar contexto anterior
  clearUserContext()
  
  // Se há usuário autenticado, configurar contexto
  if (req.user) {
    setUserContext(
      req.user.id,
      req.user.role,
      req.user.municipality_id,
      req.user.name
    )
  }
  
  // Limpar contexto após a resposta
  res.on('finish', () => {
    clearUserContext()
  })
  
  next()
}

/**
 * Middleware para logs de operações críticas
 */
export const logCriticalOperation = (operation) => (req, res, next) => {
  const startTime = Date.now()
  
  // Log início da operação
  req.logOperation = {
    operation,
    startTime,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  }
  
  // Log fim da operação
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const success = res.statusCode < 400
    
    // Importar aqui para evitar dependência circular
    import('../utils/logger.js').then(({ logAudit, logPerformance }) => {
      logAudit(operation, req.user?.id, {
        success,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      })
      
      if (duration > 1000) { // Log performance se > 1s
        logPerformance(operation, duration, {
          slow: true,
          userId: req.user?.id,
          statusCode: res.statusCode,
        })
      }
    })
  })
  
  next()
}

export default {
  setupLogContext,
  logCriticalOperation,
}
