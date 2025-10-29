/**
 * Middleware para capturar métricas de autenticação
 */

import { Request, Response, NextFunction } from 'express'
import { metricsCollector } from '../config/metrics'

export const authMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Interceptar respostas de autenticação
  const originalSend = res.send.bind(res)
  
  res.send = function(data) {
    // Verificar se é uma rota de autenticação
    if (req.path.includes('/auth/')) {
      try {
        // Se a resposta indica erro de autenticação
        if (res.statusCode === 401 || res.statusCode === 403) {
          // Incrementar contador de logins falhados
          metricsCollector.incrementMetric('failed_logins', 1, 300).catch(console.error)
        }
        
        // Se é uma rota de login e foi bem-sucedida
        if (req.path === '/api/auth/login' && res.statusCode === 200) {
          metricsCollector.incrementMetric('successful_logins', 1, 300).catch(console.error)
        }
      } catch (error) {
        console.error('Erro ao capturar métricas de autenticação:', error)
      }
    }
    
    return originalSend(data)
  }
  
  next()
}

export default authMetricsMiddleware
