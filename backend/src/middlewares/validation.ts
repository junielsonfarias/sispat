import { body, param, query, validationResult } from 'express-validator';
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

// Validações para patrimônios
export const patrimonioValidations = {
  create: [
    body('numero_patrimonio')
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos'),
    
    body('descricao_bem')
      .isLength({ min: 3, max: 200 })
      .withMessage('Descrição deve ter entre 3 e 200 caracteres'),
    
    body('tipo')
      .isLength({ min: 1, max: 50 })
      .withMessage('Tipo deve ter entre 1 e 50 caracteres'),
    
    body('marca')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Marca deve ter no máximo 50 caracteres'),
    
    body('modelo')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Modelo deve ter no máximo 50 caracteres'),
    
    body('data_aquisicao')
      .isISO8601()
      .withMessage('Data de aquisição deve ser uma data válida'),
    
    body('valor_aquisicao')
      .isFloat({ min: 0 })
      .withMessage('Valor de aquisição deve ser um número positivo'),
    
    body('quantidade')
      .isInt({ min: 1 })
      .withMessage('Quantidade deve ser um número inteiro positivo'),
    
    body('setor_responsavel')
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor responsável deve ter entre 1 e 100 caracteres'),
    
    body('local_objeto')
      .isLength({ min: 1, max: 100 })
      .withMessage('Local do objeto deve ter entre 1 e 100 caracteres'),
    
    body('situacao_bem')
      .optional()
      .isIn(['otimo', 'bom', 'regular', 'ruim', 'pessimo'])
      .withMessage('Situação deve ser: otimo, bom, regular, ruim ou pessimo'),
    
    body('observacoes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Observações devem ter no máximo 1000 caracteres'),
    
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),
    
    body('fotos.*')
      .optional()
      .custom((v) => {
        // Aceita string OU objeto { file_url, id, file_name } vindo do ImageUpload.
        // O backend (sanitizeIncomingUrls) normaliza ambos antes de gravar.
        // URLs blob: e javascript: são rejeitadas no service layer.
        if (typeof v === 'string') return true;
        if (v && typeof v === 'object' && (typeof v.file_url === 'string' || typeof v.url === 'string')) return true;
        throw new Error('Cada foto deve ser URL (string) ou objeto { file_url }');
      })
  ],
  
  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    
    body('numero_patrimonio')
      .optional()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos'),
    
    body('descricao_bem')
      .optional()
      .isLength({ min: 3, max: 200 })
      .withMessage('Descrição deve ter entre 3 e 200 caracteres'),
    
    body('tipo')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tipo deve ter entre 1 e 50 caracteres'),
    
    body('marca')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Marca deve ter no máximo 50 caracteres'),
    
    body('modelo')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Modelo deve ter no máximo 50 caracteres'),
    
    body('data_aquisicao')
      .optional()
      .isISO8601()
      .withMessage('Data de aquisição deve ser uma data válida'),
    
    body('valor_aquisicao')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Valor de aquisição deve ser um número positivo'),
    
    body('quantidade')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantidade deve ser um número inteiro positivo'),
    
    body('setor_responsavel')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor responsável deve ter entre 1 e 100 caracteres'),
    
    body('local_objeto')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Local do objeto deve ter entre 1 e 100 caracteres'),
    
    body('situacao_bem')
      .optional()
      .isIn(['otimo', 'bom', 'regular', 'ruim', 'pessimo'])
      .withMessage('Situação deve ser: otimo, bom, regular, ruim ou pessimo'),
    
    body('observacoes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Observações devem ter no máximo 1000 caracteres'),
    
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),
    
    body('fotos.*')
      .optional()
      .custom((v) => {
        // Aceita string OU objeto { file_url, id, file_name } vindo do ImageUpload.
        // O backend (sanitizeIncomingUrls) normaliza ambos antes de gravar.
        // URLs blob: e javascript: são rejeitadas no service layer.
        if (typeof v === 'string') return true;
        if (v && typeof v === 'object' && (typeof v.file_url === 'string' || typeof v.url === 'string')) return true;
        throw new Error('Cada foto deve ser URL (string) ou objeto { file_url }');
      })
  ]
};

// Validações para imóveis
export const imovelValidations = {
  create: [
    body('numero_patrimonio')
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos'),
    
    body('denominacao')
      .isLength({ min: 1, max: 200 })
      .withMessage('Denominação deve ter entre 1 e 200 caracteres'),
    
    body('endereco')
      .isLength({ min: 1, max: 300 })
      .withMessage('Endereço deve ter entre 1 e 300 caracteres'),
    
    body('setor')
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor deve ter entre 1 e 100 caracteres'),
    
    body('data_aquisicao')
      .isISO8601()
      .withMessage('Data de aquisição deve ser uma data válida'),
    
    body('valor_aquisicao')
      .isFloat({ min: 0 })
      .withMessage('Valor de aquisição deve ser um número positivo'),
    
    body('area_terreno')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Área do terreno deve ser um número positivo'),
    
    body('area_construida')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Área construída deve ser um número positivo'),
    
    body('tipo_imovel')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Tipo deve ter no máximo 50 caracteres'),

    body('situacao')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Situação deve ter no máximo 50 caracteres'),

    body('latitude')
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude deve estar entre -90 e 90'),

    body('longitude')
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude deve estar entre -180 e 180'),

    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),

    body('fotos.*')
      .optional()
      .custom((v) => {
        // Aceita string OU objeto { file_url, id, file_name } vindo do ImageUpload.
        // O backend (sanitizeIncomingUrls) normaliza ambos antes de gravar.
        // URLs blob: e javascript: são rejeitadas no service layer.
        if (typeof v === 'string') return true;
        if (v && typeof v === 'object' && (typeof v.file_url === 'string' || typeof v.url === 'string')) return true;
        throw new Error('Cada foto deve ser URL (string) ou objeto { file_url }');
      })
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),

    body('numero_patrimonio')
      .optional()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos'),

    body('denominacao')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Denominação deve ter entre 1 e 200 caracteres'),

    body('endereco')
      .optional()
      .isLength({ min: 1, max: 300 })
      .withMessage('Endereço deve ter entre 1 e 300 caracteres'),

    body('setor')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor deve ter entre 1 e 100 caracteres'),

    body('data_aquisicao')
      .optional()
      .isISO8601()
      .withMessage('Data de aquisição deve ser uma data válida'),

    body('valor_aquisicao')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Valor de aquisição deve ser um número positivo'),

    body('area_terreno')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Área do terreno deve ser um número positivo'),

    body('area_construida')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Área construída deve ser um número positivo'),

    body('tipo_imovel')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Tipo deve ter no máximo 50 caracteres'),

    body('situacao')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Situação deve ter no máximo 50 caracteres'),

    body('latitude')
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude deve estar entre -90 e 90'),

    body('longitude')
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude deve estar entre -180 e 180'),
    
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),
    
    body('fotos.*')
      .optional()
      .custom((v) => {
        // Aceita string OU objeto { file_url, id, file_name } vindo do ImageUpload.
        // O backend (sanitizeIncomingUrls) normaliza ambos antes de gravar.
        // URLs blob: e javascript: são rejeitadas no service layer.
        if (typeof v === 'string') return true;
        if (v && typeof v === 'object' && (typeof v.file_url === 'string' || typeof v.url === 'string')) return true;
        throw new Error('Cada foto deve ser URL (string) ou objeto { file_url }');
      })
  ]
};

// Validações de autenticação foram migradas para schemas Zod compartilhados
// (Sprint 19). Ver `@sispat/shared` → `schemas/auth.ts` e o middleware
// `zodValidate.ts`. Regra única de senha forte: `STRONG_PASSWORD_REGEX` em
// `shared/src/rules/password.ts`.

// Validações de inventário/transfer/manutencao/notification/customization/
// document/labelTemplate/formaAquisicao/emprestimo migradas para schemas Zod
// compartilhados (Sprint 21). Ver `@sispat/shared` → `schemas/*.ts` +
// middleware `zodValidate.ts`.


// `queryValidations.pagination` foi substituído por `paginationQuerySchema`
// do `@sispat/shared` (Sprint 20). Mantido aqui temporariamente porque ainda
// é consumido pelas rotas de patrimonio/imovel (Sprint 22).
// Validações para queries
export const queryValidations = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro positivo'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100'),
    
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Busca deve ter entre 1 e 100 caracteres'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'name', 'numero_patrimonio'])
      .withMessage('Ordenação deve ser: createdAt, updatedAt, name ou numero_patrimonio'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Ordem deve ser: asc ou desc')
  ]
};
