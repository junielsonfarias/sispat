/**
 * SISPAT - Configuração do Banco de Dados para Produção
 * Data: 09/09/2025
 * Versão: 0.0.193
 * Descrição: Script para configurar PostgreSQL otimizado para produção
 */

import { getRows, query } from '../server/database/connection.js';
import { logError, logInfo, logWarning } from '../server/utils/logger.js';

/**
 * Configurações de produção para PostgreSQL
 */
const PRODUCTION_CONFIGS = [
  // Configurações de memória
  "ALTER SYSTEM SET shared_buffers = '256MB';",
  "ALTER SYSTEM SET effective_cache_size = '1GB';",
  "ALTER SYSTEM SET maintenance_work_mem = '64MB';",
  "ALTER SYSTEM SET work_mem = '4MB';",

  // Configurações de WAL
  "ALTER SYSTEM SET wal_buffers = '16MB';",
  'ALTER SYSTEM SET checkpoint_completion_target = 0.9;',
  "ALTER SYSTEM SET checkpoint_timeout = '15min';",
  "ALTER SYSTEM SET max_wal_size = '1GB';",
  "ALTER SYSTEM SET min_wal_size = '80MB';",

  // Configurações de conexões
  'ALTER SYSTEM SET max_connections = 100;',
  'ALTER SYSTEM SET superuser_reserved_connections = 3;',

  // Configurações de logging
  "ALTER SYSTEM SET log_destination = 'stderr';",
  'ALTER SYSTEM SET logging_collector = on;',
  "ALTER SYSTEM SET log_directory = 'pg_log';",
  "ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';",
  "ALTER SYSTEM SET log_rotation_age = '1d';",
  "ALTER SYSTEM SET log_rotation_size = '100MB';",
  'ALTER SYSTEM SET log_min_duration_statement = 1000;',
  "ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';",
  'ALTER SYSTEM SET log_checkpoints = on;',
  'ALTER SYSTEM SET log_connections = on;',
  'ALTER SYSTEM SET log_disconnections = on;',
  'ALTER SYSTEM SET log_lock_waits = on;',
  'ALTER SYSTEM SET log_temp_files = 0;',

  // Configurações de estatísticas
  'ALTER SYSTEM SET track_activities = on;',
  'ALTER SYSTEM SET track_counts = on;',
  'ALTER SYSTEM SET track_io_timing = on;',
  'ALTER SYSTEM SET track_functions = all;',
  "ALTER SYSTEM SET stats_temp_directory = 'pg_stat_tmp';",

  // Configurações de autovacuum
  'ALTER SYSTEM SET autovacuum = on;',
  'ALTER SYSTEM SET autovacuum_max_workers = 3;',
  "ALTER SYSTEM SET autovacuum_naptime = '1min';",
  'ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;',
  'ALTER SYSTEM SET autovacuum_analyze_threshold = 50;',
  'ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.2;',
  'ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.1;',
  'ALTER SYSTEM SET autovacuum_freeze_max_age = 200000000;',
  'ALTER SYSTEM SET autovacuum_multixact_freeze_max_age = 400000000;',
  'ALTER SYSTEM SET autovacuum_vacuum_cost_delay = 20;',
  'ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 200;',

  // Configurações de segurança
  'ALTER SYSTEM SET ssl = on;',
  'ALTER SYSTEM SET password_encryption = scram-sha-256;',
  "ALTER SYSTEM SET log_statement = 'mod';",
  'ALTER SYSTEM SET log_min_error_statement = error;',

  // Configurações de performance
  'ALTER SYSTEM SET random_page_cost = 1.1;',
  'ALTER SYSTEM SET effective_io_concurrency = 200;',
  'ALTER SYSTEM SET max_worker_processes = 8;',
  'ALTER SYSTEM SET max_parallel_workers_per_gather = 2;',
  'ALTER SYSTEM SET max_parallel_workers = 8;',
  'ALTER SYSTEM SET max_parallel_maintenance_workers = 2;',

  // Configurações de timeout
  "ALTER SYSTEM SET statement_timeout = '30min';",
  "ALTER SYSTEM SET lock_timeout = '1min';",
  "ALTER SYSTEM SET idle_in_transaction_session_timeout = '10min';",

  // Configurações de locale
  "ALTER SYSTEM SET lc_messages = 'en_US.UTF-8';",
  "ALTER SYSTEM SET lc_monetary = 'en_US.UTF-8';",
  "ALTER SYSTEM SET lc_numeric = 'en_US.UTF-8';",
  "ALTER SYSTEM SET lc_time = 'en_US.UTF-8';",
  "ALTER SYSTEM SET default_text_search_config = 'pg_catalog.english';",

  // Configurações de timezone
  "ALTER SYSTEM SET timezone = 'UTC';",
  "ALTER SYSTEM SET log_timezone = 'UTC';",

  // Configurações de backup
  'ALTER SYSTEM SET archive_mode = on;',
  "ALTER SYSTEM SET archive_command = 'test ! -f /var/backups/postgresql/%f && cp %p /var/backups/postgresql/%f';",
  'ALTER SYSTEM SET wal_level = replica;',
  'ALTER SYSTEM SET max_wal_senders = 3;',
  'ALTER SYSTEM SET wal_keep_segments = 64;',
  'ALTER SYSTEM SET hot_standby = on;',
  'ALTER SYSTEM SET hot_standby_feedback = on;',

  // Configurações de extensões
  'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;',
  'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
  'CREATE EXTENSION IF NOT EXISTS btree_gin;',
  'CREATE EXTENSION IF NOT EXISTS btree_gist;',
  'CREATE EXTENSION IF NOT EXISTS unaccent;',
  'CREATE EXTENSION IF NOT EXISTS uuid-ossp;',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
];

/**
 * Índices de produção para otimização
 */
const PRODUCTION_INDEXES = [
  // Índices para patrimônios
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_municipality_status ON patrimonios(municipality_id, status);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_setor_data ON patrimonios(setor_responsavel, data_aquisicao);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_numero ON patrimonios(numero_patrimonio);',
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_descricao_gin ON patrimonios USING gin(to_tsvector('portuguese', descricao));",
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_tipo_municipality ON patrimonios(tipo, municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_valor ON patrimonios(valor_aquisicao) WHERE valor_aquisicao IS NOT NULL;',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_created_at ON patrimonios(created_at);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patrimonios_updated_at ON patrimonios(updated_at);',

  // Índices para usuários
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_unique ON users(email);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_municipality_role ON users(municipality_id, role);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login) WHERE last_login IS NOT NULL;',

  // Índices para setores
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_municipality ON sectors(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_parent ON sectors(parent_id) WHERE parent_id IS NOT NULL;',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_name ON sectors(name);',

  // Índices para locais
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_sector ON locals(sector_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_municipality ON locals(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locals_name ON locals(name);',

  // Índices para imóveis
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_municipality ON imoveis(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_numero ON imoveis(numero_imovel);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_endereco ON imoveis(endereco);',

  // Índices para activity_logs
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, created_at);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_table ON activity_logs(table_name);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_municipality ON activity_logs(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);',

  // Índices para transferências
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_patrimonio ON transfers(patrimonio_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_data ON transfers(data_transferencia);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_status ON transfers(status);',

  // Índices para manutenções
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manutencao_patrimonio ON manutencao(patrimonio_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manutencao_status ON manutencao(status);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manutencao_data ON manutencao(data_manutencao);',

  // Índices para inventários
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_municipality ON inventories(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_status ON inventories(status);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventories_data ON inventories(data_inicio, data_fim);',

  // Índices para user_sectors
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_user ON user_sectors(user_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_sector ON user_sectors(sector_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sectors_primary ON user_sectors(user_id, is_primary) WHERE is_primary = true;',

  // Índices para customization_settings
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customization_municipality ON customization_settings(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customization_type ON customization_settings(type);',

  // Índices para label_templates
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_municipality ON label_templates(municipality_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_created_by ON label_templates(created_by);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_templates_is_default ON label_templates(is_default) WHERE is_default = true;',
];

/**
 * Função principal para configurar o banco de dados
 */
async function setupProductionDatabase() {
  try {
    logInfo('🚀 Iniciando configuração do banco de dados para produção...');

    // 1. Aplicar configurações do PostgreSQL
    logInfo('⚙️ Aplicando configurações do PostgreSQL...');
    for (const config of PRODUCTION_CONFIGS) {
      try {
        await query(config);
        logInfo(`✅ Configuração aplicada: ${config.substring(0, 50)}...`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          logInfo(`ℹ️ Configuração já existe: ${config.substring(0, 50)}...`);
        } else {
          logWarning(`⚠️ Erro ao aplicar configuração: ${error.message}`);
        }
      }
    }

    // 2. Criar índices de produção
    logInfo('📊 Criando índices de produção...');
    for (const index of PRODUCTION_INDEXES) {
      try {
        await query(index);
        logInfo(`✅ Índice criado: ${index.substring(0, 50)}...`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          logInfo(`ℹ️ Índice já existe: ${index.substring(0, 50)}...`);
        } else {
          logWarning(`⚠️ Erro ao criar índice: ${error.message}`);
        }
      }
    }

    // 3. Analisar tabelas para otimização
    logInfo('📈 Analisando tabelas...');
    const tables = await getRows(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    for (const table of tables) {
      try {
        await query(`ANALYZE ${table.tablename};`);
        logInfo(`✅ Tabela analisada: ${table.tablename}`);
      } catch (error) {
        logWarning(
          `⚠️ Erro ao analisar tabela ${table.tablename}: ${error.message}`
        );
      }
    }

    // 4. Configurar estatísticas
    logInfo('📊 Configurando estatísticas...');
    await query('SELECT pg_stat_statements_reset();');
    logInfo('✅ Estatísticas resetadas');

    // 5. Verificar configurações aplicadas
    logInfo('🔍 Verificando configurações...');
    const configs = await getRows(`
      SELECT name, setting, unit, context 
      FROM pg_settings 
      WHERE name IN (
        'shared_buffers', 'effective_cache_size', 'maintenance_work_mem',
        'work_mem', 'wal_buffers', 'checkpoint_completion_target',
        'max_connections', 'log_min_duration_statement'
      )
      ORDER BY name
    `);

    logInfo('📋 Configurações aplicadas:');
    configs.forEach(config => {
      logInfo(`  ${config.name}: ${config.setting}${config.unit || ''}`);
    });

    // 6. Verificar índices criados
    const indexCount = await getRows(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);

    logInfo(`📊 Total de índices: ${indexCount[0].count}`);

    // 7. Verificar extensões
    const extensions = await getRows(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'btree_gin', 'uuid-ossp', 'pgcrypto')
    `);

    logInfo('🔌 Extensões instaladas:');
    extensions.forEach(ext => {
      logInfo(`  ${ext.extname}: ${ext.extversion}`);
    });

    logInfo('🎉 Configuração do banco de dados para produção concluída!');

    return {
      success: true,
      configsApplied: PRODUCTION_CONFIGS.length,
      indexesCreated: PRODUCTION_INDEXES.length,
      tablesAnalyzed: tables.length,
      extensionsInstalled: extensions.length,
    };
  } catch (error) {
    logError('❌ Erro na configuração do banco de dados:', error);
    throw error;
  }
}

/**
 * Função para verificar a saúde do banco
 */
async function checkDatabaseHealth() {
  try {
    logInfo('🏥 Verificando saúde do banco de dados...');

    // Verificar conexões
    const connections = await getRows(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
    `);

    logInfo(
      `📊 Conexões: ${connections[0].total_connections} total, ${connections[0].active_connections} ativas, ${connections[0].idle_connections} idle`
    );

    // Verificar tamanho do banco
    const dbSize = await getRows(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);

    logInfo(`💾 Tamanho do banco: ${dbSize[0].size}`);

    // Verificar queries lentas
    const slowQueries = await getRows(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > 100
      ORDER BY mean_time DESC 
      LIMIT 5
    `);

    if (slowQueries.length > 0) {
      logWarning('🐌 Queries lentas encontradas:');
      slowQueries.forEach(query => {
        logWarning(
          `  ${query.query.substring(0, 100)}... (${query.mean_time}ms média)`
        );
      });
    } else {
      logInfo('✅ Nenhuma query lenta encontrada');
    }

    // Verificar locks
    const locks = await getRows(`
      SELECT COUNT(*) as lock_count
      FROM pg_locks 
      WHERE NOT granted
    `);

    if (locks[0].lock_count > 0) {
      logWarning(`⚠️ ${locks[0].lock_count} locks não concedidos encontrados`);
    } else {
      logInfo('✅ Nenhum lock pendente');
    }

    return {
      success: true,
      connections: connections[0],
      dbSize: dbSize[0].size,
      slowQueries: slowQueries.length,
      pendingLocks: locks[0].lock_count,
    };
  } catch (error) {
    logError('❌ Erro ao verificar saúde do banco:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProductionDatabase()
    .then(result => {
      console.log('✅ Configuração concluída:', result);
      return checkDatabaseHealth();
    })
    .then(health => {
      console.log('✅ Saúde do banco:', health);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

export { checkDatabaseHealth, setupProductionDatabase };
