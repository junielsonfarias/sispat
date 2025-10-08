import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para logar todas as requisições
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log quando a resposta é enviada
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
    };

    // Colorir log baseado no status
    const statusColor = 
      res.statusCode >= 500 ? '\x1b[31m' : // Red
      res.statusCode >= 400 ? '\x1b[33m' : // Yellow
      res.statusCode >= 300 ? '\x1b[36m' : // Cyan
      '\x1b[32m'; // Green

    console.log(
      `${statusColor}[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.status} - ${logData.duration}\x1b[0m`
    );
  });

  next();
};

