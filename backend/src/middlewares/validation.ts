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

// Validações para inventários
export const inventarioValidations = {
  create: [
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título deve ter entre 1 e 200 caracteres'),

    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),

    body('setor')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor é obrigatório (1 a 100 caracteres)'),

    body('local')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Local deve ter no máximo 100 caracteres'),

    body('dataInicio')
      .optional()
      .isISO8601()
      .withMessage('Data de início deve ser uma data válida'),

    body('scope')
      .optional()
      .isIn(['sector', 'location', 'specific_location'])
      .withMessage('Scope deve ser: sector, location ou specific_location'),
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),

    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título deve ter entre 1 e 200 caracteres'),

    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),

    body('setor')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor deve ter entre 1 e 100 caracteres'),

    body('local')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Local deve ter no máximo 100 caracteres'),

    body('status')
      .optional()
      .isIn(['em_andamento', 'concluido', 'cancelado'])
      .withMessage('Status deve ser: em_andamento, concluido ou cancelado'),

    body('dataFim')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Data de fim deve ser uma data válida'),
  ],
};

// Validações para transferências
export const transferValidations = {
  create: [
    body('patrimonioId')
      .isUUID()
      .withMessage('ID do patrimônio deve ser um UUID válido'),

    body('setorOrigem')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor de origem é obrigatório (1 a 100 caracteres)'),

    body('setorDestino')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Setor de destino é obrigatório (1 a 100 caracteres)'),

    body('localOrigem')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Local de origem deve ter no máximo 100 caracteres'),

    body('localDestino')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Local de destino deve ter no máximo 100 caracteres'),

    body('motivo')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Motivo é obrigatório (1 a 500 caracteres)'),

    body('dataTransferencia')
      .isISO8601()
      .withMessage('Data de transferência deve ser uma data válida'),

    body('responsavelOrigem')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Responsável de origem deve ter no máximo 200 caracteres'),

    body('responsavelDestino')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Responsável de destino deve ter no máximo 200 caracteres'),

    body('observacoes')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Observações devem ter no máximo 1000 caracteres'),
  ],

  approve: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('observacoes')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Observações devem ter no máximo 1000 caracteres'),
  ],

  reject: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('motivo')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Motivo deve ter no máximo 500 caracteres'),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para manutenções
export const manutencaoValidations = {
  create: [
    // XOR patrimonioId / imovelId — ambos opcionais aqui, controller faz o check
    body('patrimonioId')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('patrimonioId deve ser um UUID válido'),

    body('imovelId')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('imovelId deve ser um UUID válido'),

    body('tipo')
      .isIn(['preventiva', 'corretiva', 'preditiva'])
      .withMessage('Tipo deve ser: preventiva, corretiva ou preditiva'),

    body('titulo')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título é obrigatório (1 a 200 caracteres)'),

    body('descricao')
      .isString()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Descrição é obrigatória (1 a 2000 caracteres)'),

    body('prioridade')
      .isIn(['baixa', 'media', 'alta', 'urgente'])
      .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

    body('responsavel')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 200 })
      .withMessage('Responsável deve ter no máximo 200 caracteres'),

    body('dataPrevista')
      .isISO8601()
      .withMessage('Data prevista deve ser uma data válida'),

    body('custo')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('Custo deve ser um número positivo'),

    body('observacoes')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Observações devem ter no máximo 2000 caracteres'),
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),

    body('tipo')
      .optional()
      .isIn(['preventiva', 'corretiva', 'preditiva'])
      .withMessage('Tipo deve ser: preventiva, corretiva ou preditiva'),

    body('titulo')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título deve ter entre 1 e 200 caracteres'),

    body('descricao')
      .optional()
      .isString()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Descrição deve ter entre 1 e 2000 caracteres'),

    body('prioridade')
      .optional()
      .isIn(['baixa', 'media', 'alta', 'urgente'])
      .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

    body('status')
      .optional()
      .isIn(['pendente', 'em_andamento', 'concluida', 'cancelada'])
      .withMessage('Status deve ser: pendente, em_andamento, concluida ou cancelada'),

    body('responsavel')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 200 })
      .withMessage('Responsável deve ter no máximo 200 caracteres'),

    body('dataPrevista')
      .optional()
      .isISO8601()
      .withMessage('Data prevista deve ser uma data válida'),

    body('dataConclusao')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Data de conclusão deve ser uma data válida'),

    body('custo')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('Custo deve ser um número positivo'),

    body('observacoes')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Observações devem ter no máximo 2000 caracteres'),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para notificações
export const notificationValidations = {
  create: [
    // userId é opcional aqui; o controller força req.user.userId para não-admin.
    body('userId')
      .optional()
      .isUUID()
      .withMessage('userId deve ser um UUID válido'),

    body('tipo')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tipo é obrigatório (1 a 50 caracteres)'),

    body('titulo')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título é obrigatório (1 a 200 caracteres)'),

    body('mensagem')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Mensagem é obrigatória (1 a 1000 caracteres)'),

    body('link')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage('Link deve ter no máximo 500 caracteres'),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para customização visual.
// O controller já tem ALLOWED_FIELDS + isSafeUrl (Sprint 15) que faz a validação
// crítica de URLs. Aqui é só rejeitar payloads grossos cedo (tipos errados, strings gigantes).
export const customizationValidations = {
  save: [
    body('activeLogoUrl').optional().isString().isLength({ max: 1000 }),
    body('secondaryLogoUrl').optional().isString().isLength({ max: 1000 }),
    body('backgroundImageUrl').optional().isString().isLength({ max: 1000 }),
    body('backgroundVideoUrl').optional().isString().isLength({ max: 1000 }),
    body('faviconUrl').optional().isString().isLength({ max: 1000 }),
    body('backgroundType').optional().isIn(['color', 'image', 'video']),
    body('backgroundColor').optional().isString().isLength({ max: 50 }),
    body('primaryColor').optional().isString().isLength({ max: 50 }),
    body('buttonTextColor').optional().isString().isLength({ max: 50 }),
    body('fontFamily').optional().isString().isLength({ max: 100 }),
    body('layout').optional().isString().isLength({ max: 50 }),
    body('welcomeTitle').optional().isString().isLength({ max: 200 }),
    body('welcomeSubtitle').optional().isString().isLength({ max: 500 }),
    body('browserTitle').optional().isString().isLength({ max: 200 }),
    body('loginFooterText').optional().isString().isLength({ max: 500 }),
    body('systemFooterText').optional().isString().isLength({ max: 500 }),
    body('superUserFooterText').optional().isString().isLength({ max: 500 }),
    body('prefeituraName').optional().isString().isLength({ max: 200 }),
    body('secretariaResponsavel').optional().isString().isLength({ max: 200 }),
    body('departamentoResponsavel').optional().isString().isLength({ max: 200 }),
    body('videoLoop').optional().isBoolean(),
    body('videoMuted').optional().isBoolean(),
  ],
};

// Validações para documentos
export const documentValidations = {
  // O upload usa multer; valida só os campos textuais
  create: [
    body('titulo')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Título deve ter entre 1 e 200 caracteres'),
    body('descricao')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    body('patrimonioId').optional().isUUID().withMessage('patrimonioId deve ser UUID'),
    body('imovelId').optional().isUUID().withMessage('imovelId deve ser UUID'),
    body('tipo').optional().isString().isLength({ max: 50 }),
    body('publico').optional().isBoolean(),
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('titulo').optional().isString().isLength({ min: 1, max: 200 }),
    body('descricao').optional().isString().isLength({ max: 1000 }),
    body('tipo').optional().isString().isLength({ max: 50 }),
    body('publico').optional().isBoolean(),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para templates de etiqueta
export const labelTemplateValidations = {
  create: [
    body('nome')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Nome é obrigatório (1 a 200 caracteres)'),
    body('descricao').optional().isString().isLength({ max: 1000 }),
    body('largura').optional().isFloat({ min: 0.1 }).withMessage('Largura deve ser positiva'),
    body('altura').optional().isFloat({ min: 0.1 }).withMessage('Altura deve ser positiva'),
    body('unidade').optional().isIn(['mm', 'cm', 'in']).withMessage('Unidade deve ser mm, cm ou in'),
    body('elementos').optional().isArray().withMessage('Elementos deve ser um array'),
    body('ativo').optional().isBoolean(),
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('nome').optional().isString().isLength({ min: 1, max: 200 }),
    body('descricao').optional().isString().isLength({ max: 1000 }),
    body('largura').optional().isFloat({ min: 0.1 }),
    body('altura').optional().isFloat({ min: 0.1 }),
    body('unidade').optional().isIn(['mm', 'cm', 'in']),
    body('elementos').optional().isArray(),
    body('ativo').optional().isBoolean(),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para formas de aquisição
export const formaAquisicaoValidations = {
  create: [
    body('nome')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Nome é obrigatório (1 a 100 caracteres)'),
    body('descricao').optional().isString().isLength({ max: 500 }),
    body('ativo').optional().isBoolean(),
  ],

  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('nome').optional().isString().isLength({ min: 1, max: 100 }),
    body('descricao').optional().isString().isLength({ max: 500 }),
    body('ativo').optional().isBoolean(),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

// Validações para empréstimos
export const emprestimoValidations = {
  create: [
    body('patrimonioId').isUUID().withMessage('patrimonioId deve ser um UUID válido'),
    body('responsavel')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Responsável é obrigatório (1 a 200 caracteres)'),
    body('dataEmprestimo')
      .isISO8601()
      .withMessage('Data de empréstimo deve ser uma data válida'),
    body('dataPrevDevolucao')
      .optional()
      .isISO8601()
      .withMessage('Data prevista de devolução deve ser uma data válida'),
    body('observacoes').optional().isString().isLength({ max: 1000 }),
  ],

  devolver: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('dataDevolucao').optional().isISO8601(),
    body('observacoes').optional().isString().isLength({ max: 1000 }),
  ],

  byId: [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
};

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
