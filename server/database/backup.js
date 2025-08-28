import { query, getRows } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações de backup
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 10; // Manter apenas os últimos 10 backups

// Criar diretório de backup se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Função para criar backup completo do banco de dados
 */
export async function createBackup() {
  try {
    console.log('🔄 Iniciando backup do banco de dados...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: {},
    };

    // Lista de tabelas para backup
    const tables = [
      'users',
      'municipalities',
      'sectors',
      'locals',
      'patrimonios',
      'imoveis',
      'manutencao_tasks',
      'transfers',
      'inventories',
      'activity_logs',
      'report_templates',
      'label_templates',
      'excel_csv_templates',
      'form_fields',
      'customization_settings',
    ];

    // Backup de cada tabela
    for (const table of tables) {
      try {
        console.log(`📋 Fazendo backup da tabela: ${table}`);

        // Verificar se a tabela existe
        const tableExists = await query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `,
          [table]
        );

        if (tableExists.rows[0].exists) {
          const data = await getRows(`SELECT * FROM ${table}`);
          backupData.tables[table] = data;
          console.log(`✅ Tabela ${table}: ${data.length} registros`);
        } else {
          console.log(`⚠️ Tabela ${table} não existe, pulando...`);
          backupData.tables[table] = [];
        }
      } catch (error) {
        console.error(
          `❌ Erro ao fazer backup da tabela ${table}:`,
          error.message
        );
        backupData.tables[table] = [];
      }
    }

    // Salvar backup em arquivo
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup criado com sucesso: ${backupFileName}`);

    // Limpar backups antigos
    await cleanupOldBackups();

    return {
      success: true,
      filename: backupFileName,
      path: backupPath,
      tables: Object.keys(backupData.tables),
      totalRecords: Object.values(backupData.tables).reduce(
        (acc, table) => acc + table.length,
        0
      ),
    };
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    throw error;
  }
}

/**
 * Função para restaurar backup
 */
export async function restoreBackup(backupFileName) {
  try {
    console.log(`🔄 Iniciando restauração do backup: ${backupFileName}`);

    const backupPath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFileName}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    // Verificar versão do backup
    if (!backupData.version) {
      console.warn('⚠️ Backup sem versão, pode ser incompatível');
    }

    // Restaurar cada tabela
    for (const [tableName, records] of Object.entries(backupData.tables)) {
      if (records.length === 0) continue;

      try {
        console.log(
          `📋 Restaurando tabela: ${tableName} (${records.length} registros)`
        );

        // Limpar tabela existente
        await query(`DELETE FROM ${tableName}`);

        // Inserir registros
        for (const record of records) {
          const columns = Object.keys(record);
          const values = Object.values(record);
          const placeholders = values
            .map((_, index) => `$${index + 1}`)
            .join(', ');

          await query(
            `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
          `,
            values
          );
        }

        console.log(`✅ Tabela ${tableName} restaurada com sucesso`);
      } catch (error) {
        console.error(
          `❌ Erro ao restaurar tabela ${tableName}:`,
          error.message
        );
        throw error;
      }
    }

    console.log('✅ Restauração concluída com sucesso');

    return {
      success: true,
      filename: backupFileName,
      tables: Object.keys(backupData.tables),
      totalRecords: Object.values(backupData.tables).reduce(
        (acc, table) => acc + table.length,
        0
      ),
    };
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
    throw error;
  }
}

/**
 * Função para listar backups disponíveis
 */
export async function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);

        try {
          const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          backups.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            timestamp: backupData.timestamp,
            version: backupData.version,
            tables: Object.keys(backupData.tables),
            totalRecords: Object.values(backupData.tables).reduce(
              (acc, table) => acc + table.length,
              0
            ),
          });
        } catch (error) {
          console.warn(`⚠️ Erro ao ler backup ${file}:`, error.message);
        }
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    return backups;
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error);
    throw error;
  }
}

/**
 * Função para limpar backups antigos
 */
async function cleanupOldBackups() {
  try {
    const backups = await listBackups();

    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(MAX_BACKUPS);

      for (const backup of backupsToDelete) {
        const filePath = path.join(BACKUP_DIR, backup.filename);
        fs.unlinkSync(filePath);
        console.log(`🗑️ Backup antigo removido: ${backup.filename}`);
      }

      console.log(`🧹 ${backupsToDelete.length} backups antigos removidos`);
    }
  } catch (error) {
    console.error('❌ Erro ao limpar backups antigos:', error);
  }
}

/**
 * Função para criar backup automático (para ser chamada por cron)
 */
export async function autoBackup() {
  try {
    console.log('🤖 Iniciando backup automático...');

    const result = await createBackup();

    console.log('✅ Backup automático concluído:', result.filename);

    return result;
  } catch (error) {
    console.error('❌ Erro no backup automático:', error);
    throw error;
  }
}

/**
 * Função para verificar integridade do backup
 */
export async function verifyBackup(backupFileName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFileName}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    const verification = {
      filename: backupFileName,
      timestamp: backupData.timestamp,
      version: backupData.version,
      tables: {},
      isValid: true,
      errors: [],
    };

    // Verificar cada tabela
    for (const [tableName, records] of Object.entries(backupData.tables)) {
      try {
        verification.tables[tableName] = {
          recordCount: records.length,
          hasData: records.length > 0,
          sampleRecord: records.length > 0 ? Object.keys(records[0]) : [],
        };
      } catch (error) {
        verification.tables[tableName] = {
          recordCount: 0,
          hasData: false,
          error: error.message,
        };
        verification.errors.push(
          `Erro na tabela ${tableName}: ${error.message}`
        );
        verification.isValid = false;
      }
    }

    return verification;
  } catch (error) {
    console.error('❌ Erro ao verificar backup:', error);
    throw error;
  }
}
