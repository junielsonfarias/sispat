import express from 'express'
import { backupManager } from '../database/backup-enhanced.js'
import { authenticateToken, requireSuperuser } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { backupScheduler } from '../services/backup-scheduler.js'
import { logInfo, logWarning } from '../utils/logger.js'

const router = express.Router()

// Aplicar autenticação a todas as rotas
router.use(authenticateToken)

// POST /backup-enhanced/create - Criar backup manual avançado
router.post('/create', requireSuperuser, asyncHandler(async (req, res) => {
  const { type = 'manual', method = 'pg_dump' } = req.body
  
  logInfo('Backup manual solicitado', {
    userId: req.user.id,
    type,
    method
  })
  
  let result
  
  if (method === 'pg_dump') {
    result = await backupManager.createPgDumpBackup(type)
  } else {
    result = await backupManager.createJsonBackup(type)
  }
  
  res.json({
    success: true,
    message: `Backup ${method} criado com sucesso`,
    data: result
  })
}))

// POST /backup-enhanced/test-restore/:filename - Testar restore de backup
router.post('/test-restore/:filename', requireSuperuser, asyncHandler(async (req, res) => {
  const { filename } = req.params
  
  logInfo('Teste de restore solicitado', {
    userId: req.user.id,
    filename
  })
  
  const result = await backupManager.testRestore(filename)
  
  res.json({
    success: true,
    message: 'Teste de restore concluído',
    data: result
  })
}))

// GET /backup-enhanced/list - Listar todos os backups com detalhes
router.get('/list', requireSuperuser, asyncHandler(async (req, res) => {
  const backups = await backupManager.listAllBackups()
  
  // Adicionar informações de idade e formatação
  const enrichedBackups = backups.map(backup => ({
    ...backup,
    age: Math.round((Date.now() - new Date(backup.created)) / (1000 * 60 * 60 * 24)) + ' dias',
    sizeFormatted: formatBytes(backup.size),
    canRestore: backup.type === 'pg_dump'
  }))
  
  res.json({
    success: true,
    data: {
      backups: enrichedBackups,
      summary: {
        total: backups.length,
        totalSize: backups.reduce((sum, b) => sum + b.size, 0),
        totalSizeFormatted: formatBytes(backups.reduce((sum, b) => sum + b.size, 0)),
        pgDumpCount: backups.filter(b => b.type === 'pg_dump').length,
        jsonCount: backups.filter(b => b.type === 'json').length,
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
        newestBackup: backups.length > 0 ? backups[0].created : null
      }
    }
  })
}))

// GET /backup-enhanced/scheduler/status - Status do agendador
router.get('/scheduler/status', requireSuperuser, asyncHandler(async (req, res) => {
  const status = backupScheduler.getStatus()
  
  res.json({
    success: true,
    data: status
  })
}))

// POST /backup-enhanced/scheduler/start - Iniciar agendador
router.post('/scheduler/start', requireSuperuser, asyncHandler(async (req, res) => {
  logInfo('Iniciando agendador de backup', { userId: req.user.id })
  
  if (backupScheduler.isRunning) {
    return res.json({
      success: true,
      message: 'Agendador já está rodando',
      data: backupScheduler.getStatus()
    })
  }
  
  backupScheduler.start()
  
  res.json({
    success: true,
    message: 'Agendador de backup iniciado',
    data: backupScheduler.getStatus()
  })
}))

// POST /backup-enhanced/scheduler/stop - Parar agendador
router.post('/scheduler/stop', requireSuperuser, asyncHandler(async (req, res) => {
  logInfo('Parando agendador de backup', { userId: req.user.id })
  
  if (!backupScheduler.isRunning) {
    return res.json({
      success: true,
      message: 'Agendador já está parado',
      data: backupScheduler.getStatus()
    })
  }
  
  backupScheduler.stop()
  
  res.json({
    success: true,
    message: 'Agendador de backup parado',
    data: backupScheduler.getStatus()
  })
}))

// POST /backup-enhanced/cleanup - Executar limpeza manual
router.post('/cleanup', requireSuperuser, asyncHandler(async (req, res) => {
  logInfo('Limpeza manual de backups solicitada', { userId: req.user.id })
  
  const result = await backupManager.cleanupOldBackups()
  
  res.json({
    success: true,
    message: 'Limpeza de backups concluída',
    data: result
  })
}))

// GET /backup-enhanced/config - Obter configuração atual
router.get('/config', requireSuperuser, asyncHandler(async (req, res) => {
  const config = {
    retention: backupManager.config.maxBackups,
    compression: backupManager.config.compression,
    testRestore: backupManager.config.testRestore,
    directories: {
      base: backupManager.config.baseDir,
      pgDump: backupManager.config.pgDumpDir,
      json: backupManager.config.jsonDir
    },
    scheduler: {
      isRunning: backupScheduler.isRunning,
      jobs: backupScheduler.getStatus().jobs
    }
  }
  
  res.json({
    success: true,
    data: config
  })
}))

// GET /backup-enhanced/health - Verificar saúde do sistema de backup
router.get('/health', requireSuperuser, asyncHandler(async (req, res) => {
  const backups = await backupManager.listAllBackups()
  const now = new Date()
  
  // Verificar backup recente (últimas 48 horas)
  const recentBackup = backups.find(backup => {
    const age = now - new Date(backup.created)
    return age < 48 * 60 * 60 * 1000 // 48 horas
  })
  
  // Verificar espaço em disco (simulado)
  const health = {
    hasRecentBackup: !!recentBackup,
    lastBackupAge: recentBackup ? Math.round((now - new Date(recentBackup.created)) / (1000 * 60 * 60)) + 'h' : 'N/A',
    totalBackups: backups.length,
    schedulerRunning: backupScheduler.isRunning,
    diskSpace: 'OK', // TODO: Implementar verificação real
    issues: []
  }
  
  // Identificar problemas
  if (!health.hasRecentBackup) {
    health.issues.push('Nenhum backup nas últimas 48 horas')
  }
  
  if (!health.schedulerRunning) {
    health.issues.push('Agendador de backup não está rodando')
  }
  
  if (backups.length === 0) {
    health.issues.push('Nenhum backup disponível')
  }
  
  const isHealthy = health.issues.length === 0
  
  res.json({
    success: true,
    data: {
      ...health,
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: new Date().toISOString()
    }
  })
}))

// POST /backup-enhanced/run-job/:jobType - Executar job específico manualmente
router.post('/run-job/:jobType', requireSuperuser, asyncHandler(async (req, res) => {
  const { jobType } = req.params
  
  logInfo('Execução manual de job solicitada', {
    userId: req.user.id,
    jobType
  })
  
  let result
  
  switch (jobType) {
    case 'daily':
      result = await backupScheduler.executeDailyBackup()
      break
    case 'weekly':
      result = await backupScheduler.executeWeeklyBackup()
      break
    case 'monthly':
      result = await backupScheduler.executeMonthlyBackup()
      break
    case 'cleanup':
      result = await backupScheduler.executeCleanup()
      break
    case 'verification':
      result = await backupScheduler.executeVerification()
      break
    default:
      return res.status(400).json({
        success: false,
        error: 'Tipo de job inválido',
        validTypes: ['daily', 'weekly', 'monthly', 'cleanup', 'verification']
      })
  }
  
  res.json({
    success: true,
    message: `Job ${jobType} executado manualmente`,
    data: result
  })
}))

// DELETE /backup-enhanced/:filename - Excluir backup específico
router.delete('/:filename', requireSuperuser, asyncHandler(async (req, res) => {
  const { filename } = req.params
  
  logWarning('Exclusão manual de backup solicitada', {
    userId: req.user.id,
    filename
  })
  
  const backups = await backupManager.listAllBackups()
  const backup = backups.find(b => b.filename === filename)
  
  if (!backup) {
    return res.status(404).json({
      success: false,
      error: 'Backup não encontrado'
    })
  }
  
  // Verificar se não é o último backup
  if (backups.length <= 1) {
    return res.status(400).json({
      success: false,
      error: 'Não é possível excluir o último backup disponível'
    })
  }
  
  const fs = await import('fs')
  
  // Remover arquivo principal
  if (fs.existsSync(backup.path)) {
    fs.unlinkSync(backup.path)
  }
  
  // Remover metadata se existir
  const metaFile = backup.path + '.meta.json'
  if (fs.existsSync(metaFile)) {
    fs.unlinkSync(metaFile)
  }
  
  res.json({
    success: true,
    message: 'Backup excluído com sucesso',
    data: {
      filename,
      freedSpace: formatBytes(backup.size)
    }
  })
}))

// Função utilitária para formatar bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default router
