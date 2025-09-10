import dotenv from 'dotenv';
import pg from 'pg';

// Carregar .env da raiz do projeto
dotenv.config({ path: '.env' });

// Validar variáveis críticas de ambiente
const requiredEnvVars = ['DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'DB_USER'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('💡 Solução: Verifique se o arquivo .env contém todas as variáveis necessárias');
  process.exit(1);
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

// Create connection pool
export const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados PostgreSQL');
});

pool.on('error', err => {
  console.error('❌ Erro na conexão com o banco de dados:', err);
});

// Helper function to execute queries
export const query = (text, params) => pool.query(text, params);

// Helper function to get a single row
export const getRow = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0];
};

// Helper function to get multiple rows
export const getRows = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper function to execute a transaction
export const executeTransaction = async callback => {
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
