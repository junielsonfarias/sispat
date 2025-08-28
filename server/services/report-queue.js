/**
 * Sistema de Filas para Geração Assíncrona de Relatórios
 */

import { EventEmitter } from 'events';
import { getRow, getRows, query } from '../database/connection.js';
import {
  logError,
  logInfo,
  logPerformance,
  logWarning,
} from '../utils/logger.js';
import { notificationManager } from './notification-manager.js';
import { websocketServer } from './websocket-server.js';

class ReportQueue extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map();
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.maxWorkers = 3;
    this.maxRetries = 3;
    this.jobTimeout = 10 * 60 * 1000; // 10 minutos
    this.cleanupInterval = 60 * 60 * 1000; // 1 hora

    this.reportTypes = {
      PATRIMONY_SUMMARY: 'patrimony_summary',
      DEPRECIATION_REPORT: 'depreciation_report',
      TRANSFER_HISTORY: 'transfer_history',
      INVENTORY_REPORT: 'inventory_report',
      CUSTOM_REPORT: 'custom_report',
      EXPORT_DATA: 'export_data',
    };

    this.priorities = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      URGENT: 4,
    };

    this.initialize();
  }

  /**
   * Inicializar sistema de filas
   */
  async initialize() {
    try {
      await this.createJobsTable();
      await this.loadPendingJobs();
      this.startWorkers();
      this.startCleanupJob();

      logInfo('Report Queue initialized', {
        maxWorkers: this.maxWorkers,
        jobTimeout: this.jobTimeout,
      });
    } catch (error) {
      logError('Failed to initialize Report Queue', error);
    }
  }

  /**
   * Criar tabela de jobs
   */
  async createJobsTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS report_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 2,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
        parameters JSONB DEFAULT '{}',
        progress INTEGER DEFAULT 0,
        result JSONB,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        worker_id VARCHAR(50),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_report_jobs_priority ON report_jobs(priority DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_report_jobs_user_id ON report_jobs(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_report_jobs_created_at ON report_jobs(created_at DESC)
    `);
  }

  /**
   * Carregar jobs pendentes
   */
  async loadPendingJobs() {
    try {
      const pendingJobs = await getRows(`
        SELECT * FROM report_jobs 
        WHERE status IN ('pending', 'processing') 
        ORDER BY priority DESC, created_at ASC
      `);

      // Resetar jobs que estavam processando
      for (const job of pendingJobs) {
        if (job.status === 'processing') {
          await this.updateJobStatus(
            job.id,
            'pending',
            null,
            'Restarted after server restart'
          );
        }
      }

      logInfo('Loaded pending jobs', { count: pendingJobs.length });
    } catch (error) {
      logError('Failed to load pending jobs', error);
    }
  }

  /**
   * Adicionar job à fila
   */
  async addJob(options) {
    const {
      type,
      userId,
      municipalityId,
      parameters = {},
      priority = this.priorities.MEDIUM,
      expiresAt = null,
    } = options;

    try {
      const job = await getRow(
        `
        INSERT INTO report_jobs (
          type, user_id, municipality_id, parameters, priority, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          type,
          userId,
          municipalityId,
          JSON.stringify(parameters),
          priority,
          expiresAt,
        ]
      );

      logInfo('Job added to queue', {
        jobId: job.id,
        type,
        userId,
        priority,
      });

      // Notificar que job foi criado
      this.emit('job-created', job);

      // Tentar processar imediatamente se há workers disponíveis
      this.processNextJob();

      return job;
    } catch (error) {
      logError('Failed to add job to queue', error);
      throw error;
    }
  }

  /**
   * Iniciar workers
   */
  startWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = `worker-${i + 1}`;
      this.workers.set(workerId, {
        id: workerId,
        busy: false,
        currentJob: null,
        processedJobs: 0,
        startedAt: new Date(),
      });
    }

    // Processar jobs pendentes
    setInterval(() => {
      this.processNextJob();
    }, 5000); // Verificar a cada 5 segundos
  }

  /**
   * Processar próximo job
   */
  async processNextJob() {
    try {
      // Encontrar worker disponível
      const availableWorker = Array.from(this.workers.values()).find(
        worker => !worker.busy
      );

      if (!availableWorker) {
        return; // Todos os workers estão ocupados
      }

      // Buscar próximo job
      const job = await getRow(`
        SELECT * FROM report_jobs 
        WHERE status = 'pending' 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `);

      if (!job) {
        return; // Não há jobs pendentes
      }

      // Marcar worker como ocupado
      availableWorker.busy = true;
      availableWorker.currentJob = job.id;

      // Atualizar status do job
      await this.updateJobStatus(job.id, 'processing', availableWorker.id);

      // Processar job
      this.processJob(job, availableWorker);
    } catch (error) {
      logError('Error processing next job', error);
    }
  }

  /**
   * Processar job específico
   */
  async processJob(job, worker) {
    const startTime = Date.now();

    try {
      logInfo('Processing job', {
        jobId: job.id,
        type: job.type,
        workerId: worker.id,
      });

      // Configurar timeout
      const timeoutId = setTimeout(() => {
        this.handleJobTimeout(job.id, worker.id);
      }, this.jobTimeout);

      // Processar baseado no tipo
      let result;
      switch (job.type) {
        case this.reportTypes.PATRIMONY_SUMMARY:
          result = await this.generatePatrimonySummary(job);
          break;
        case this.reportTypes.DEPRECIATION_REPORT:
          result = await this.generateDepreciationReport(job);
          break;
        case this.reportTypes.TRANSFER_HISTORY:
          result = await this.generateTransferHistory(job);
          break;
        case this.reportTypes.INVENTORY_REPORT:
          result = await this.generateInventoryReport(job);
          break;
        case this.reportTypes.EXPORT_DATA:
          result = await this.generateDataExport(job);
          break;
        default:
          throw new Error(`Unknown report type: ${job.type}`);
      }

      clearTimeout(timeoutId);

      // Marcar como completo
      await this.completeJob(job.id, result);

      const duration = Date.now() - startTime;
      logPerformance('Job completed', duration, {
        jobId: job.id,
        type: job.type,
        workerId: worker.id,
      });

      // Notificar usuário
      await this.notifyJobCompletion(job, result);
    } catch (error) {
      logError('Job processing failed', error, {
        jobId: job.id,
        type: job.type,
        workerId: worker.id,
      });

      await this.handleJobError(job.id, error);
    } finally {
      // Liberar worker
      worker.busy = false;
      worker.currentJob = null;
      worker.processedJobs++;
    }
  }

  /**
   * Gerar relatório de patrimônios
   */
  async generatePatrimonySummary(job) {
    const { municipalityId, filters = {} } = JSON.parse(job.parameters);

    // Simular progresso
    await this.updateJobProgress(job.id, 10);

    // Buscar dados
    let whereClause = 'WHERE p.municipality_id = $1';
    const params = [municipalityId];
    let paramIndex = 2;

    if (filters.sectorId) {
      whereClause += ` AND p.sector_id = $${paramIndex}`;
      params.push(filters.sectorId);
      paramIndex++;
    }

    if (filters.dateFrom) {
      whereClause += ` AND p.created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      whereClause += ` AND p.created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    await this.updateJobProgress(job.id, 30);

    const summary = await getRow(
      `
      SELECT 
        COUNT(*) as total_patrimonios,
        SUM(valor_aquisicao) as valor_total,
        AVG(valor_aquisicao) as valor_medio,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as inativos,
        COUNT(CASE WHEN situacao_bem = 'bom' THEN 1 END) as bom_estado,
        COUNT(CASE WHEN situacao_bem = 'regular' THEN 1 END) as estado_regular,
        COUNT(CASE WHEN situacao_bem = 'ruim' THEN 1 END) as estado_ruim
      FROM patrimonios p
      ${whereClause}
    `,
      params
    );

    await this.updateJobProgress(job.id, 60);

    const byType = await getRows(
      `
      SELECT 
        tipo,
        COUNT(*) as quantidade,
        SUM(valor_aquisicao) as valor_total
      FROM patrimonios p
      ${whereClause}
      GROUP BY tipo
      ORDER BY quantidade DESC
    `,
      params
    );

    await this.updateJobProgress(job.id, 80);

    const bySector = await getRows(
      `
      SELECT 
        s.name as setor_nome,
        COUNT(*) as quantidade,
        SUM(p.valor_aquisicao) as valor_total
      FROM patrimonios p
      LEFT JOIN sectors s ON p.sector_id = s.id
      ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY quantidade DESC
    `,
      params
    );

    await this.updateJobProgress(job.id, 100);

    return {
      summary,
      byType,
      bySector,
      filters,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar relatório de depreciação
   */
  async generateDepreciationReport(job) {
    const { municipalityId, year = new Date().getFullYear() } = JSON.parse(
      job.parameters
    );

    await this.updateJobProgress(job.id, 20);

    const depreciationData = await getRows(
      `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao,
        p.valor_aquisicao,
        p.valor_residual,
        p.vida_util_anos,
        p.metodo_depreciacao,
        p.data_aquisicao,
        s.name as setor_nome,
        CASE 
          WHEN p.vida_util_anos > 0 THEN 
            GREATEST(0, p.valor_aquisicao - p.valor_residual) * 
            LEAST(EXTRACT(YEAR FROM AGE(NOW(), p.data_aquisicao)), p.vida_util_anos) / 
            p.vida_util_anos
          ELSE 0
        END as depreciacao_acumulada,
        CASE 
          WHEN p.vida_util_anos > 0 THEN 
            p.valor_aquisicao - (
              GREATEST(0, p.valor_aquisicao - p.valor_residual) * 
              LEAST(EXTRACT(YEAR FROM AGE(NOW(), p.data_aquisicao)), p.vida_util_anos) / 
              p.vida_util_anos
            )
          ELSE p.valor_aquisicao
        END as valor_atual
      FROM patrimonios p
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.municipality_id = $1
        AND p.data_aquisicao IS NOT NULL
        AND p.valor_aquisicao > 0
      ORDER BY p.data_aquisicao DESC
    `,
      [municipalityId]
    );

    await this.updateJobProgress(job.id, 100);

    const totals = depreciationData.reduce(
      (acc, item) => {
        acc.valorOriginal += parseFloat(item.valor_aquisicao) || 0;
        acc.depreciacao += parseFloat(item.depreciacao_acumulada) || 0;
        acc.valorAtual += parseFloat(item.valor_atual) || 0;
        return acc;
      },
      { valorOriginal: 0, depreciacao: 0, valorAtual: 0 }
    );

    return {
      year,
      items: depreciationData,
      totals,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar histórico de transferências
   */
  async generateTransferHistory(job) {
    const { municipalityId, dateFrom, dateTo } = JSON.parse(job.parameters);

    await this.updateJobProgress(job.id, 30);

    const transfers = await getRows(
      `
      SELECT 
        t.*,
        p.numero_patrimonio,
        p.descricao as patrimonio_descricao,
        sf.name as setor_origem,
        st.name as setor_destino,
        u.name as usuario_nome
      FROM transfers t
      LEFT JOIN patrimonios p ON t.patrimonio_id = p.id
      LEFT JOIN sectors sf ON t.from_sector_id = sf.id
      LEFT JOIN sectors st ON t.to_sector_id = st.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.municipality_id = $1
        AND t.created_at >= $2
        AND t.created_at <= $3
      ORDER BY t.created_at DESC
    `,
      [municipalityId, dateFrom, dateTo]
    );

    await this.updateJobProgress(job.id, 100);

    return {
      transfers,
      period: { from: dateFrom, to: dateTo },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar relatório de inventário
   */
  async generateInventoryReport(job) {
    const { inventoryId } = JSON.parse(job.parameters);

    await this.updateJobProgress(job.id, 25);

    const inventory = await getRow(
      `
      SELECT * FROM inventories WHERE id = $1
    `,
      [inventoryId]
    );

    if (!inventory) {
      throw new Error('Inventory not found');
    }

    await this.updateJobProgress(job.id, 50);

    const items = await getRows(
      `
      SELECT 
        ii.*,
        p.numero_patrimonio,
        p.descricao,
        p.valor_aquisicao,
        s.name as setor_nome
      FROM inventory_items ii
      LEFT JOIN patrimonios p ON ii.patrimonio_id = p.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE ii.inventory_id = $1
      ORDER BY ii.status, p.numero_patrimonio
    `,
      [inventoryId]
    );

    await this.updateJobProgress(job.id, 100);

    const summary = items.reduce(
      (acc, item) => {
        acc.total++;
        if (item.status === 'found') acc.found++;
        if (item.status === 'not_found') acc.notFound++;
        if (item.status === 'damaged') acc.damaged++;
        return acc;
      },
      { total: 0, found: 0, notFound: 0, damaged: 0 }
    );

    return {
      inventory,
      items,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar exportação de dados
   */
  async generateDataExport(job) {
    const {
      type,
      municipalityId,
      format = 'json',
    } = JSON.parse(job.parameters);

    let data;
    switch (type) {
      case 'patrimonios':
        await this.updateJobProgress(job.id, 30);
        data = await getRows(
          `
          SELECT 
            p.*,
            s.name as setor_nome,
            l.name as local_nome
          FROM patrimonios p
          LEFT JOIN sectors s ON p.sector_id = s.id
          LEFT JOIN locals l ON p.local_id = l.id
          WHERE p.municipality_id = $1
          ORDER BY p.created_at DESC
        `,
          [municipalityId]
        );
        break;

      case 'users':
        await this.updateJobProgress(job.id, 30);
        data = await getRows(
          `
          SELECT 
            id, name, email, role, created_at, updated_at
          FROM users
          WHERE municipality_id = $1
          ORDER BY name
        `,
          [municipalityId]
        );
        break;

      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    await this.updateJobProgress(job.id, 80);

    // Aqui você poderia converter para outros formatos (CSV, Excel, etc.)
    let result = { data, format, type };

    if (format === 'csv') {
      result.csvData = this.convertToCSV(data);
    }

    await this.updateJobProgress(job.id, 100);

    return result;
  }

  /**
   * Converter dados para CSV
   */
  convertToCSV(data) {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value}"` : value;
          })
          .join(',')
      ),
    ].join('\n');

    return csv;
  }

  /**
   * Atualizar status do job
   */
  async updateJobStatus(jobId, status, workerId = null, errorMessage = null) {
    const updates = ['status = $2'];
    const params = [jobId, status];
    let paramIndex = 3;

    if (workerId !== null) {
      updates.push(`worker_id = $${paramIndex}`);
      params.push(workerId);
      paramIndex++;
    }

    if (status === 'processing') {
      updates.push(`started_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex}`);
      params.push(errorMessage);
      paramIndex++;
    }

    await query(
      `
      UPDATE report_jobs 
      SET ${updates.join(', ')}
      WHERE id = $1
    `,
      params
    );

    // Emitir evento de atualização
    this.emit('job-updated', { jobId, status, workerId });

    // Notificar via WebSocket
    const job = await this.getJob(jobId);
    if (job && job.user_id) {
      websocketServer.sendNotificationToUser(job.user_id, {
        type: 'job_update',
        jobId,
        status,
        progress: job.progress,
      });
    }
  }

  /**
   * Atualizar progresso do job
   */
  async updateJobProgress(jobId, progress) {
    await query(
      `
      UPDATE report_jobs 
      SET progress = $2
      WHERE id = $1
    `,
      [jobId, progress]
    );

    // Emitir evento de progresso
    this.emit('job-progress', { jobId, progress });

    // Notificar via WebSocket
    const job = await this.getJob(jobId);
    if (job && job.user_id) {
      websocketServer.sendNotificationToUser(job.user_id, {
        type: 'job_progress',
        jobId,
        progress,
      });
    }
  }

  /**
   * Completar job
   */
  async completeJob(jobId, result) {
    await query(
      `
      UPDATE report_jobs 
      SET status = 'completed', 
          result = $2, 
          progress = 100,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [jobId, JSON.stringify(result)]
    );

    this.emit('job-completed', { jobId, result });
  }

  /**
   * Lidar com erro no job
   */
  async handleJobError(jobId, error) {
    const job = await this.getJob(jobId);

    if (job.retry_count < this.maxRetries) {
      // Tentar novamente
      await query(
        `
        UPDATE report_jobs 
        SET status = 'pending',
            retry_count = retry_count + 1,
            error_message = $2,
            worker_id = NULL
        WHERE id = $1
      `,
        [jobId, error.message]
      );

      logWarning('Job will be retried', {
        jobId,
        retryCount: job.retry_count + 1,
        error: error.message,
      });
    } else {
      // Marcar como falha permanente
      await query(
        `
        UPDATE report_jobs 
        SET status = 'failed',
            error_message = $2,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [jobId, error.message]
      );

      this.emit('job-failed', { jobId, error: error.message });
    }
  }

  /**
   * Lidar com timeout do job
   */
  async handleJobTimeout(jobId, workerId) {
    logWarning('Job timeout', { jobId, workerId });
    await this.handleJobError(jobId, new Error('Job timeout'));
  }

  /**
   * Notificar conclusão do job
   */
  async notifyJobCompletion(job, result) {
    try {
      await notificationManager.createNotification({
        userId: job.user_id,
        municipalityId: job.municipality_id,
        type: 'report',
        priority: 'medium',
        title: 'Relatório concluído',
        message: `O relatório "${job.type}" foi gerado com sucesso.`,
        data: { jobId: job.id, type: job.type },
        actionUrl: `/reports/job/${job.id}`,
        actionLabel: 'Ver relatório',
      });
    } catch (error) {
      logError('Failed to notify job completion', error);
    }
  }

  /**
   * Obter job por ID
   */
  async getJob(jobId) {
    return await getRow('SELECT * FROM report_jobs WHERE id = $1', [jobId]);
  }

  /**
   * Obter jobs do usuário
   */
  async getUserJobs(userId, options = {}) {
    const { limit = 20, offset = 0, status = null } = options;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    return await getRows(
      `
      SELECT * FROM report_jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      [...params, limit, offset]
    );
  }

  /**
   * Cancelar job
   */
  async cancelJob(jobId, userId) {
    const job = await this.getJob(jobId);

    if (!job || job.user_id !== userId) {
      throw new Error('Job not found or not authorized');
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error('Job cannot be cancelled');
    }

    await query(
      `
      UPDATE report_jobs 
      SET status = 'cancelled',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [jobId]
    );

    this.emit('job-cancelled', { jobId });
    return true;
  }

  /**
   * Limpar jobs antigos
   */
  async cleanupExpiredJobs() {
    const result = await query(`
      DELETE FROM report_jobs 
      WHERE expires_at < NOW()
    `);

    if (result.rowCount > 0) {
      logInfo('Expired jobs cleaned up', { count: result.rowCount });
    }

    return result.rowCount;
  }

  /**
   * Iniciar job de limpeza
   */
  startCleanupJob() {
    setInterval(async () => {
      try {
        await this.cleanupExpiredJobs();
      } catch (error) {
        logError('Cleanup job failed', error);
      }
    }, this.cleanupInterval);
  }

  /**
   * Obter estatísticas da fila
   */
  getQueueStats() {
    const workers = Array.from(this.workers.values());
    const busyWorkers = workers.filter(w => w.busy).length;

    return {
      workers: {
        total: this.maxWorkers,
        busy: busyWorkers,
        available: this.maxWorkers - busyWorkers,
      },
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedJobs.size,
    };
  }
}

// Instância singleton
export const reportQueue = new ReportQueue();

export default reportQueue;
