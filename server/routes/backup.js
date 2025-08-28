import express from 'express'
import { authenticateToken, requireSupervisor } from '../middleware/auth.js'
import { 
  createBackup, 
  restoreBackup, 
  listBackups, 
  verifyBackup,
  autoBackup 
} from '../database/backup.js'

const router = express.Router()

// Aplicar autenticação a todas as rotas
router.use(authenticateToken)

// POST /backup/create - Criar backup manual
router.post('/create', requireSupervisor, async (req, res) => {
  try {
    console.log('🔄 Iniciando backup manual...')
    
    const result = await createBackup()
    
    console.log('✅ Backup manual concluído:', result.filename)
    
    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      data: result
    })
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao criar backup',
      details: error.message
    })
  }
})

// POST /backup/auto - Executar backup automático
router.post('/auto', requireSupervisor, async (req, res) => {
  try {
    console.log('🤖 Iniciando backup automático...')
    
    const result = await autoBackup()
    
    console.log('✅ Backup automático concluído:', result.filename)
    
    res.json({
      success: true,
      message: 'Backup automático executado com sucesso',
      data: result
    })
    
  } catch (error) {
    console.error('❌ Erro no backup automático:', error)
    res.status(500).json({
      success: false,
      error: 'Erro no backup automático',
      details: error.message
    })
  }
})

// GET /backup/list - Listar backups disponíveis
router.get('/list', requireSupervisor, async (req, res) => {
  try {
    console.log('📋 Listando backups disponíveis...')
    
    const backups = await listBackups()
    
    console.log(`✅ Encontrados ${backups.length} backups`)
    
    res.json({
      success: true,
      data: backups
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao listar backups',
      details: error.message
    })
  }
})

// POST /backup/restore/:filename - Restaurar backup
router.post('/restore/:filename', requireSupervisor, async (req, res) => {
  try {
    const { filename } = req.params
    
    console.log(`🔄 Iniciando restauração do backup: ${filename}`)
    
    // Verificar se o backup existe
    const backups = await listBackups()
    const backupExists = backups.some(b => b.filename === filename)
    
    if (!backupExists) {
      return res.status(404).json({
        success: false,
        error: 'Backup não encontrado'
      })
    }
    
    const result = await restoreBackup(filename)
    
    console.log('✅ Restauração concluída com sucesso')
    
    res.json({
      success: true,
      message: 'Backup restaurado com sucesso',
      data: result
    })
    
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar backup',
      details: error.message
    })
  }
})

// GET /backup/verify/:filename - Verificar integridade do backup
router.get('/verify/:filename', requireSupervisor, async (req, res) => {
  try {
    const { filename } = req.params
    
    console.log(`🔍 Verificando integridade do backup: ${filename}`)
    
    const verification = await verifyBackup(filename)
    
    console.log('✅ Verificação concluída')
    
    res.json({
      success: true,
      data: verification
    })
    
  } catch (error) {
    console.error('❌ Erro ao verificar backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar backup',
      details: error.message
    })
  }
})

// GET /backup/stats - Obter estatísticas de backup
router.get('/stats', requireSupervisor, async (req, res) => {
  try {
    console.log('📊 Obtendo estatísticas de backup...')
    
    const backups = await listBackups()
    
    const stats = {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
      averageSize: backups.length > 0 ? backups.reduce((sum, b) => sum + b.size, 0) / backups.length : 0,
      totalRecords: backups.reduce((sum, b) => sum + b.totalRecords, 0)
    }
    
    console.log('✅ Estatísticas obtidas')
    
    res.json({
      success: true,
      data: stats
    })
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas',
      details: error.message
    })
  }
})

// DELETE /backup/:filename - Excluir backup
router.delete('/:filename', requireSupervisor, async (req, res) => {
  try {
    const { filename } = req.params
    
    console.log(`🗑️ Excluindo backup: ${filename}`)
    
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const backupPath = path.join(__dirname, '../../backups', filename)
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup não encontrado'
      })
    }
    
    fs.unlinkSync(backupPath)
    
    console.log('✅ Backup excluído com sucesso')
    
    res.json({
      success: true,
      message: 'Backup excluído com sucesso'
    })
    
  } catch (error) {
    console.error('❌ Erro ao excluir backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir backup',
      details: error.message
    })
  }
})

export default router
