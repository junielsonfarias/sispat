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

// Validações para usuários
export const userValidations = {
  create: [
    body('name')
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
      .withMessage('Nome deve ter entre 2 e 100 caracteres e conter apenas letras'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo'),
    
    body('role')
      .isIn(['superuser', 'admin', 'supervisor', 'usuario', 'visualizador'])
      .withMessage('Role deve ser: superuser, admin, supervisor, usuario ou visualizador'),
    
    body('responsibleSectors')
      .optional()
      .isArray()
      .withMessage('ResponsibleSectors deve ser um array'),
    
    body('responsibleSectors.*')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Cada setor deve ser uma string de 1 a 100 caracteres')
  ],
  
  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
      .withMessage('Nome deve ter entre 2 e 100 caracteres e conter apenas letras'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    
    body('role')
      .optional()
      .isIn(['superuser', 'admin', 'supervisor', 'usuario', 'visualizador'])
      .withMessage('Role deve ser: superuser, admin, supervisor, usuario ou visualizador'),
    
    body('responsibleSectors')
      .optional()
      .isArray()
      .withMessage('ResponsibleSectors deve ser um array'),
    
    body('responsibleSectors.*')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Cada setor deve ser uma string de 1 a 100 caracteres')
  ]
};

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
      .isString()
      .isURL()
      .withMessage('Cada foto deve ser uma URL válida')
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
      .isString()
      .isURL()
      .withMessage('Cada foto deve ser uma URL válida')
  ]
};

// Validações para setores
export const sectorValidations = {
  create: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('codigo')
      .optional()
      .isLength({ min: 1, max: 20 })
      .matches(/^[A-Z0-9\-_]+$/)
      .withMessage('Código deve ter 1 a 20 caracteres maiúsculos'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres')
  ],
  
  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('codigo')
      .optional()
      .isLength({ min: 1, max: 20 })
      .matches(/^[A-Z0-9\-_]+$/)
      .withMessage('Código deve ter 1 a 20 caracteres maiúsculos'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres')
  ]
};

// Validações para locais
export const localValidations = {
  create: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
    body('sectorId')
      .isUUID()
      .withMessage('ID do setor deve ser um UUID válido')
  ],
  
  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
    body('sectorId')
      .optional()
      .isUUID()
      .withMessage('ID do setor deve ser um UUID válido')
  ]
};

// Validações para tipos de bens
export const tipoBemValidations = {
  create: [
    body('nome')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('descricao')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
    body('vidaUtilPadrao')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Vida útil padrão deve ser entre 1 e 100 anos'),
    
    body('taxaDepreciacao')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Taxa de depreciação deve ser entre 0 e 100%')
  ],
  
  update: [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    
    body('nome')
      .optional()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/)
      .withMessage('Nome deve ter entre 1 e 100 caracteres alfanuméricos'),
    
    body('descricao')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
    body('vidaUtilPadrao')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Vida útil padrão deve ser entre 1 e 100 anos'),
    
    body('taxaDepreciacao')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Taxa de depreciação deve ser entre 0 e 100%')
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
      .isIn(['residencial', 'comercial', 'industrial', 'rural', 'publico', 'outro'])
      .withMessage('Tipo deve ser: residencial, comercial, industrial, rural, publico ou outro'),
    
    body('situacao')
      .isIn(['ativo', 'inativo', 'vendido', 'doado', 'demolido'])
      .withMessage('Situação deve ser: ativo, inativo, vendido, doado ou demolido'),
    
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),
    
    body('fotos.*')
      .optional()
      .isString()
      .isURL()
      .withMessage('Cada foto deve ser uma URL válida')
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
      .isIn(['residencial', 'comercial', 'industrial', 'rural', 'publico', 'outro'])
      .withMessage('Tipo deve ser: residencial, comercial, industrial, rural, publico ou outro'),
    
    body('situacao')
      .optional()
      .isIn(['ativo', 'inativo', 'vendido', 'doado', 'demolido'])
      .withMessage('Situação deve ser: ativo, inativo, vendido, doado ou demolido'),
    
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos deve ser um array'),
    
    body('fotos.*')
      .optional()
      .isString()
      .isURL()
      .withMessage('Cada foto deve ser uma URL válida')
  ]
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
