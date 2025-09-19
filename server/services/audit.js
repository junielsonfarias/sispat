import { pool } from '../database/connection.js';
import { logError, logInfo, logWarning } from '../utils/logger.js';

class AuditService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!pool) {
        logWarning(
          '⚠️ Pool de banco de dados não disponível - Serviço de auditoria desabilitado'
        );
        return;
      }

      // Criar tabela de auditoria se não existir
      await this.createAuditTable();
      this.isInitialized = true;
      logInfo('🔍 Serviço de auditoria inicializado com sucesso');
    } catch (error) {
      logError('Erro ao inicializar serviço de auditoria', error);
      throw error;
    }
  }

  async createAuditTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(100),
        resource_name VARCHAR(255),
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        municipality_id UUID REFERENCES municipalities(id),
        severity VARCHAR(20) DEFAULT 'info',
        category VARCHAR(50),
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await pool.query(createTableQuery);

    // Criar índices separadamente para evitar erro de sintaxe
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity)',
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        logError(`Erro ao criar índice: ${indexQuery}`, error);
      }
    }
  }

  async logAuditEvent({
    userId,
    userEmail,
    action,
    resourceType,
    resourceId,
    resourceName,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    municipalityId = null,
    severity = 'info',
    category = 'general',
    description = null,
    metadata = null,
  }) {
    if (!this.isInitialized) {
      logError('Serviço de auditoria não inicializado');
      return false;
    }

    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, user_email, action, resource_type, resource_id, resource_name,
          old_values, new_values, ip_address, user_agent, session_id, municipality_id,
          severity, category, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      const values = [
        userId,
        userEmail,
        action,
        resourceType,
        resourceId,
        resourceName,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        sessionId,
        municipalityId,
        severity,
        category,
        description,
        metadata ? JSON.stringify(metadata) : null,
      ];

      const result = await pool.query(query, values);

      logInfo('🔍 Evento de auditoria registrado', {
        action,
        resourceType,
        resourceId,
        severity,
        auditId: result.rows[0].id,
      });

      return result.rows[0].id;
    } catch (error) {
      logError('Erro ao registrar evento de auditoria', error);
      return false;
    }
  }

  async getAuditLogs({
    userId = null,
    action = null,
    resourceType = null,
    resourceId = null,
    severity = null,
    category = null,
    municipalityId = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
  } = {}) {
    try {
      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      if (userId) {
        whereConditions.push(`user_id = $${valueIndex++}`);
        values.push(userId);
      }

      if (action) {
        whereConditions.push(`action = $${valueIndex++}`);
        values.push(action);
      }

      if (resourceType) {
        whereConditions.push(`resource_type = $${valueIndex++}`);
        values.push(resourceType);
      }

      if (resourceId) {
        whereConditions.push(`resource_id = $${valueIndex++}`);
        values.push(resourceId);
      }

      if (severity) {
        whereConditions.push(`severity = $${valueIndex++}`);
        values.push(severity);
      }

      if (category) {
        whereConditions.push(`category = $${valueIndex++}`);
        values.push(category);
      }

      if (municipalityId) {
        whereConditions.push(`municipality_id = $${valueIndex++}`);
        values.push(municipalityId);
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${valueIndex++}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${valueIndex++}`);
        values.push(endDate);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(' AND ')}`
          : '';

      const query = `
        SELECT 
          id, user_id, user_email, action, resource_type, resource_id, resource_name,
          old_values, new_values, ip_address, user_agent, session_id, municipality_id,
          severity, category, description, metadata, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${valueIndex++} OFFSET $${valueIndex++}
      `;

      values.push(limit, offset);

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logError('Erro ao buscar logs de auditoria', error);
      throw error;
    }
  }

  async getAuditStats({
    municipalityId = null,
    startDate = null,
    endDate = null,
  } = {}) {
    try {
      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      if (municipalityId) {
        whereConditions.push(`municipality_id = $${valueIndex++}`);
        values.push(municipalityId);
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${valueIndex++}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${valueIndex++}`);
        values.push(endDate);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(' AND ')}`
          : '';

      const statsQuery = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action) as unique_actions,
          COUNT(DISTINCT resource_type) as unique_resources,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_events,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity_events,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity_events,
          COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_events
        FROM audit_logs
        ${whereClause}
      `;

      const actionsQuery = `
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;

      const resourcesQuery = `
        SELECT 
          resource_type,
          COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        GROUP BY resource_type
        ORDER BY count DESC
        LIMIT 10
      `;

      const [statsResult, actionsResult, resourcesResult] = await Promise.all([
        pool.query(statsQuery, values),
        pool.query(actionsQuery, values),
        pool.query(resourcesQuery, values),
      ]);

      return {
        summary: statsResult.rows[0],
        topActions: actionsResult.rows,
        topResources: resourcesResult.rows,
      };
    } catch (error) {
      logError('Erro ao buscar estatísticas de auditoria', error);
      throw error;
    }
  }

  async exportAuditLogs(format = 'csv', filters = {}) {
    try {
      const logs = await this.getAuditLogs({ ...filters, limit: 10000 });

      if (format === 'csv') {
        return this.convertToCSV(logs);
      } else if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        throw new Error('Formato não suportado');
      }
    } catch (error) {
      logError('Erro ao exportar logs de auditoria', error);
      throw error;
    }
  }

  convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'User ID',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Severity',
      'Category',
      'Description',
      'IP Address',
      'Created At',
    ];

    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.user_id || '',
        log.user_email || '',
        log.action,
        log.resource_type,
        log.resource_id || '',
        log.resource_name || '',
        log.severity,
        log.category,
        log.description || '',
        log.ip_address || '',
        log.created_at,
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  async cleanupOldLogs(retentionDays = 90) {
    try {
      const query = `
        DELETE FROM audit_logs 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      `;

      const result = await pool.query(query);

      logInfo('🧹 Limpeza de logs de auditoria concluída', {
        deletedCount: result.rowCount,
        retentionDays,
      });

      return result.rowCount;
    } catch (error) {
      logError('Erro ao limpar logs antigos de auditoria', error);
      throw error;
    }
  }

  // Métodos de conveniência para ações comuns
  async logUserLogin(userId, userEmail, ipAddress, userAgent, sessionId) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: userId,
      resourceName: userEmail,
      ipAddress,
      userAgent,
      sessionId,
      severity: 'info',
      category: 'authentication',
      description: 'Usuário fez login no sistema',
    });
  }

  async logUserLogout(userId, userEmail, sessionId) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
      resourceName: userEmail,
      sessionId,
      severity: 'info',
      category: 'authentication',
      description: 'Usuário fez logout do sistema',
    });
  }

  async logResourceCreated(
    userId,
    userEmail,
    resourceType,
    resourceId,
    resourceName,
    newValues,
    municipalityId = null
  ) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action: 'CREATE',
      resourceType,
      resourceId,
      resourceName,
      newValues,
      municipalityId,
      severity: 'info',
      category: 'data_management',
      description: `Novo ${resourceType} criado`,
    });
  }

  async logResourceUpdated(
    userId,
    userEmail,
    resourceType,
    resourceId,
    resourceName,
    oldValues,
    newValues,
    municipalityId = null
  ) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action: 'UPDATE',
      resourceType,
      resourceId,
      resourceName,
      oldValues,
      newValues,
      municipalityId,
      severity: 'info',
      category: 'data_management',
      description: `${resourceType} atualizado`,
    });
  }

  async logResourceDeleted(
    userId,
    userEmail,
    resourceType,
    resourceId,
    resourceName,
    oldValues,
    municipalityId = null
  ) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action: 'DELETE',
      resourceType,
      resourceId,
      resourceName,
      oldValues,
      municipalityId,
      severity: 'medium',
      category: 'data_management',
      description: `${resourceType} excluído`,
    });
  }

  async logSecurityEvent(
    userId,
    userEmail,
    action,
    description,
    severity = 'medium',
    metadata = null
  ) {
    return this.logAuditEvent({
      userId,
      userEmail,
      action,
      resourceType: 'SECURITY',
      resourceId: userId,
      resourceName: userEmail,
      severity,
      category: 'security',
      description,
      metadata,
    });
  }
}

// Instância singleton
const auditService = new AuditService();

export { auditService };
export default auditService;
