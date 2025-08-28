import z from 'zod';

// Schema para validação de UUID v4
const uuidSchema = z.string().uuid('ID deve ser um UUID válido');

// Middleware para validar UUID em parâmetros de rota
export const validateUUID = paramName => {
  return (req, res, next) => {
    try {
      const paramValue = req.params[paramName];

      if (!paramValue) {
        return res.status(400).json({
          error: `Parâmetro ${paramName} é obrigatório`,
          code: 'MISSING_PARAMETER',
        });
      }

      // Validar formato UUID
      uuidSchema.parse(paramValue);

      // Log de acesso válido
      console.log(`✅ UUID válido para ${paramName}:`, paramValue);

      next();
    } catch (error) {
      // Log de tentativa de acesso inválido
      console.warn(`🚨 Tentativa de acesso com UUID inválido:`, {
        paramName,
        value: req.params[paramName],
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        error: `${paramName} deve ser um UUID válido`,
        code: 'INVALID_UUID',
        received: req.params[paramName],
      });
    }
  };
};

// Middleware para validar múltiplos UUIDs
export const validateMultipleUUIDs = paramNames => {
  return (req, res, next) => {
    try {
      const errors = [];

      for (const paramName of paramNames) {
        const paramValue = req.params[paramName];

        if (!paramValue) {
          errors.push(`Parâmetro ${paramName} é obrigatório`);
          continue;
        }

        try {
          uuidSchema.parse(paramValue);
        } catch {
          errors.push(`${paramName} deve ser um UUID válido`);
        }
      }

      if (errors.length > 0) {
        // Log de tentativas de acesso inválido
        console.warn(`🚨 Tentativa de acesso com UUIDs inválidos:`, {
          params: req.params,
          errors,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        });

        return res.status(400).json({
          error: 'Parâmetros inválidos',
          code: 'INVALID_PARAMETERS',
          details: errors,
        });
      }

      // Log de acesso válido
      console.log(`✅ Todos os UUIDs válidos:`, req.params);

      next();
    } catch (error) {
      console.error('Erro no middleware de validação UUID:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

// Validação para query parameters
export const validateUUIDQuery = queryName => {
  return (req, res, next) => {
    try {
      const queryValue = req.query[queryName];

      if (!queryValue) {
        return next(); // Query parameter é opcional
      }

      uuidSchema.parse(queryValue);

      console.log(`✅ UUID válido em query ${queryName}:`, queryValue);

      next();
    } catch (error) {
      console.warn(`🚨 Query parameter UUID inválido:`, {
        queryName,
        value: req.query[queryName],
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        error: `Query parameter ${queryName} deve ser um UUID válido`,
        code: 'INVALID_QUERY_UUID',
      });
    }
  };
};

// Schemas de validação existentes (mantidos para compatibilidade)
export const authSchemas = {
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    municipalityId: z.string().uuid().optional(),
  }),

  register: z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: z.enum(['admin', 'usuario', 'visualizador']),
    municipalityId: z.string().uuid('ID do município deve ser um UUID válido'),
  }),
};

// Middleware para validar schema completo
export const validateSchema = schema => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      console.warn(`🚨 Validação de schema falhou:`, {
        errors: error.errors,
        body: req.body,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }
  };
};

export default {
  validateUUID,
  validateMultipleUUIDs,
  validateUUIDQuery,
  validateSchema,
  authSchemas,
};
