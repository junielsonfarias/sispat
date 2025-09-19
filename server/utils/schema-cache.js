import { getRows } from '../database/connection.js';

// Cache para verificações de schema
const schemaCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Verificar se uma tabela existe
 */
export async function tableExists(tableName) {
  const cacheKey = `table:${tableName}`;
  const cached = schemaCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.exists;
  }

  try {
    const result = await getRows(
      `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1
      ) as table_exists
    `,
      [tableName]
    );

    const exists = result[0]?.table_exists || false;
    schemaCache.set(cacheKey, { exists, timestamp: Date.now() });

    return exists;
  } catch (error) {
    // Log centralizado
    import('../utils/logger.js').then(({ logError }) => {
      logError(`Erro ao verificar existência da tabela ${tableName}:`, error);
    });
    return false;
  }
}

/**
 * Verificar se uma coluna existe em uma tabela
 */
export async function columnExists(tableName, columnName) {
  const cacheKey = `column:${tableName}:${columnName}`;
  const cached = schemaCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.exists;
  }

  try {
    const result = await getRows(
      `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      ) as column_exists
    `,
      [tableName, columnName]
    );

    const exists = result[0]?.column_exists || false;
    schemaCache.set(cacheKey, { exists, timestamp: Date.now() });

    return exists;
  } catch (error) {
    import('../utils/logger.js').then(({ logError }) => {
      logError(
        `Erro ao verificar existência da coluna ${columnName} na tabela ${tableName}:`,
        error
      );
    });
    return false;
  }
}

/**
 * Obter todas as colunas de uma tabela
 */
export async function getTableColumns(tableName) {
  const cacheKey = `columns:${tableName}`;
  const cached = schemaCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.columns;
  }

  try {
    const result = await getRows(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName]
    );

    const columns = result.map(row => row.column_name);
    schemaCache.set(cacheKey, { columns, timestamp: Date.now() });

    return columns;
  } catch (error) {
    import('../utils/logger.js').then(({ logError }) => {
      logError(`Erro ao obter colunas da tabela ${tableName}:`, error);
    });
    return [];
  }
}

/**
 * Limpar cache
 */
export function clearSchemaCache() {
  schemaCache.clear();
}

/**
 * Obter estatísticas do cache
 */
export function getSchemaCacheStats() {
  return {
    size: schemaCache.size,
    entries: Array.from(schemaCache.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      age: Date.now() - value.timestamp,
    })),
  };
}
