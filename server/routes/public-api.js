import express from 'express';
// // import { rateLimit } from 'express-rate-limit';
import { query } from '../database/connection.js';
import { validateUUID } from '../middleware/validation.js';
// // import intelligentCache from '../services/cache/intelligentCache.js';
// // import advancedSearch from '../services/search/advancedSearch.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

// Rate limiting para API pública (temporariamente desabilitado)
// const publicApiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 100, // Máximo 100 requisições por IP
//   message: {
//     error: 'Muitas requisições. Tente novamente em 15 minutos.',
//     code: 'RATE_LIMIT_EXCEEDED'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Rate limiting mais restritivo para busca (temporariamente desabilitado)
// const searchLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutos
//   max: 30, // Máximo 30 buscas por IP
//   message: {
//     error: 'Muitas buscas. Tente novamente em 5 minutos.',
//     code: 'SEARCH_RATE_LIMIT_EXCEEDED'
//   }
// });

// Aplicar rate limiting (temporariamente desabilitado)
// router.use(publicApiLimiter);

/**
 * @swagger
 * /api/public/health:
 *   get:
 *     summary: Verificar saúde da API pública
 *     tags: [Public API]
 *     responses:
 *       200:
 *         description: API funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'SISPAT Public API'
    });
  } catch (error) {
    logError('Erro no health check da API pública:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/patrimonios:
 *   get:
 *     summary: Listar patrimônios públicos
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Itens por página
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do município
 *       - in: query
 *         name: sector
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do setor
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO, MANUTENCAO]
 *         description: Status do patrimônio
 *     responses:
 *       200:
 *         description: Lista de patrimônios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patrimonio'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/patrimonios', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      municipality,
      sector,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Validar parâmetros
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Construir query
    let sql = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.marca,
        p.modelo,
        p.valor_aquisicao,
        p.data_aquisicao,
        p.situacao_bem,
        p.status,
        p.fotos,
        p.created_at
      FROM patrimonios p
      WHERE p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    // Filtros
    if (municipality) {
      sql += ` AND p.municipality_id = $${paramIndex++}`;
      params.push(municipality);
    }

    if (sector) {
      sql += ` AND p.sector_id = $${paramIndex++}`;
      params.push(sector);
    }

    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    // Contar total
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total);

    // Validar campos de ordenação para evitar SQL injection
    const allowedSortFields = ['created_at', 'numero_patrimonio', 'descricao', 'valor_aquisicao', 'data_aquisicao'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Ordenação e paginação
    sql += ` ORDER BY p.${safeSortBy} ${safeSortOrder}`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    const patrimonios = result.rows;

    // Formatar dados
    const formattedPatrimonios = patrimonios.map(p => ({
      id: p.id,
      numeroPatrimonio: p.numero_patrimonio,
      descricao: p.descricao,
      tipo: p.tipo,
      marca: p.marca,
      modelo: p.modelo,
      valorAquisicao: parseFloat(p.valor_aquisicao || 0),
      dataAquisicao: p.data_aquisicao,
      situacaoBem: p.situacao_bem,
      status: p.status,
      fotos: p.fotos ? JSON.parse(p.fotos) : [],
      createdAt: p.created_at
    }));

    res.json({
      data: formattedPatrimonios,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    logError('Erro ao buscar patrimônios públicos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/patrimonios/{id}:
 *   get:
 *     summary: Obter detalhes de um patrimônio
 *     tags: [Public API]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do patrimônio
 *     responses:
 *       200:
 *         description: Detalhes do patrimônio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patrimonio'
 *       404:
 *         description: Patrimônio não encontrado
 */
router.get('/patrimonios/:id', validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.*,
        s.nome as setor_nome,
        m.nome as municipio_nome
      FROM patrimonios p
      LEFT JOIN sectors s ON p.sector_id = s.id
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Patrimônio não encontrado',
        code: 'PATRIMONIO_NOT_FOUND'
      });
    }

    const patrimonio = result.rows[0];

    // Formatar resposta
    const formattedPatrimonio = {
      id: patrimonio.id,
      numeroPatrimonio: patrimonio.numero_patrimonio,
      descricao: patrimonio.descricao,
      tipo: patrimonio.tipo,
      marca: patrimonio.marca,
      modelo: patrimonio.modelo,
      numeroSerie: patrimonio.numero_serie,
      estado: patrimonio.estado,
      valorAquisicao: parseFloat(patrimonio.valor_aquisicao || 0),
      dataAquisicao: patrimonio.data_aquisicao,
      fornecedor: patrimonio.fornecedor,
      notaFiscal: patrimonio.nota_fiscal,
      situacaoBem: patrimonio.situacao_bem,
      status: patrimonio.status,
      fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
      documentos: patrimonio.documentos ? JSON.parse(patrimonio.documentos) : [],
      setor: patrimonio.setor_nome,
      municipio: patrimonio.municipio_nome,
      createdAt: patrimonio.created_at,
      updatedAt: patrimonio.updated_at
    };

    res.json(formattedPatrimonio);

  } catch (error) {
    logError('Erro ao buscar patrimônio público:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/search:
 *   get:
 *     summary: Busca avançada em patrimônios
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: strategy
 *         schema:
 *           type: string
 *           enum: [fullText, fuzzy, tag, semantic]
 *           default: fullText
 *         description: Estratégia de busca
 *       - in: query
 *         name: filters
 *         schema:
 *           type: object
 *         description: Filtros adicionais
 *     responses:
 *       200:
 *         description: Resultados da busca
 */
router.get('/search', async (req, res) => {
  try {
    const { q, strategy = 'fullText', filters = {} } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Termo de busca deve ter pelo menos 2 caracteres',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    // Usar sistema de busca avançada (temporariamente desabilitado)
    // const searchResult = await advancedSearch.search(q, {
    //   type: 'patrimonios',
    //   strategy,
    //   filters: JSON.parse(filters),
    //   limit: 50,
    //   useCache: true
    // });

    // Por enquanto, retornar busca simples
    res.json({
      success: true,
      message: 'Busca avançada temporariamente desabilitada',
      data: []
    });

  } catch (error) {
    logError('Erro na busca pública:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/municipalities:
 *   get:
 *     summary: Listar municípios disponíveis
 *     tags: [Public API]
 *     responses:
 *       200:
 *         description: Lista de municípios
 */
router.get('/municipalities', async (req, res) => {
  try {
    // const cacheKey = 'public_municipalities';
    // const cached = await intelligentCache.get(cacheKey);
    
    // if (cached) {
    //   return res.json(cached);
    // }

    const sql = `
      SELECT 
        id,
        name,
        state,
        created_at
      FROM municipalities
      ORDER BY name
    `;

    const result = await query(sql);
    const municipalities = result.rows.map(m => ({
      id: m.id,
      nome: m.name,
      uf: m.state,
      createdAt: m.created_at
    }));

    // await intelligentCache.set(cacheKey, municipalities, { ttl: 3600 });
    res.json(municipalities);

  } catch (error) {
    logError('Erro ao buscar municípios públicos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/sectors/{municipalityId}:
 *   get:
 *     summary: Listar setores de um município
 *     tags: [Public API]
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do município
 *     responses:
 *       200:
 *         description: Lista de setores
 */
router.get('/sectors/:municipalityId', validateUUID('municipalityId'), async (req, res) => {
  try {
    const { municipalityId } = req.params;

    // const cacheKey = `public_sectors_${municipalityId}`;
    // const cached = await intelligentCache.get(cacheKey);
    
    // if (cached) {
    //   return res.json(cached);
    // }

    const sql = `
      SELECT 
        id,
        name,
        codigo,
        parent_id
      FROM sectors
      WHERE municipality_id = $1
      ORDER BY name
    `;

    const result = await query(sql, [municipalityId]);
    const sectors = result.rows.map(s => ({
      id: s.id,
      nome: s.name,
      codigo: s.codigo,
      parentId: s.parent_id
    }));

    // await intelligentCache.set(cacheKey, sectors, { ttl: 1800 });
    res.json(sectors);

  } catch (error) {
    logError('Erro ao buscar setores públicos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/stats:
 *   get:
 *     summary: Estatísticas públicas do sistema
 *     tags: [Public API]
 *     responses:
 *       200:
 *         description: Estatísticas gerais
 */
router.get('/stats', async (req, res) => {
  try {
    // const cacheKey = 'public_stats';
    // const cached = await intelligentCache.get(cacheKey);
    
    // if (cached) {
    //   return res.json(cached);
    // }

    const [
      patrimoniosCount,
      totalValue,
      municipalitiesCount,
      sectorsCount
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM patrimonios WHERE deleted_at IS NULL'),
      query('SELECT SUM(valor_aquisicao) as total FROM patrimonios WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM municipalities'),
      query('SELECT COUNT(*) as count FROM sectors')
    ]);

    const stats = {
      patrimonios: {
        total: parseInt(patrimoniosCount.rows[0].count),
        valorTotal: parseFloat(totalValue.rows[0].total || 0)
      },
      municipalities: parseInt(municipalitiesCount.rows[0].count),
      sectors: parseInt(sectorsCount.rows[0].count),
      lastUpdated: new Date().toISOString()
    };

    // await intelligentCache.set(cacheKey, stats, { ttl: 1800 });
    res.json(stats);

  } catch (error) {
    logError('Erro ao buscar estatísticas públicas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/public/webhooks:
 *   post:
 *     summary: Registrar webhook
 *     tags: [Public API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [patrimonio.created, patrimonio.updated, patrimonio.deleted]
 *     responses:
 *       201:
 *         description: Webhook registrado com sucesso
 */
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events } = req.body;

    // Validação básica
    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'URL e eventos são obrigatórios',
        code: 'INVALID_WEBHOOK_DATA'
      });
    }

    // Em produção, você salvaria no banco de dados
    // Por enquanto, apenas simular
    const webhook = {
      id: `webhook_${Date.now()}`,
      url,
      events,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    logInfo('Webhook registrado:', webhook);

    res.status(201).json({
      message: 'Webhook registrado com sucesso',
      webhook
    });

  } catch (error) {
    logError('Erro ao registrar webhook:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Middleware de erro para API pública
router.use((error, req, res, next) => {
  logError('Erro na API pública:', error);
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;
