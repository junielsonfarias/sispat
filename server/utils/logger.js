import path from 'path'
import { fileURLToPath } from 'url'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Contexto global para adicionar informações de usuário aos logs
let globalLogContext = {}

// Definir níveis de log customizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
}

// Adicionar cores aos níveis
winston.addColors(customLevels.colors)

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    }
    
    if (stack) {
      logEntry.stack = stack
    }
    
    return JSON.stringify(logEntry, null, 2)
  })
)

// Formato para console (mais legível)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    if (stack) {
      log += `\n${stack}`
    }
    
    return log
  })
)

// Configurar transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleFormat,
  }),
  
  // Arquivo de erro com rotação diária
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    createSymlink: true,
    symlinkName: 'error-current.log',
  }),
  
  // Arquivo combinado com rotação diária
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    createSymlink: true,
    symlinkName: 'combined-current.log',
  }),
  
  // Arquivo de HTTP requests
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '7d',
    createSymlink: true,
    symlinkName: 'http-current.log',
  }),
]

// Criar logger principal
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: logFormat,
  defaultMeta: {
    service: 'sispat-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  // Não sair do processo em caso de erro
  exitOnError: false,
})

// Funções utilitárias para diferentes tipos de log
export const logError = (message, error = null, meta = {}) => {
  logger.error(message, {
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : null,
    ...meta,
  })
}

export const logWarning = (message, meta = {}) => {
  logger.warn(message, meta)
}

export const logInfo = (message, meta = {}) => {
  logger.info(message, meta)
}

export const logHttp = (req, res, responseTime) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    userRole: req.user?.role,
    municipalityId: req.user?.municipality_id,
  })
}

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta)
}

// Log de atividades de auditoria
export const logAudit = (action, userId, details = {}) => {
  logger.info('Audit Log', {
    type: 'AUDIT',
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  })
}

// Log de segurança
export const logSecurity = (event, severity = 'warn', details = {}) => {
  logger[severity]('Security Event', {
    type: 'SECURITY',
    event,
    timestamp: new Date().toISOString(),
    ...details,
  })
}

// Log de performance
export const logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance Log', {
    type: 'PERFORMANCE',
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...globalLogContext,
    ...details,
  })
}

// Funções para gerenciar contexto de usuário
export const setUserContext = (userId, userRole, municipalityId = null, userName = null) => {
  globalLogContext = {
    userId,
    userRole,
    municipalityId,
    userName,
    contextSet: new Date().toISOString(),
  }
}

export const clearUserContext = () => {
  globalLogContext = {}
}

export const getUserContext = () => {
  return { ...globalLogContext }
}

// Wrapper para adicionar contexto automaticamente
const withContext = (logFn) => (message, meta = {}) => {
  return logFn(message, {
    ...globalLogContext,
    ...meta,
  })
}

// Versões com contexto das funções de log
export const logErrorWithContext = withContext(logError)
export const logWarningWithContext = withContext(logWarning)
export const logInfoWithContext = withContext(logInfo)
export const logDebugWithContext = withContext(logDebug)

// Log de sistema (sem contexto de usuário)
export const logSystem = (message, meta = {}) => {
  logger.info(message, {
    type: 'SYSTEM',
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

// Log de startup/shutdown
export const logStartup = (message, meta = {}) => {
  logger.info(message, {
    type: 'STARTUP',
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

export const logShutdown = (message, meta = {}) => {
  logger.info(message, {
    type: 'SHUTDOWN',
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

// Middleware para capturar logs não tratados
export const setupUncaughtExceptionHandling = () => {
  // Capturar exceções não tratadas
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error, {
      type: 'UNCAUGHT_EXCEPTION',
      fatal: true,
    })
    
    // Dar tempo para o log ser escrito antes de sair
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })
  
  // Capturar promises rejeitadas não tratadas
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(reason), {
      type: 'UNHANDLED_REJECTION',
      promise: promise.toString(),
    })
  })
}

export default logger
