import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import { authenticateToken, requireSupervisor } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all locals (filtered by municipality)
router.get('/', async (req, res) => {
  try {
    let localsQuery = `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.sector_id as "sectorId",
        l.municipality_id as "municipalityId",
        l.created_by,
        l.created_at,
        l.updated_at,
        s.name as sector_name,
        m.name as municipality_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      LEFT JOIN municipalities m ON l.municipality_id = m.id
    `;

    const params = [];
    let whereClause = '';

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE l.municipality_id = $1';
      params.push(req.user.municipality_id);
    }

    // Controle de acesso baseado em setores para usuários normais
    if (req.user.role === 'usuario' || req.user.role === 'visualizador') {
      // Buscar setores atribuídos ao usuário
      const userSectors = await getRows(
        `
        SELECT us.sector_id, s.name as sector_name
        FROM user_sectors us
        JOIN sectors s ON us.sector_id = s.id
        WHERE us.user_id = $1
      `,
        [req.user.id]
      );

      if (userSectors.length > 0) {
        const sectorIds = userSectors.map(s => s.sector_id);
        const sectorNames = userSectors.map(s => s.sector_name);
        console.log('🔍 Usuário tem acesso aos setores:', sectorNames);
        console.log('🔍 IDs dos setores:', sectorIds);

        // Filtrar por IDs dos setores (mais eficiente que por nome)
        const sectorFilter = ` AND l.sector_id = ANY($${params.length + 1})`;
        whereClause += sectorFilter;
        params.push(sectorIds);
      } else {
        console.log('⚠️ Usuário sem setores atribuídos - sem acesso a locais');
        return res.json([]);
      }
    }

    localsQuery += whereClause + ' ORDER BY l.name';

    const locals = await getRows(localsQuery, params);
    res.json(locals);
  } catch (error) {
    console.error('Get locals error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get locals by user's assigned sectors (MUST come before /:id route)
router.get('/user-sectors', async (req, res) => {
  try {
    console.log(
      '🔍 Buscando locais dos setores do usuário:',
      req.user?.id,
      req.user?.role
    );

    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.log('❌ Usuário não autenticado');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Se for superusuário ou supervisor, retorna todos os locais do município
    if (req.user.role === 'superuser' || req.user.role === 'supervisor') {
      console.log(
        '🔍 Usuário é supervisor/superusuário, buscando todos os locais do município'
      );

      if (!req.user.municipality_id) {
        console.log('⚠️ Usuário supervisor/superusuário sem municipality_id');
        return res.json([]);
      }

      const locals = await getRows(
        `
        SELECT 
          l.id,
          l.name,
          l.description,
          l.sector_id as "sectorId",
          l.municipality_id as "municipalityId",
          l.created_by,
          l.created_at,
          l.updated_at,
          s.name as sector_name,
          m.name as municipality_name
        FROM locals l
        LEFT JOIN sectors s ON l.sector_id = s.id
        LEFT JOIN municipalities m ON l.municipality_id = m.id
        WHERE l.municipality_id = $1
        ORDER BY s.name, l.name
      `,
        [req.user.municipality_id]
      );

      console.log('✅ Retornando todos os locais do município:', locals.length);
      return res.json(locals);
    }

    // Para usuários normais, buscar locais dos setores atribuídos
    console.log('🔍 Buscando setores do usuário:', req.user.id);

    // Verificar se a tabela user_sectors existe
    try {
      const tableCheck = await getRow(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sectors'
        )
      `);

      if (!tableCheck.exists) {
        console.log('⚠️ Tabela user_sectors não existe');
        return res.json([]);
      }
    } catch (tableError) {
      console.error('❌ Erro ao verificar tabela user_sectors:', tableError);
      return res.json([]);
    }

    // Buscar setores atribuídos ao usuário
    const userSectors = await getRows(
      `
      SELECT 
        us.sector_id,
        s.name as sector_name,
        s.municipality_id
      FROM user_sectors us
      JOIN sectors s ON us.sector_id = s.id
      WHERE us.user_id = $1
    `,
      [req.user.id]
    );

    console.log('🔍 Setores encontrados para o usuário:', userSectors.length);

    if (userSectors.length === 0) {
      console.log('⚠️ Usuário sem setores atribuídos');
      return res.json([]);
    }

    const sectorIds = userSectors.map(s => s.sector_id);
    console.log('🔍 IDs dos setores do usuário:', sectorIds);
    console.log(
      '🔍 Nomes dos setores do usuário:',
      userSectors.map(s => s.sector_name)
    );

    // Buscar locais para esses setores - versão simplificada
    let locals = [];
    for (const sectorId of sectorIds) {
      try {
        const sectorLocals = await getRows(
          `
          SELECT 
            l.id,
            l.name,
            l.description,
            l.sector_id as "sectorId",
            l.municipality_id as "municipalityId",
            l.created_by,
            l.created_at,
            l.updated_at,
            s.name as sector_name,
            m.name as municipality_name
          FROM locals l
          LEFT JOIN sectors s ON l.sector_id = s.id
          LEFT JOIN municipalities m ON l.municipality_id = m.id
          WHERE l.sector_id = $1
          ORDER BY l.name
        `,
          [sectorId]
        );
        locals = locals.concat(sectorLocals);
      } catch (sectorError) {
        console.error(
          `❌ Erro ao buscar locais do setor ${sectorId}:`,
          sectorError
        );
        // Continua com os outros setores
      }
    }

    console.log(
      '✅ Locais encontrados para os setores do usuário:',
      locals.length
    );
    res.json(locals);
  } catch (error) {
    console.error('❌ Erro ao buscar locais dos setores do usuário:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Get local by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const local = await getRow(
      `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.sector_id as "sectorId",
        l.municipality_id as "municipalityId",
        l.created_by,
        l.created_at,
        l.updated_at,
        s.name as sector_name,
        m.name as municipality_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      LEFT JOIN municipalities m ON l.municipality_id = m.id
      WHERE l.id = $1
    `,
      [id]
    );

    if (!local) {
      return res.status(404).json({ error: 'Local não encontrado' });
    }

    // Check if user has access to this local's municipality
    if (
      req.user.role !== 'superuser' &&
      local.municipalityId !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!local) {
      return res.status(404).json({ error: 'Local não encontrado' });
    }

    // Check if user has access to this local's municipality
    if (
      req.user.role !== 'superuser' &&
      local.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(local);
  } catch (error) {
    console.error('Get local error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create local
router.post('/', requireSupervisor, async (req, res) => {
  try {
    console.log('🔄 POST /locals - Criando novo local');
    console.log(
      '👤 Usuário:',
      req.user.name,
      'Role:',
      req.user.role,
      'Municipality:',
      req.user.municipality_id
    );
    console.log('📋 Dados recebidos:', req.body);

    const { name, sectorId } = req.body;

    // Validation
    if (!name || !sectorId) {
      console.log('❌ Validação falhou - campos obrigatórios faltando');
      return res.status(400).json({
        error: 'Nome e setor são obrigatórios',
      });
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id;
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId;
    }

    console.log('🏛️ Municipality ID definido:', municipalityId);

    // Check if sector exists and belongs to the municipality
    console.log('🔍 Verificando setor:', sectorId);
    const sector = await getRow(
      'SELECT id, municipality_id FROM sectors WHERE id = $1',
      [sectorId]
    );

    if (!sector) {
      console.log('❌ Setor não encontrado:', sectorId);
      return res.status(400).json({ error: 'Setor não encontrado' });
    }

    console.log('✅ Setor encontrado:', sector);

    if (sector.municipality_id !== municipalityId) {
      console.log('❌ Setor não pertence ao município');
      return res.status(400).json({
        error: 'Setor deve pertencer ao mesmo município',
      });
    }

    // Create local
    console.log('🔄 Criando local no banco...');
    const result = await query(
      `
      INSERT INTO locals (name, sector_id, municipality_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        name,
        description,
        sector_id as "sectorId",
        municipality_id as "municipalityId",
        created_by,
        created_at,
        updated_at
    `,
      [name, sectorId, municipalityId, req.user.id]
    );

    const newLocal = result.rows[0];
    console.log('✅ Local criado com sucesso:', newLocal);

    // Log activity (skip for now to avoid errors)
    try {
      console.log('🔄 Tentando registrar atividade...');
      await query(
        'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          req.user.name,
          'LOCAL_CREATE',
          `Local "${name}" criado.`,
          municipalityId,
        ]
      );
      console.log('✅ Atividade registrada com sucesso');
    } catch (activityError) {
      console.log(
        '⚠️ Erro ao registrar atividade (ignorando):',
        activityError.message
      );
      // Continue even if activity log fails
    }

    res.status(201).json(newLocal);
  } catch (error) {
    console.error('❌ Erro ao criar local:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Update local
router.put('/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sectorId } = req.body;

    // Check if local exists
    const existingLocal = await getRow(
      'SELECT name, municipality_id FROM locals WHERE id = $1',
      [id]
    );

    if (!existingLocal) {
      return res.status(404).json({ error: 'Local não encontrado' });
    }

    // Check if user has access to this local's municipality
    if (
      req.user.role !== 'superuser' &&
      existingLocal.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Validate sector if provided
    if (sectorId) {
      const sector = await getRow(
        'SELECT id, municipality_id FROM sectors WHERE id = $1',
        [sectorId]
      );

      if (!sector) {
        return res.status(400).json({ error: 'Setor não encontrado' });
      }

      if (sector.municipality_id !== existingLocal.municipality_id) {
        return res.status(400).json({
          error: 'Setor deve pertencer ao mesmo município',
        });
      }
    }

    // Update local
    const result = await query(
      `
      UPDATE locals SET
        name = COALESCE($1, name),
        sector_id = COALESCE($2, sector_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING 
        id,
        name,
        description,
        sector_id as "sectorId",
        municipality_id as "municipalityId",
        created_by,
        created_at,
        updated_at
    `,
      [name, sectorId, id]
    );

    const updatedLocal = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'LOCAL_UPDATE',
        `Local "${updatedLocal.name}" atualizado.`,
        existingLocal.municipality_id,
      ]
    );

    res.json(updatedLocal);
  } catch (error) {
    console.error('Update local error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete local
router.delete('/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if local exists
    const existingLocal = await getRow(
      'SELECT name, municipality_id FROM locals WHERE id = $1',
      [id]
    );

    if (!existingLocal) {
      return res.status(404).json({ error: 'Local não encontrado' });
    }

    // Check if user has access to this local's municipality
    if (
      req.user.role !== 'superuser' &&
      existingLocal.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Check if local has patrimonios
    const patrimonios = await getRow(
      'SELECT COUNT(*) as count FROM patrimonios WHERE local_objeto = (SELECT name FROM locals WHERE id = $1)',
      [id]
    );

    if (parseInt(patrimonios.count) > 0) {
      return res.status(400).json({
        error:
          'Não é possível excluir um local que possui patrimônios vinculados',
      });
    }

    // Delete local
    await query('DELETE FROM locals WHERE id = $1', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'LOCAL_DELETE',
        `Local "${existingLocal.name}" excluído.`,
        existingLocal.municipality_id,
      ]
    );

    res.json({ message: 'Local excluído com sucesso' });
  } catch (error) {
    console.error('Delete local error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get locals by municipality
router.get('/municipality/:municipalityId', async (req, res) => {
  try {
    const { municipalityId } = req.params;

    // Check if user has access to this municipality
    if (
      req.user.role !== 'superuser' &&
      req.user.municipality_id !== municipalityId
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const locals = await getRows(
      `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.sector_id as "sectorId",
        l.municipality_id as "municipalityId",
        l.created_by,
        l.created_at,
        l.updated_at,
        s.name as sector_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE l.municipality_id = $1
      ORDER BY l.name
    `,
      [municipalityId]
    );

    res.json(locals);
  } catch (error) {
    console.error('Get locals by municipality error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get locals by sector
router.get('/sector/:sectorId', async (req, res) => {
  try {
    const { sectorId } = req.params;

    // Check if sector exists and user has access
    const sector = await getRow(
      'SELECT municipality_id FROM sectors WHERE id = $1',
      [sectorId]
    );

    if (!sector) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    if (
      req.user.role !== 'superuser' &&
      sector.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const locals = await getRows(
      `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.sector_id as "sectorId",
        l.municipality_id as "municipalityId",
        l.created_by,
        l.created_at,
        l.updated_at,
        s.name as sector_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE l.sector_id = $1
      ORDER BY l.name
    `,
      [sectorId]
    );

    res.json(locals);
  } catch (error) {
    console.error('Get locals by sector error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Test endpoint to check user_sectors table
router.get('/test-user-sectors', async (req, res) => {
  try {
    console.log('🧪 Testando tabela user_sectors para usuário:', req.user.id);

    // Primeiro, verificar se a tabela user_sectors existe
    const tableExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sectors'
      )
    `);

    console.log('🧪 Tabela user_sectors existe:', tableExists.exists);

    if (!tableExists.exists) {
      return res.json({
        error: 'Tabela user_sectors não existe',
        userId: req.user.id,
        userRole: req.user.role,
      });
    }

    // Verificar se a tabela user_sectors tem dados
    const userSectors = await getRows(
      `
      SELECT 
        us.user_id,
        us.sector_id,
        us.is_primary,
        s.name as sector_name,
        s.municipality_id
      FROM user_sectors us
      JOIN sectors s ON us.sector_id = s.id
      WHERE us.user_id = $1
    `,
      [req.user.id]
    );

    console.log('🧪 Dados encontrados na user_sectors:', userSectors);

    res.json({
      userId: req.user.id,
      userRole: req.user.role,
      userSectors: userSectors,
      count: userSectors.length,
      tableExists: tableExists.exists,
    });
  } catch (error) {
    console.error('❌ Erro no teste user_sectors:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      stack: error.stack,
    });
  }
});

// Get locals by sector (for users to see their sector's locals)
router.get('/my-sector/:sectorId', async (req, res) => {
  try {
    const { sectorId } = req.params;

    // Verificar se o usuário tem acesso a este setor
    if (req.user.role === 'usuario' || req.user.role === 'visualizador') {
      const hasAccess = await getRow(
        `
        SELECT 1 FROM user_sectors 
        WHERE user_id = $1 AND sector_id = $2
      `,
        [req.user.id, sectorId]
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso negado a este setor' });
      }
    }

    // Verificar se o setor pertence ao município do usuário
    const sector = await getRow(
      `
      SELECT municipality_id FROM sectors WHERE id = $1
    `,
      [sectorId]
    );

    if (!sector) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    if (
      req.user.role !== 'superuser' &&
      sector.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const locals = await getRows(
      `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.sector_id as "sectorId",
        l.municipality_id as "municipalityId",
        l.created_by,
        l.created_at,
        l.updated_at,
        s.name as sector_name,
        m.name as municipality_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      LEFT JOIN municipalities m ON l.municipality_id = m.id
      WHERE l.sector_id = $1
      ORDER BY l.name
    `,
      [sectorId]
    );

    res.json(locals);
  } catch (error) {
    console.error('Get locals by sector error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Debug route to check table structure
router.get('/debug/check-tables', async (req, res) => {
  try {
    console.log('🔍 Verificando estrutura das tabelas...');

    // Check if locals table exists
    const localsExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'locals'
      )
    `);

    // Check if activity_logs table exists
    const activityLogsExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      )
    `);

    // Get locals table structure
    const localsColumns = await getRows(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'locals'
      ORDER BY ordinal_position
    `);

    // Get activity_logs table structure
    const activityLogsColumns = await getRows(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
      ORDER BY ordinal_position
    `);

    console.log('📋 Tabela locals existe:', localsExists.exists);
    console.log('📋 Tabela activity_logs existe:', activityLogsExists.exists);

    res.json({
      locals: {
        exists: localsExists.exists,
        columns: localsColumns,
      },
      activityLogs: {
        exists: activityLogsExists.exists,
        columns: activityLogsColumns,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
