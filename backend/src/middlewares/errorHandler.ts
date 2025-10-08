import { Request, Response, NextFunction } from 'express';

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
  // Log do erro
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Erro customizado
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Erro de validação do Prisma
  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      error: 'Dados inválidos fornecidos',
      message: err.message,
    });
    return;
  }

  // Erro de registro não encontrado do Prisma
  if (err.name === 'NotFoundError') {
    res.status(404).json({
      error: 'Registro não encontrado',
    });
    return;
  }

  // Erro genérico
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
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method,
  });
};

