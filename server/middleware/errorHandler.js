import { logError, logSecurity } from '../utils/logger.js';

// Códigos de erro padronizados
export const ERROR_CODES = {
  // Autenticação e Autorização
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_UUID: 'INVALID_UUID',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Recursos
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Banco de Dados
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',

  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Negócio
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
};

// Classe para erros customizados
export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    errorCode = ERROR_CODES.INTERNAL_ERROR,
    details = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Função para determinar se é um erro operacional (esperado)
const isOperationalError = error => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

// Função para mapear erros comuns para códigos padronizados
const mapErrorToCode = error => {
  // Erros de JWT
  if (error.name === 'JsonWebTokenError') {
    return { code: ERROR_CODES.TOKEN_INVALID, status: 401 };
  }
  if (error.name === 'TokenExpiredError') {
    return { code: ERROR_CODES.TOKEN_EXPIRED, status: 401 };
  }

  // Erros de validação Zod
  if (error.name === 'ZodError') {
    return { code: ERROR_CODES.VALIDATION_ERROR, status: 400 };
  }

  // Erros de banco de dados PostgreSQL
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return { code: ERROR_CODES.ALREADY_EXISTS, status: 409 };
      case '23503': // foreign_key_violation
        return { code: ERROR_CODES.CONSTRAINT_VIOLATION, status: 400 };
      case '23502': // not_null_violation
        return { code: ERROR_CODES.VALIDATION_ERROR, status: 400 };
      case '42P01': // undefined_table
        return { code: ERROR_CODES.DATABASE_ERROR, status: 500 };
      case 'ECONNREFUSED':
        return { code: ERROR_CODES.CONNECTION_ERROR, status: 503 };
      default:
        return { code: ERROR_CODES.DATABASE_ERROR, status: 500 };
    }
  }

  // Erros HTTP comuns
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    switch (status) {
      case 400:
        return { code: ERROR_CODES.VALIDATION_ERROR, status: 400 };
      case 401:
        return { code: ERROR_CODES.UNAUTHORIZED, status: 401 };
      case 403:
        return { code: ERROR_CODES.FORBIDDEN, status: 403 };
      case 404:
        return { code: ERROR_CODES.NOT_FOUND, status: 404 };
      case 409:
        return { code: ERROR_CODES.CONFLICT, status: 409 };
      case 429:
        return { code: ERROR_CODES.RATE_LIMIT_EXCEEDED, status: 429 };
      default:
        return { code: ERROR_CODES.INTERNAL_ERROR, status: 500 };
    }
  }

  return { code: ERROR_CODES.INTERNAL_ERROR, status: 500 };
};

// Função para criar resposta de erro padronizada
const createErrorResponse = (error, req) => {
  const { code, status } = mapErrorToCode(error);

  const errorResponse = {
    success: false,
    error: {
      code,
      message: error.message || 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  // Adicionar detalhes em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Adicionar ID de rastreamento
  if (req.requestId) {
    errorResponse.error.requestId = req.requestId;
  }

  return { response: errorResponse, statusCode: status };
};

// Middleware de tratamento de erros
export const errorHandler = (error, req, res, next) => {
  // Não fazer nada se a resposta já foi enviada
  if (res.headersSent) {
    return next(error);
  }

  const { response, statusCode } = createErrorResponse(error, req);

  // Log do erro
  const logMeta = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    userRole: req.user?.role,
    municipalityId: req.user?.municipality_id,
    statusCode,
    errorCode: response.error.code,
  };

  // Determinar nível de log baseado no tipo de erro
  if (statusCode >= 500) {
    logError('Internal Server Error', error, logMeta);
  } else if (statusCode >= 400) {
    logError('Client Error', error, { ...logMeta, severity: 'warn' });
  }

  // Log de segurança para tentativas maliciosas
  if (statusCode === 401 || statusCode === 403) {
    logSecurity('Authentication/Authorization Failure', 'warn', {
      ...logMeta,
      suspiciousActivity: statusCode === 403,
    });
  }

  // Enviar resposta
  res.status(statusCode).json(response);
};

// Middleware para capturar erros 404
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Rota não encontrada: ${req.method} ${req.path}`,
    404,
    ERROR_CODES.NOT_FOUND,
    {
      method: req.method,
      path: req.path,
      availableRoutes: req.app._router
        ? req.app._router.stack.map(r => r.route?.path).filter(Boolean)
        : [],
    }
  );

  next(error);
};

// Middleware para adicionar ID de rastreamento às requisições
export const requestTracker = (req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Função para envolver funções async e capturar erros automaticamente
export const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para validar se o erro é crítico e requer notificação
export const criticalErrorNotifier = (error, req, res, next) => {
  const isCritical =
    error.statusCode >= 500 ||
    error.errorCode === ERROR_CODES.DATABASE_ERROR ||
    error.errorCode === ERROR_CODES.CONNECTION_ERROR ||
    !isOperationalError(error);

  if (isCritical) {
    // Aqui poderia integrar com serviços de notificação
    // como Slack, email, SMS, etc.
    logError('Critical Error Detected - Notification Required', error, {
      requestId: req.requestId,
      userId: req.user?.id,
      critical: true,
      notificationSent: false, // Implementar notificação real
    });
  }

  next();
};

export default {
  errorHandler,
  notFoundHandler,
  requestTracker,
  asyncHandler,
  criticalErrorNotifier,
  AppError,
  ERROR_CODES,
};
