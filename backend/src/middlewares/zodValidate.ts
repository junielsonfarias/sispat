import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Middleware genérico para validar req.body / req.params / req.query com schemas
// Zod compartilhados (`@sispat/shared`). Substitui o padrão antigo de
// `express-validator + handleValidationErrors` que vive em `validation.ts`,
// e elimina a duplicação de regras entre frontend e backend.
//
// Formato de erro mantido compatível com o legado para não quebrar consumers:
// `{ error: 'Dados inválidos', details: [{ field, message }] }`.
//
// Uso:
//   router.post('/auth/login', zodValidate({ body: loginSchema }), handler);
//   router.put('/users/:id', zodValidate({ params: idSchema, body: userUpdateSchema }), handler);
//
// Em sucesso, o middleware SUBSTITUI req.body/params/query pela versão parsed
// (com `default()` aplicados, coercion etc.) — o controller recebe valores já
// normalizados, sem precisar re-parsear.

interface ZodValidateConfig {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

interface ErrorDetail {
  field: string;
  message: string;
}

function formatZodError(error: ZodError, source: 'body' | 'params' | 'query'): ErrorDetail[] {
  return error.errors.map((issue) => {
    const path = issue.path.join('.');
    const field = path || source;
    return { field, message: issue.message };
  });
}

export function zodValidate(config: ZodValidateConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const details: ErrorDetail[] = [];

    if (config.body) {
      const result = config.body.safeParse(req.body);
      if (!result.success) {
        details.push(...formatZodError(result.error, 'body'));
      } else {
        req.body = result.data;
      }
    }

    if (config.params) {
      const result = config.params.safeParse(req.params);
      if (!result.success) {
        details.push(...formatZodError(result.error, 'params'));
      } else {
        // Express 5: req.params é readonly, mas atribuição via Object.assign funciona
        Object.assign(req.params, result.data);
      }
    }

    if (config.query) {
      const result = config.query.safeParse(req.query);
      if (!result.success) {
        details.push(...formatZodError(result.error, 'query'));
      } else {
        // Persiste a query parseada (coerção/defaults). Funciona porque o index.ts
        // "congela" req.query num property mutável — no Express 5 cru, req.query é
        // um getter re-parseado e este Object.assign seria no-op.
        Object.assign(req.query, result.data);
      }
    }

    if (details.length > 0) {
      res.status(400).json({ error: 'Dados inválidos', details });
      return;
    }

    next();
  };
}
