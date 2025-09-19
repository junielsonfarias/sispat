import cron from 'node-cron';
import { getRows, pool, query } from '../database/connection.js';
import { logError, logInfo, logSecurity, logWarning } from '../utils/logger.js';

/**
 * Gerenciador avançado de lockout de usuários
 * - Desbloqueio automático
 * - Logs de segurança
 * - Notificações
 * - Análise de tentativas suspeitas
 */
export class LockoutManager {
  constructor() {
    this.config = {
      maxAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutos em ms
      cleanupInterval: '*/5 * * * *', // A cada 5 minutos
      suspiciousThreshold: 3, // 3 lockouts em 24h é suspeito
      notificationEnabled: true,
    };
    this.initialized = false;
  }

  /**
   * Inicializar o gerenciador de lockout
   */
  async initialize() {
    if (this.initialized) return;

    try {
      if (!pool) {
        logWarning(
          '⚠️ Pool de banco de dados não disponível - Gerenciador de lockout desabilitado'
        );
        return;
      }

      // Criar tabela de histórico de tentativas se não existir
      await this.createLoginAttemptsTable();

      // Iniciar job de limpeza automática
      this.startCleanupJob();

      this.initialized = true;
      logInfo('✅ Gerenciador de lockout inicializado', {
        maxAttempts: this.config.maxAttempts,
        lockoutDuration: `${this.config.lockoutDuration / 60000} minutos`,
        cleanupInterval: this.config.cleanupInterval,
      });
    } catch (error) {
      logError('Erro ao inicializar gerenciador de lockout', error);
      throw error;
    }
  }

  /**
   * Criar tabela de histórico de tentativas de login
   */
  async createLoginAttemptsTable() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          email VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          success BOOLEAN DEFAULT FALSE,
          failure_reason VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          municipality_id UUID REFERENCES municipalities(id)
        )
      `);

      // Criar índices para performance
      await query(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id 
        ON login_attempts(user_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_email 
        ON login_attempts(email)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
        ON login_attempts(ip_address)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at 
        ON login_attempts(created_at)
      `);

      logInfo('Tabela login_attempts verificada/criada com sucesso');
    } catch (error) {
      logError('Erro ao criar tabela login_attempts', error);
      throw error;
    }
  }

  /**
   * Registrar tentativa de login
   */
  async recordLoginAttempt(data) {
    try {
      const {
        userId,
        email,
        ipAddress,
        userAgent,
        success = false,
        failureReason = null,
        municipalityId = null,
      } = data;

      await query(
        `
        INSERT INTO login_attempts 
        (user_id, email, ip_address, user_agent, success, failure_reason, municipality_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          userId,
          email,
          ipAddress,
          userAgent,
          success,
          failureReason,
          municipalityId,
        ]
      );

      // Log de segurança
      if (!success) {
        logSecurity('Login attempt failed', 'warn', {
          email,
          ipAddress,
          userAgent,
          failureReason,
          municipalityId,
        });
      }
    } catch (error) {
      logError('Erro ao registrar tentativa de login', error, data);
    }
  }

  /**
   * Processar tentativa de login falhada
   */
  async handleFailedLogin(
    user,
    ipAddress,
    userAgent,
    failureReason = 'invalid_credentials'
  ) {
    try {
      const newFailedAttempts = (user.login_attempts || 0) + 1;
      let lockoutUntil = null;
      let isLocked = false;

      // Registrar tentativa
      await this.recordLoginAttempt({
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        success: false,
        failureReason,
        municipalityId: user.municipality_id,
      });

      // Verificar se deve bloquear
      if (newFailedAttempts >= this.config.maxAttempts) {
        lockoutUntil = new Date(Date.now() + this.config.lockoutDuration);
        isLocked = true;

        // Log de segurança crítico
        logSecurity(
          'User account locked due to multiple failed attempts',
          'error',
          {
            userId: user.id,
            email: user.email,
            ipAddress,
            failedAttempts: newFailedAttempts,
            lockoutUntil,
            municipality: user.municipality_id,
          }
        );

        // Verificar se é suspeito (múltiplos lockouts)
        await this.checkSuspiciousActivity(user.id, user.email, ipAddress);

        // Enviar notificação (se habilitado)
        if (this.config.notificationEnabled) {
          await this.sendLockoutNotification(user, lockoutUntil, ipAddress);
        }
      }

      // Atualizar usuário no banco
      await query(
        'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newFailedAttempts, lockoutUntil, user.id]
      );

      return {
        isLocked,
        remainingAttempts: Math.max(
          0,
          this.config.maxAttempts - newFailedAttempts
        ),
        lockoutUntil,
        failedAttempts: newFailedAttempts,
      };
    } catch (error) {
      logError('Erro ao processar login falhado', error, {
        userId: user.id,
        email: user.email,
      });
      throw error;
    }
  }

  /**
   * Processar login bem-sucedido
   */
  async handleSuccessfulLogin(user, ipAddress, userAgent) {
    try {
      // Registrar tentativa bem-sucedida
      await this.recordLoginAttempt({
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        success: true,
        municipalityId: user.municipality_id,
      });

      // Reset tentativas se necessário
      if (user.login_attempts > 0 || user.locked_until) {
        await query(
          'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
          [user.id]
        );

        logInfo('Login attempts reset for user', {
          userId: user.id,
          email: user.email,
          previousAttempts: user.login_attempts,
        });
      }

      // Log de segurança para login bem-sucedido
      logSecurity('User login successful', 'info', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress,
        municipality: user.municipality_id,
      });
    } catch (error) {
      logError('Erro ao processar login bem-sucedido', error, {
        userId: user.id,
      });
    }
  }

  /**
   * Verificar atividade suspeita
   */
  async checkSuspiciousActivity(userId, email, ipAddress) {
    try {
      // Verificar lockouts nas últimas 24 horas
      const lockouts = await getRows(
        `
        SELECT COUNT(*) as lockout_count
        FROM login_attempts 
        WHERE (user_id = $1 OR email = $2 OR ip_address = $3)
        AND success = false 
        AND created_at > NOW() - INTERVAL '24 hours'
      `,
        [userId, email, ipAddress]
      );

      const lockoutCount = parseInt(lockouts[0]?.lockout_count || 0);

      if (lockoutCount >= this.config.suspiciousThreshold) {
        logSecurity('Suspicious login activity detected', 'error', {
          userId,
          email,
          ipAddress,
          lockoutCount,
          threshold: this.config.suspiciousThreshold,
          timeframe: '24 hours',
        });

        // TODO: Implementar notificação para administradores
        // await this.notifyAdmins('suspicious_activity', { userId, email, ipAddress, lockoutCount })
      }
    } catch (error) {
      logError('Erro ao verificar atividade suspeita', error);
    }
  }

  /**
   * Enviar notificação de lockout
   */
  async sendLockoutNotification(user, lockoutUntil, ipAddress) {
    try {
      // Por enquanto apenas log - pode ser expandido para email
      logInfo('Lockout notification sent', {
        userId: user.id,
        email: user.email,
        lockoutUntil,
        ipAddress,
        message:
          'Sua conta foi temporariamente bloqueada devido a múltiplas tentativas de login',
      });

      // TODO: Implementar envio de email
      // await emailService.sendLockoutNotification(user.email, lockoutUntil)
    } catch (error) {
      logError('Erro ao enviar notificação de lockout', error);
    }
  }

  /**
   * Desbloqueio automático de usuários
   */
  async unlockExpiredUsers() {
    try {
      const result = await query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL 
        WHERE locked_until IS NOT NULL 
        AND locked_until < NOW()
        RETURNING id, email, name
      `);

      if (result.rowCount > 0) {
        logInfo('Usuários desbloqueados automaticamente', {
          count: result.rowCount,
          users: result.rows.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
          })),
        });

        // Log de segurança para cada usuário desbloqueado
        for (const user of result.rows) {
          logSecurity('User automatically unlocked', 'info', {
            userId: user.id,
            email: user.email,
            name: user.name,
            reason: 'lockout_expired',
          });
        }
      }

      return result.rowCount;
    } catch (error) {
      logError('Erro no desbloqueio automático', error);
      return 0;
    }
  }

  /**
   * Desbloqueio manual por administrador
   */
  async unlockUser(userId, adminUserId, reason = 'admin_unlock') {
    try {
      // Verificar se usuário existe e está bloqueado
      const user = await query(
        'SELECT id, email, name, locked_until, login_attempts FROM users WHERE id = $1',
        [userId]
      );

      if (user.rowCount === 0) {
        throw new Error('Usuário não encontrado');
      }

      const userData = user.rows[0];

      if (!userData.locked_until && userData.login_attempts === 0) {
        throw new Error('Usuário não está bloqueado');
      }

      // Desbloquear usuário
      await query(
        'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
        [userId]
      );

      // Log de segurança
      logSecurity('User manually unlocked by admin', 'warn', {
        userId,
        userEmail: userData.email,
        adminUserId,
        reason,
        previousAttempts: userData.login_attempts,
        previousLockout: userData.locked_until,
      });

      logInfo('Usuário desbloqueado manualmente', {
        userId,
        userEmail: userData.email,
        adminUserId,
        reason,
      });

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
        },
      };
    } catch (error) {
      logError('Erro no desbloqueio manual', error, { userId, adminUserId });
      throw error;
    }
  }

  /**
   * Obter estatísticas de lockout
   */
  async getLockoutStats(timeframe = '24 hours') {
    try {
      const stats = await getRows(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(*) FILTER (WHERE success = false) as failed_attempts,
          COUNT(*) FILTER (WHERE success = true) as successful_attempts,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM login_attempts 
        WHERE created_at > NOW() - INTERVAL '${timeframe}'
      `);

      const lockedUsers = await getRows(`
        SELECT COUNT(*) as locked_count
        FROM users 
        WHERE locked_until IS NOT NULL AND locked_until > NOW()
      `);

      return {
        timeframe,
        totalAttempts: parseInt(stats[0]?.total_attempts || 0),
        failedAttempts: parseInt(stats[0]?.failed_attempts || 0),
        successfulAttempts: parseInt(stats[0]?.successful_attempts || 0),
        uniqueUsers: parseInt(stats[0]?.unique_users || 0),
        uniqueIPs: parseInt(stats[0]?.unique_ips || 0),
        currentlyLocked: parseInt(lockedUsers[0]?.locked_count || 0),
      };
    } catch (error) {
      logError('Erro ao obter estatísticas de lockout', error);
      return null;
    }
  }

  /**
   * Iniciar job de limpeza automática
   */
  startCleanupJob() {
    cron.schedule(
      this.config.cleanupInterval,
      async () => {
        try {
          const unlockedCount = await this.unlockExpiredUsers();

          if (unlockedCount > 0) {
            logInfo('Cleanup job executado', {
              unlockedUsers: unlockedCount,
              nextRun: 'em 5 minutos',
            });
          }

          // Limpar tentativas antigas (mais de 30 dias)
          const cleanupResult = await query(`
          DELETE FROM login_attempts 
          WHERE created_at < NOW() - INTERVAL '30 days'
        `);

          if (cleanupResult.rowCount > 0) {
            logInfo('Tentativas antigas removidas', {
              removedRecords: cleanupResult.rowCount,
            });
          }
        } catch (error) {
          logError('Erro no job de limpeza', error);
        }
      },
      {
        scheduled: true,
        timezone: 'America/Sao_Paulo',
      }
    );

    logInfo('Job de limpeza de lockout agendado', {
      interval: this.config.cleanupInterval,
      timezone: 'America/Sao_Paulo',
    });
  }

  /**
   * Parar jobs de limpeza
   */
  stop() {
    // Implementar se necessário
    logInfo('Gerenciador de lockout parado');
  }
}

// Instância singleton
export const lockoutManager = new LockoutManager();

export default lockoutManager;
