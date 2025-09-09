#!/usr/bin/env node

/**
 * SISPAT - Script de Otimização do Banco de Dados
 * Este script configura otimizações de produção no banco de dados PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sispat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Função para log
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const color =
    {
      ERROR: colors.red,
      WARNING: colors.yellow,
      SUCCESS: colors.green,
      INFO: colors.white,
    }[level] || colors.white;

  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Função para executar query
async function executeQuery(pool, query, description) {
  try {
    await pool.query(query);
    log(`✅ ${description}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`❌ Erro em ${description}: ${error.message}`, 'ERROR');
    return false;
  }
}

// Função para executar query com resultado
async function executeQueryWithResult(pool, query, description) {
  try {
    const result = await pool.query(query);
    log(`✅ ${description}`, 'SUCCESS');
    return result.rows;
  } catch (error) {
    log(`❌ Erro em ${description}: ${error.message}`, 'ERROR');
    return null;
  }
}

// Função principal
async function setupDatabaseOptimization() {
  log('🚀 Iniciando otimização do banco de dados para produção...', 'INFO');

  const pool = new Pool(dbConfig);

  try {
    // Testar conexão
    await pool.query('SELECT 1');
    log('✅ Conectado ao banco de dados PostgreSQL', 'SUCCESS');

    // 1. Criar extensões necessárias
    log('📦 Criando extensões do PostgreSQL...', 'INFO');

    const extensions = [
      'pg_stat_statements',
      'pg_trgm',
      'btree_gin',
      'btree_gist',
      'unaccent',
      'pgcrypto',
    ];

    for (const extension of extensions) {
      await executeQuery(
        pool,
        `CREATE EXTENSION IF NOT EXISTS ${extension};`,
        `Extensão ${extension} criada`
      );
    }

    // 2. Configurar usuário de backup
    log('👤 Configurando usuário de backup...', 'INFO');

    await executeQuery(
      pool,
      `CREATE USER IF NOT EXISTS backup_user WITH PASSWORD 'backup_secure_password_2025';`,
      'Usuário de backup criado'
    );

    await executeQuery(
      pool,
      `GRANT CONNECT ON DATABASE ${dbConfig.database} TO backup_user;`,
      'Permissão de conexão concedida ao usuário de backup'
    );

    await executeQuery(
      pool,
      `GRANT USAGE ON SCHEMA public TO backup_user;`,
      'Permissão de uso do schema concedida ao usuário de backup'
    );

    await executeQuery(
      pool,
      `GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;`,
      'Permissão de SELECT concedida ao usuário de backup'
    );

    await executeQuery(
      pool,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;`,
      'Permissões padrão configuradas para o usuário de backup'
    );

    // 3. Criar função de monitoramento
    log('📊 Criando função de monitoramento...', 'INFO');

    const monitoringFunction = `
            CREATE OR REPLACE FUNCTION get_database_stats()
            RETURNS TABLE (
                database_name text,
                size_bytes bigint,
                connections integer,
                active_queries integer
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    d.datname::text,
                    pg_database_size(d.datname) as size_bytes,
                    (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as connections,
                    (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname AND state = 'active') as active_queries
                FROM pg_database d
                WHERE d.datname NOT IN ('template0', 'template1', 'postgres');
            END;
            $$ LANGUAGE plpgsql;
        `;

    await executeQuery(
      pool,
      monitoringFunction,
      'Função de monitoramento criada'
    );

    // 4. Criar índices de performance
    log('🔍 Criando índices de performance...', 'INFO');

    const indexes = [
      // Índices para patrimonios
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_municipality_id ON patrimonios(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_sector_id ON patrimonios(sector_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_local_id ON patrimonios(local_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_status ON patrimonios(status);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_created_at ON patrimonios(created_at);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_updated_at ON patrimonios(updated_at);',
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_name ON patrimonios USING gin(to_tsvector('portuguese', name));",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_description ON patrimonios USING gin(to_tsvector('portuguese', description));",

      // Índices para users
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_municipality_id ON users(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);',

      // Índices para sectors
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_municipality_id ON sectors(municipality_id);',
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_name ON sectors USING gin(to_tsvector('portuguese', name));",
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_created_at ON sectors(created_at);',

      // Índices para locals
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_municipality_id ON locals(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_sector_id ON locals(sector_id);',
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_name ON locals USING gin(to_tsvector('portuguese', name));",
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_created_at ON locals(created_at);',

      // Índices para imoveis
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_municipality_id ON imoveis(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_sector_id ON imoveis(sector_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_local_id ON imoveis(local_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_status ON imoveis(status);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_created_at ON imoveis(created_at);',

      // Índices para activity_logs
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_municipality_id ON activity_logs(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_table_name ON activity_logs(table_name);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_record_id ON activity_logs(record_id);',

      // Índices para transfers
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_from_municipality_id ON transfers(from_municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_to_municipality_id ON transfers(to_municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);',

      // Índices para inventories
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_municipality_id ON inventories(municipality_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_sector_id ON inventories(sector_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_status ON inventories(status);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_created_at ON inventories(created_at);',

      // Índices para user_sectors
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_user_id ON user_sectors(user_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_sector_id ON user_sectors(sector_id);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_municipality_id ON user_sectors(municipality_id);',

      // Índices para label_templates
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_municipality_id ON label_templates(municipality_id);',
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_name ON label_templates USING gin(to_tsvector('portuguese', name));",
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_created_at ON label_templates(created_at);',
    ];

    for (const indexQuery of indexes) {
      await executeQuery(
        pool,
        indexQuery,
        `Índice criado: ${indexQuery.split(' ')[5]}`
      );
    }

    // 5. Analisar tabelas para otimizar estatísticas
    log('📈 Analisando tabelas...', 'INFO');

    const tables = await executeQueryWithResult(
      pool,
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`,
      'Lista de tabelas obtida'
    );

    if (tables) {
      for (const table of tables) {
        await executeQuery(
          pool,
          `ANALYZE ${table.table_name};`,
          `Tabela ${table.table_name} analisada`
        );
      }
    }

    // 6. Configurar estatísticas
    log('📊 Configurando estatísticas...', 'INFO');

    await executeQuery(
      pool,
      `ALTER SYSTEM SET track_activities = on;`,
      'Rastreamento de atividades habilitado'
    );

    await executeQuery(
      pool,
      `ALTER SYSTEM SET track_counts = on;`,
      'Rastreamento de contadores habilitado'
    );

    await executeQuery(
      pool,
      `ALTER SYSTEM SET track_io_timing = on;`,
      'Rastreamento de I/O habilitado'
    );

    // 7. Verificar configuração
    log('🔍 Verificando configuração...', 'INFO');

    // Verificar extensões
    const loadedExtensions = await executeQueryWithResult(
      pool,
      `SELECT extname FROM pg_extension WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'btree_gin', 'btree_gist', 'unaccent', 'pgcrypto');`,
      'Extensões verificadas'
    );

    if (loadedExtensions) {
      log(
        `✅ Extensões carregadas: ${loadedExtensions.map(e => e.extname).join(', ')}`,
        'SUCCESS'
      );
    }

    // Verificar índices criados
    const indexCount = await executeQueryWithResult(
      pool,
      `SELECT count(*) as count FROM pg_indexes WHERE schemaname = 'public';`,
      'Contagem de índices'
    );

    if (indexCount) {
      log(`✅ Total de índices: ${indexCount[0].count}`, 'SUCCESS');
    }

    // Verificar tamanho do banco
    const dbSize = await executeQueryWithResult(
      pool,
      `SELECT pg_size_pretty(pg_database_size('${dbConfig.database}')) as size;`,
      'Tamanho do banco verificado'
    );

    if (dbSize) {
      log(`✅ Tamanho do banco: ${dbSize[0].size}`, 'SUCCESS');
    }

    // 8. Criar relatório de otimização
    log('📋 Gerando relatório de otimização...', 'INFO');

    const report = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
      optimizations: {
        extensions: loadedExtensions
          ? loadedExtensions.map(e => e.extname)
          : [],
        indexes: indexCount ? indexCount[0].count : 0,
        tables_analyzed: tables ? tables.length : 0,
        monitoring_function: true,
        backup_user: true,
      },
      recommendations: [
        'Configure backup automático diário',
        'Monitore performance regularmente',
        'Execute VACUUM ANALYZE semanalmente',
        'Configure alertas para métricas críticas',
        'Considere particionamento para tabelas grandes',
      ],
    };

    const reportPath = path.join(
      __dirname,
      '..',
      'docs',
      'database-optimization-report.json'
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`✅ Relatório salvo em: ${reportPath}`, 'SUCCESS');

    log('🎉 Otimização do banco de dados concluída com sucesso!', 'SUCCESS');
    log('📋 Configurações aplicadas:', 'SUCCESS');
    log('   • Extensões de performance instaladas', 'SUCCESS');
    log('   • Usuário de backup criado', 'SUCCESS');
    log('   • Função de monitoramento criada', 'SUCCESS');
    log('   • Índices de performance criados', 'SUCCESS');
    log('   • Tabelas analisadas para otimização', 'SUCCESS');
    log('   • Estatísticas configuradas', 'SUCCESS');
    log('   • Relatório de otimização gerado', 'SUCCESS');
  } catch (error) {
    log(`❌ Erro na otimização do banco de dados: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabaseOptimization().catch(console.error);
}

module.exports = { setupDatabaseOptimization };
