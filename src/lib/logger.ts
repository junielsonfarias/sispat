/**
 * Sistema de logging condicional para SISPAT 2.0
 * Logs apenas em desenvolvimento, silencia em produção
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface Logger {
  error: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

class SispLogger implements Logger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD

  private shouldLog(level: LogLevel): boolean {
    // Em produção, apenas erros críticos
    if (this.isProduction) {
      return level === 'error'
    }
    
    // Em desenvolvimento, todos os logs
    if (this.isDevelopment) {
      return true
    }
    
    // Fallback
    return level === 'error' || level === 'warn'
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[SISPAT ERROR] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[SISPAT WARN] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[SISPAT INFO] ${message}`, ...args)
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[SISPAT DEBUG] ${message}`, ...args)
    }
  }
}

// Instância singleton do logger
export const logger = new SispLogger()

// Função helper para substituir console.log
export const log = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
}

// Função para logs de API
export const apiLog = {
  request: (url: string, method: string) => {
    logger.debug(`[API] ${method.toUpperCase()} ${url}`)
  },
  response: (url: string, status: number) => {
    if (status >= 400) {
      logger.error(`[API] ${status} ${url}`)
    } else {
      logger.debug(`[API] ${status} ${url}`)
    }
  },
  error: (url: string, error: any) => {
    logger.error(`[API ERROR] ${url}`, error)
  }
}

// Função para logs de contexto
export const contextLog = {
  load: (contextName: string, data: any) => {
    logger.debug(`[CONTEXT] ${contextName} loaded:`, data)
  },
  error: (contextName: string, error: any) => {
    logger.error(`[CONTEXT ERROR] ${contextName}:`, error)
  }
}

export default logger
