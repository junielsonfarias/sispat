import express from 'express'
import { authenticateApiKey, rateLimitApi } from '../middleware/api-auth.js'
import { logError, logInfo } from '../utils/logger.js'
import { pool } from '../database/connection.js'
import auditService from '../services/audit.js'

const router = express.Router()

// Middleware de autenticação por API key para todas as rotas
router.use(authenticateApiKey)
router.use(rateLimitApi)

// GET /api/external/health - Verificar status da API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    apiKey: req.apiKey ? req.apiKey.name : null
  })
})

// GET /api/external/municipalities - Listar municípios públicos
router.get('/municipalities', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query

    const query = `
      SELECT id, name, state, created_at, updated_at
      FROM municipalities
      ORDER BY name
      LIMIT $1 OFFSET $2
    `

    const result = await pool.query(query, [parseInt(limit), parseInt(offset)])

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'MUNICIPALITY',
      resourceId: 'LIST',
      resourceName: 'Lista de Municípios',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou lista de municípios'
    })

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    })
  } catch (error) {
    logError('Erro na API externa - municípios', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/patrimonios - Listar patrimônios públicos
router.get('/patrimonios', async (req, res) => {
  try {
    const { 
      municipalityId, 
      limit = 100, 
      offset = 0,
      search,
      setor
    } = req.query

    let whereConditions = ['deleted_at IS NULL']
    let values = []
    let valueIndex = 1

    if (municipalityId) {
      whereConditions.push(`municipality_id = $${valueIndex++}`)
      values.push(municipalityId)
    }

    if (search) {
      whereConditions.push(`(descricao ILIKE $${valueIndex++} OR numero_patrimonio ILIKE $${valueIndex++})`)
      values.push(`%${search}%`, `%${search}%`)
    }

    if (setor) {
      whereConditions.push(`setor ILIKE $${valueIndex++}`)
      values.push(`%${setor}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        p.id, p.numero_patrimonio, p.descricao, p.setor, p.local,
        p.valor_aquisicao, p.data_aquisicao, p.status,
        m.name as municipality_name, m.state as municipality_state,
        p.created_at, p.updated_at
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      ${whereClause}
      ORDER BY p.numero_patrimonio
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `

    values.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, values)

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'PATRIMONIO',
      resourceId: 'LIST',
      resourceName: 'Lista de Patrimônios',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou lista de patrimônios',
      metadata: { filters: { municipalityId, search, setor } }
    })

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    })
  } catch (error) {
    logError('Erro na API externa - patrimônios', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/imoveis - Listar imóveis públicos
router.get('/imoveis', async (req, res) => {
  try {
    const { 
      municipalityId, 
      limit = 100, 
      offset = 0,
      search
    } = req.query

    let whereConditions = []
    let values = []
    let valueIndex = 1

    if (municipalityId) {
      whereConditions.push(`i.municipality_id = $${valueIndex++}`)
      values.push(municipalityId)
    }

    if (search) {
      whereConditions.push(`(i.descricao ILIKE $${valueIndex++} OR i.numero_patrimonio ILIKE $${valueIndex++})`)
      values.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        i.id, i.numero_patrimonio, i.endereco, i.descricao,
        i.area_total, i.area_construida, i.valor_aquisicao, i.data_aquisicao,
        m.name as municipality_name, m.state as municipality_state,
        i.created_at, i.updated_at
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      ${whereClause}
      ORDER BY i.numero_patrimonio
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `

    values.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, values)

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'IMOVEL',
      resourceId: 'LIST',
      resourceName: 'Lista de Imóveis',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou lista de imóveis',
      metadata: { filters: { municipalityId, search } }
    })

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    })
  } catch (error) {
    logError('Erro na API externa - imóveis', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/patrimonios/:id - Obter patrimônio específico
router.get('/patrimonios/:id', async (req, res) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        p.*,
        m.name as municipality_name, m.state as municipality_state
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patrimônio não encontrado'
      })
    }

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'PATRIMONIO',
      resourceId: id,
      resourceName: result.rows[0].descricao,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou patrimônio específico'
    })

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    logError('Erro na API externa - patrimônio específico', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/imoveis/:id - Obter imóvel específico
router.get('/imoveis/:id', async (req, res) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        i.*,
        m.name as municipality_name, m.state as municipality_state
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Imóvel não encontrado'
      })
    }

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'IMOVEL',
      resourceId: id,
      resourceName: result.rows[0].descricao,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou imóvel específico'
    })

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    logError('Erro na API externa - imóvel específico', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/stats - Estatísticas públicas
router.get('/stats', async (req, res) => {
  try {
    const { municipalityId } = req.query

    let whereConditions = ['deleted_at IS NULL']
    let values = []
    let valueIndex = 1

    if (municipalityId) {
      whereConditions.push(`municipality_id = $${valueIndex++}`)
      values.push(municipalityId)
    }

    const whereClause = whereConditions.join(' AND ')

    const patrimoniosQuery = `
      SELECT COUNT(*) as total_patrimonios
      FROM patrimonios
      WHERE ${whereClause}
    `

    const imoveisQuery = `
      SELECT COUNT(*) as total_imoveis
      FROM imoveis
      ${municipalityId ? 'WHERE municipality_id = $1' : ''}
    `

    const municipalitiesQuery = `
      SELECT COUNT(*) as total_municipalities
      FROM municipalities
    `

    const [patrimoniosResult, imoveisResult, municipalitiesResult] = await Promise.all([
      pool.query(patrimoniosQuery, values),
      pool.query(imoveisQuery, municipalityId ? [municipalityId] : []),
      pool.query(municipalitiesQuery)
    ])

    const stats = {
      total_patrimonios: parseInt(patrimoniosResult.rows[0].total_patrimonios),
      total_imoveis: parseInt(imoveisResult.rows[0].total_imoveis),
      total_municipalities: parseInt(municipalitiesResult.rows[0].total_municipalities),
      last_updated: new Date().toISOString()
    }

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'STATS',
      resourceId: 'PUBLIC',
      resourceName: 'Estatísticas Públicas',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa acessou estatísticas públicas'
    })

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logError('Erro na API externa - estatísticas', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/external/search - Busca unificada
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all', limit = 50 } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro de busca "q" é obrigatório'
      })
    }

    const searchTerm = `%${q}%`
    const results = {
      patrimonios: [],
      imoveis: [],
      municipalities: []
    }

    // Buscar patrimônios
    if (type === 'all' || type === 'patrimonios') {
      const patrimoniosQuery = `
        SELECT 
          p.id, p.numero_patrimonio, p.descricao, p.setor,
          m.name as municipality_name,
          'patrimonio' as type
        FROM patrimonios p
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        WHERE p.deleted_at IS NULL 
          AND (p.descricao ILIKE $1 OR p.numero_patrimonio ILIKE $1)
        ORDER BY p.descricao
        LIMIT $2
      `
      const patrimoniosResult = await pool.query(patrimoniosQuery, [searchTerm, parseInt(limit)])
      results.patrimonios = patrimoniosResult.rows
    }

    // Buscar imóveis
    if (type === 'all' || type === 'imoveis') {
      const imoveisQuery = `
        SELECT 
          i.id, i.numero_patrimonio, i.descricao, i.endereco,
          m.name as municipality_name,
          'imovel' as type
        FROM imoveis i
        LEFT JOIN municipalities m ON i.municipality_id = m.id
        WHERE i.descricao ILIKE $1 OR i.numero_patrimonio ILIKE $1
        ORDER BY i.descricao
        LIMIT $2
      `
      const imoveisResult = await pool.query(imoveisQuery, [searchTerm, parseInt(limit)])
      results.imoveis = imoveisResult.rows
    }

    // Buscar municípios
    if (type === 'all' || type === 'municipalities') {
      const municipalitiesQuery = `
        SELECT 
          id, name, state,
          'municipality' as type
        FROM municipalities
        WHERE name ILIKE $1
        ORDER BY name
        LIMIT $2
      `
      const municipalitiesResult = await pool.query(municipalitiesQuery, [searchTerm, parseInt(limit)])
      results.municipalities = municipalitiesResult.rows
    }

    // Log de auditoria
    await auditService.logAuditEvent({
      userId: req.apiKey?.userId,
      userEmail: req.apiKey?.name || 'API_EXTERNAL',
      action: 'API_ACCESS',
      resourceType: 'SEARCH',
      resourceId: 'UNIFIED',
      resourceName: 'Busca Unificada',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info',
      category: 'api_access',
      description: 'API externa realizou busca unificada',
      metadata: { search: q, type, results_count: Object.values(results).flat().length }
    })

    res.json({
      success: true,
      data: results,
      search: q,
      total_results: Object.values(results).flat().length
    })
  } catch (error) {
    logError('Erro na API externa - busca', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
