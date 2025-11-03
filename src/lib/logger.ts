/**
 * Logger estruturado para o frontend
 * Similar ao Winston do backend, mas usando console com formatação estruturada
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      level,
      message,
      timestamp,
      ...(meta && { meta }),
    };

    if (this.isDevelopment) {
      // Em desenvolvimento: exibir formatado no console
      const prefix = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[level];

      if (meta) {
        console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, meta);
      } else {
        console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
      }
    }

    // Em produção: poderia enviar para serviço de log (Sentry, LogRocket, etc.)
    // Por enquanto, apenas não exibe no console
    return JSON.stringify(entry);
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.formatMessage('info', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.formatMessage('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    const errorMeta = error instanceof Error
      ? {
          ...meta,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        }
      : { ...meta, error };

    this.formatMessage('error', message, errorMeta);
  }
}

// Exportar instância singleton
export const logger = new Logger();

// Exportar métodos diretos para compatibilidade
export const logDebug = (message: string, meta?: Record<string, any>) => logger.debug(message, meta);
export const logInfo = (message: string, meta?: Record<string, any>) => logger.info(message, meta);
export const logWarn = (message: string, meta?: Record<string, any>) => logger.warn(message, meta);
export const logError = (message: string, error?: Error | unknown, meta?: Record<string, any>) =>
  logger.error(message, error, meta);

export default logger;
