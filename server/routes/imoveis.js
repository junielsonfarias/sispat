import express from 'express'
import { getRow, getRows, query } from '../database/connection.js'
import { authenticateToken, requireUser } from '../middleware/auth.js'
import { tableExists, columnExists, getTableColumns } from '../utils/schema-cache.js'
import { sanitizeSearchInput } from '../middleware/input-sanitizer.js'

const router = express.Router()

// Public route for imoveis (for public consultation)
router.get('/public', sanitizeSearchInput, async (req, res) => {
  try {
    console.log('🌐 CONSULTA PÚBLICA - Buscando imóveis públicos')
    
    const { municipalityId, search, limit = 50 } = req.query
    
    // Check if imoveis table exists using cached check
    const tableExistsResult = await tableExists('imoveis')
    if (!tableExistsResult) {
      console.log('ℹ️ Tabela imoveis não existe, retornando lista vazia')
      return res.json([])
    }
    
    // Check if required columns exist using cached check
    const hasMunicipalityId = await columnExists('imoveis', 'municipality_id')
    if (!hasMunicipalityId) {
      console.log('ℹ️ Tabela imoveis não tem coluna municipality_id, retornando lista vazia')
      return res.json([])
    }
    
    let whereClause = ''
    const params = []
    
    if (municipalityId) {
      whereClause = 'WHERE i.municipality_id = $1'
      params.push(municipalityId)
    }
    
    if (search && municipalityId) {
      whereClause += ' AND (i.numero_patrimonio ILIKE $2 OR i.endereco ILIKE $2 OR i.descricao ILIKE $2)'
      params.push(`%${search}%`)
    } else if (search) {
      whereClause = 'WHERE (i.numero_patrimonio ILIKE $1 OR i.endereco ILIKE $1 OR i.descricao ILIKE $1)'
      params.push(`%${search}%`)
    }
    
    // Obter colunas da tabela usando cache
    const existingColumns = new Set(await getTableColumns('imoveis'))

    // Construir SELECT dinamicamente baseado nas colunas existentes
    const selectColumns = [
      'i.id',
      'i.numero_patrimonio',
      'i.municipality_id',
      'm.name as municipality_name'
    ]

    // Adicionar colunas opcionais apenas se existirem
    if (existingColumns.has('endereco')) selectColumns.push('i.endereco')
    if (existingColumns.has('descricao')) selectColumns.push('i.descricao')
    if (existingColumns.has('area_total')) selectColumns.push('i.area_total')
    if (existingColumns.has('area_construida')) selectColumns.push('i.area_construida')
    if (existingColumns.has('valor_aquisicao')) selectColumns.push('i.valor_aquisicao')
    if (existingColumns.has('data_aquisicao')) selectColumns.push('i.data_aquisicao')

    const imoveis = await getRows(`
      SELECT ${selectColumns.join(', ')}
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      ${whereClause}
      ORDER BY i.numero_patrimonio
      LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)])

    console.log(`✅ Encontrados ${imoveis.length} imóveis públicos`)
    res.json(imoveis)
  } catch (error) {
    console.error('❌ Erro ao buscar imóveis públicos:', error)
    // Return empty array instead of error to prevent frontend issues
    console.log('ℹ️ Retornando lista vazia devido ao erro')
    res.json([])
  }
})

// Public route to get single imovel by ID (for QR code access)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log(`🌐 CONSULTA PÚBLICA - Buscando imóvel: ${id}`)
    
    // Verificar se a tabela existe
    const tableExistsResult = await tableExists('imoveis')
    if (!tableExistsResult) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }
    
    // Obter colunas da tabela usando cache
    const existingColumns = new Set(await getTableColumns('imoveis'))

    // Construir SELECT dinamicamente
    const selectColumns = ['i.id']
    
    // Adicionar colunas apenas se existirem
    if (existingColumns.has('numero_patrimonio')) selectColumns.push('i.numero_patrimonio')
    if (existingColumns.has('endereco')) selectColumns.push('i.endereco')
    if (existingColumns.has('descricao')) selectColumns.push('i.descricao')
    if (existingColumns.has('municipality_id')) selectColumns.push('i.municipality_id')
    if (existingColumns.has('area_total')) selectColumns.push('i.area_total')
    if (existingColumns.has('area_construida')) selectColumns.push('i.area_construida')
    if (existingColumns.has('valor_aquisicao')) selectColumns.push('i.valor_aquisicao')
    if (existingColumns.has('data_aquisicao')) selectColumns.push('i.data_aquisicao')
    
    // Adicionar colunas do município
    selectColumns.push('m.name as municipality_name')
    selectColumns.push('m.logo_url as municipality_logo')
    
    const imovel = await getRow(`
      SELECT ${selectColumns.join(', ')}
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1
    `, [id])

    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    console.log(`✅ Imóvel encontrado: ${imovel.endereco || imovel.numero_patrimonio}`)
    res.json(imovel)
  } catch (error) {
    console.error('❌ Erro ao buscar imóvel público:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Apply authentication to all routes
router.use(authenticateToken)

// Get all imoveis (filtered by municipality)
router.get('/', async (req, res) => {
  try {
    // Verificar se a tabela existe
    const tableExistsResult = await tableExists('imoveis')
    if (!tableExistsResult) {
      return res.json([])
    }
    
    // Obter colunas da tabela usando cache
    const existingColumns = new Set(await getTableColumns('imoveis'))

    // Construir SELECT dinamicamente
    const selectColumns = ['i.id']
    
    // Adicionar colunas apenas se existirem
    if (existingColumns.has('numero_patrimonio')) selectColumns.push('i.numero_patrimonio')
    if (existingColumns.has('endereco')) selectColumns.push('i.endereco')
    if (existingColumns.has('descricao')) selectColumns.push('i.descricao')
    if (existingColumns.has('municipality_id')) selectColumns.push('i.municipality_id')
    if (existingColumns.has('area_total')) selectColumns.push('i.area_total')
    if (existingColumns.has('area_construida')) selectColumns.push('i.area_construida')
    if (existingColumns.has('valor_aquisicao')) selectColumns.push('i.valor_aquisicao')
    if (existingColumns.has('data_aquisicao')) selectColumns.push('i.data_aquisicao')
    if (existingColumns.has('status')) selectColumns.push('i.status')
    if (existingColumns.has('created_at')) selectColumns.push('i.created_at')
    if (existingColumns.has('updated_at')) selectColumns.push('i.updated_at')
    
    // Adicionar coluna do município
    selectColumns.push('m.name as municipality_name')

    let imoveisQuery = `
      SELECT ${selectColumns.join(', ')}
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
    `

    const params = []
    let whereClause = ''

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE i.municipality_id = $1'
      params.push(req.user.municipality_id)
    }

    imoveisQuery += whereClause + ' ORDER BY i.numero_patrimonio'

    const imoveis = await getRows(imoveisQuery, params)
    res.json(imoveis)
  } catch (error) {
    console.error('Get imoveis error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get imovel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const imovel = await getRow(`
      SELECT 
        i.*,
        m.name as municipality_name
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1 OR i.numero_patrimonio = $1
    `, [id])

    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    // Check if user has access to this imovel's municipality
    if (req.user.role !== 'superuser' && imovel.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    res.json(imovel)
  } catch (error) {
    console.error('Get imovel error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Create imovel
router.post('/', requireUser, async (req, res) => {
  try {
    const {
      numero_patrimonio,
      denominacao,
      endereco,
      setor,
      data_aquisicao,
      valor_aquisicao,
      area_terreno,
      area_construida,
      latitude,
      longitude,
      fotos,
      documentos,
      custom_fields
    } = req.body

    // Validation
    if (!numero_patrimonio || !denominacao || !endereco || !setor || !data_aquisicao || !valor_aquisicao) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: número do patrimônio, denominação, endereço, setor, data de aquisição e valor' 
      })
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId
    }

    // Check if patrimonio number already exists in this municipality
    const existingImovel = await getRow(
      'SELECT id FROM imoveis WHERE numero_patrimonio = $1 AND municipality_id = $2',
      [numero_patrimonio, municipalityId]
    )

    if (existingImovel) {
      return res.status(400).json({ 
        error: 'Número do patrimônio já existe neste município' 
      })
    }

    // Create imovel
    const result = await query(`
      INSERT INTO imoveis (
        numero_patrimonio, denominacao, endereco, setor, data_aquisicao, valor_aquisicao,
        area_terreno, area_construida, latitude, longitude, fotos, documentos,
        municipality_id, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      numero_patrimonio, denominacao, endereco, setor, data_aquisicao, valor_aquisicao,
      area_terreno, area_construida, latitude, longitude, fotos || [], documentos || [],
      municipalityId, custom_fields || {}
    ])

    const newImovel = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'IMOVEL_CREATE', `Imóvel "${numero_patrimonio}" criado.`, municipalityId]
    )

    res.status(201).json(newImovel)
  } catch (error) {
    console.error('Create imovel error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update imovel
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if imovel exists
    const existingImovel = await getRow(
      'SELECT numero_patrimonio, municipality_id FROM imoveis WHERE id = $1',
      [id]
    )

    if (!existingImovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    // Check if user has access to this imovel's municipality
    if (req.user.role !== 'superuser' && existingImovel.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Check if patrimonio number already exists (excluding current imovel)
    if (updateData.numero_patrimonio) {
      const imovelExists = await getRow(
        'SELECT id FROM imoveis WHERE numero_patrimonio = $1 AND municipality_id = $2 AND id != $3',
        [updateData.numero_patrimonio, existingImovel.municipality_id, id]
      )

      if (imovelExists) {
        return res.status(400).json({ 
          error: 'Número do patrimônio já existe neste município' 
        })
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    let paramCount = 1

    const fieldsToUpdate = [
      'numero_patrimonio', 'denominacao', 'endereco', 'setor', 'data_aquisicao', 'valor_aquisicao',
      'area_terreno', 'area_construida', 'latitude', 'longitude', 'fotos', 'documentos', 'custom_fields'
    ]

    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`)
        updateValues.push(updateData[field])
        paramCount++
      }
    })

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateValues.push(id)

    const updateQuery = `
      UPDATE imoveis SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await query(updateQuery, updateValues)
    const updatedImovel = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'IMOVEL_UPDATE', `Imóvel "${updatedImovel.numero_patrimonio}" atualizado.`, existingImovel.municipality_id]
    )

    res.json(updatedImovel)
  } catch (error) {
    console.error('Update imovel error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Delete imovel
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params

    // Check if imovel exists
    const existingImovel = await getRow(
      'SELECT numero_patrimonio, municipality_id FROM imoveis WHERE id = $1',
      [id]
    )

    if (!existingImovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    // Check if user has access to this imovel's municipality
    if (req.user.role !== 'superuser' && existingImovel.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Delete imovel (cascade will handle related data)
    await query('DELETE FROM imoveis WHERE id = $1', [id])

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.name, 'IMOVEL_DELETE', `Imóvel "${existingImovel.numero_patrimonio}" excluído.`, existingImovel.municipality_id]
    )

    res.json({ message: 'Imóvel excluído com sucesso' })
  } catch (error) {
    console.error('Delete imovel error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
