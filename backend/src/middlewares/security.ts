import { Request, Response, NextFunction } from 'express';
import { logInfo } from '../config/logger';

// NOTA: este arquivo continha um conjunto de helpers legados que NÃO eram mais
// usados (dead code) — rate-limiters duplicavam `advanced-rate-limit.ts`, o
// `helmetConfig` duplicava o helmet inline do `index.ts`, e
// `sanitizeInput`/`validateInput`/`commonValidations`/`secureUpload`/`secureCors`
// foram substituídos por `zodValidate` + `uploadMiddleware`/`file-validation` +
// CORS do `index.ts`. Removidos em 2026-06-27. Mantido apenas o `auditLog`, que
// segue em uso. (O `sanitizeInput` ainda tinha o bug do `req.query` do Express 5.)

// Middleware de auditoria: loga a ação no momento da resposta.
export const auditLog = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data) {
      logInfo(
        `[AUDIT] ${new Date().toISOString()} - ${req.user?.userId || 'anonymous'} - ${action} - ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`,
      );

      return originalSend.call(this, data);
    };

    next();
  };
};
