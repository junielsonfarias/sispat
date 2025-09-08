import dotenv from 'dotenv';
import pg from 'pg';

// Carregar .env da raiz do projeto
dotenv.config({ path: '.env' });

const { Pool } = pg;

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sispat_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
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
