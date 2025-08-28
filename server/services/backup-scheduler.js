import cron from 'node-cron'
import { backupManager } from '../database/backup-enhanced.js'
import { logError, logInfo, logWarning } from '../utils/logger.js'

/**
 * Serviço de agendamento automático de backups
 */
export class BackupScheduler {
  constructor() {
    this.jobs = new Map()
    this.isRunning = false
  }

  /**
   * Iniciar serviço de agendamento
   */
  start() {
    if (this.isRunning) {
      logWarning('Backup scheduler já está rodando')
      return
    }

    try {
      logInfo('🚀 Iniciando serviço de agendamento de backups')

      // Backup diário às 02:00
      const dailyJob = cron.schedule('0 2 * * *', async () => {
        await this.executeDailyBackup()
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      })

      // Backup semanal aos domingos às 03:00
      const weeklyJob = cron.schedule('0 3 * * 0', async () => {
        await this.executeWeeklyBackup()
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      })

      // Backup mensal no primeiro dia do mês às 04:00
      const monthlyJob = cron.schedule('0 4 1 * *', async () => {
        await this.executeMonthlyBackup()
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      })

      // Limpeza de backups antigos às 05:00 todo dia
      const cleanupJob = cron.schedule('0 5 * * *', async () => {
        await this.executeCleanup()
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      })

      // Verificação de integridade às 01:00 (antes do backup diário)
      const verificationJob = cron.schedule('0 1 * * *', async () => {
        await this.executeVerification()
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      })

      // Armazenar jobs
      this.jobs.set('daily', dailyJob)
      this.jobs.set('weekly', weeklyJob)
      this.jobs.set('monthly', monthlyJob)
      this.jobs.set('cleanup', cleanupJob)
      this.jobs.set('verification', verificationJob)

      // Iniciar todos os jobs
      this.jobs.forEach((job, name) => {
        job.start()
        logInfo(`Job agendado: ${name}`, { schedule: this.getJobSchedule(name) })
      })

      this.isRunning = true
      
      logInfo('✅ Serviço de agendamento de backups iniciado', {
        jobs: Array.from(this.jobs.keys()),
        timezone: 'America/Sao_Paulo'
      })

      // Executar backup inicial se não houver backups recentes
      setTimeout(() => this.checkInitialBackup(), 5000)

    } catch (error) {
      logError('Erro ao iniciar serviço de agendamento', error)
      throw error
    }
  }

  /**
   * Parar serviço de agendamento
   */
  stop() {
    if (!this.isRunning) {
      logWarning('Backup scheduler não está rodando')
      return
    }

    try {
      logInfo('🛑 Parando serviço de agendamento de backups')

      this.jobs.forEach((job, name) => {
        job.stop()
        logInfo(`Job parado: ${name}`)
      })

      this.jobs.clear()
      this.isRunning = false

      logInfo('✅ Serviço de agendamento parado')

    } catch (error) {
      logError('Erro ao parar serviço de agendamento', error)
    }
  }

  /**
   * Verificar se precisa fazer backup inicial
   */
  async checkInitialBackup() {
    try {
      const backups = await backupManager.listAllBackups()
      const now = new Date()
      
      // Verificar se há backup nas últimas 24 horas
      const recentBackup = backups.find(backup => {
        const age = now - new Date(backup.created)
        return age < 24 * 60 * 60 * 1000 // 24 horas em ms
      })

      if (!recentBackup) {
        logInfo('🔄 Nenhum backup recente encontrado - executando backup inicial')
        await this.executeDailyBackup()
      } else {
        logInfo('✅ Backup recente encontrado', { 
          file: recentBackup.filename,
          age: Math.round((now - new Date(recentBackup.created)) / (1000 * 60 * 60)) + 'h'
        })
      }

    } catch (error) {
      logError('Erro ao verificar backup inicial', error)
    }
  }

  /**
   * Executar backup diário
   */
  async executeDailyBackup() {
    const startTime = Date.now()
    
    try {
      logInfo('📅 Executando backup diário agendado')
      
      const result = await backupManager.createPgDumpBackup('daily')
      
      if (result.success) {
        logInfo('✅ Backup diário concluído com sucesso', {
          filename: result.filename,
          size: result.size,
          duration: result.duration
        })

        // Testar restore se configurado
        if (backupManager.config.testRestore) {
          await this.testBackupRestore(result.filename)
        }

        // Enviar notificação de sucesso (se configurado)
        await this.sendNotification('success', 'daily', result)

      } else {
        throw new Error('Backup falhou')
      }

    } catch (error) {
      const duration = Date.now() - startTime
      
      logError('❌ Falha no backup diário', error, { duration })
      
      // Enviar notificação de falha
      await this.sendNotification('failure', 'daily', { error: error.message, duration })
      
      // Tentar backup JSON como fallback
      await this.tryFallbackBackup('daily')
    }
  }

  /**
   * Executar backup semanal
   */
  async executeWeeklyBackup() {
    try {
      logInfo('📅 Executando backup semanal agendado')
      
      const result = await backupManager.createPgDumpBackup('weekly')
      
      if (result.success) {
        logInfo('✅ Backup semanal concluído', {
          filename: result.filename,
          size: result.size
        })

        await this.sendNotification('success', 'weekly', result)
      }

    } catch (error) {
      logError('❌ Falha no backup semanal', error)
      await this.sendNotification('failure', 'weekly', { error: error.message })
      await this.tryFallbackBackup('weekly')
    }
  }

  /**
   * Executar backup mensal
   */
  async executeMonthlyBackup() {
    try {
      logInfo('📅 Executando backup mensal agendado')
      
      const result = await backupManager.createPgDumpBackup('monthly')
      
      if (result.success) {
        logInfo('✅ Backup mensal concluído', {
          filename: result.filename,
          size: result.size
        })

        await this.sendNotification('success', 'monthly', result)
      }

    } catch (error) {
      logError('❌ Falha no backup mensal', error)
      await this.sendNotification('failure', 'monthly', { error: error.message })
      await this.tryFallbackBackup('monthly')
    }
  }

  /**
   * Executar limpeza de backups antigos
   */
  async executeCleanup() {
    try {
      logInfo('🧹 Executando limpeza de backups antigos')
      
      const result = await backupManager.cleanupOldBackups()
      
      logInfo('✅ Limpeza concluída', {
        deleted: result.deleted,
        freedSpace: result.freedSpace
      })

    } catch (error) {
      logError('❌ Erro na limpeza de backups', error)
    }
  }

  /**
   * Executar verificação de integridade
   */
  async executeVerification() {
    try {
      logInfo('🔍 Executando verificação de integridade dos backups')
      
      const backups = await backupManager.listAllBackups()
      const recentBackups = backups.slice(0, 3) // Verificar os 3 mais recentes
      
      let verifiedCount = 0
      let failedCount = 0
      
      for (const backup of recentBackups) {
        try {
          if (backup.type === 'pg_dump') {
            const testResult = await backupManager.testRestore(backup.filename)
            
            if (testResult.success) {
              verifiedCount++
              logInfo('✅ Backup verificado', { file: backup.filename })
            } else {
              failedCount++
              logWarning('⚠️ Backup com problema', { 
                file: backup.filename, 
                error: testResult.error 
              })
            }
          }
        } catch (error) {
          failedCount++
          logError('❌ Erro ao verificar backup', error, { file: backup.filename })
        }
      }
      
      logInfo('Verificação de integridade concluída', {
        verified: verifiedCount,
        failed: failedCount,
        total: recentBackups.length
      })

      if (failedCount > 0) {
        await this.sendNotification('verification_failed', 'integrity', {
          verified: verifiedCount,
          failed: failedCount
        })
      }

    } catch (error) {
      logError('❌ Erro na verificação de integridade', error)
    }
  }

  /**
   * Tentar backup de fallback (JSON)
   */
  async tryFallbackBackup(type) {
    try {
      logWarning(`🔄 Tentando backup de fallback (JSON) para ${type}`)
      
      const result = await backupManager.createJsonBackup(type + '_fallback')
      
      if (result.success) {
        logInfo('✅ Backup de fallback concluído', {
          filename: result.filename,
          size: result.size
        })

        await this.sendNotification('fallback_success', type, result)
      }

    } catch (error) {
      logError('❌ Falha no backup de fallback', error)
      await this.sendNotification('fallback_failure', type, { error: error.message })
    }
  }

  /**
   * Testar restore de backup
   */
  async testBackupRestore(filename) {
    try {
      logInfo('🧪 Testando restore do backup', { filename })
      
      const testResult = await backupManager.testRestore(filename)
      
      if (testResult.success) {
        logInfo('✅ Teste de restore bem-sucedido', {
          filename,
          duration: testResult.duration,
          tables: testResult.verification?.totalTables
        })
      } else {
        logWarning('⚠️ Teste de restore falhou', {
          filename,
          error: testResult.error
        })
      }

      return testResult

    } catch (error) {
      logError('❌ Erro no teste de restore', error, { filename })
      return { success: false, error: error.message }
    }
  }

  /**
   * Enviar notificação
   */
  async sendNotification(type, backupType, data) {
    try {
      // Por enquanto apenas log - pode ser expandido para email/Slack/etc
      const messages = {
        success: `✅ Backup ${backupType} concluído com sucesso`,
        failure: `❌ Falha no backup ${backupType}`,
        fallback_success: `✅ Backup de fallback ${backupType} concluído`,
        fallback_failure: `❌ Falha no backup de fallback ${backupType}`,
        verification_failed: `⚠️ Verificação de integridade detectou problemas`
      }

      const message = messages[type] || `Notificação de backup: ${type}`
      
      logInfo('📧 Notificação de backup', {
        type,
        backupType,
        message,
        data
      })

      // TODO: Implementar envio de email/webhook se configurado
      // await this.sendEmailNotification(message, data)
      // await this.sendWebhookNotification(type, backupType, data)

    } catch (error) {
      logError('Erro ao enviar notificação', error)
    }
  }

  /**
   * Obter horário de agendamento de um job
   */
  getJobSchedule(jobName) {
    const schedules = {
      daily: '02:00 todos os dias',
      weekly: '03:00 aos domingos',
      monthly: '04:00 no primeiro dia do mês',
      cleanup: '05:00 todos os dias',
      verification: '01:00 todos os dias'
    }

    return schedules[jobName] || 'Não definido'
  }

  /**
   * Obter status do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()).map(name => ({
        name,
        schedule: this.getJobSchedule(name),
        isRunning: this.jobs.get(name)?.running || false
      })),
      nextRun: this.getNextRunTimes()
    }
  }

  /**
   * Obter próximos horários de execução
   */
  getNextRunTimes() {
    const now = new Date()
    const schedules = {
      daily: this.getNextCronTime('0 2 * * *', now),
      weekly: this.getNextCronTime('0 3 * * 0', now),
      monthly: this.getNextCronTime('0 4 1 * *', now),
      cleanup: this.getNextCronTime('0 5 * * *', now),
      verification: this.getNextCronTime('0 1 * * *', now)
    }

    return schedules
  }

  /**
   * Calcular próximo horário de execução de um cron
   */
  getNextCronTime(cronExpression, from) {
    try {
      // Implementação simplificada - pode usar biblioteca como node-cron-parser
      const now = new Date(from)
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      return tomorrow.toISOString()
    } catch (error) {
      return 'Erro ao calcular'
    }
  }
}

// Instância singleton
export const backupScheduler = new BackupScheduler()

// Função para iniciar o serviço automaticamente
export const startBackupService = () => {
  try {
    backupScheduler.start()
    return true
  } catch (error) {
    logError('Erro ao iniciar serviço de backup', error)
    return false
  }
}

// Função para parar o serviço
export const stopBackupService = () => {
  try {
    backupScheduler.stop()
    return true
  } catch (error) {
    logError('Erro ao parar serviço de backup', error)
    return false
  }
}

export default backupScheduler
