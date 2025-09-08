/**
 * Sistema de Logging para SISPAT
 * Substitui console.log por um sistema de logging mais robusto
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isProduction = import.meta.env.MODE === 'production';

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;

    // Em produção, apenas log ERROR e WARN
    return level === LogLevel.ERROR || level === LogLevel.WARN;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, context, data);

    if (this.isDevelopment) {
      // Em desenvolvimento, usar console com cores
      const colors = {
        [LogLevel.ERROR]: '\x1b[31m', // Vermelho
        [LogLevel.WARN]: '\x1b[33m', // Amarelo
        [LogLevel.INFO]: '\x1b[36m', // Ciano
        [LogLevel.DEBUG]: '\x1b[90m', // Cinza
      };
      const reset = '\x1b[0m';

      console.log(
        `${colors[level]}[${level.toUpperCase()}]${reset} ${logEntry.timestamp} ${context ? `[${context}]` : ''} ${message}`,
        data ? data : ''
      );
    } else {
      // Em produção, usar console estruturado
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }
}

// Instância singleton
export const logger = new Logger();

// Função de conveniência para substituir console.log
export const log = {
  error: (message: string, context?: string, data?: any) =>
    logger.error(message, context, data),
  warn: (message: string, context?: string, data?: any) =>
    logger.warn(message, context, data),
  info: (message: string, context?: string, data?: any) =>
    logger.info(message, context, data),
  debug: (message: string, context?: string, data?: any) =>
    logger.debug(message, context, data),
};

export default logger;
