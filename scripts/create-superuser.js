#!/usr/bin/env node

/**
 * Script para criar superusuário automaticamente
 * Executa durante a instalação para garantir que o admin existe
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Configurações do banco
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sispat_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// Dados do superusuário
const SUPERUSER_DATA = {
  name: 'Junielson Farias',
  email: 'junielsonfarias@gmail.com',
  password: 'Tiko6273@',
  role: 'superuser',
  municipality_id: 1, // Será criado se não existir
};

// Função para log
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Função para conectar ao banco
async function connectToDatabase() {
  const pool = new Pool(dbConfig);

  try {
    const client = await pool.connect();
    log('Conectado ao banco de dados PostgreSQL');
    return { pool, client };
  } catch (error) {
    log(`Erro ao conectar ao banco: ${error.message}`, 'error');
    throw error;
  }
}

// Função para verificar se a tabela users existe
async function checkUsersTable(client) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!result.rows[0].exists) {
      log('Tabela users não existe, criando...');
      await createUsersTable(client);
    }

    return true;
  } catch (error) {
    log(`Erro ao verificar tabela users: ${error.message}`, 'error');
    throw error;
  }
}

// Função para criar tabela users se não existir
async function createUsersTable(client) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      municipality_id INTEGER,
      is_active BOOLEAN DEFAULT true,
      two_factor_secret VARCHAR(255),
      two_factor_backup_codes TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(createTableSQL);
  log('Tabela users criada com sucesso');
}

// Função para verificar se a tabela municipalities existe
async function checkMunicipalitiesTable(client) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'municipalities'
      );
    `);

    if (!result.rows[0].exists) {
      log('Tabela municipalities não existe, criando...');
      await createMunicipalitiesTable(client);
    }

    return true;
  } catch (error) {
    log(`Erro ao verificar tabela municipalities: ${error.message}`, 'error');
    throw error;
  }
}

// Função para criar tabela municipalities se não existir
async function createMunicipalitiesTable(client) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS municipalities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(10) UNIQUE NOT NULL,
      state VARCHAR(2) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(createTableSQL);
  log('Tabela municipalities criada com sucesso');
}

// Função para criar município padrão
async function createDefaultMunicipality(client) {
  try {
    // Verificar se já existe um município
    const existing = await client.query(
      'SELECT id FROM municipalities LIMIT 1'
    );

    if (existing.rows.length === 0) {
      log('Criando município padrão...');
      await client.query(`
        INSERT INTO municipalities (name, code, state, is_active)
        VALUES ('Município Padrão', '0000000', 'XX', true)
        ON CONFLICT (code) DO NOTHING
      `);
      log('Município padrão criado');
    } else {
      log('Município já existe');
    }

    // Retornar o ID do município
    const result = await client.query('SELECT id FROM municipalities LIMIT 1');
    return result.rows[0].id;
  } catch (error) {
    log(`Erro ao criar município padrão: ${error.message}`, 'error');
    throw error;
  }
}

// Função para verificar se o superusuário já existe
async function checkSuperuserExists(client, email) {
  try {
    const result = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      log(
        `Usuário já existe: ${user.email} (ID: ${user.id}, Role: ${user.role})`
      );
      return { exists: true, user: user };
    }

    return { exists: false };
  } catch (error) {
    log(`Erro ao verificar superusuário: ${error.message}`, 'error');
    throw error;
  }
}

// Função para criar superusuário
async function createSuperuser(client, municipalityId) {
  try {
    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      SUPERUSER_DATA.password,
      saltRounds
    );

    // Inserir superusuário
    const result = await client.query(
      `
      INSERT INTO users (name, email, password, role, municipality_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, name, email, role
    `,
      [
        SUPERUSER_DATA.name,
        SUPERUSER_DATA.email,
        hashedPassword,
        SUPERUSER_DATA.role,
        municipalityId,
      ]
    );

    const user = result.rows[0];
    log(
      `Superusuário criado com sucesso: ${user.name} (${user.email})`,
      'success'
    );
    return user;
  } catch (error) {
    log(`Erro ao criar superusuário: ${error.message}`, 'error');
    throw error;
  }
}

// Função para atualizar superusuário existente
async function updateSuperuser(client, userId) {
  try {
    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      SUPERUSER_DATA.password,
      saltRounds
    );

    // Atualizar superusuário
    const result = await client.query(
      `
      UPDATE users 
      SET name = $1, password = $2, role = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, email, role
    `,
      [SUPERUSER_DATA.name, hashedPassword, SUPERUSER_DATA.role, userId]
    );

    const user = result.rows[0];
    log(
      `Superusuário atualizado com sucesso: ${user.name} (${user.email})`,
      'success'
    );
    return user;
  } catch (error) {
    log(`Erro ao atualizar superusuário: ${error.message}`, 'error');
    throw error;
  }
}

// Função para criar arquivo de credenciais
async function createCredentialsFile(user) {
  try {
    const credentials = {
      name: user.name,
      email: user.email,
      password: SUPERUSER_DATA.password,
      role: user.role,
      created_at: new Date().toISOString(),
      note: 'Credenciais do superusuário criadas automaticamente durante a instalação',
    };

    const credentialsPath = '/root/sispat-superuser-credentials.json';
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    // Definir permissões seguras
    fs.chmodSync(credentialsPath, 0o600);

    log(`Credenciais salvas em: ${credentialsPath}`, 'success');
  } catch (error) {
    log(`Erro ao salvar credenciais: ${error.message}`, 'error');
  }
}

// Função principal
async function main() {
  let pool, client;

  try {
    log('Iniciando criação do superusuário...');

    // Conectar ao banco
    const connection = await connectToDatabase();
    pool = connection.pool;
    client = connection.client;

    // Verificar e criar tabelas necessárias
    await checkUsersTable(client);
    await checkMunicipalitiesTable(client);

    // Criar município padrão se necessário
    const municipalityId = await createDefaultMunicipality(client);

    // Verificar se superusuário já existe
    const superuserCheck = await checkSuperuserExists(
      client,
      SUPERUSER_DATA.email
    );

    let user;
    if (superuserCheck.exists) {
      log('Atualizando superusuário existente...');
      user = await updateSuperuser(client, superuserCheck.user.id);
    } else {
      log('Criando novo superusuário...');
      user = await createSuperuser(client, municipalityId);
    }

    // Criar arquivo de credenciais
    await createCredentialsFile(user);

    log('Superusuário configurado com sucesso!', 'success');
    log(`Email: ${user.email}`);
    log(`Nome: ${user.name}`);
    log(`Role: ${user.role}`);
  } catch (error) {
    log(`Erro fatal: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log(`Erro não tratado: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, SUPERUSER_DATA };
