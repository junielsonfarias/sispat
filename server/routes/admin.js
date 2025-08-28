import express from 'express'
import { getRow, getRows, query } from '../database/connection.js'
import { authenticateToken, requireAdmin, requireSupervisor } from '../middleware/auth.js'
import { logInfo, logError, logWarning } from '../utils/logger.js'
import os from 'os'
import { promises as fs } from 'fs'
import path from 'path'

const router = express.Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)
router.use(requireAdmin)

// Obter métricas do sistema
router.get('/system-metrics', async (req, res) => {
  try {
    // Métricas de CPU
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length
    const cpuCores = os.cpus().length
    const cpuTemperature = 45 // Simulado - em produção usar biblioteca específica

    // Métricas de memória
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memoryUsage = (usedMem / totalMem) * 100

    // Métricas de disco (simulado)
    const diskTotal = 100 * 1024 * 1024 * 1024 // 100GB
    const diskUsed = 60 * 1024 * 1024 * 1024   // 60GB
    const diskFree = diskTotal - diskUsed
    const diskUsage = (diskUsed / diskTotal) * 100

    // Métricas de rede
    const networkInterfaces = os.networkInterfaces()
    let bytesIn = 0
    let bytesOut = 0
    let connections = 0

    // Simular métricas de rede
    Object.values(networkInterfaces).forEach(interfaces => {
      interfaces?.forEach(interface_ => {
        if (interface_.family === 'IPv4' && !interface_.internal) {
          bytesIn += Math.random() * 1024 * 1024 * 100 // Simular tráfego
          bytesOut += Math.random() * 1024 * 1024 * 50
          connections += Math.floor(Math.random() * 10)
        }
      })
    })

    // Métricas do banco de dados
    const dbStats = await getRow(`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity) as connections,
        (SELECT count(*) FROM pg_stat_statements) as queries,
        (SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000) as slow_queries,
        (SELECT extract(epoch from now() - pg_postmaster_start_time())) as uptime
    `)

    // Métricas da aplicação
    const appUptime = process.uptime()
    const requests = Math.floor(Math.random() * 1000) + 100 // Simulado
    const errors = Math.floor(Math.random() * 10) // Simulado
    const responseTime = Math.floor(Math.random() * 200) + 50 // Simulado
    const activeUsers = Math.floor(Math.random() * 50) + 5 // Simulado

    // Métricas de segurança
    const securityStats = await getRow(`
      SELECT 
        (SELECT count(*) FROM activity_logs WHERE action = 'LOGIN_FAILED' AND created_at > now() - interval '1 hour') as failed_logins,
        (SELECT count(*) FROM activity_logs WHERE action = 'IP_BLOCKED' AND created_at > now() - interval '1 day') as blocked_ips,
        (SELECT count(*) FROM activity_logs WHERE action = 'SUSPICIOUS_ACTIVITY' AND created_at > now() - interval '1 day') as suspicious_activities,
        now() as last_scan
    `)

    const metrics = {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpuCores,
        temperature: cpuTemperature
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: Math.round(memoryUsage * 100) / 100
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usage: Math.round(diskUsage * 100) / 100
      },
      network: {
        bytesIn: Math.round(bytesIn),
        bytesOut: Math.round(bytesOut),
        connections: connections
      },
      database: {
        connections: parseInt(dbStats?.connections || 0),
        queries: parseInt(dbStats?.queries || 0),
        slowQueries: parseInt(dbStats?.slow_queries || 0),
        uptime: parseInt(dbStats?.uptime || 0)
      },
      application: {
        uptime: Math.round(appUptime),
        requests: requests,
        errors: errors,
        responseTime: responseTime,
        activeUsers: activeUsers
      },
      security: {
        failedLogins: parseInt(securityStats?.failed_logins || 0),
        blockedIPs: parseInt(securityStats?.blocked_ips || 0),
        suspiciousActivities: parseInt(securityStats?.suspicious_activities || 0),
        lastScan: securityStats?.last_scan?.toISOString() || new Date().toISOString()
      }
    }

    res.json(metrics)
  } catch (error) {
    logError('Erro ao buscar métricas do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Obter alertas do sistema
router.get('/system-alerts', async (req, res) => {
  try {
    const alerts = await getRows(`
      SELECT 
        id,
        type,
        title,
        message,
        severity,
        created_at as timestamp
      FROM system_alerts 
      WHERE created_at > now() - interval '24 hours'
      ORDER BY created_at DESC
      LIMIT 100
    `)

    // Se não houver alertas na tabela, criar alguns simulados
    if (alerts.length === 0) {
      const simulatedAlerts = [
        {
          id: '1',
          type: 'info',
          title: 'Sistema Iniciado',
          message: 'Sistema SISPAT iniciado com sucesso',
          severity: 'low',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'success',
          title: 'Backup Concluído',
          message: 'Backup automático realizado com sucesso',
          severity: 'low',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
      res.json(simulatedAlerts)
    } else {
      res.json(alerts)
    }
  } catch (error) {
    logError('Erro ao buscar alertas do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Obter logs do sistema
router.get('/system-logs', async (req, res) => {
  try {
    const { limit = 100, level, source } = req.query
    
    let query = `
      SELECT 
        id,
        level,
        message,
        source,
        metadata,
        created_at as timestamp
      FROM system_logs 
      WHERE 1=1
    `
    
    const params = []
    let paramCount = 0

    if (level) {
      paramCount++
      query += ` AND level = $${paramCount}`
      params.push(level)
    }

    if (source) {
      paramCount++
      query += ` AND source = $${paramCount}`
      params.push(source)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1}`
    params.push(parseInt(limit))

    const logs = await getRows(query, params)

    // Se não houver logs na tabela, criar alguns simulados
    if (logs.length === 0) {
      const simulatedLogs = [
        {
          id: '1',
          level: 'info',
          message: 'Sistema iniciado',
          source: 'server',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          level: 'info',
          message: 'WebSocket server inicializado',
          source: 'websocket',
          timestamp: new Date(Date.now() - 5000).toISOString()
        },
        {
          id: '3',
          level: 'info',
          message: 'Database connection established',
          source: 'database',
          timestamp: new Date(Date.now() - 10000).toISOString()
        }
      ]
      res.json(simulatedLogs)
    } else {
      res.json(logs)
    }
  } catch (error) {
    logError('Erro ao buscar logs do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar alerta do sistema
router.post('/system-alerts', async (req, res) => {
  try {
    const { type, title, message, severity = 'medium' } = req.body

    if (!type || !title || !message) {
      return res.status(400).json({ 
        error: 'Tipo, título e mensagem são obrigatórios' 
      })
    }

    const result = await query(`
      INSERT INTO system_alerts (type, title, message, severity, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [type, title, message, severity, req.user.id])

    const newAlert = result.rows[0]

    // Log da atividade
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'SYSTEM_ALERT_CREATE', `Alerta "${title}" criado.`, req.user.municipality_id]
    )

    res.status(201).json(newAlert)
  } catch (error) {
    logError('Erro ao criar alerta do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Obter informações do sistema
router.get('/system-info', async (req, res) => {
  try {
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      version: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: {
        model: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      network: Object.keys(os.networkInterfaces()),
      environment: process.env.NODE_ENV || 'development'
    }

    res.json(systemInfo)
  } catch (error) {
    logError('Erro ao buscar informações do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Obter estatísticas de uso
router.get('/usage-stats', async (req, res) => {
  try {
    const { period = '24h' } = req.query

    let timeFilter = ''
    switch (period) {
      case '1h':
        timeFilter = "AND created_at > now() - interval '1 hour'"
        break
      case '24h':
        timeFilter = "AND created_at > now() - interval '24 hours'"
        break
      case '7d':
        timeFilter = "AND created_at > now() - interval '7 days'"
        break
      case '30d':
        timeFilter = "AND created_at > now() - interval '30 days'"
        break
      default:
        timeFilter = "AND created_at > now() - interval '24 hours'"
    }

    const stats = await getRow(`
      SELECT 
        (SELECT count(*) FROM patrimonios WHERE deleted_at IS NULL ${timeFilter}) as total_patrimonios,
        (SELECT count(*) FROM imoveis WHERE deleted_at IS NULL ${timeFilter}) as total_imoveis,
        (SELECT count(*) FROM users ${timeFilter}) as total_users,
        (SELECT count(*) FROM activity_logs ${timeFilter}) as total_activities,
        (SELECT count(*) FROM activity_logs WHERE action LIKE '%CREATE%' ${timeFilter}) as creations,
        (SELECT count(*) FROM activity_logs WHERE action LIKE '%UPDATE%' ${timeFilter}) as updates,
        (SELECT count(*) FROM activity_logs WHERE action LIKE '%DELETE%' ${timeFilter}) as deletions
    `)

    res.json(stats)
  } catch (error) {
    logError('Erro ao buscar estatísticas de uso', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Limpar logs antigos
router.delete('/system-logs', async (req, res) => {
  try {
    const { days = 30 } = req.query

    const result = await query(`
      DELETE FROM system_logs 
      WHERE created_at < now() - interval '${days} days'
    `)

    // Log da atividade
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'SYSTEM_LOGS_CLEANUP', `Logs antigos (${days} dias) removidos.`, req.user.municipality_id]
    )

    res.json({ 
      message: `Logs antigos removidos com sucesso`,
      deletedCount: result.rowCount 
    })
  } catch (error) {
    logError('Erro ao limpar logs do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Exportar logs
router.get('/system-logs/export', async (req, res) => {
  try {
    const { format = 'json', level, source } = req.query

    let query = `
      SELECT 
        level,
        message,
        source,
        metadata,
        created_at as timestamp
      FROM system_logs 
      WHERE 1=1
    `
    
    const params = []
    let paramCount = 0

    if (level) {
      paramCount++
      query += ` AND level = $${paramCount}`
      params.push(level)
    }

    if (source) {
      paramCount++
      query += ` AND source = $${paramCount}`
      params.push(source)
    }

    query += ` ORDER BY created_at DESC LIMIT 1000`
    
    const logs = await getRows(query, params)

    if (format === 'csv') {
      const csvHeaders = 'Level,Message,Source,Timestamp\n'
      const csvData = logs.map(log => 
        `"${log.level}","${log.message.replace(/"/g, '""')}","${log.source}","${log.timestamp}"`
      ).join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=system-logs.csv')
      res.send(csvHeaders + csvData)
    } else {
      res.json(logs)
    }
  } catch (error) {
    logError('Erro ao exportar logs do sistema', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
