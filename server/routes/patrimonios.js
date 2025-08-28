import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import {
  authenticateToken,
  requireSupervisor,
  requireUser,
} from '../middleware/auth.js';
import {
  invalidatePatrimoniosCache,
  patrimoniosCacheMiddleware,
} from '../middleware/cacheMiddleware.js';
import { validateUUID } from '../middleware/validation.js';
import {
  buildPaginatedQuery,
  executePaginatedQuery,
  paginationMiddleware,
  sendPaginatedResponse,
} from '../utils/pagination.js';

const router = express.Router();

// Função simples para validar e limitar tamanho de imagens base64
function validateAndLimitImageSize(base64String, maxSizeInMB = 5) {
  try {
    // Remover o prefixo data:image/...;base64, para obter apenas os dados
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

    // Calcular tamanho em bytes
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const sizeInMB = sizeInBytes / (1024 * 1024);

    console.log(`📸 Tamanho da imagem: ${sizeInMB.toFixed(2)} MB`);

    if (sizeInMB > maxSizeInMB) {
      console.log(
        `⚠️ Imagem muito grande (${sizeInMB.toFixed(2)} MB). Máximo permitido: ${maxSizeInMB} MB`
      );
      return null; // Retornar null para indicar que a imagem deve ser rejeitada
    }

    return base64String; // Retornar a imagem original se estiver dentro do limite
  } catch (error) {
    console.log('⚠️ Erro ao validar imagem:', error.message);
    return null;
  }
}

// Função para validar array de imagens
function validateImages(images, maxSizeInMB = 5) {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  const validImages = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i];
      if (typeof image === 'string' && image.startsWith('data:image')) {
        console.log(`📸 Validando imagem ${i + 1}/${images.length}...`);
        const validated = validateAndLimitImageSize(image, maxSizeInMB);
        if (validated) {
          validImages.push(validated);
        } else {
          console.log(`❌ Imagem ${i + 1} rejeitada por ser muito grande`);
        }
      } else {
        validImages.push(image);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao validar imagem ${i + 1}:`, error.message);
    }
  }

  return validImages;
}

// Test route to check database connection (NO AUTH REQUIRED)
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando conexão com banco');

    // Simple test query
    const result = await getRow('SELECT 1 as test');
    console.log('✅ Conexão OK:', result);

    res.json({ success: true, message: 'Conexão OK', result });
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    res.status(500).json({ error: 'Erro de conexão', details: error.message });
  }
});

// Test route to check if patrimonios table exists (NO AUTH REQUIRED)
router.get('/test-table', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando tabela patrimonios');

    // Check if table exists
    const tableExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patrimonios'
      ) as exists
    `);

    if (!tableExists.exists) {
      return res
        .status(404)
        .json({ error: 'Tabela patrimonios não encontrada' });
    }

    // Get table structure
    const columns = await getRows(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios' 
      ORDER BY ordinal_position
    `);

    // Get total records
    const totalRecords = await getRow(
      'SELECT COUNT(*) as count FROM patrimonios'
    );

    // Get sample data
    const sampleData = await getRows('SELECT * FROM patrimonios LIMIT 1');

    console.log('✅ Tabela patrimonios encontrada');
    console.log('📊 Total de registros:', totalRecords.count);
    console.log('📋 Colunas:', columns.length);

    res.json({
      success: true,
      message: 'Tabela patrimonios OK',
      tableExists: true,
      columns: columns.length,
      totalRecords: totalRecords.count,
      sampleColumns: columns.slice(0, 10),
      sampleData: sampleData[0] || null,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
    res
      .status(500)
      .json({ error: 'Erro ao verificar tabela', details: error.message });
  }
});

// Test route for public patrimonios query (NO AUTH REQUIRED)
router.get('/test-public-query', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando query pública');

    const { municipalityId } = req.query;
    console.log('🔍 MunicipalityId:', municipalityId);

    // Test basic query without filters
    console.log('🔍 Testando query básica...');
    const basicQuery =
      'SELECT COUNT(*) as count FROM patrimonios WHERE deleted_at IS NULL';
    const basicResult = await getRow(basicQuery);
    console.log('✅ Query básica OK:', basicResult);

    // Test query with municipality filter
    if (municipalityId) {
      console.log('🔍 Testando query com filtro de município...');
      const municipalityQuery = `
        SELECT COUNT(*) as count 
        FROM patrimonios 
        WHERE municipality_id = $1 AND deleted_at IS NULL
      `;
      const municipalityResult = await getRow(municipalityQuery, [
        municipalityId,
      ]);
      console.log('✅ Query com município OK:', municipalityResult);

      // Test full query
      console.log('🔍 Testando query completa...');
      const fullQuery = `
        SELECT 
          id,
          numero_patrimonio,
          descricao_bem,
          descricao,
          setor_responsavel,
          local_objeto,
          situacao_bem,
          status,
          tipo,
          data_aquisicao,
          valor_aquisicao,
          fotos,
          municipality_id
        FROM patrimonios
        WHERE municipality_id = $1 AND deleted_at IS NULL
        ORDER BY numero_patrimonio
        LIMIT 10
      `;
      const fullResult = await getRows(fullQuery, [municipalityId]);
      console.log('✅ Query completa OK:', fullResult.length, 'registros');

      res.json({
        success: true,
        basicCount: basicResult.count,
        municipalityCount: municipalityResult.count,
        sampleData: fullResult.slice(0, 3),
      });
    } else {
      res.json({
        success: true,
        basicCount: basicResult.count,
        message: 'MunicipalityId não fornecido',
      });
    }
  } catch (error) {
    console.error('❌ Erro no teste da query pública:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro no teste da query pública',
      details: error.message,
      stack: error.stack,
    });
  }
});

// Simple test route for public patrimonios (NO AUTH REQUIRED)
router.get('/test-simple-public', async (req, res) => {
  try {
    console.log('🧪 TESTE SIMPLES - Rota pública');

    const { municipalityId } = req.query;
    console.log('🔍 MunicipalityId:', municipalityId);

    if (!municipalityId) {
      return res.json({
        success: true,
        message: 'MunicipalityId não fornecido',
        data: [],
      });
    }

    // Simple query
    const query = `
      SELECT 
        id,
        numero_patrimonio,
        descricao_bem,
        descricao,
        municipality_id
      FROM patrimonios
      WHERE municipality_id = $1 AND deleted_at IS NULL
      LIMIT 5
    `;

    console.log('🔍 Executando query simples...');
    const result = await getRows(query, [municipalityId]);
    console.log('✅ Query executada com sucesso:', result.length, 'registros');

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('❌ Erro na rota simples:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro na rota simples',
      details: error.message,
      stack: error.stack,
    });
  }
});

// Test route to check simple query (NO AUTH REQUIRED)
router.get('/test-simple', async (req, res) => {
  try {
    console.log('🧪 TESTE - Query simples de patrimônios');

    // Simple query without pagination
    const patrimonios = await getRows(`
      SELECT 
        id,
        numero_patrimonio,
        descricao,
        valor_aquisicao,
        municipality_id
      FROM patrimonios 
      WHERE deleted_at IS NULL
      LIMIT 5
    `);

    console.log('✅ Patrimônios encontrados:', patrimonios.length);

    res.json({
      success: true,
      message: 'Query simples OK',
      count: patrimonios.length,
      patrimonios: patrimonios,
    });
  } catch (error) {
    console.error('❌ Erro na query simples:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro na query simples', details: error.message });
  }
});

// Test route to check main query without pagination (NO AUTH REQUIRED)
router.get('/test-main-query', async (req, res) => {
  try {
    console.log('🧪 TESTE - Query principal sem paginação');

    // Main query without pagination
    const patrimoniosQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.tipo,
        p.marca,
        p.modelo,
        p.numero_serie,
        p.estado as situacao_bem,
        p.status,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.fornecedor as forma_aquisicao,
        p.nota_fiscal as numero_nota_fiscal,
        p.local_id,
        p.sector_id,
        l.name as local_objeto,
        s.name as setor_responsavel,
        p.cor,
        p.quantidade,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.numero_patrimonio
      LIMIT 5
    `;

    console.log('📋 Executando query principal...');
    const patrimonios = await getRows(patrimoniosQuery);
    console.log('✅ Patrimônios encontrados:', patrimonios.length);

    // Processar cada patrimônio
    const processedPatrimonios = patrimonios.map(patrimonio => ({
      ...patrimonio,
      fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
      documentos: patrimonio.documentos
        ? JSON.parse(patrimonio.documentos)
        : [],
      valor_aquisicao: parseFloat(patrimonio.valor_aquisicao) || 0,
      valor_residual: parseFloat(patrimonio.valor_residual) || 0,
      quantidade: parseInt(patrimonio.quantidade) || 1,
      vida_util_anos: parseInt(patrimonio.vida_util_anos) || 0,
    }));

    res.json({
      success: true,
      message: 'Query principal OK',
      count: processedPatrimonios.length,
      patrimonios: processedPatrimonios,
    });
  } catch (error) {
    console.error('❌ Erro na query principal:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro na query principal', details: error.message });
  }
});

// Test route to check pagination (NO AUTH REQUIRED)
router.get('/test-pagination', async (req, res) => {
  try {
    console.log('🧪 TESTE - Paginação simples');

    // Test pagination with simple query
    const limit = 5;
    const offset = 0;

    const patrimoniosQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.valor_aquisicao,
        p.municipality_id
      FROM patrimonios p
      WHERE p.deleted_at IS NULL
      ORDER BY p.numero_patrimonio
      LIMIT $1 OFFSET $2
    `;

    console.log('📋 Executando query com paginação...');
    const patrimonios = await getRows(patrimoniosQuery, [limit, offset]);
    console.log('✅ Patrimônios encontrados:', patrimonios.length);

    // Count total
    const countQuery =
      'SELECT COUNT(*) as total FROM patrimonios WHERE deleted_at IS NULL';
    const countResult = await getRow(countQuery);
    const total = parseInt(countResult.total);

    res.json({
      success: true,
      message: 'Paginação simples OK',
      count: patrimonios.length,
      total: total,
      limit: limit,
      offset: offset,
      patrimonios: patrimonios,
    });
  } catch (error) {
    console.error('❌ Erro na paginação:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro na paginação', details: error.message });
  }
});

// Test route to check buildPaginatedQuery function (NO AUTH REQUIRED)
router.get('/test-build-pagination', async (req, res) => {
  try {
    console.log('🧪 TESTE - Função buildPaginatedQuery');

    // Test parameters
    const baseQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.valor_aquisicao,
        p.municipality_id
      FROM patrimonios p
      WHERE p.deleted_at IS NULL
    `;

    const params = {
      limit: 5,
      cursor: null,
      sort: 'numero_patrimonio',
      order: 'ASC',
      search: '',
      filters: {},
    };

    console.log('📋 Testando buildPaginatedQuery...');
    const result = buildPaginatedQuery(baseQuery, params, 'p');

    console.log('📋 Query gerada:', result.query);
    console.log('📋 Parâmetros:', result.params);

    // Test the generated query
    const patrimonios = await getRows(result.query, result.params);
    console.log('✅ Patrimônios encontrados:', patrimonios.length);

    res.json({
      success: true,
      message: 'buildPaginatedQuery OK',
      generatedQuery: result.query,
      generatedParams: result.params,
      count: patrimonios.length,
      patrimonios: patrimonios,
    });
  } catch (error) {
    console.error('❌ Erro na buildPaginatedQuery:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro na buildPaginatedQuery', details: error.message });
  }
});

// Test route to check main query with buildPaginatedQuery (NO AUTH REQUIRED)
router.get('/test-main-with-pagination', async (req, res) => {
  try {
    console.log('🧪 TESTE - Query principal com buildPaginatedQuery');

    // Main query base
    const baseQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.tipo,
        p.marca,
        p.modelo,
        p.numero_serie,
        p.estado as situacao_bem,
        p.status,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.fornecedor as forma_aquisicao,
        p.nota_fiscal as numero_nota_fiscal,
        p.local_id,
        p.sector_id,
        l.name as local_objeto,
        s.name as setor_responsavel,
        p.cor,
        p.quantidade,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.deleted_at IS NULL
    `;

    const params = {
      limit: 5,
      cursor: null,
      sort: 'numero_patrimonio',
      order: 'ASC',
      search: '',
      filters: {},
    };

    console.log('📋 Testando query principal com buildPaginatedQuery...');
    const result = buildPaginatedQuery(baseQuery, params, 'p');

    console.log('📋 Query gerada:', result.query);
    console.log('📋 Parâmetros:', result.params);

    // Test the generated query
    const patrimonios = await getRows(result.query, result.params);
    console.log('✅ Patrimônios encontrados:', patrimonios.length);

    // Processar cada patrimônio
    const processedPatrimonios = patrimonios.map(patrimonio => ({
      ...patrimonio,
      fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
      documentos: patrimonio.documentos
        ? JSON.parse(patrimonio.documentos)
        : [],
      valor_aquisicao: parseFloat(patrimonio.valor_aquisicao) || 0,
      valor_residual: parseFloat(patrimonio.valor_residual) || 0,
      quantidade: parseInt(patrimonio.quantidade) || 1,
      vida_util_anos: parseInt(patrimonio.vida_util_anos) || 0,
    }));

    res.json({
      success: true,
      message: 'Query principal com buildPaginatedQuery OK',
      generatedQuery: result.query,
      generatedParams: result.params,
      count: processedPatrimonios.length,
      patrimonios: processedPatrimonios,
    });
  } catch (error) {
    console.error('❌ Erro na query principal com buildPaginatedQuery:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro na query principal com buildPaginatedQuery',
      details: error.message,
    });
  }
});

// Test route to check executePaginatedQuery function (NO AUTH REQUIRED)
router.get('/test-execute-pagination', async (req, res) => {
  try {
    console.log('🧪 TESTE - Função executePaginatedQuery');

    // Main query base
    const baseQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.valor_aquisicao,
        p.municipality_id
      FROM patrimonios p
      WHERE p.deleted_at IS NULL
    `;

    const params = {
      limit: 5,
      cursor: null,
      sort: 'numero_patrimonio',
      order: 'ASC',
      search: '',
      filters: {},
    };

    console.log('📋 Testando executePaginatedQuery...');
    const result = await executePaginatedQuery(getRows, baseQuery, params, 'p');

    console.log('📋 Resultado:', result);

    res.json({
      success: true,
      message: 'executePaginatedQuery OK',
      result: result,
    });
  } catch (error) {
    console.error('❌ Erro na executePaginatedQuery:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro na executePaginatedQuery', details: error.message });
  }
});

// Get count of patrimonios (for dashboard statistics)
router.get('/count', authenticateToken, async (req, res) => {
  try {
    console.log('🔢 GET /patrimonios/count - Iniciando...');
    console.log(
      '👤 Usuário:',
      req.user.name,
      'Role:',
      req.user.role,
      'Municipality:',
      req.user.municipality_id
    );

    let countQuery = `
      SELECT COUNT(*) as total
      FROM patrimonios p
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      countQuery += ' AND p.municipality_id = $1';
      params.push(req.user.municipality_id);
      console.log(
        '🔍 Contando patrimônios do município:',
        req.user.municipality_id
      );
    } else {
      console.log('🔍 Superusuário - contando todos os patrimônios');
    }

    const result = await getRow(countQuery, params);
    const total = parseInt(result.total) || 0;

    console.log('✅ Total de patrimônios:', total);

    res.json({
      success: true,
      total: total,
    });
  } catch (error) {
    console.error('❌ Get patrimonios count error:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Test route to check latest patrimonio (NO AUTH REQUIRED)
router.get('/test-latest', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando patrimônio mais recente');

    // Get the latest patrimonio
    const latestPatrimonio = await getRow(`
      SELECT * FROM patrimonios 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!latestPatrimonio) {
      return res.status(404).json({ error: 'Nenhum patrimônio encontrado' });
    }

    console.log('📋 Patrimônio mais recente:', latestPatrimonio);

    res.json({
      patrimonio: latestPatrimonio,
      message: 'Patrimônio mais recente encontrado',
    });
  } catch (error) {
    console.error('❌ Erro ao verificar patrimônio:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Test route to check table structure (NO AUTH REQUIRED)
router.get('/test-tables', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando estrutura das tabelas');

    // Check if transfers table exists
    const transfersExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'transfers'
      ) as exists
    `);

    // Check if analytics_metrics table exists
    const analyticsExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'analytics_metrics'
      ) as exists
    `);

    // Check patrimonios table columns
    const patrimoniosColumns = await getRows(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios'
      ORDER BY ordinal_position
    `);

    res.json({
      transfersTable: transfersExists.exists,
      analyticsTable: analyticsExists.exists,
      patrimoniosColumns: patrimoniosColumns,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Test route to add missing columns (NO AUTH REQUIRED)
router.post('/test-add-columns', async (req, res) => {
  try {
    console.log('🧪 TESTE - Adicionando colunas faltando à tabela patrimonios');

    // Add missing columns
    const alterQueries = [
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS cor character varying',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS quantidade integer',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS fotos text',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS documentos text',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS metodo_depreciacao character varying',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS vida_util_anos integer',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS valor_residual numeric',
    ];

    console.log('🔄 Executando queries ALTER TABLE...');

    for (const alterQuery of alterQueries) {
      console.log('📋 Executando:', alterQuery);
      await query(alterQuery);
    }

    console.log('✅ Colunas adicionadas com sucesso!');

    // Verify the new structure
    const columns = await getRows(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios'
      ORDER BY ordinal_position
    `);

    res.json({
      message: 'Colunas adicionadas com sucesso',
      columns: columns,
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Test route to check table structure (NO AUTH REQUIRED)
router.get('/test-structure', async (req, res) => {
  try {
    console.log('🧪 TESTE - Verificando estrutura da tabela patrimonios');

    // Check if table exists
    const tableExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patrimonios'
      )
    `);

    console.log('📋 Tabela patrimonios existe:', tableExists.exists);

    if (!tableExists.exists) {
      return res.status(500).json({ error: 'Tabela patrimonios não existe' });
    }

    // Get table structure
    const columns = await getRows(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura da tabela:', columns);

    // Check if municipality exists
    const municipality = await getRow(
      `
      SELECT id, name FROM municipalities WHERE id = $1
    `,
      ['85dd1cad-8e51-4e18-a7ff-bce1ec94e615']
    );

    console.log('📋 Município encontrado:', municipality);

    // Check if we need to add missing columns
    const existingColumns = columns.map(col => col.column_name);
    const missingColumns = [
      'cor',
      'quantidade',
      'fotos',
      'documentos',
      'metodo_depreciacao',
      'vida_util_anos',
      'valor_residual',
    ].filter(col => !existingColumns.includes(col));

    console.log('📋 Colunas faltando:', missingColumns);

    res.json({
      tableExists: tableExists.exists,
      columns: columns,
      municipality: municipality,
      testMunicipalityId: '85dd1cad-8e51-4e18-a7ff-bce1ec94e615',
      missingColumns: missingColumns,
      existingColumns: existingColumns,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Test route to create patrimonio without photos (NO AUTH REQUIRED)
router.post('/test-create', async (req, res) => {
  try {
    console.log('🧪 TESTE - Criando patrimônio sem fotos (sem autenticação)');
    console.log('📋 Dados recebidos:', req.body);

    const {
      numero_patrimonio,
      descricao_bem,
      tipo,
      data_aquisicao,
      valor_aquisicao,
    } = req.body;

    // Validation
    if (
      !numero_patrimonio ||
      !descricao_bem ||
      !tipo ||
      !data_aquisicao ||
      !valor_aquisicao
    ) {
      console.log('❌ Validação falhou - campos obrigatórios faltando');
      return res.status(400).json({
        error:
          'Campos obrigatórios: número do patrimônio, descrição, tipo, data de aquisição, valor',
      });
    }

    // Use a fixed municipality ID for testing
    const municipalityId = '85dd1cad-8e51-4e18-a7ff-bce1ec94e615'; // São Sebastião da Boa Vista
    console.log('🏛️ Municipality ID fixo para teste:', municipalityId);

    // Verify municipality exists
    const municipalityCheck = await getRow(
      `
      SELECT id, name FROM municipalities WHERE id = $1
    `,
      [municipalityId]
    );

    if (!municipalityCheck) {
      console.log('❌ Município não encontrado:', municipalityId);
      return res.status(400).json({ error: 'Município não encontrado' });
    }

    console.log('✅ Município encontrado:', municipalityCheck.name);

    // Get a valid user ID for testing
    const userCheck = await getRow(`
      SELECT id, name FROM users LIMIT 1
    `);

    if (!userCheck) {
      console.log('❌ Nenhum usuário encontrado na tabela');
      return res.status(500).json({ error: 'Nenhum usuário encontrado' });
    }

    const testUserId = userCheck.id;
    console.log(
      '✅ Usuário encontrado para teste:',
      userCheck.name,
      'ID:',
      testUserId
    );

    // Check if patrimonio number already exists in this municipality
    console.log(
      '🔍 Verificando se patrimônio já existe:',
      numero_patrimonio,
      'no município:',
      municipalityId
    );
    const existingPatrimonio = await getRow(
      'SELECT id FROM patrimonios WHERE numero_patrimonio = $1 AND municipality_id = $2',
      [numero_patrimonio, municipalityId]
    );

    if (existingPatrimonio) {
      console.log('❌ Patrimônio já existe:', existingPatrimonio.id);
      return res.status(400).json({
        error: 'Número do patrimônio já existe neste município',
      });
    }

    console.log('✅ Patrimônio não existe, criando...');
    console.log('📋 Dados para inserção:', {
      numero_patrimonio,
      descricao_bem,
      tipo,
      data_aquisicao,
      valor_aquisicao,
      municipalityId,
    });

    // Create patrimonio with correct fields based on table structure
    const result = await query(
      `
      INSERT INTO patrimonios (
        id,
        numero_patrimonio, 
        descricao, 
        tipo, 
        data_aquisicao, 
        valor_aquisicao, 
        municipality_id, 
        created_by,
        created_at,
        updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `,
      [
        numero_patrimonio,
        descricao_bem,
        tipo,
        data_aquisicao,
        valor_aquisicao.toString(), // Convert to string for numeric field
        municipalityId,
        testUserId, // created_by fixo para teste
      ]
    );

    const newPatrimonio = result.rows[0];
    console.log(
      '✅ Patrimônio criado com sucesso:',
      newPatrimonio.id,
      newPatrimonio.numero_patrimonio
    );

    // Skip historico for now to test basic creation
    console.log('⏭️ Pulando histórico para teste');

    // Return the created patrimonio directly
    console.log('✅ Patrimônio retornado');
    res.status(201).json(newPatrimonio);
  } catch (error) {
    console.error('❌ Erro ao criar patrimônio (teste):', error);
    console.error('❌ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Public route for patrimonios (for public consultation)
router.get('/public', async (req, res) => {
  try {
    console.log('🌐 CONSULTA PÚBLICA - Buscando patrimônios públicos');
    console.log('📋 Query params:', req.query);

    const { municipalityId, search, limit = 50 } = req.query;

    let whereClause = '';
    const params = [];

    if (municipalityId) {
      whereClause = 'WHERE municipality_id = $1';
      params.push(municipalityId);
      console.log('🔍 Filtro por município:', municipalityId);
    }

    if (search && municipalityId) {
      whereClause += ' AND (numero_patrimonio ILIKE $2 OR descricao ILIKE $2)';
      params.push(`%${search}%`);
      console.log('🔍 Filtro de busca:', search);
    } else if (search) {
      whereClause = 'WHERE (numero_patrimonio ILIKE $1 OR descricao ILIKE $1)';
      params.push(`%${search}%`);
      console.log('🔍 Filtro de busca (sem município):', search);
    }

    // Add soft delete filter to whereClause
    if (whereClause) {
      whereClause += ' AND deleted_at IS NULL';
    } else {
      whereClause = 'WHERE deleted_at IS NULL';
    }

    console.log('🔍 Where clause:', whereClause);
    console.log('🔍 Params:', params);
    console.log('🔍 Limit:', limit);

    const query = `
      SELECT 
        id,
        numero_patrimonio,
        descricao,
        setor_responsavel,
        local_objeto,
        situacao_bem,
        status,
        tipo,
        data_aquisicao,
        valor_aquisicao,
        fotos,
        municipality_id
      FROM patrimonios
      ${whereClause}
      ORDER BY numero_patrimonio
      LIMIT $${params.length + 1}
    `;

    console.log('🔍 Query final:', query);

    const patrimonios = await getRows(query, [...params, parseInt(limit)]);

    console.log(`✅ Encontrados ${patrimonios.length} patrimônios públicos`);

    // Log detalhado dos dados retornados
    patrimonios.forEach((patrimonio, index) => {
      console.log(`📋 Patrimônio ${index + 1}:`, {
        numero_patrimonio: patrimonio.numero_patrimonio,
        descricao: patrimonio.descricao,
        setor_responsavel: patrimonio.setor_responsavel,
        local_objeto: patrimonio.local_objeto,
        situacao_bem: patrimonio.situacao_bem,
      });
    });

    res.json(patrimonios);
  } catch (error) {
    console.error('❌ Erro ao buscar patrimônios públicos:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Public route to get single patrimonio by number (for QR code access)
router.get('/public/:numeroPatrimonio', async (req, res) => {
  try {
    const { numeroPatrimonio } = req.params;
    console.log(
      `🌐 CONSULTA PÚBLICA - Buscando patrimônio: ${numeroPatrimonio}`
    );

    const patrimonio = await getRow(
      `
      SELECT 
        p.*,
        m.name as municipality_name,
        m.logo_url as municipality_logo,
        s.name as setor_name,
        l.name as local_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      LEFT JOIN locals l ON p.local_id = l.id
      WHERE p.numero_patrimonio = $1 AND p.deleted_at IS NULL
    `,
      [numeroPatrimonio]
    );

    if (!patrimonio) {
      return res.status(404).json({ error: 'Patrimônio não encontrado' });
    }

    // Garantir que fotos seja um array
    if (patrimonio.fotos && typeof patrimonio.fotos === 'string') {
      try {
        patrimonio.fotos = JSON.parse(patrimonio.fotos);
      } catch (e) {
        patrimonio.fotos = [];
      }
    } else if (!patrimonio.fotos) {
      patrimonio.fotos = [];
    }

    console.log(`✅ Patrimônio encontrado: ${patrimonio.descricao_bem}`);
    res.json(patrimonio);
  } catch (error) {
    console.error('❌ Erro ao buscar patrimônio público:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Debug endpoint to check public data sync (NO AUTH REQUIRED)
router.get('/debug/public-sync', async (req, res) => {
  try {
    console.log('🔍 DEBUG - Verificando sincronização de dados públicos');

    // Check municipalities (all municipalities are public for now)
    const municipalities = await getRows(
      'SELECT id, name, state FROM municipalities'
    );
    console.log('📋 Municípios públicos:', municipalities.length);

    // Check patrimonios for each municipality
    const patrimoniosData = [];
    for (const municipality of municipalities) {
      const patrimonios = await getRows(
        `
        SELECT id, numero_patrimonio, descricao, municipality_id 
        FROM patrimonios 
        WHERE municipality_id = $1 AND deleted_at IS NULL
        LIMIT 10
      `,
        [municipality.id]
      );

      patrimoniosData.push({
        municipality: municipality,
        patrimonios: patrimonios,
        count: patrimonios.length,
      });

      console.log(
        `📋 Município ${municipality.name}: ${patrimonios.length} patrimônios`
      );
    }

    res.json({
      municipalities: municipalities,
      patrimoniosData: patrimoniosData,
      totalMunicipalities: municipalities.length,
      totalPatrimonios: patrimoniosData.reduce(
        (sum, data) => sum + data.count,
        0
      ),
    });
  } catch (error) {
    console.error('❌ Erro no debug de sincronização:', error);
    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get all patrimonios (filtered by municipality) - with pagination
router.get(
  '/',
  patrimoniosCacheMiddleware,
  paginationMiddleware,
  async (req, res) => {
    try {
      console.log('�� GET /patrimonios - Iniciando...');
      console.log(
        '👤 Usuário:',
        req.user.name,
        'Role:',
        req.user.role,
        'Municipality:',
        req.user.municipality_id
      );

      // Verificar se o usuário tem municipality_id (exceto superusuários)
      if (req.user.role !== 'superuser' && !req.user.municipality_id) {
        console.log('❌ Usuário sem municipality_id:', req.user);
        return res
          .status(400)
          .json({ error: 'Usuário sem município definido' });
      }

      let patrimoniosQuery = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.marca,
        p.modelo,
        p.numero_serie,
        p.estado as situacao_bem,
        p.status,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.fornecedor as forma_aquisicao,
        p.nota_fiscal as numero_nota_fiscal,
        p.local_id,
        p.sector_id,
        l.name as local_objeto,
        s.name as setor_responsavel,
        p.cor,
        p.quantidade,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.data_baixa,
        p.motivo_baixa,
        p.entity_name,
        p.custom_fields,
        p.emprestimo_ativo,
        p.transferencia_pendente,
        p.doado,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
    `;

      const params = [];
      let whereClause = '';

      // Filter by municipality if not superuser
      if (req.user.role !== 'superuser') {
        whereClause = 'WHERE p.municipality_id = $1';
        params.push(req.user.municipality_id);
        console.log('🔍 Filtrando por município:', req.user.municipality_id);
      } else {
        console.log('🔍 Superusuário - buscando todos os patrimônios');
      }

      // Controle de acesso baseado em setores para usuários normais
      if (req.user.role === 'usuario' || req.user.role === 'visualizador') {
        // Buscar setores atribuídos ao usuário
        const userSectors = await getRows(
          `
        SELECT s.name 
        FROM user_sectors us
        JOIN sectors s ON us.sector_id = s.id
        WHERE us.user_id = $1
      `,
          [req.user.id]
        );

        if (userSectors.length > 0) {
          const sectorNames = userSectors.map(s => s.name);
          console.log('🔍 Usuário tem acesso aos setores:', sectorNames);

          const sectorFilter = ` AND s.name IN (${sectorNames.map((_, i) => `$${params.length + i + 1}`).join(', ')})`;
          whereClause += sectorFilter;
          params.push(...sectorNames);
        } else {
          console.log(
            '⚠️ Usuário sem setores atribuídos - sem acesso a patrimônios'
          );
          return res.json({
            items: [],
            pagination: {
              hasMore: false,
              nextCursor: null,
              total: 0,
            },
          });
        }
      }

      // Add search filters
      if (req.query.search) {
        const searchParam = `%${req.query.search}%`;
        whereClause += whereClause ? ' AND' : 'WHERE';
        whereClause += ` (p.numero_patrimonio ILIKE $${params.length + 1} OR p.descricao ILIKE $${params.length + 1})`;
        params.push(searchParam);
        console.log('🔍 Busca por:', req.query.search);
      }

      // Add soft delete filter
      const softDeleteFilter = ' AND p.deleted_at IS NULL';
      patrimoniosQuery += whereClause + softDeleteFilter;
      console.log('📋 Query base:', patrimoniosQuery);
      console.log('📋 Parâmetros:', params);

      console.log('🔄 Executando query paginada no banco...');

      // Adicionar ordenação e limit manualmente para evitar conflitos
      const limit = req.pagination.limit || 20;
      const offset = 0; // Para primeira página

      const finalQuery =
        patrimoniosQuery +
        ` ORDER BY p.numero_patrimonio LIMIT $${params.length + 1}`;
      const finalParams = [...params, limit];

      console.log('📋 Query final:', finalQuery);
      console.log('📋 Parâmetros finais:', finalParams);

      // Executar query diretamente
      const patrimonios = await getRows(finalQuery, finalParams);

      // Simular resultado paginado
      const result = {
        items: patrimonios,
        pagination: {
          hasMore: patrimonios.length === limit,
          nextCursor:
            patrimonios.length > 0
              ? patrimonios[patrimonios.length - 1].numero_patrimonio
              : null,
          prevCursor: null,
          count: patrimonios.length,
          limit: limit,
        },
      };

      console.log('✅ Patrimônios encontrados:', result.items.length);
      console.log(
        '📋 Patrimônios:',
        result.items.map(p => ({
          id: p.id,
          numero: p.numero_patrimonio,
          descricao: p.descricao_bem,
          municipality_id: p.municipality_id,
        }))
      );

      console.log('🔄 Processando patrimônios...');

      // Processar cada patrimônio para incluir histórico
      const processedPatrimonios = await Promise.all(
        result.items.map(async patrimonio => {
          try {
            console.log(
              '🔄 Processando patrimônio:',
              patrimonio.numero_patrimonio
            );
            console.log('📋 Dados originais:', {
              setor_responsavel: patrimonio.setor_responsavel,
              local_objeto: patrimonio.local_objeto,
              situacao_bem: patrimonio.situacao_bem,
              status: patrimonio.status,
              fotos: patrimonio.fotos ? 'Presente' : 'Ausente',
            });

            // Buscar histórico de movimentação para este patrimônio
            const historico = await getRows(
              `
          SELECT 
            hm.id,
            hm.tipo_movimentacao as action,
            hm.observacoes as details,
            u.name as user,
            hm.data_movimentacao as date
          FROM historico_movimentacao hm
          LEFT JOIN users u ON hm.created_by = u.id
          WHERE hm.patrimonio_id = $1
          ORDER BY hm.data_movimentacao DESC
        `,
              [patrimonio.id]
            );

            const processed = {
              ...patrimonio,
              fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
              documentos: patrimonio.documentos
                ? JSON.parse(patrimonio.documentos)
                : [],
              historico_movimentacao: historico || [],
            };

            console.log('✅ Patrimônio processado:', {
              setor_responsavel: processed.setor_responsavel,
              local_objeto: processed.local_objeto,
              situacao_bem: processed.situacao_bem,
              status: processed.status,
              fotos: processed.fotos.length,
            });

            return processed;
          } catch (error) {
            console.error(
              `Erro ao processar histórico do patrimônio ${patrimonio.id}:`,
              error
            );
            return {
              ...patrimonio,
              fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
              documentos: patrimonio.documentos
                ? JSON.parse(patrimonio.documentos)
                : [],
              historico_movimentacao: [],
            };
          }
        })
      );

      // Processar os dados para garantir formato correto
      const processedItems = processedPatrimonios.map(patrimonio => ({
        ...patrimonio,
        fotos: patrimonio.fotos || [],
        documentos: patrimonio.documentos || [],
        valor_aquisicao: parseFloat(patrimonio.valor_aquisicao) || 0,
        valor_residual: parseFloat(patrimonio.valor_residual) || 0,
        quantidade: parseInt(patrimonio.quantidade) || 1,
        vida_util_anos: parseInt(patrimonio.vida_util_anos) || 0,
      }));

      console.log(
        '✅ Patrimônios processados:',
        processedItems.length,
        'HasMore:',
        result.pagination.hasMore
      );

      // Enviar resposta paginada
      sendPaginatedResponse(
        res,
        { items: processedItems },
        result.pagination,
        '/api/patrimonios',
        req.query
      );
    } catch (error) {
      console.error('❌ Get patrimonios error:', error);
      console.error('❌ Stack trace:', error.stack);
      res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: error.message });
    }
  }
);

// Get patrimonio by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o ID é um UUID válido
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    let patrimonio;
    if (isUUID) {
      // Se for UUID, buscar por ID
      patrimonio = await getRow(
        `
        SELECT 
          p.id,
          p.numero_patrimonio,
          p.descricao,
          p.tipo,
          p.marca,
          p.modelo,
          p.numero_serie,
          p.estado as situacao_bem,
          p.status,
          p.data_aquisicao,
          p.valor_aquisicao,
          p.fornecedor as forma_aquisicao,
          p.nota_fiscal as numero_nota_fiscal,
          p.local_id,
          p.sector_id,
          l.name as local_objeto,
          s.name as setor_responsavel,
          p.cor,
          p.quantidade,
          p.fotos,
          p.documentos,
          p.metodo_depreciacao,
          p.vida_util_anos,
          p.valor_residual,
          p.municipality_id,
          p.created_by,
          p.created_at,
          p.updated_at,
          m.name as municipality_name
        FROM patrimonios p
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        LEFT JOIN locals l ON p.local_id = l.id
        LEFT JOIN sectors s ON p.sector_id = s.id
        WHERE p.id = $1
      `,
        [id]
      );
    } else {
      // Se não for UUID, buscar por número do patrimônio
      patrimonio = await getRow(
        `
        SELECT 
          p.id,
          p.numero_patrimonio,
          p.descricao,
          p.tipo,
          p.marca,
          p.modelo,
          p.numero_serie,
          p.estado as situacao_bem,
          p.status,
          p.data_aquisicao,
          p.valor_aquisicao,
          p.fornecedor as forma_aquisicao,
          p.nota_fiscal as numero_nota_fiscal,
          p.local_id,
          p.sector_id,
          l.name as local_objeto,
          s.name as setor_responsavel,
          p.cor,
          p.quantidade,
          p.fotos,
          p.documentos,
          p.metodo_depreciacao,
          p.vida_util_anos,
          p.valor_residual,
          p.municipality_id,
          p.created_by,
          p.created_at,
          p.updated_at,
          m.name as municipality_name
        FROM patrimonios p
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        LEFT JOIN locals l ON p.local_id = l.id
        LEFT JOIN sectors s ON p.sector_id = s.id
        WHERE p.numero_patrimonio = $1
      `,
        [id]
      );
    }

    if (!patrimonio) {
      return res.status(404).json({ error: 'Patrimônio não encontrado' });
    }

    // Check if user has access to this patrimonio's municipality
    if (
      req.user.role !== 'superuser' &&
      patrimonio.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar histórico de movimentações
    const historico = await getRows(
      `
      SELECT 
        hm.id,
        hm.tipo_movimentacao as action,
        hm.observacoes as details,
        u.name as user,
        hm.data_movimentacao as date
      FROM historico_movimentacao hm
      LEFT JOIN users u ON hm.created_by = u.id
      WHERE hm.patrimonio_id = $1
      ORDER BY hm.data_movimentacao DESC
    `,
      [id]
    );

    // Process JSON fields and related data
    const processedPatrimonio = {
      ...patrimonio,
      descricao_bem: patrimonio.descricao, // Mapear descricao para descricao_bem
      situacao_bem: patrimonio.estado, // Mapear estado para situacao_bem
      numero_nota_fiscal: patrimonio.nota_fiscal, // Mapear nota_fiscal para numero_nota_fiscal
      fotos: patrimonio.fotos ? JSON.parse(patrimonio.fotos) : [],
      documentos: patrimonio.documentos
        ? JSON.parse(patrimonio.documentos)
        : [],
      historico_movimentacao: historico || [],

      emprestimo_ativo: null,
    };

    res.json(processedPatrimonio);
  } catch (error) {
    console.error('Get patrimonio error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new patrimonio
router.post('/', invalidatePatrimoniosCache, async (req, res) => {
  try {
    console.log('🔄 POST /patrimonios - Criando novo patrimônio');
    console.log(
      '👤 Usuário:',
      req.user.name,
      'Role:',
      req.user.role,
      'Municipality:',
      req.user.municipality_id
    );
    console.log('📋 Dados recebidos:', req.body);

    const {
      numero_patrimonio,
      descricao_bem,
      tipo,
      marca,
      modelo,
      cor,
      numero_serie,
      data_aquisicao,
      valor_aquisicao,
      quantidade,
      numero_nota_fiscal,
      forma_aquisicao,
      setor_responsavel,
      local_objeto,
      status,
      situacao_bem,
      documentos,
      custom_fields,
      metodo_depreciacao,
      vida_util_anos,
      valor_residual,
    } = req.body;

    // Declarar fotos como let para permitir reatribuição
    let fotos = req.body.fotos;

    // Validation
    if (
      !numero_patrimonio ||
      !descricao_bem ||
      !tipo ||
      !data_aquisicao ||
      !valor_aquisicao
    ) {
      console.log('❌ Validação falhou - campos obrigatórios faltando');
      return res.status(400).json({
        error:
          'Campos obrigatórios: número do patrimônio, descrição, tipo, data de aquisição e valor',
      });
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id;
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId;
    }

    console.log('🏛️ Municipality ID definido:', municipalityId);

    // Check if patrimonio number already exists in this municipality
    console.log(
      '🔍 Verificando se patrimônio já existe:',
      numero_patrimonio,
      'no município:',
      municipalityId
    );
    const existingPatrimonio = await getRow(
      'SELECT id FROM patrimonios WHERE numero_patrimonio = $1 AND municipality_id = $2',
      [numero_patrimonio, municipalityId]
    );

    if (existingPatrimonio) {
      console.log('❌ Patrimônio já existe:', existingPatrimonio.id);
      return res.status(400).json({
        error: 'Número do patrimônio já existe neste município',
      });
    }

    console.log('✅ Patrimônio não existe, criando...');

    // Map local_objeto and setor_responsavel to UUIDs
    let localId = null;
    let sectorId = null;

    if (local_objeto) {
      console.log(
        '🔍 Buscando local:',
        local_objeto,
        'no município:',
        municipalityId
      );

      // Primeiro, listar todos os locais disponíveis para debug
      const allLocals = await getRows(
        `
        SELECT id, name, municipality_id FROM locals 
        WHERE municipality_id = $1
        ORDER BY name
      `,
        [municipalityId]
      );
      console.log(
        '📋 Todos os locais disponíveis:',
        allLocals.map(l => ({ id: l.id, name: l.name }))
      );

      const local = await getRow(
        `
        SELECT id, name FROM locals 
        WHERE LOWER(name) = LOWER($1) AND municipality_id = $2
      `,
        [local_objeto, municipalityId]
      );

      if (local) {
        localId = local.id;
        console.log('✅ Local encontrado:', local.name, '→', localId);
      } else {
        console.log('⚠️ Local não encontrado:', local_objeto);
        // Tentar buscar por similaridade
        const similarLocal = await getRow(
          `
          SELECT id, name FROM locals 
          WHERE LOWER(name) LIKE LOWER($1) AND municipality_id = $2
        `,
          [`%${local_objeto}%`, municipalityId]
        );

        if (similarLocal) {
          localId = similarLocal.id;
          console.log(
            '✅ Local encontrado por similaridade:',
            similarLocal.name,
            '→',
            localId
          );
        } else {
          console.log(
            '❌ Local não encontrado mesmo com busca por similaridade'
          );
        }
      }
    }

    if (setor_responsavel) {
      console.log(
        '🔍 Buscando setor:',
        setor_responsavel,
        'no município:',
        municipalityId
      );

      // Primeiro, listar todos os setores disponíveis para debug
      const allSectors = await getRows(
        `
        SELECT id, name, municipality_id FROM sectors 
        WHERE municipality_id = $1
        ORDER BY name
      `,
        [municipalityId]
      );
      console.log(
        '📋 Todos os setores disponíveis:',
        allSectors.map(s => ({ id: s.id, name: s.name }))
      );

      const sector = await getRow(
        `
        SELECT id, name FROM sectors 
        WHERE LOWER(name) = LOWER($1) AND municipality_id = $2
      `,
        [setor_responsavel, municipalityId]
      );

      if (sector) {
        sectorId = sector.id;
        console.log('✅ Setor encontrado:', sector.name, '→', sectorId);
      } else {
        console.log('⚠️ Setor não encontrado:', setor_responsavel);
        // Tentar buscar por similaridade
        const similarSector = await getRow(
          `
          SELECT id, name FROM sectors 
          WHERE LOWER(name) LIKE LOWER($1) AND municipality_id = $2
        `,
          [`%${setor_responsavel}%`, municipalityId]
        );

        if (similarSector) {
          sectorId = similarSector.id;
          console.log(
            '✅ Setor encontrado por similaridade:',
            similarSector.name,
            '→',
            sectorId
          );
        } else {
          console.log(
            '❌ Setor não encontrado mesmo com busca por similaridade'
          );
        }
      }
    }

    // Create patrimonio with correct fields based on table structure
    console.log('🔄 Preparando dados para inserção...');
    console.log('📋 Dados completos recebidos:', {
      numero_patrimonio,
      descricao_bem,
      tipo,
      marca,
      modelo,
      cor,
      numero_serie,
      data_aquisicao,
      valor_aquisicao,
      quantidade,
      numero_nota_fiscal,
      forma_aquisicao,
      setor_responsavel,
      local_objeto,
      status,
      situacao_bem,
      fotos: fotos ? `${fotos.length} fotos` : 'nenhuma',
      documentos: documentos ? `${documentos.length} documentos` : 'nenhum',
    });

    // Validar e processar fotos
    if (fotos && Array.isArray(fotos)) {
      console.log('📸 Número de fotos recebidas:', fotos.length);
      fotos = validateImages(fotos, 5); // Limite de 5MB por imagem
      console.log('📸 Número de fotos válidas:', fotos.length);
    }

    console.log('🔄 Executando query INSERT...');
    console.log('📋 Parâmetros da query:', [
      numero_patrimonio,
      descricao_bem,
      tipo,
      marca || null,
      modelo || null,
      numero_serie || null,
      situacao_bem || null, // maps to estado
      data_aquisicao,
      valor_aquisicao.toString(), // Convert to string for numeric field
      forma_aquisicao || null, // maps to fornecedor
      numero_nota_fiscal || null,
      localId, // local_id - UUID mapeado
      sectorId, // sector_id - UUID mapeado
      municipalityId,
      req.user.id,
    ]);

    const result = await query(
      `
      INSERT INTO patrimonios (
        id,
        numero_patrimonio, 
        descricao, 
        tipo, 
        marca, 
        modelo, 
        numero_serie,
        estado,
        data_aquisicao, 
        valor_aquisicao, 
        fornecedor,
        nota_fiscal,
        local_id,
        sector_id,
        cor,
        quantidade,
        fotos,
        documentos,
        metodo_depreciacao,
        vida_util_anos,
        valor_residual,
        status,
        municipality_id, 
        created_by,
        created_at,
        updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `,
      [
        numero_patrimonio,
        descricao_bem,
        tipo,
        marca || null,
        modelo || null,
        numero_serie || null,
        situacao_bem || null, // maps to estado
        data_aquisicao,
        valor_aquisicao.toString(), // Convert to string for numeric field
        forma_aquisicao || null, // maps to fornecedor
        numero_nota_fiscal || null,
        localId, // local_id - UUID mapeado
        sectorId, // sector_id - UUID mapeado
        cor || null,
        quantidade || null,
        fotos ? JSON.stringify(fotos) : null,
        documentos ? JSON.stringify(documentos) : null,
        metodo_depreciacao || null,
        vida_util_anos || null,
        valor_residual ? valor_residual.toString() : null,
        status || 'ativo', // Campo status com valor padrão
        municipalityId,
        req.user.id,
      ]
    );

    const newPatrimonio = result.rows[0];
    console.log(
      '✅ Patrimônio criado com sucesso:',
      newPatrimonio.id,
      newPatrimonio.numero_patrimonio
    );

    // Skip historico for now - may not exist in this database
    console.log('⏭️ Pulando histórico por enquanto');

    // Return the created patrimonio with complete data including local and sector names
    const patrimonioWithCompleteData = await getRow(
      `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.tipo,
        p.marca,
        p.modelo,
        p.numero_serie,
        p.estado as situacao_bem,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.fornecedor as forma_aquisicao,
        p.nota_fiscal as numero_nota_fiscal,
        p.local_id,
        p.sector_id,
        l.name as local_objeto,
        s.name as setor_responsavel,
        p.cor,
        p.quantidade,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.status,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.id = $1
    `,
      [newPatrimonio.id]
    );

    // Process JSON fields
    const processedPatrimonio = {
      ...patrimonioWithCompleteData,
      fotos: patrimonioWithCompleteData.fotos
        ? JSON.parse(patrimonioWithCompleteData.fotos)
        : [],
      documentos: patrimonioWithCompleteData.documentos
        ? JSON.parse(patrimonioWithCompleteData.documentos)
        : [],
    };

    console.log(
      '✅ Patrimônio retornado com dados completos:',
      processedPatrimonio
    );
    res.status(201).json(processedPatrimonio);
  } catch (error) {
    console.error('❌ Erro ao criar patrimônio:', error);
    console.error('❌ Stack trace:', error.stack);

    // Verificar se é erro de constraint
    if (error.code === '23505') {
      // Unique constraint violation
      console.error('❌ Violação de constraint única');
      return res
        .status(400)
        .json({ error: 'Número do patrimônio já existe neste município' });
    }

    // Verificar se é erro de JSON
    if (error.message && error.message.includes('JSON')) {
      console.error('❌ Erro de JSON nas fotos/documentos');
      return res
        .status(400)
        .json({ error: 'Erro nos dados de fotos ou documentos' });
    }

    // Verificar se é erro de tamanho
    if (
      error.message &&
      (error.message.includes('too long') ||
        error.message.includes('value too long'))
    ) {
      console.error('❌ Dados muito grandes');
      return res.status(400).json({
        error: 'Dados muito grandes (fotos ou documentos). Tente sem fotos.',
      });
    }

    // Verificar se é erro de memória ou timeout
    if (
      error.message &&
      (error.message.includes('memory') || error.message.includes('timeout'))
    ) {
      console.error('❌ Erro de memória ou timeout');
      return res
        .status(400)
        .json({ error: 'Dados muito pesados. Tente sem fotos.' });
    }

    res
      .status(500)
      .json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Update patrimonio
router.put(
  '/:id',
  requireUser,
  invalidatePatrimoniosCache,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log('🔄 Atualizando patrimônio:', id);
      console.log('📋 Dados de atualização completos:', updateData);
      console.log('📋 Campos específicos recebidos:', {
        setor_responsavel: updateData.setor_responsavel,
        local_objeto: updateData.local_objeto,
        situacao_bem: updateData.situacao_bem,
        status: updateData.status,
      });

      // Check if patrimonio exists
      const existingPatrimonio = await getRow(
        'SELECT numero_patrimonio, municipality_id FROM patrimonios WHERE id = $1',
        [id]
      );

      if (!existingPatrimonio) {
        return res.status(404).json({ error: 'Patrimônio não encontrado' });
      }

      // Check if user has access to this patrimonio's municipality
      if (
        req.user.role !== 'superuser' &&
        existingPatrimonio.municipality_id !== req.user.municipality_id
      ) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Check if patrimonio number already exists (excluding current patrimonio)
      if (updateData.numero_patrimonio) {
        const patrimonioExists = await getRow(
          'SELECT id FROM patrimonios WHERE numero_patrimonio = $1 AND municipality_id = $2 AND id != $3',
          [updateData.numero_patrimonio, existingPatrimonio.municipality_id, id]
        );

        if (patrimonioExists) {
          return res.status(400).json({
            error: 'Número do patrimônio já existe neste município',
          });
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      // Processar campos especiais primeiro
      let processedUpdateData = { ...updateData };

      // Mapear campos especiais
      if (updateData.situacao_bem !== undefined) {
        processedUpdateData.estado = updateData.situacao_bem;
        delete processedUpdateData.situacao_bem;
        console.log(
          `🔄 Mapeando situacao_bem → estado: ${updateData.situacao_bem}`
        );
      }

      if (updateData.forma_aquisicao !== undefined) {
        processedUpdateData.fornecedor = updateData.forma_aquisicao;
        delete processedUpdateData.forma_aquisicao;
        console.log(
          `🔄 Mapeando forma_aquisicao → fornecedor: ${updateData.forma_aquisicao}`
        );
      }

      if (updateData.numero_nota_fiscal !== undefined) {
        processedUpdateData.nota_fiscal = updateData.numero_nota_fiscal;
        delete processedUpdateData.numero_nota_fiscal;
        console.log(
          `🔄 Mapeando numero_nota_fiscal → nota_fiscal: ${updateData.numero_nota_fiscal}`
        );
      }

      if (updateData.descricao_bem !== undefined) {
        processedUpdateData.descricao = updateData.descricao_bem;
        delete processedUpdateData.descricao_bem;
        console.log(
          `🔄 Mapeando descricao_bem → descricao: ${updateData.descricao_bem}`
        );
      }

      const fieldsToUpdate = [
        'numero_patrimonio',
        'descricao',
        'tipo',
        'marca',
        'modelo',
        'numero_serie',
        'data_aquisicao',
        'valor_aquisicao',
        'estado',
        'fornecedor',
        'nota_fiscal',
        'status',
        'setor_responsavel',
        'local_objeto',
        'situacao_bem',
        'cor',
        'quantidade',
        'forma_aquisicao',
        'metodo_depreciacao',
        'vida_util_anos',
        'valor_residual',
        'fotos',
        'documentos',
      ];

      // Verificar se todos os campos existem na tabela
      const validFields = [
        'numero_patrimonio',
        'descricao',
        'tipo',
        'marca',
        'modelo',
        'numero_serie',
        'data_aquisicao',
        'valor_aquisicao',
        'estado',
        'fornecedor',
        'nota_fiscal',
        'status',
        'setor_responsavel',
        'local_objeto',
        'situacao_bem',
        'cor',
        'quantidade',
        'forma_aquisicao',
        'metodo_depreciacao',
        'vida_util_anos',
        'valor_residual',
        'fotos',
        'documentos',
      ];

      Object.keys(processedUpdateData).forEach(field => {
        // Verificar se o campo existe no updateData
        if (processedUpdateData[field] !== undefined) {
          // Verificar se o campo é válido
          if (!validFields.includes(field)) {
            console.log(`⚠️ Campo inválido ignorado: ${field}`);
            return;
          }

          let value = processedUpdateData[field];

          // Tratar campos JSON
          if (field === 'fotos' || field === 'documentos') {
            if (Array.isArray(value)) {
              value = JSON.stringify(value);
              console.log(`📸 Campo ${field} convertido para JSON:`, value);
            } else if (typeof value === 'string') {
              try {
                JSON.parse(value); // Validar se é JSON válido
                console.log(`📸 Campo ${field} já é JSON válido`);
              } catch (e) {
                console.log(`⚠️ Campo ${field} não é JSON válido, ignorando`);
                return;
              }
            } else {
              console.log(`⚠️ Campo ${field} não é array ou string, ignorando`);
              return;
            }
          }

          updateFields.push(`${field} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
          console.log(`✅ Campo ${field} será atualizado com valor:`, value);
        } else {
          console.log(
            `⚠️ Campo ${field} não encontrado nos dados de atualização`
          );
        }
      });

      if (updateFields.length === 0) {
        console.log('❌ Nenhum campo para atualizar encontrado');
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      console.log('📋 Campos que serão atualizados:', updateFields);
      console.log('📋 Valores para atualização:', updateValues);

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      const updateQuery = `
      UPDATE patrimonios SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      RETURNING *
    `;

      const result = await query(updateQuery, updateValues);
      const updatedPatrimonio = result.rows[0];

      // Add to historico if any significant change
      if (
        updateData.descricao_bem ||
        updateData.valor_aquisicao ||
        updateData.estado
      ) {
        const changes = [];
        if (updateData.descricao_bem) changes.push('descrição');
        if (updateData.valor_aquisicao) changes.push('valor');
        if (updateData.estado) changes.push('estado');

        await query(
          `
        INSERT INTO historico_movimentacao (patrimonio_id, tipo_movimentacao, observacoes, created_by)
        VALUES ($1, $2, $3, $4)
      `,
          [
            id,
            'ATUALIZAÇÃO',
            `Campos atualizados: ${changes.join(', ')}`,
            req.user.id,
          ]
        );
      }

      // Log activity
      await query(
        'INSERT INTO activity_logs (user_id, action, table_name, record_id, municipality_id) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          'PATRIMONIO_UPDATE',
          'patrimonios',
          id,
          existingPatrimonio.municipality_id,
        ]
      );

      console.log('✅ Cache será invalidado automaticamente pelo middleware');
      console.log('✅ Atividade logada no banco');

      res.json(updatedPatrimonio);
    } catch (error) {
      console.error('Update patrimonio error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Delete patrimonio
router.delete(
  '/:id',
  requireSupervisor,
  invalidatePatrimoniosCache,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if patrimonio exists
      const existingPatrimonio = await getRow(
        'SELECT numero_patrimonio, municipality_id FROM patrimonios WHERE id = $1',
        [id]
      );

      if (!existingPatrimonio) {
        return res.status(404).json({ error: 'Patrimônio não encontrado' });
      }

      // Check if user has access to this patrimonio's municipality
      if (
        req.user.role !== 'superuser' &&
        existingPatrimonio.municipality_id !== req.user.municipality_id
      ) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Skip emprestimo check for now - table may not exist
      // const activeEmprestimo = await getRow(
      //   'SELECT id FROM emprestimos WHERE patrimonio_id = $1 AND data_devolucao_real IS NULL',
      //   [id]
      // )

      // if (activeEmprestimo) {
      //   return res.status(400).json({
      //     error: 'Não é possível excluir um patrimônio que possui empréstimo ativo'
      //   })
      // }

      // Check if deleted_at column exists, if not add it
      const hasDeletedAtColumn = await getRow(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patrimonios' AND column_name = 'deleted_at'
      ) as has_column
    `);

      if (!hasDeletedAtColumn.has_column) {
        console.log('🔧 Adicionando coluna deleted_at à tabela patrimonios...');
        await query('ALTER TABLE patrimonios ADD COLUMN deleted_at TIMESTAMP');
        console.log('✅ Coluna deleted_at adicionada com sucesso');
      }

      // Soft delete - mark as deleted instead of physical delete
      await query('UPDATE patrimonios SET deleted_at = NOW() WHERE id = $1', [
        id,
      ]);

      console.log('✅ Patrimônio marcado como excluído (soft delete)');

      // Skip activity log for now - table may not exist
      // await query(
      //   'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      //   [req.user.id, req.user.name, 'PATRIMONIO_DELETE', `Patrimônio "${existingPatrimonio.numero_patrimonio}" excluído.`, existingPatrimonio.municipality_id]
      // )

      res.json({ message: 'Patrimônio excluído com sucesso' });
    } catch (error) {
      console.error('Delete patrimonio error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Get patrimonio statistics
router.get('/stats/municipality/:municipalityId', async (req, res) => {
  try {
    const { municipalityId } = req.params;

    // Check if user has access to this municipality
    if (
      req.user.role !== 'superuser' &&
      req.user.municipality_id !== municipalityId
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const stats = await getRow(
      `
      SELECT
        COUNT(*) as total_patrimonios,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as inativos,
        COUNT(CASE WHEN status = 'manutencao' THEN 1 END) as em_manutencao,
        COUNT(CASE WHEN status = 'baixado' THEN 1 END) as baixados,
        COUNT(CASE WHEN status = 'extraviado' THEN 1 END) as extraviados,
        SUM(valor_aquisicao) as valor_total,
        AVG(valor_aquisicao) as valor_medio
      FROM patrimonios 
      WHERE municipality_id = $1 AND deleted_at IS NULL
    `,
      [municipalityId]
    );

    res.json(stats);
  } catch (error) {
    console.error('Get patrimonio stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Debug route to check municipality and user data
router.get('/debug/municipality-info', async (req, res) => {
  try {
    console.log('🔍 Debug - Informações do município e usuário');
    console.log('👤 Usuário:', req.user);

    // Get municipality info
    const municipality = await getRow(
      `
      SELECT id, name, state FROM municipalities WHERE id = $1
    `,
      [req.user.municipality_id]
    );

    // Get total patrimonios in this municipality
    const totalPatrimonios = await getRow(
      `
      SELECT COUNT(*) as total FROM patrimonios WHERE municipality_id = $1
    `,
      [req.user.municipality_id]
    );

    // Get sample patrimonios
    const samplePatrimonios = await getRows(
      `
      SELECT id, numero_patrimonio, descricao, municipality_id, created_at 
      FROM patrimonios 
      WHERE municipality_id = $1 
      ORDER BY created_at DESC
      LIMIT 5
    `,
      [req.user.municipality_id]
    );

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        municipality_id: req.user.municipality_id,
      },
      municipality,
      totalPatrimonios: totalPatrimonios.total,
      samplePatrimonios,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar informações do município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Temporary route to check patrimonios data
router.get('/debug/check-data', async (req, res) => {
  try {
    console.log('🔍 Verificando dados na tabela patrimonios...');

    // Check total count
    const totalCount = await getRow(
      'SELECT COUNT(*) as total FROM patrimonios'
    );
    console.log('📊 Total de patrimônios:', totalCount.total);

    // Check by municipality
    const byMunicipality = await getRows(`
      SELECT municipality_id, COUNT(*) as count 
      FROM patrimonios 
      GROUP BY municipality_id
    `);
    console.log('📊 Patrimônios por município:', byMunicipality);

    // Get sample data
    const sampleData = await getRows(`
      SELECT id, numero_patrimonio, descricao, municipality_id, created_at 
      FROM patrimonios 
      LIMIT 5
    `);
    console.log('📋 Amostra de dados:', sampleData);

    res.json({
      total: totalCount.total,
      byMunicipality,
      sampleData,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    res.status(500).json({ error: 'Erro ao verificar dados' });
  }
});

// Temporary route to check specific patrimonio
router.get('/debug/check-patrimonio/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    console.log('🔍 Verificando patrimônio:', numero);

    const patrimonio = await getRow(
      `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.tipo,
        p.marca,
        p.modelo,
        p.cor,
        p.numero_serie,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.quantidade,
        p.nota_fiscal as numero_nota_fiscal,
        p.forma_aquisicao,
        p.setor_responsavel,
        p.local_objeto,
        p.status,
        p.situacao_bem,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      WHERE p.numero_patrimonio = $1
    `,
      [numero]
    );

    if (patrimonio) {
      console.log('✅ Patrimônio encontrado:', patrimonio);
      res.json({ found: true, patrimonio });
    } else {
      console.log('❌ Patrimônio não encontrado');
      res.json({ found: false });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar patrimônio:', error);
    res.status(500).json({ error: 'Erro ao verificar patrimônio' });
  }
});

// Debug route to check sectors and locals for a municipality
router.get('/debug/check-sectors-locals/:municipalityId', async (req, res) => {
  try {
    const { municipalityId } = req.params;
    console.log(
      '🔍 Verificando setores e locais para município:',
      municipalityId
    );

    // Get sectors
    const sectors = await getRows(
      `
      SELECT id, name, description, municipality_id
      FROM sectors 
      WHERE municipality_id = $1
      ORDER BY name
    `,
      [municipalityId]
    );

    // Get locals
    const locals = await getRows(
      `
      SELECT l.id, l.name, l.description, l.sector_id, s.name as sector_name
      FROM locals l
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE l.municipality_id = $1
      ORDER BY l.name
    `,
      [municipalityId]
    );

    console.log('📋 Setores encontrados:', sectors.length);
    console.log('📋 Locais encontrados:', locals.length);

    res.json({
      municipalityId,
      sectors,
      locals,
      totalSectors: sectors.length,
      totalLocals: locals.length,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar setores e locais:', error);
    res.status(500).json({ error: 'Erro ao verificar setores e locais' });
  }
});

// Temporary route to fix patrimonios table schema
router.post('/fix-schema', async (req, res) => {
  try {
    // Add missing columns to patrimonios table
    const alterQueries = [
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS cor VARCHAR(30)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS forma_aquisicao VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(255)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS local_objeto VARCHAR(255)',
      "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo'",
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS situacao_bem VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS fotos JSONB',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS documentos JSONB',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS metodo_depreciacao VARCHAR(50)',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS vida_util_anos INTEGER',
      'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS valor_residual DECIMAL(10,2)',
    ];

    for (const query of alterQueries) {
      await query(query);
      console.log(`Executed: ${query}`);
    }

    res.json({ message: 'Schema atualizado com sucesso' });
  } catch (error) {
    console.error('Fix schema error:', error);
    res.status(500).json({ error: 'Erro ao atualizar schema' });
  }
});

// Debug routes (no authentication required)
// Check patrimonios by municipality name
router.get(
  '/debug/public/check-municipality/:municipalityName',
  async (req, res) => {
    try {
      const { municipalityName } = req.params;
      console.log('🔍 Verificando patrimônios do município:', municipalityName);

      // Buscar o município
      const municipality = await getRow(
        `
      SELECT id, name, state FROM municipalities 
      WHERE LOWER(name) LIKE LOWER($1)
    `,
        [`%${municipalityName}%`]
      );

      if (!municipality) {
        console.log('❌ Município não encontrado:', municipalityName);
        return res.json({
          found: false,
          message: 'Município não encontrado',
          searchTerm: municipalityName,
        });
      }

      console.log('✅ Município encontrado:', municipality);

      // Buscar patrimônios deste município
      const patrimonios = await getRows(
        `
      SELECT 
        id,
        numero_patrimonio,
        descricao,
        tipo,
        valor_aquisicao,
        created_at
      FROM patrimonios 
      WHERE municipality_id = $1
      ORDER BY created_at DESC
    `,
        [municipality.id]
      );

      console.log('📋 Patrimônios encontrados:', patrimonios.length);

      res.json({
        found: true,
        municipality,
        patrimonios,
        totalCount: patrimonios.length,
      });
    } catch (error) {
      console.error('❌ Erro ao verificar município:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Delete all patrimonios from a municipality (no auth required for debug)
router.delete(
  '/debug/public/delete-municipality/:municipalityName',
  async (req, res) => {
    try {
      const { municipalityName } = req.params;
      console.log('🗑️ Excluindo patrimônios do município:', municipalityName);

      // Buscar o município
      const municipality = await getRow(
        `
      SELECT id, name, state FROM municipalities 
      WHERE LOWER(name) LIKE LOWER($1)
    `,
        [`%${municipalityName}%`]
      );

      if (!municipality) {
        console.log('❌ Município não encontrado:', municipalityName);
        return res.status(404).json({
          error: 'Município não encontrado',
          searchTerm: municipalityName,
        });
      }

      console.log('✅ Município encontrado:', municipality);

      // Contar patrimônios antes de excluir
      const countResult = await getRow(
        `
      SELECT COUNT(*) as total FROM patrimonios WHERE municipality_id = $1
    `,
        [municipality.id]
      );

      const totalPatrimonios = countResult.total;
      console.log('📋 Total de patrimônios a excluir:', totalPatrimonios);

      if (totalPatrimonios === 0) {
        console.log('ℹ️ Nenhum patrimônio encontrado para excluir');
        return res.json({
          success: true,
          message: 'Nenhum patrimônio encontrado para excluir',
          municipality,
          deletedCount: 0,
        });
      }

      // Excluir patrimônios
      const deleteResult = await query(
        `
      DELETE FROM patrimonios WHERE municipality_id = $1
    `,
        [municipality.id]
      );

      console.log('✅ Patrimônios excluídos com sucesso');

      res.json({
        success: true,
        message: `${totalPatrimonios} patrimônios excluídos com sucesso`,
        municipality,
        deletedCount: totalPatrimonios,
      });
    } catch (error) {
      console.error('❌ Erro ao excluir patrimônios:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

router.post(
  '/:id/notes',
  requireSupervisor,
  invalidatePatrimoniosCache,
  async (req, res) => {
    try {
      console.log('📝 POST /:id/notes - Criando nova nota');
      console.log(
        '👤 Usuário:',
        req.user.name,
        'ID:',
        req.user.id,
        'Role:',
        req.user.role
      );
      console.log('📋 Parâmetros:', req.params);
      console.log('�� Body:', req.body);

      const { id } = req.params;
      const { text } = req.body;

      if (!text || !text.trim()) {
        console.log('❌ Texto da nota é obrigatório');
        return res.status(400).json({ error: 'Texto da nota é obrigatório' });
      }

      // Check if patrimonio exists
      const patrimonio = await getRow(
        'SELECT id, municipality_id FROM patrimonios WHERE id = $1',
        [id]
      );

      if (!patrimonio) {
        console.log('❌ Patrimônio não encontrado:', id);
        return res.status(404).json({ error: 'Patrimônio não encontrado' });
      }

      console.log('✅ Patrimônio encontrado:', patrimonio.id);

      // Check if user has access to this patrimonio's municipality
      if (
        req.user.role !== 'superuser' &&
        patrimonio.municipality_id !== req.user.municipality_id
      ) {
        console.log('❌ Acesso negado - usuário não tem permissão');
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Add note
      console.log('🔄 Inserindo nota no banco...');
      const result = await query(
        `
      INSERT INTO notes (patrimonio_id, content, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
        [id, text.trim(), req.user.id]
      );

      const newNote = result.rows[0];
      console.log('✅ Nota criada no banco:', newNote);

      // Get user name for the response
      const user = await getRow('SELECT name FROM users WHERE id = $1', [
        req.user.id,
      ]);

      console.log('👤 Dados do usuário:', user);

      const noteWithUser = {
        ...newNote,
        text: newNote.content,
        date: newNote.created_at,
        userId: newNote.created_by,
        userName: user.name,
      };

      console.log('📝 Nota final para resposta:', noteWithUser);

      // Log activity
      await query(
        'INSERT INTO activity_logs (user_id, action, table_name, record_id, municipality_id) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          'PATRIMONIO_NOTE_ADDED',
          'patrimonios',
          id,
          patrimonio.municipality_id,
        ]
      );

      console.log('✅ Enviando resposta com status 201');
      res.status(201).json(noteWithUser);
    } catch (error) {
      console.error('❌ Add note error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Debug route para testar consulta de patrimônios
router.get(
  '/debug/test-query/:sectorId',
  authenticateToken,
  async (req, res) => {
    try {
      const { sectorId } = req.params;
      let municipalityId = req.user.municipality_id;

      console.log('🧪 DEBUG - Testando consulta para setor:', sectorId);

      // Buscar o setor
      let sector;
      if (municipalityId) {
        sector = await getRow(
          `
        SELECT id, name, codigo, municipality_id FROM sectors 
        WHERE id = $1 AND municipality_id = $2
      `,
          [sectorId, municipalityId]
        );
      } else {
        sector = await getRow(
          `
        SELECT id, name, codigo, municipality_id FROM sectors 
        WHERE id = $1
      `,
          [sectorId]
        );

        if (sector) {
          municipalityId = sector.municipality_id;
        }
      }

      if (!sector) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      const currentYear = new Date().getFullYear().toString();
      const sectorCode = sector.codigo;
      const prefix = `${currentYear}${sectorCode}`;

      console.log('🧪 DEBUG - Parâmetros da consulta:');
      console.log('  - municipalityId:', municipalityId);
      console.log('  - prefix:', prefix);
      console.log('  - pattern:', `${prefix}%`);

      // Testar diferentes consultas
      const allPatrimonios = await getRows(`
      SELECT numero_patrimonio, municipality_id, created_at 
      FROM patrimonios 
      ORDER BY numero_patrimonio
    `);
      console.log('🧪 DEBUG - Todos os patrimônios:', allPatrimonios);

      const municipalityPatrimonios = await getRows(
        `
      SELECT numero_patrimonio, municipality_id, created_at 
      FROM patrimonios 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `,
        [municipalityId]
      );
      console.log(
        '🧪 DEBUG - Patrimônios do município:',
        municipalityPatrimonios
      );

      const prefixPatrimonios = await getRows(
        `
      SELECT numero_patrimonio, municipality_id, created_at 
      FROM patrimonios 
      WHERE municipality_id = $1 
      AND numero_patrimonio LIKE $2
      ORDER BY numero_patrimonio
    `,
        [municipalityId, `${prefix}%`]
      );
      console.log('🧪 DEBUG - Patrimônios com prefixo:', prefixPatrimonios);

      res.json({
        debug: true,
        sector: sector.name,
        sectorCode: sector.codigo,
        municipalityId,
        prefix,
        pattern: `${prefix}%`,
        allPatrimonios,
        municipalityPatrimonios,
        prefixPatrimonios,
      });
    } catch (error) {
      console.error('❌ Erro no debug:', error);
      res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: error.message });
    }
  }
);

// Rota para gerar número do patrimônio baseado no banco de dados
router.get(
  '/generate-number/:sectorId',
  authenticateToken,
  validateUUID('sectorId'),
  async (req, res) => {
    try {
      const { sectorId } = req.params;
      let municipalityId = req.user.municipality_id;

      console.log(
        '🔢 Gerando número para setor:',
        sectorId,
        'município:',
        municipalityId
      );
      console.log('👤 Usuário:', req.user.name, 'Role:', req.user.role);

      // Buscar o setor para obter o código
      let sector;
      if (municipalityId) {
        // Usuário tem municipality_id definido
        sector = await getRow(
          `
        SELECT id, name, codigo, municipality_id FROM sectors 
        WHERE id = $1 AND municipality_id = $2
      `,
          [sectorId, municipalityId]
        );
      } else {
        // Superuser sem municipality_id - buscar setor e obter municipality_id dele
        sector = await getRow(
          `
        SELECT id, name, codigo, municipality_id FROM sectors 
        WHERE id = $1
      `,
          [sectorId]
        );

        if (sector) {
          municipalityId = sector.municipality_id;
          console.log('📋 Municipality ID obtido do setor:', municipalityId);
        }
      }

      if (!sector) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      if (!sector.codigo) {
        return res
          .status(400)
          .json({ error: 'Setor não possui código definido' });
      }

      const currentYear = new Date().getFullYear().toString();
      const sectorCode = sector.codigo;
      const prefix = `${currentYear}${sectorCode}`;

      console.log('📋 Prefixo:', prefix);

      // Buscar patrimônios existentes no banco de dados com este prefixo
      // Primeiro, vamos buscar TODOS os patrimônios do município para debug
      const allMunicipalityPatrimonios = await getRows(
        `
      SELECT numero_patrimonio 
      FROM patrimonios 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `,
        [municipalityId]
      );

      console.log(
        '🔍 TODOS os patrimônios do município:',
        allMunicipalityPatrimonios.map(p => p.numero_patrimonio)
      );

      // Agora filtrar apenas os que começam com o prefixo
      const existingPatrimonios = allMunicipalityPatrimonios.filter(
        p => p.numero_patrimonio && p.numero_patrimonio.startsWith(prefix)
      );

      console.log('📊 Patrimônios existentes:', existingPatrimonios.length);
      console.log(
        '📋 Números:',
        existingPatrimonios.map(p => p.numero_patrimonio)
      );
      console.log('📋 Prefixo buscado:', prefix);
      console.log('📋 Padrão LIKE:', `${prefix}%`);

      let maxSequence = 0;

      // Se não há patrimônios com este prefixo, começar do 1
      if (existingPatrimonios.length === 0) {
        console.log(
          '📊 Nenhum patrimônio encontrado com este prefixo, começando do 1'
        );
        maxSequence = 0;
      } else {
        existingPatrimonios.forEach(p => {
          if (!p.numero_patrimonio) return;

          const sequenceStr = p.numero_patrimonio.substring(prefix.length);
          const sequenceNum = parseInt(sequenceStr, 10);
          console.log(
            `🔍 Analisando: ${p.numero_patrimonio} -> sequência: ${sequenceStr} -> número: ${sequenceNum}`
          );
          if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
            console.log(`📈 Nova sequência máxima: ${maxSequence}`);
          }
        });
      }

      const nextSequence = (maxSequence + 1).toString().padStart(5, '0');
      const generatedNumber = `${prefix}${nextSequence}`;

      console.log('📊 Sequência máxima encontrada:', maxSequence);
      console.log('📊 Próxima sequência:', nextSequence);
      console.log('✅ Número gerado:', generatedNumber);

      // Verificação adicional: garantir que o número não existe
      const duplicateCheck = await getRow(
        `
      SELECT id FROM patrimonios 
      WHERE numero_patrimonio = $1 AND municipality_id = $2
    `,
        [generatedNumber, municipalityId]
      );

      if (duplicateCheck) {
        console.log('⚠️ AVISO: Número gerado já existe! Tentando próximo...');
        const nextNextSequence = (maxSequence + 2).toString().padStart(5, '0');
        const alternativeNumber = `${prefix}${nextNextSequence}`;
        console.log('🔄 Número alternativo:', alternativeNumber);

        return res.json({
          success: true,
          numero_patrimonio: alternativeNumber,
          sector: sector.name,
          sectorCode: sector.codigo,
          year: currentYear,
          nextSequence: nextNextSequence,
          warning: 'Número original já existia, gerado número alternativo',
        });
      }

      res.json({
        success: true,
        numero_patrimonio: generatedNumber,
        sector: sector.name,
        sectorCode: sector.codigo,
        year: currentYear,
        nextSequence: nextSequence,
      });
    } catch (error) {
      console.error('❌ Erro ao gerar número:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message,
      });
    }
  }
);

export default router;
