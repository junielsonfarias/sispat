import express from 'express'
import { getRow, getRows, query } from '../database/connection.js'
import { authenticateToken, requireUser } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Get all transfers (filtered by municipality)
router.get('/', async (req, res) => {
  try {
    let transfersQuery = `
      SELECT 
        t.*,
        m.name as municipality_name
      FROM transferencias t
      LEFT JOIN municipalities m ON t.municipality_id = m.id
    `

    const params = []
    let whereClause = ''

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE t.municipality_id = $1'
      params.push(req.user.municipality_id)
    }

    transfersQuery += whereClause + ' ORDER BY t.data_solicitacao DESC'

    const transfers = await getRows(transfersQuery, params)
    res.json(transfers)
  } catch (error) {
    console.error('Get transfers error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get transfer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const transfer = await getRow(`
      SELECT 
        t.*,
        m.name as municipality_name
      FROM transferencias t
      LEFT JOIN municipalities m ON t.municipality_id = m.id
      WHERE t.id = $1
    `, [id])

    if (!transfer) {
      return res.status(404).json({ error: 'Transferência não encontrada' })
    }

    // Check if user has access to this transfer's municipality
    if (req.user.role !== 'superuser' && transfer.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    res.json(transfer)
  } catch (error) {
    console.error('Get transfer error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Create transfer
router.post('/', requireUser, async (req, res) => {
  try {
    const {
      patrimonioId,
      patrimonioNumero,
      patrimonioDescricao,
      tipo,
      setorOrigem,
      setorDestino,
      destinatarioExterno,
      motivo,
      documentosAnexos
    } = req.body

    // Validation
    if (!patrimonioId || !patrimonioNumero || !patrimonioDescricao || !tipo || !setorOrigem || !motivo) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: patrimônio, tipo, setor origem e motivo' 
      })
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId
    }

    // Create transfer
    const result = await query(`
      INSERT INTO transferencias (
        patrimonio_id, patrimonio_numero, patrimonio_descricao, tipo, setor_origem,
        setor_destino, destinatario_externo, solicitante_id, solicitante_nome, motivo,
        documentos_anexos, municipality_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      patrimonioId, patrimonioNumero, patrimonioDescricao, tipo, setorOrigem,
      setorDestino, destinatarioExterno, req.user.id, req.user.name, motivo,
      documentosAnexos || [], municipalityId
    ])

    const newTransfer = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'TRANSFER_CREATE', `Transferência "${patrimonioNumero}" solicitada.`, municipalityId]
    )

    res.status(201).json(newTransfer)
  } catch (error) {
    console.error('Create transfer error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update transfer status
router.put('/:id/status', requireUser, async (req, res) => {
  try {
    const { id } = req.params
    const { status, comentariosAprovador } = req.body

    // Check if transfer exists
    const existingTransfer = await getRow(
      'SELECT patrimonio_numero, municipality_id FROM transferencias WHERE id = $1',
      [id]
    )

    if (!existingTransfer) {
      return res.status(404).json({ error: 'Transferência não encontrada' })
    }

    // Check if user has access to this transfer's municipality
    if (req.user.role !== 'superuser' && existingTransfer.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Update transfer status
    const result = await query(`
      UPDATE transferencias SET
        status = $1,
        aprovador_id = $2,
        aprovador_nome = $3,
        data_aprovacao = CURRENT_TIMESTAMP,
        comentarios_aprovador = $4
      WHERE id = $5
      RETURNING *
    `, [status, req.user.id, req.user.name, comentariosAprovador, id])

    const updatedTransfer = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'TRANSFER_STATUS_UPDATE', `Transferência "${updatedTransfer.patrimonio_numero}" ${status}.`, existingTransfer.municipality_id]
    )

    res.json(updatedTransfer)
  } catch (error) {
    console.error('Update transfer status error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
