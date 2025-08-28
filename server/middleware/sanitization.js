/**
 * Middleware de sanitização de dados de entrada
 * Protege contra XSS, SQL injection e outros ataques
 */

/**
 * Sanitiza strings removendo caracteres perigosos
 */
const sanitizeString = str => {
  if (typeof str !== 'string') return str;

  return (
    str
      // Remove tags HTML/XML
      .replace(/<[^>]*>/g, '')
      // Remove caracteres de controle
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // eslint-disable-line no-control-regex
      // Remove caracteres SQL perigosos
      .replace(/[';-]/g, '')
      .replace(/--/g, '')
      // Remove scripts inline
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Limita tamanho
      .substring(0, 1000)
      .trim()
  );
};

/**
 * Sanitiza números
 */
const sanitizeNumber = num => {
  if (typeof num === 'number') return num;
  if (typeof num === 'string') {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Sanitiza booleanos
 */
const sanitizeBoolean = bool => {
  if (typeof bool === 'boolean') return bool;
  if (typeof bool === 'string') {
    return bool.toLowerCase() === 'true';
  }
  return false;
};

/**
 * Sanitiza emails
 */
const sanitizeEmail = email => {
  if (typeof email !== 'string') return '';

  const sanitized = sanitizeString(email).toLowerCase();
  // Regex básica para email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitiza UUIDs
 */
const sanitizeUUID = uuid => {
  if (typeof uuid !== 'string') return '';

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid) ? uuid : '';
};

/**
 * Sanitiza objetos recursivamente
 */
const sanitizeObject = (obj, schema = {}) => {
  if (!obj || typeof obj !== 'object') return {};

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitiza a chave
    const cleanKey = sanitizeString(key);
    if (!cleanKey) continue;

    // Aplica sanitização baseada no tipo esperado
    const expectedType = schema[key] || 'string';

    if (Array.isArray(value)) {
      sanitized[cleanKey] = value
        .map(item =>
          typeof item === 'object' ? sanitizeObject(item) : sanitizeString(item)
        )
        .slice(0, 100); // Limita arrays
    } else if (value && typeof value === 'object') {
      sanitized[cleanKey] = sanitizeObject(value);
    } else {
      switch (expectedType) {
        case 'email':
          sanitized[cleanKey] = sanitizeEmail(value);
          break;
        case 'uuid':
          sanitized[cleanKey] = sanitizeUUID(value);
          break;
        case 'number':
          sanitized[cleanKey] = sanitizeNumber(value);
          break;
        case 'boolean':
          sanitized[cleanKey] = sanitizeBoolean(value);
          break;
        default:
          sanitized[cleanKey] = sanitizeString(value);
      }
    }
  }

  return sanitized;
};

/**
 * Middleware de sanitização para Express
 */
export const sanitizeInput = (schema = {}) => {
  return (req, res, next) => {
    try {
      // Sanitiza body
      if (req.body) {
        req.body = sanitizeObject(req.body, schema);
      }

      // Sanitiza query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }

      // Sanitiza params
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      console.error('Erro na sanitização:', error);
      res.status(400).json({ error: 'Dados de entrada inválidos' });
    }
  };
};

/**
 * Schemas de sanitização para diferentes endpoints
 */
export const sanitizationSchemas = {
  auth: {
    email: 'email',
    password: 'string',
    municipalityId: 'uuid',
  },
  user: {
    name: 'string',
    email: 'email',
    role: 'string',
    municipality_id: 'uuid',
    is_active: 'boolean',
  },
  patrimonio: {
    numero_patrimonio: 'string',
    descricao: 'string',
    tipo: 'string',
    marca: 'string',
    modelo: 'string',
    valor_aquisicao: 'number',
    local_id: 'uuid',
    sector_id: 'uuid',
    municipality_id: 'uuid',
  },
  municipality: {
    name: 'string',
    state: 'string',
  },
  sector: {
    name: 'string',
    description: 'string',
    parent_id: 'uuid',
    municipality_id: 'uuid',
  },
};

export default {
  sanitizeInput,
  sanitizationSchemas,
  sanitizeString,
  sanitizeNumber,
  sanitizeEmail,
  sanitizeUUID,
  sanitizeObject,
};
