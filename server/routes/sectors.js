import express from 'express'
import { getRow, getRows, query } from '../database/connection.js'
import { authenticateToken, requireSupervisor } from '../middleware/auth.js'
// import {
//     invalidateSectorsCache,
//     sectorsCacheMiddleware
// } from '../middleware/cacheMiddleware.js'
import { validateUUID } from '../middleware/validation.js'

const router = express.Router()

// Public endpoint to get sectors by municipality (for user forms)
router.get('/public/:municipalityId', 
  validateUUID('municipalityId'),
  async (req, res) => {
  try {
    const { municipalityId } = req.params

    const sectors = await getRows(`
      SELECT 
        s.id,
        s.name,
        s.municipality_id as "municipalityId",
        s.parent_id,
        p.name as parent_name
      FROM sectors s
      LEFT JOIN sectors p ON s.parent_id = p.id
      WHERE s.municipality_id = $1
      ORDER BY s.name
    `, [municipalityId])

    res.json(sectors)
  } catch (error) {
    console.error('Get public sectors by municipality error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Apply authentication to all other routes
router.use(authenticateToken)

// Get sectors by municipality (for superuser)
router.get('/municipality/:municipalityId', 
  requireSupervisor, 
  validateUUID('municipalityId'),
  // sectorsCacheMiddleware,
  async (req, res) => {
  try {
    const { municipalityId } = req.params

    const sectors = await getRows(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.parent_id,
        s.municipality_id as "municipalityId",
        s.created_by,
        s.created_at,
        s.updated_at,
        s.codigo,
        s.sigla,
        s.endereco,
        s.cnpj,
        s.responsavel,
        p.name as parent_name,
        m.name as municipality_name
      FROM sectors s
      LEFT JOIN sectors p ON s.parent_id = p.id
      LEFT JOIN municipalities m ON s.municipality_id = m.id
      WHERE s.municipality_id = $1
      ORDER BY s.name
    `, [municipalityId])

    res.json(sectors)
  } catch (error) {
    console.error('Get sectors by municipality error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get all sectors (filtered by municipality)
router.get('/', 
  // sectorsCacheMiddleware, 
  async (req, res) => {
  try {
    let sectorsQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.parent_id,
        s.municipality_id as "municipalityId",
        s.created_by,
        s.created_at,
        s.updated_at,
        s.codigo,
        s.sigla,
        s.endereco,
        s.cnpj,
        s.responsavel,
        p.name as parent_name,
        m.name as municipality_name
      FROM sectors s
      LEFT JOIN sectors p ON s.parent_id = p.id
      LEFT JOIN municipalities m ON s.municipality_id = m.id
    `

    const params = []
    let whereClause = ''

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE s.municipality_id = $1'
      params.push(req.user.municipality_id)
    }

    // Controle de acesso baseado em setores para usuários normais
    if (req.user.role === 'usuario' || req.user.role === 'visualizador') {
      // Buscar setores atribuídos ao usuário
      const userSectors = await getRows(`
        SELECT s.name 
        FROM user_sectors us
        JOIN sectors s ON us.sector_id = s.id
        WHERE us.user_id = $1
      `, [req.user.id])
      
      if (userSectors.length > 0) {
        const sectorNames = userSectors.map(s => s.name)
        console.log('🔍 Usuário tem acesso aos setores:', sectorNames)
        
        const sectorFilter = ` AND s.name IN (${sectorNames.map((_, i) => `$${params.length + i + 1}`).join(', ')})`
        whereClause += sectorFilter
        params.push(...sectorNames)
      } else {
        console.log('⚠️ Usuário sem setores atribuídos - sem acesso a setores')
        return res.json([])
      }
    }

    sectorsQuery += whereClause + ' ORDER BY s.name'

    const sectors = await getRows(sectorsQuery, params)
    res.json(sectors)
  } catch (error) {
    console.error('Get sectors error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get sector by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const sector = await getRow(`
      SELECT 
        s.*,
        p.name as parent_name,
        m.name as municipality_name
      FROM sectors s
      LEFT JOIN sectors p ON s.parent_id = p.id
      LEFT JOIN municipalities m ON s.municipality_id = m.id
      WHERE s.id = $1
    `, [id])

    if (!sector) {
      return res.status(404).json({ error: 'Setor não encontrado' })
    }

    // Check if user has access to this sector's municipality
    if (req.user.role !== 'superuser' && sector.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    res.json(sector)
  } catch (error) {
    console.error('Get sector error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Create sector
router.post('/', 
  requireSupervisor, 
  // invalidateSectorsCache, 
  async (req, res) => {
  try {
    const {
      name,
      description,
      parentId,
      sigla,
      codigo,
      endereco,
      cnpj,
      responsavel
    } = req.body

    // Validation
    if (!name) {
      return res.status(400).json({ 
        error: 'Nome é obrigatório' 
      })
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId
    }
    
    // Validate municipality_id
    if (!municipalityId) {
      return res.status(400).json({ 
        error: 'Município é obrigatório. Verifique se você está vinculado a um município.' 
      })
    }

    // Check if name already exists in this municipality
    const existingSector = await getRow(
      'SELECT id FROM sectors WHERE name = $1 AND municipality_id = $2',
      [name, municipalityId]
    )

    if (existingSector) {
      return res.status(400).json({ 
        error: 'Nome já existe neste município' 
      })
    }

    // Validate parent sector if provided
    if (parentId) {
      const parentSector = await getRow(
        'SELECT id, municipality_id FROM sectors WHERE id = $1',
        [parentId]
      )

      if (!parentSector) {
        return res.status(400).json({ error: 'Setor pai não encontrado' })
      }

      if (parentSector.municipality_id !== municipalityId) {
        return res.status(400).json({ 
          error: 'Setor pai deve pertencer ao mesmo município' 
        })
      }
    }

    // Create sector
    const result = await query(`
      INSERT INTO sectors (
        name, description, parent_id, municipality_id, created_by,
        sigla, codigo, endereco, cnpj, responsavel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name, description || '', parentId, municipalityId, req.user.id,
      sigla || '', codigo || '', endereco || '', cnpj || '', responsavel || ''
    ])

    const newSector = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'SECTOR_CREATE', 'sectors', newSector.id, JSON.stringify({ name, description, sigla, codigo, endereco, cnpj, responsavel }), municipalityId]
    )

    res.status(201).json(newSector)
  } catch (error) {
    console.error('Create sector error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update sector
router.put('/:id', 
  requireSupervisor, 
  // invalidateSectorsCache, 
  async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      parentId,
      sigla,
      codigo,
      endereco,
      cnpj,
      responsavel
    } = req.body

    // Check if sector exists
    const existingSector = await getRow(
      'SELECT name, municipality_id FROM sectors WHERE id = $1',
      [id]
    )

    if (!existingSector) {
      return res.status(404).json({ error: 'Setor não encontrado' })
    }

    // Check if user has access to this sector's municipality
    if (req.user.role !== 'superuser' && existingSector.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Check if name already exists (excluding current sector)
    if (name) {
      const nameExists = await getRow(
        'SELECT id FROM sectors WHERE name = $1 AND municipality_id = $2 AND id != $3',
        [name, existingSector.municipality_id, id]
      )

      if (nameExists) {
        return res.status(400).json({ 
          error: 'Nome já existe neste município' 
        })
      }
    }

    // Validate parent sector if provided
    if (parentId) {
      const parentSector = await getRow(
        'SELECT id, municipality_id FROM sectors WHERE id = $1',
        [parentId]
      )

      if (!parentSector) {
        return res.status(400).json({ error: 'Setor pai não encontrado' })
      }

      if (parentSector.municipality_id !== existingSector.municipality_id) {
        return res.status(400).json({ 
          error: 'Setor pai deve pertencer ao mesmo município' 
        })
      }

      // Prevent circular reference
      if (parentId === id) {
        return res.status(400).json({ 
          error: 'Setor não pode ser pai de si mesmo' 
        })
      }
    }

    // Update sector
    const result = await query(`
      UPDATE sectors SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        parent_id = $3,
        sigla = COALESCE($4, sigla),
        codigo = COALESCE($5, codigo),
        endereco = COALESCE($6, endereco),
        cnpj = COALESCE($7, cnpj),
        responsavel = COALESCE($8, responsavel),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      name, description, parentId, sigla, codigo, endereco, cnpj, responsavel, id
    ])

    const updatedSector = result.rows[0]

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'SECTOR_UPDATE', 'sectors', updatedSector.id, JSON.stringify({ name, description, sigla, codigo, endereco, cnpj, responsavel }), existingSector.municipality_id]
    )

    res.json(updatedSector)
  } catch (error) {
    console.error('Update sector error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Delete sector
router.delete('/:id', 
  requireSupervisor, 
  // invalidateSectorsCache, 
  async (req, res) => {
  try {
    const { id } = req.params

    // Check if sector exists
    const existingSector = await getRow(
      'SELECT name, municipality_id FROM sectors WHERE id = $1',
      [id]
    )

    if (!existingSector) {
      return res.status(404).json({ error: 'Setor não encontrado' })
    }

    // Check if user has access to this sector's municipality
    if (req.user.role !== 'superuser' && existingSector.municipality_id !== req.user.municipality_id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Check if sector has child sectors
    const childSectors = await getRow(
      'SELECT COUNT(*) as count FROM sectors WHERE parent_id = $1',
      [id]
    )

    if (parseInt(childSectors.count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um setor que possui setores filhos' 
      })
    }

    // Check if sector has patrimonios (simplified check)
    try {
      const patrimonios = await getRow(
        'SELECT COUNT(*) as count FROM patrimonios WHERE setor_responsavel = (SELECT name FROM sectors WHERE id = $1)',
        [id]
      )

      if (patrimonios && parseInt(patrimonios.count) > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir um setor que possui patrimônios vinculados' 
        })
      }
    } catch (error) {
      console.log('Patrimonios table check skipped:', error.message)
    }

    // Check if sector has locals (simplified check)
    try {
      const locals = await getRow(
        'SELECT COUNT(*) as count FROM locals WHERE sector_id = $1',
        [id]
      )

      if (locals && parseInt(locals.count) > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir um setor que possui locais vinculados' 
        })
      }
    } catch (error) {
      console.log('Locals table check skipped:', error.message)
    }

    // Delete sector
    await query('DELETE FROM sectors WHERE id = $1', [id])

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'SECTOR_DELETE', 'sectors', id, JSON.stringify({ name: existingSector.name }), existingSector.municipality_id]
    )

    res.json({ message: 'Setor excluído com sucesso' })
  } catch (error) {
    console.error('Delete sector error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Debug route to check sectors in database
router.get('/debug/check-sectors', async (req, res) => {
  try {
    console.log('🧪 DEBUG - Verificando setores no banco de dados')
    
    // Get all sectors with their codes
    const sectors = await getRows(`
      SELECT id, name, codigo, sigla, municipality_id, created_at, updated_at
      FROM sectors 
      ORDER BY name
    `)
    
    console.log('📋 Setores encontrados:', sectors.length)
    console.log('📋 Detalhes dos setores:', sectors)
    
    // Check for sectors without codes
    const sectorsWithoutCode = sectors.filter(s => !s.codigo || s.codigo === '')
    console.log('⚠️ Setores sem código:', sectorsWithoutCode.length)
    
    res.json({
      totalSectors: sectors.length,
      sectors: sectors,
      sectorsWithoutCode: sectorsWithoutCode,
      sectorsWithCode: sectors.filter(s => s.codigo && s.codigo !== '')
    })
  } catch (error) {
    console.error('❌ Erro ao verificar setores:', error)
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Create default sectors for municipality
router.post('/create-default/:municipalityId', 
  requireSupervisor, 
  validateUUID('municipalityId'),
  async (req, res) => {
  try {
    const { municipalityId } = req.params

    // Check if municipality exists
    const municipality = await getRow(
      'SELECT id, name FROM municipalities WHERE id = $1',
      [municipalityId]
    )

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' })
    }

    // Check if user has access to this municipality
    if (req.user.role !== 'superuser' && req.user.municipality_id !== municipalityId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Default sectors for municipality
    const defaultSectors = [
      {
        name: 'Secretaria Municipal de Educação',
        description: 'Setor responsável pela educação municipal',
        sigla: 'SME',
        codigo: '01',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Saúde',
        description: 'Setor responsável pela saúde municipal',
        sigla: 'SMS',
        codigo: '02',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Administração',
        description: 'Setor responsável pela administração municipal',
        sigla: 'SMA',
        codigo: '03',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Obras',
        description: 'Setor responsável pelas obras municipais',
        sigla: 'SMO',
        codigo: '04',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Finanças',
        description: 'Setor responsável pelas finanças municipais',
        sigla: 'SMF',
        codigo: '05',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Meio Ambiente',
        description: 'Setor responsável pelo meio ambiente',
        sigla: 'SMMA',
        codigo: '06',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Cultura e Turismo',
        description: 'Setor responsável pela cultura e turismo',
        sigla: 'SMCT',
        codigo: '07',
        endereco: '',
        cnpj: '',
        responsavel: ''
      },
      {
        name: 'Secretaria Municipal de Esportes',
        description: 'Setor responsável pelos esportes',
        sigla: 'SME',
        codigo: '08',
        endereco: '',
        cnpj: '',
        responsavel: ''
      }
    ]

    const createdSectors = []

    for (const sectorData of defaultSectors) {
      // Check if sector already exists
      const existingSector = await getRow(
        'SELECT id FROM sectors WHERE name = $1 AND municipality_id = $2',
        [sectorData.name, municipalityId]
      )

      if (!existingSector) {
        const result = await query(`
          INSERT INTO sectors (
            name, description, parent_id, municipality_id, created_by,
            sigla, codigo, endereco, cnpj, responsavel
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          sectorData.name, 
          sectorData.description, 
          null, // No parent_id (setor raiz)
          municipalityId, 
          req.user.id,
          sectorData.sigla, 
          sectorData.codigo, 
          sectorData.endereco, 
          sectorData.cnpj, 
          sectorData.responsavel
        ])

        createdSectors.push(result.rows[0])

        // Log activity
        await query(
          'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.user.id, 'SECTOR_CREATE_DEFAULT', 'sectors', result.rows[0].id, JSON.stringify(sectorData), municipalityId]
        )
      }
    }

    res.status(201).json({
      message: `${createdSectors.length} setores padrão criados para ${municipality.name}`,
      createdSectors,
      totalSectors: createdSectors.length
    })

  } catch (error) {
    console.error('Create default sectors error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get sector tree (hierarchical structure)
router.get('/tree/:municipalityId', async (req, res) => {
  try {
    const { municipalityId } = req.params

    // Check if user has access to this municipality
    if (req.user.role !== 'superuser' && req.user.municipality_id !== municipalityId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const sectors = await getRows(`
      SELECT 
        s.*,
        p.name as parent_name
      FROM sectors s
      LEFT JOIN sectors p ON s.parent_id = p.id
      WHERE s.municipality_id = $1
      ORDER BY s.name
    `, [municipalityId])

    // Build hierarchical tree
    const buildTree = (parentId = null) => {
      return sectors
        .filter(sector => sector.parent_id === parentId)
        .map(sector => ({
          ...sector,
          children: buildTree(sector.id)
        }))
    }

    const sectorTree = buildTree()
    res.json(sectorTree)
  } catch (error) {
    console.error('Get sector tree error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
