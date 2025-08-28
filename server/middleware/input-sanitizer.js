import { logWarning } from '../utils/logger.js';

/**
 * Sanitizar string para prevenir SQL injection
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;

  // Remover caracteres perigosos
  return input
    .replace(/['";\\]/g, '') // Remover aspas e ponto e vírgula
    .replace(/--/g, '') // Remover comentários SQL
    .replace(/\/\*/g, '') // Remover comentários SQL
    .replace(/\*\//g, '') // Remover comentários SQL
    .trim();
}

/**
 * Validar e sanitizar parâmetros de busca
 */
function sanitizeSearchParams(params) {
  const sanitized = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      case 'search':
      case 'descricao':
      case 'endereco':
      case 'numero_patrimonio':
        sanitized[key] = sanitizeString(value);
        break;

      case 'municipalityId':
      case 'municipality_id':
        // Validar UUID
        if (
          typeof value === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          sanitized[key] = value;
        } else {
          logWarning('Invalid municipality ID format', { value, key });
        }
        break;

      case 'limit':
      case 'page': {
        const num = parseInt(value);
        if (!isNaN(num) && num > 0 && num <= 1000) {
          sanitized[key] = num;
        } else {
          logWarning('Invalid numeric parameter', { value, key });
        }
        break;
      }

      case 'status': {
        const validStatuses = [
          'ativo',
          'inativo',
          'manutencao',
          'baixado',
          'extraviado',
        ];
        if (validStatuses.includes(value)) {
          sanitized[key] = value;
        } else {
          logWarning('Invalid status value', { value, key });
        }
        break;
      }

      default:
        // Para outros parâmetros, sanitizar como string
        sanitized[key] = sanitizeString(value);
    }
  }

  return sanitized;
}

/**
 * Middleware para sanitizar entrada
 */
export function sanitizeInput(req, res, next) {
  try {
    // Sanitizar query parameters
    if (req.query) {
      req.query = sanitizeSearchParams(req.query);
    }

    // Sanitizar body parameters
    if (req.body) {
      req.body = sanitizeSearchParams(req.body);
    }

    // Sanitizar params (URL parameters)
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        req.params[key] = sanitizeString(value);
      }
    }

    next();
  } catch (error) {
    logWarning('Error in input sanitization', error);
    next();
  }
}

/**
 * Middleware específico para rotas de busca
 */
export function sanitizeSearchInput(req, res, next) {
  try {
    // Sanitizar parâmetros de busca específicos
    if (req.query.search) {
      req.query.search = sanitizeString(req.query.search);

      // Limitar tamanho da busca
      if (req.query.search.length > 100) {
        req.query.search = req.query.search.substring(0, 100);
      }
    }

    // Validar e sanitizar municipalityId
    if (req.query.municipalityId) {
      const municipalityId = req.query.municipalityId;
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          municipalityId
        )
      ) {
        return res.status(400).json({ error: 'ID do município inválido' });
      }
    }

    // Validar limit
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1 || limit > 500) {
        req.query.limit = 50; // Valor padrão
      }
    }

    next();
  } catch (error) {
    logWarning('Error in search input sanitization', error);
    next();
  }
}

/**
 * Validar formato de UUID
 */
export function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

/**
 * Validar formato de email
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
