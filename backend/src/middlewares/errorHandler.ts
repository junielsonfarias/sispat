import { Request, Response, NextFunction } from 'express';
import { logError, logWarn } from '../config/logger';

/**
 * Interface para erros customizados
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware global de tratamento de erros
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log estruturado do erro
  const errorContext = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    body: process.env.NODE_ENV === 'development' ? req.body : '[REDACTED]',
    user: req.user ? {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    } : null,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // Erro customizado
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logError('AppError (Server)', err, errorContext);
    } else {
      logWarn('AppError (Client)', errorContext);
    }
    
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Erro de validação do Prisma
  if (err.name === 'PrismaClientValidationError') {
    logWarn('Prisma Validation Error', errorContext);
    res.status(400).json({
      error: 'Dados inválidos fornecidos',
      message: err.message,
    });
    return;
  }

  // Erro de registro não encontrado do Prisma
  if (err.name === 'NotFoundError') {
    logWarn('Not Found Error', errorContext);
    res.status(404).json({
      error: 'Registro não encontrado',
    });
    return;
  }

  // Erro genérico - sempre logar erros 500
  logError('Unhandled Error', err, errorContext);
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && {
      message: err.message,
      stack: err.stack,
    }),
  });
};

/**
 * Middleware para capturar rotas não encontradas
 */
export const notFound = (req: Request, res: Response): void => {
  logWarn('Route Not Found', {
    path: req.path,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
  });

  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method,
  });
};

