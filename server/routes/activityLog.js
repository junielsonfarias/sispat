import express from 'express'
import { getRows, getRow } from '../database/connection.js'
import { authenticateToken, requireSupervisor } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Get activity logs (filtered by municipality)
router.get('/', async (req, res) => {
  try {
    let logsQuery = `
      SELECT 
        al.*,
        m.name as municipality_name
      FROM activity_logs al
      LEFT JOIN municipalities m ON al.municipality_id = m.id
    `

    const params = []
    let whereClause = ''

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE al.municipality_id = $1'
      params.push(req.user.municipality_id)
    }

         // Add date filters
     if (req.query.startDate) {
       whereClause += whereClause ? ' AND' : 'WHERE'
       whereClause += ` al.created_at >= $${params.length + 1}`
       params.push(req.query.startDate)
     }

     if (req.query.endDate) {
       whereClause += whereClause ? ' AND' : 'WHERE'
       whereClause += ` al.created_at <= $${params.length + 1}`
       params.push(req.query.endDate)
     }

    // Add action filter
    if (req.query.action) {
      whereClause += whereClause ? ' AND' : 'WHERE'
      whereClause += ` al.action = $${params.length + 1}`
      params.push(req.query.action)
    }

    // Add user filter
    if (req.query.userId) {
      whereClause += whereClause ? ' AND' : 'WHERE'
      whereClause += ` al.user_id = $${params.length + 1}`
      params.push(req.query.userId)
    }

    logsQuery += whereClause + ' ORDER BY al.created_at DESC'

    // Add pagination
    const limit = parseInt(req.query.limit) || 100
    const offset = parseInt(req.query.offset) || 0
    logsQuery += ` LIMIT ${limit} OFFSET ${offset}`

    const logs = await getRows(logsQuery, params)
    res.json(logs)
  } catch (error) {
    console.error('Get activity logs error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get activity logs by municipality
router.get('/municipality/:municipalityId', requireSupervisor, async (req, res) => {
  try {
    const { municipalityId } = req.params

    // Check if user has access to this municipality
    if (req.user.role !== 'superuser' && req.user.municipality_id !== municipalityId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const logs = await getRows(`
      SELECT 
        al.*,
        m.name as municipality_name
      FROM activity_logs al
      LEFT JOIN municipalities m ON al.municipality_id = m.id
      WHERE al.municipality_id = $1
      ORDER BY al.created_at DESC
      LIMIT 100
    `, [municipalityId])

    res.json(logs)
  } catch (error) {
    console.error('Get activity logs by municipality error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get activity logs by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Check if user has permission to view this user's logs
    if (req.user.role !== 'superuser' && req.user.id !== userId) {
      const targetUser = await getRow(
        'SELECT municipality_id FROM users WHERE id = $1',
        [userId]
      )
      
      if (!targetUser || targetUser.municipality_id !== req.user.municipality_id) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    const logs = await getRows(`
      SELECT 
        al.*,
        m.name as municipality_name
      FROM activity_logs al
      LEFT JOIN municipalities m ON al.municipality_id = m.id
      WHERE al.user_id = $1
             ORDER BY al.created_at DESC
      LIMIT 100
    `, [userId])

    res.json(logs)
  } catch (error) {
    console.error('Get activity logs by user error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Create new activity log
router.post('/', async (req, res) => {
  try {
    const { action, details, sector, municipalityId } = req.body

    // Validate required fields
    if (!action || !details) {
      return res.status(400).json({ error: 'Ação e detalhes são obrigatórios' })
    }

    // Insert new activity log
    const result = await getRows(`
      INSERT INTO activity_logs (
        user_id, 
        user_name, 
        action, 
        details, 
        sector, 
        municipality_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [
      req.user.id,
      req.user.name,
      action,
      details,
      sector || req.user.sector,
      municipalityId || req.user.municipality_id
    ])

    res.status(201).json({
      success: true,
      data: result[0],
      message: 'Atividade registrada com sucesso'
    })
  } catch (error) {
    console.error('Create activity log error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
