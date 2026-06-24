import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware para verificar erros de validação
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array().map((error: any) => ({
        field: error.type === 'field' ? error.path : error.param,
        message: error.msg,
        value: error.value
      }))
    });
    return;
  }
  next();
};

// Validações de usuários, setores, locais e tipos de bens migradas para
// schemas Zod compartilhados (Sprint 20). Ver `@sispat/shared` →
// `schemas/{user,sector,local,tipoBem}.ts` + middleware `zodValidate.ts`.

// Validações para patrimônios, imóveis e queryValidations foram migradas para
// schemas Zod compartilhados (Sprint 22). Ver `@sispat/shared` →
// `schemas/patrimonio.ts` e `schemas/imovel.ts` + middleware `zodValidate.ts`.
// `paginationQuerySchema` do `@sispat/shared` substitui `queryValidations.pagination`.
