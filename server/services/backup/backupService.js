import { exec } from 'child_process';
import fs from 'fs/promises';
import cron from 'node-cron';
import path from 'path';
import { promisify } from 'util';
import { logError, logInfo, logWarning } from '../../utils/logger.js';

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'sispat',
      username: process.env.DB_USER || 'sispat_user',
      password: process.env.DB_PASSWORD,
    };
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Criar diretório de backup se não existir
      await fs.mkdir(this.backupDir, { recursive: true });

      // Configurar agendamentos
      this.setupSchedules();

      logInfo('✅ Serviço de backup inicializado');
    } catch (error) {
      logError('❌ Erro ao inicializar serviço de backup', error);
    }
  }

  setupSchedules() {
    // Backup diário às 02:00
    cron.schedule(
      '0 2 * * *',
      () => {
        this.createBackup('daily');
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    // Backup semanal aos domingos às 03:00
    cron.schedule(
      '0 3 * * 0',
      () => {
        this.createBackup('weekly');
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    // Backup mensal no primeiro dia do mês às 04:00
    cron.schedule(
      '0 4 1 * *',
      () => {
        this.createBackup('monthly');
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    // Limpeza de backups antigos diariamente às 05:00
    cron.schedule(
      '0 5 * * *',
      () => {
        this.cleanupOldBackups();
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    logInfo('📅 Agendamentos de backup configurados');
  }

  async createBackup(type = 'manual') {
    if (this.isRunning) {
      logWarning('⚠️ Backup já está em execução');
      return;
    }

    this.isRunning = true;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    try {
      logInfo(`🔄 Iniciando backup ${type}: ${filename}`);

      // Comando pg_dump
      const pgDumpCmd = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} --verbose --clean --no-owner --no-privileges`;

      // Executar backup
      const { stdout } = await execAsync(pgDumpCmd);

      // Salvar backup em arquivo
      await fs.writeFile(filepath, stdout);

      // Comprimir backup
      const compressedFilepath = await this.compressBackup(filepath);

      // Remover arquivo não comprimido
      await fs.unlink(filepath);

      // Calcular tamanho do arquivo
      const stats = await fs.stat(compressedFilepath);
      const fileSize = this.formatBytes(stats.size);

      // Registrar backup
      await this.registerBackup({
        filename: path.basename(compressedFilepath),
        type,
        size: fileSize,
        sizeBytes: stats.size,
        path: compressedFilepath,
        timestamp: new Date().toISOString(),
      });

      logInfo(
        `✅ Backup ${type} concluído: ${path.basename(compressedFilepath)} (${fileSize})`
      );

      // Notificar sucesso
      await this.notifyBackupSuccess(
        type,
        path.basename(compressedFilepath),
        fileSize
      );
    } catch (error) {
      logError(`❌ Erro no backup ${type}:`, error);

      // Notificar erro
      await this.notifyBackupError(type, error.message);

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async compressBackup(filepath) {
    const gzipCmd = `gzip -9 "${filepath}"`;
    await execAsync(gzipCmd);
    return `${filepath}.gz`;
  }

  async registerBackup(backupInfo) {
    try {
      const backupLogPath = path.join(this.backupDir, 'backup-log.json');
      let backupLog = [];

      // Carregar log existente
      try {
        const logContent = await fs.readFile(backupLogPath, 'utf8');
        backupLog = JSON.parse(logContent);
      } catch {
        // Arquivo não existe, começar com array vazio
      }

      // Adicionar novo backup
      backupLog.push(backupInfo);

      // Manter apenas os últimos 100 registros
      if (backupLog.length > 100) {
        backupLog = backupLog.slice(-100);
      }

      // Salvar log
      await fs.writeFile(backupLogPath, JSON.stringify(backupLog, null, 2));
    } catch (error) {
      logError('❌ Erro ao registrar backup', error);
    }
  }

  async cleanupOldBackups() {
    try {
      logInfo('🧹 Iniciando limpeza de backups antigos...');

      const files = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;
      let freedSpace = 0;

      for (const file of files) {
        if (!file.endsWith('.sql.gz')) continue;

        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          freedSpace += stats.size;
          logInfo(`🗑️ Removido: ${file}`);
        }
      }

      const freedSpaceFormatted = this.formatBytes(freedSpace);
      logInfo(
        `✅ Limpeza concluída: ${deletedCount} arquivos removidos, ${freedSpaceFormatted} liberados`
      );
    } catch (error) {
      logError('❌ Erro na limpeza de backups', error);
    }
  }

  async restoreBackup(filename) {
    try {
      logInfo(`🔄 Iniciando restauração: ${filename}`);

      const filepath = path.join(this.backupDir, filename);

      // Verificar se arquivo existe
      await fs.access(filepath);

      // Descomprimir backup
      const uncompressedFilepath = await this.decompressBackup(filepath);

      // Comando psql para restauração
      const psqlCmd = `PGPASSWORD="${this.dbConfig.password}" psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f "${uncompressedFilepath}"`;

      // Executar restauração
      await execAsync(psqlCmd);

      // Remover arquivo descomprimido
      await fs.unlink(uncompressedFilepath);

      logInfo(`✅ Restauração concluída: ${filename}`);

      return { success: true, message: 'Restauração concluída com sucesso' };
    } catch (error) {
      logError('❌ Erro na restauração', error);
      throw error;
    }
  }

  async decompressBackup(filepath) {
    const gunzipCmd = `gunzip -k "${filepath}"`;
    await execAsync(gunzipCmd);
    return filepath.replace('.gz', '');
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (!file.endsWith('.sql.gz')) continue;

        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);

        backups.push({
          filename: file,
          size: this.formatBytes(stats.size),
          sizeBytes: stats.size,
          createdAt: stats.mtime,
          type: this.getBackupType(file),
        });
      }

      // Ordenar por data de criação (mais recente primeiro)
      return backups.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logError('❌ Erro ao listar backups', error);
      return [];
    }
  }

  getBackupType(filename) {
    if (filename.includes('daily')) return 'daily';
    if (filename.includes('weekly')) return 'weekly';
    if (filename.includes('monthly')) return 'monthly';
    return 'manual';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async notifyBackupSuccess(type, filename, size) {
    // Implementar notificação (Slack, Discord, email, etc.)
    logInfo(`📢 Backup ${type} realizado com sucesso: ${filename} (${size})`);
  }

  async notifyBackupError(type, error) {
    // Implementar notificação de erro
    logError(`📢 Erro no backup ${type}: ${error}`);
  }

  async getBackupStats() {
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce(
        (sum, backup) => sum + backup.sizeBytes,
        0
      );

      return {
        totalBackups: backups.length,
        totalSize: this.formatBytes(totalSize),
        totalSizeBytes: totalSize,
        oldestBackup:
          backups.length > 0 ? backups[backups.length - 1].createdAt : null,
        newestBackup: backups.length > 0 ? backups[0].createdAt : null,
        byType: {
          daily: backups.filter(b => b.type === 'daily').length,
          weekly: backups.filter(b => b.type === 'weekly').length,
          monthly: backups.filter(b => b.type === 'monthly').length,
          manual: backups.filter(b => b.type === 'manual').length,
        },
      };
    } catch (error) {
      logError('❌ Erro ao obter estatísticas de backup', error);
      return null;
    }
  }
}

// Instância singleton
const backupService = new BackupService();

export default backupService;
