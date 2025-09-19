import { pool } from '../database/connection.js';
import { logError, logWarning } from '../utils/logger.js';

// Cache simples para API keys (em produção, usar Redis)
const apiKeyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rate limiting por API key
const rateLimitStore = new Map();

export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey =
      req.headers['x-api-key'] ||
      req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key é obrigatória',
        code: 'MISSING_API_KEY',
      });
    }

    // Verificar cache primeiro
    const cachedKey = apiKeyCache.get(apiKey);
    if (cachedKey && cachedKey.expiresAt > Date.now()) {
      req.apiKey = cachedKey.data;
      return next();
    }

    // Buscar API key no banco de dados
    const query = `
      SELECT 
        ak.id, ak.name, ak.key_hash, ak.permissions, ak.is_active,
        ak.rate_limit_per_hour, ak.created_at, ak.last_used_at,
        u.id as user_id, u.email as user_email
      FROM api_keys ak
      LEFT JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = $1 AND ak.is_active = true
    `;

    const result = await pool.query(query, [apiKey]);

    if (result.rows.length === 0) {
      logWarning('Tentativa de acesso com API key inválida', {
        apiKey: apiKey.substring(0, 8) + '...',
      });
      return res.status(401).json({
        success: false,
        error: 'API key inválida',
        code: 'INVALID_API_KEY',
      });
    }

    const apiKeyData = result.rows[0];

    // Atualizar último uso
    await pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyData.id]
    );

    // Armazenar no cache
    const keyData = {
      id: apiKeyData.id,
      name: apiKeyData.name,
      permissions: apiKeyData.permissions,
      rateLimitPerHour: apiKeyData.rate_limit_per_hour,
      userId: apiKeyData.user_id,
      userEmail: apiKeyData.user_email,
    };

    apiKeyCache.set(apiKey, {
      data: keyData,
      expiresAt: Date.now() + CACHE_TTL,
    });

    req.apiKey = keyData;
    next();
  } catch (error) {
    logError('Erro na autenticação da API key', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'AUTH_ERROR',
    });
  }
};

export const rateLimitApi = (req, res, next) => {
  try {
    const apiKey = req.apiKey;
    if (!apiKey) {
      return next();
    }

    const key = `api_${apiKey.id}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hora
    const maxRequests = apiKey.rateLimitPerHour || 1000;

    // Limpar registros antigos
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    const validRequests = requests.filter(
      timestamp => now - timestamp < windowMs
    );

    if (validRequests.length >= maxRequests) {
      logWarning('Rate limit excedido para API key', {
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        requests: validRequests.length,
        limit: maxRequests,
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit excedido',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Adicionar requisição atual
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    // Adicionar headers de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - validRequests.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();
  } catch (error) {
    logError('Erro no rate limiting da API', error);
    next();
  }
};

// Middleware para verificar permissões específicas
export const requireApiPermission = permission => {
  return (req, res, next) => {
    const apiKey = req.apiKey;
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key não encontrada',
        code: 'MISSING_API_KEY',
      });
    }

    const permissions = apiKey.permissions || [];

    if (!permissions.includes(permission) && !permissions.includes('*')) {
      logWarning('Tentativa de acesso sem permissão', {
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        requiredPermission: permission,
        availablePermissions: permissions,
      });

      return res.status(403).json({
        success: false,
        error: 'Permissão insuficiente',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission,
      });
    }

    next();
  };
};

// Função para criar tabela de API keys se não existir
export const createApiKeysTable = async () => {
  try {
    if (!pool) {
      console.log(
        '⚠️ Pool de banco de dados não disponível - pulando criação da tabela api_keys'
      );
      return;
    }

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        permissions TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        rate_limit_per_hour INTEGER DEFAULT 1000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        description TEXT
      )
    `;

    await pool.query(createTableQuery);

    // Criar índices separadamente
    const createIndexesQueries = [
      'CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys (is_active)',
    ];

    for (const indexQuery of createIndexesQueries) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        // Ignorar erro se o índice já existir
        if (!error.message.includes('already exists')) {
          console.warn('⚠️ Aviso ao criar índice:', error.message);
        }
      }
    }

    await pool.query(createTableQuery);
    console.log('✅ Tabela api_keys verificada/criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela api_keys:', error);
    throw error;
  }
};

// Função para gerar API key segura
export const generateApiKey = () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Função para criar nova API key
export const createApiKey = async (
  name,
  userId,
  permissions = [],
  rateLimitPerHour = 1000
) => {
  try {
    const apiKey = generateApiKey();

    const query = `
      INSERT INTO api_keys (name, key_hash, user_id, permissions, rate_limit_per_hour)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, created_at
    `;

    const result = await pool.query(query, [
      name,
      apiKey,
      userId,
      permissions,
      rateLimitPerHour,
    ]);

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      apiKey,
      created_at: result.rows[0].created_at,
    };
  } catch (error) {
    logError('Erro ao criar API key', error);
    throw error;
  }
};

// Função para listar API keys de um usuário
export const listApiKeys = async userId => {
  try {
    const query = `
      SELECT 
        id, name, permissions, is_active, rate_limit_per_hour,
        created_at, last_used_at, expires_at, description
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    logError('Erro ao listar API keys', error);
    throw error;
  }
};

// Função para revogar API key
export const revokeApiKey = async (apiKeyId, userId) => {
  try {
    const query = `
      UPDATE api_keys 
      SET is_active = false 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [apiKeyId, userId]);

    if (result.rows.length > 0) {
      // Remover do cache
      for (const [key, value] of apiKeyCache.entries()) {
        if (value.data.id === apiKeyId) {
          apiKeyCache.delete(key);
          break;
        }
      }

      return true;
    }

    return false;
  } catch (error) {
    logError('Erro ao revogar API key', error);
    throw error;
  }
};
