/**
 * Utilitários de Paginação Cursor-based
 */

import { logError, logPerformance } from './logger.js';

/**
 * Configurações padrão de paginação
 */
export const PAGINATION_DEFAULTS = {
  limit: 20,
  maxLimit: 100,
  defaultSort: 'created_at',
  defaultOrder: 'DESC',
};

/**
 * Validar parâmetros de paginação
 */
export function validatePaginationParams(query) {
  const {
    limit = PAGINATION_DEFAULTS.limit,
    cursor = null,
    sort = PAGINATION_DEFAULTS.defaultSort,
    order = PAGINATION_DEFAULTS.defaultOrder,
    search = '',
    filters = {},
  } = query;

  // Validar limit com proteção contra valores inválidos
  let validatedLimit = PAGINATION_DEFAULTS.limit;
  try {
    const parsedLimit = parseInt(limit);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = Math.min(parsedLimit, PAGINATION_DEFAULTS.maxLimit);
    }
  } catch (error) {
    console.warn('Valor de limit inválido, usando padrão:', limit);
  }

  // Validar order com proteção contra valores inválidos
  let validatedOrder = PAGINATION_DEFAULTS.defaultOrder;
  try {
    if (
      typeof order === 'string' &&
      ['ASC', 'DESC'].includes(order.toUpperCase())
    ) {
      validatedOrder = order.toUpperCase();
    }
  } catch (error) {
    console.warn('Valor de order inválido, usando padrão:', order);
  }

  // Validar sort (lista de campos permitidos)
  const allowedSortFields = [
    'id',
    'created_at',
    'updated_at',
    'name',
    'email',
    'numero_patrimonio',
    'descricao_bem',
    'valor_aquisicao',
  ];
  let validatedSort = PAGINATION_DEFAULTS.defaultSort;
  try {
    if (typeof sort === 'string' && allowedSortFields.includes(sort)) {
      validatedSort = sort;
    }
  } catch (error) {
    console.warn('Valor de sort inválido, usando padrão:', sort);
  }

  // Validar search
  let validatedSearch = '';
  try {
    validatedSearch = typeof search === 'string' ? search.trim() : '';
  } catch (error) {
    console.warn('Valor de search inválido, usando string vazia:', search);
  }

  // Validar filters
  let validatedFilters = {};
  try {
    validatedFilters =
      typeof filters === 'object' && filters !== null ? filters : {};
  } catch (error) {
    console.warn('Valor de filters inválido, usando objeto vazio:', filters);
  }

  return {
    limit: validatedLimit,
    cursor,
    sort: validatedSort,
    order: validatedOrder,
    search: validatedSearch,
    filters: validatedFilters,
  };
}

/**
 * Construir query SQL com paginação cursor-based
 */
export function buildPaginatedQuery(baseQuery, params, tableName = 't') {
  const { limit, cursor, sort, order, search, filters } = params;

  let query = baseQuery;
  let queryParams = [];
  let paramIndex = 1;

  // Adicionar filtros de busca
  if (search) {
    const searchConditions = [];

    // Campos de busca comuns
    const searchFields = ['name', 'description', 'descricao_bem', 'email'];

    searchFields.forEach(field => {
      if (
        typeof baseQuery === 'string' &&
        baseQuery.toLowerCase().includes(field)
      ) {
        searchConditions.push(
          `LOWER(${tableName}.${field}) LIKE LOWER($${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
    });

    if (searchConditions.length > 0) {
      const searchClause = searchConditions.join(' OR ');
      query +=
        typeof query === 'string' && query.toLowerCase().includes('where')
          ? ` AND (${searchClause})`
          : ` WHERE (${searchClause})`;
    }
  }

  // Adicionar filtros específicos
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query +=
        typeof query === 'string' && query.toLowerCase().includes('where')
          ? ` AND ${tableName}.${key} = $${paramIndex}`
          : ` WHERE ${tableName}.${key} = $${paramIndex}`;
      queryParams.push(value);
      paramIndex++;
    }
  });

  // Adicionar cursor (paginação)
  if (cursor) {
    const cursorCondition =
      order === 'ASC'
        ? `${tableName}.${sort} > $${paramIndex}`
        : `${tableName}.${sort} < $${paramIndex}`;

    query +=
      typeof query === 'string' && query.toLowerCase().includes('where')
        ? ` AND ${cursorCondition}`
        : ` WHERE ${cursorCondition}`;

    queryParams.push(cursor);
    paramIndex++;
  }

  // Adicionar ordenação
  query += ` ORDER BY ${tableName}.${sort} ${order}`;

  // Adicionar limit (+1 para detectar se há próxima página)
  query += ` LIMIT $${paramIndex}`;
  queryParams.push(limit + 1);

  return { query, params: queryParams };
}

/**
 * Processar resultados paginados
 */
export function processPaginatedResults(results, limit, sort) {
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;

  let nextCursor = null;
  let prevCursor = null;

  if (items.length > 0) {
    // Próximo cursor é o valor do campo de ordenação do último item
    nextCursor = hasMore ? items[items.length - 1][sort] : null;

    // Cursor anterior é o valor do campo de ordenação do primeiro item
    prevCursor = items[0][sort];
  }

  return {
    items,
    pagination: {
      hasMore,
      nextCursor,
      prevCursor,
      count: items.length,
      limit,
    },
  };
}

/**
 * Middleware de paginação para rotas
 */
export function paginationMiddleware(req, res, next) {
  try {
    req.pagination = validatePaginationParams(req.query);
    next();
  } catch (error) {
    logError('Erro no middleware de paginação', error);
    res.status(400).json({
      error: 'Parâmetros de paginação inválidos',
      details: error.message,
    });
  }
}

/**
 * Helper para executar query paginada
 */
export async function executePaginatedQuery(
  queryFn,
  baseQuery,
  params,
  tableName = 't'
) {
  const startTime = Date.now();

  try {
    const { query, params: queryParams } = buildPaginatedQuery(
      baseQuery,
      params,
      tableName
    );

    const results = await queryFn(query, queryParams);
    const processedResults = processPaginatedResults(
      results,
      params.limit,
      params.sort
    );

    const duration = Date.now() - startTime;
    logPerformance('Paginated query executed', duration, {
      itemCount: processedResults.items.length,
      hasMore: processedResults.pagination.hasMore,
      sort: params.sort,
      order: params.order,
    });

    return processedResults;
  } catch (error) {
    logError('Erro ao executar query paginada', error);
    throw error;
  }
}

/**
 * Gerar metadados de paginação para resposta
 */
export function generatePaginationMeta(pagination, baseUrl, query) {
  const { hasMore, nextCursor, prevCursor, count, limit } = pagination;

  const meta = {
    count,
    limit,
    hasMore,
    hasPrev: !!prevCursor,
  };

  // Gerar URLs de navegação
  if (hasMore && nextCursor) {
    const nextParams = new URLSearchParams(query);
    nextParams.set('cursor', nextCursor);
    meta.nextUrl = `${baseUrl}?${nextParams.toString()}`;
  }

  if (prevCursor) {
    const prevParams = new URLSearchParams(query);
    prevParams.set('cursor', prevCursor);
    prevParams.set('order', query.order === 'DESC' ? 'ASC' : 'DESC');
    meta.prevUrl = `${baseUrl}?${prevParams.toString()}`;
  }

  return meta;
}

/**
 * Resposta padronizada para endpoints paginados
 */
export function sendPaginatedResponse(res, data, pagination, baseUrl, query) {
  const meta = generatePaginationMeta(pagination, baseUrl, query);

  res.json({
    success: true,
    data: data.items,
    meta,
    pagination: {
      ...pagination,
      nextCursor: pagination.nextCursor,
      prevCursor: pagination.prevCursor,
    },
  });
}

/**
 * Configurações de paginação por entidade
 */
export const ENTITY_PAGINATION_CONFIG = {
  patrimonios: {
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    searchFields: ['descricao_bem', 'numero_patrimonio'],
    filterFields: [
      'setor_responsavel',
      'local_objeto',
      'status',
      'situacao_bem',
    ],
    limit: 20,
  },
  sectors: {
    defaultSort: 'name',
    defaultOrder: 'ASC',
    searchFields: ['name', 'description'],
    filterFields: ['parent_id', 'municipality_id'],
    limit: 50,
  },
  users: {
    defaultSort: 'name',
    defaultOrder: 'ASC',
    searchFields: ['name', 'email'],
    filterFields: ['role', 'municipality_id'],
    limit: 25,
  },
  imoveis: {
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    searchFields: ['endereco', 'bairro'],
    filterFields: ['tipo', 'status', 'municipality_id'],
    limit: 15,
  },
};

/**
 * Obter configuração de paginação para entidade
 */
export function getEntityPaginationConfig(entityType) {
  return (
    ENTITY_PAGINATION_CONFIG[entityType] || {
      defaultSort: 'created_at',
      defaultOrder: 'DESC',
      searchFields: ['name'],
      filterFields: [],
      limit: PAGINATION_DEFAULTS.limit,
    }
  );
}
