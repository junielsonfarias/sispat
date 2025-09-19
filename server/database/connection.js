import dotenv from 'dotenv';
import pg from 'pg';

// Carregar .env da raiz do projeto
dotenv.config({ path: '.env' });

// Verificar se o banco de dados está desabilitado
const isDatabaseDisabled = process.env.DISABLE_DATABASE === 'true';

if (isDatabaseDisabled) {
  console.log('⚠️ Banco de dados desabilitado para desenvolvimento');
  console.log(
    '💡 Para habilitar: remova DISABLE_DATABASE=true do arquivo .env'
  );
}

// Validar variáveis críticas de ambiente (apenas se banco não estiver desabilitado)
if (!isDatabaseDisabled) {
  const requiredEnvVars = ['DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'DB_USER'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingVars.length > 0) {
    console.error(
      '❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas:'
    );
    missingVars.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error(
      '💡 Solução: Verifique se o arquivo .env contém todas as variáveis necessárias'
    );
    console.error('💡 Execute: bash scripts/fix-database-connection.sh');
    process.exit(1);
  }
}

const { Pool } = pg;

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sispat_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 50, // Aumentado de 20 para 50
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000, // Aumentado de 30s para 60s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000, // Aumentado de 10s para 30s
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
          ca: process.env.DB_SSL_CA || undefined,
          cert: process.env.DB_SSL_CERT || undefined,
          key: process.env.DB_SSL_KEY || undefined,
        }
      : false,
};

// Create connection pool (ou null se banco desabilitado)
let pool = null;

if (!isDatabaseDisabled) {
  try {
    pool = new Pool(dbConfig);
  } catch (error) {
    console.warn(
      '⚠️ Erro ao conectar com PostgreSQL, usando modo de desenvolvimento sem banco'
    );
    console.warn(
      '💡 Para usar banco real, configure PostgreSQL ou execute: bash scripts/setup-database-local.ps1'
    );
    pool = null;
  }
}

// Export pool for other modules
export { pool };

// Test database connection (apenas se pool existe)
if (pool) {
  pool.on('connect', () => {
    console.log('✅ Conectado ao banco de dados PostgreSQL');
  });

  pool.on('error', err => {
    console.error('❌ Erro na conexão com o banco de dados:', err);
    console.error(
      '💡 Verifique se o PostgreSQL está rodando e as credenciais estão corretas'
    );
    console.error('💡 Execute: bash scripts/fix-database-connection.sh');
  });
}

// Helper function to execute queries
export const query = (text, params) => {
  if (!pool) {
    return Promise.reject(new Error('Banco de dados desabilitado'));
  }
  return pool.query(text, params);
};

// Helper function to get a single row
export const getRow = async (text, params) => {
  if (!pool) {
    throw new Error('Banco de dados desabilitado');
  }
  const result = await pool.query(text, params);
  return result.rows[0];
};

// Helper function to get multiple rows
export const getRows = async (text, params) => {
  if (!pool) {
    throw new Error('Banco de dados desabilitado');
  }
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper function to execute a transaction
export const executeTransaction = async callback => {
  if (!pool) {
    throw new Error('Banco de dados desabilitado');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Test database connection function
export const testConnection = async () => {
  if (!pool) {
    console.log('⚠️ Banco de dados desabilitado - teste de conexão ignorado');
    return false;
  }

  try {
    const result = await pool.query(
      'SELECT NOW() as current_time, version() as pg_version'
    );
    console.log('✅ Teste de conexão com banco de dados bem-sucedido');
    console.log(`📅 Data/hora do servidor: ${result.rows[0].current_time}`);
    console.log(`🐘 Versão PostgreSQL: ${result.rows[0].pg_version}`);
    return true;
  } catch (error) {
    console.error(
      '❌ Falha no teste de conexão com banco de dados:',
      error.message
    );
    console.error(
      '💡 Verifique se o PostgreSQL está rodando e as credenciais estão corretas'
    );
    console.error('💡 Execute: bash scripts/fix-database-connection.sh');
    return false;
  }
};

// Graceful shutdown
export const closePool = async () => {
  if (!pool) {
    console.log(
      '⚠️ Banco de dados desabilitado - pool não precisa ser fechado'
    );
    return;
  }

  try {
    await pool.end();
    console.log('✅ Pool de conexões do banco de dados fechado');
  } catch (error) {
    console.error('❌ Erro ao fechar pool de conexões:', error);
  }
};
