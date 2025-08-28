import { query } from '../../database/connection.js';
import { logInfo, logError } from '../../utils/logger.js';
import intelligentCache from '../cache/intelligentCache.js';

/**
 * Sistema de Busca Avançada
 * - Busca por texto completo
 * - Busca fuzzy (similaridade)
 * - Busca por tags/metadados
 * - Busca geográfica
 * - Busca por similaridade semântica
 */
class AdvancedSearchEngine {
  constructor() {
    this.searchStrategies = {
      fullText: this.fullTextSearch.bind(this),
      fuzzy: this.fuzzySearch.bind(this),
      tag: this.tagSearch.bind(this),
      geo: this.geoSearch.bind(this),
      semantic: this.semanticSearch.bind(this),
    };
  }

  /**
   * Busca principal que combina múltiplas estratégias
   */
  async search(query, options = {}) {
    const {
      type = 'patrimonios',
      strategy = 'fullText',
      filters = {},
      limit = 50,
      offset = 0,
      useCache = true,
    } = options;

    try {
      const cacheKey = `search:${type}:${JSON.stringify(query)}:${JSON.stringify(options)}`;

      if (useCache) {
        const cached = await intelligentCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      let results = [];

      // Aplicar estratégia de busca
      if (this.searchStrategies[strategy]) {
        results = await this.searchStrategies[strategy](
          query,
          type,
          filters,
          limit,
          offset
        );
      } else {
        // Busca combinada
        results = await this.combinedSearch(
          query,
          type,
          filters,
          limit,
          offset
        );
      }

      // Aplicar filtros adicionais
      results = this.applyFilters(results, filters);

      // Ordenar resultados
      results = this.sortResults(results, options.sortBy, options.sortOrder);

      const searchResult = {
        query,
        type,
        strategy,
        results,
        total: results.length,
        limit,
        offset,
        filters,
        metadata: {
          searchTime: Date.now(),
          strategy: strategy,
          cacheHit: false,
        },
      };

      // Cache do resultado
      if (useCache) {
        await intelligentCache.set(cacheKey, searchResult, { ttl: 300 });
      }

      logInfo(
        `Busca executada: ${strategy} para "${query}" - ${results.length} resultados`
      );
      return searchResult;
    } catch (error) {
      logError('Erro na busca avançada:', error);
      throw error;
    }
  }

  /**
   * Busca por texto completo
   */
  async fullTextSearch(query, type, filters, limit, offset) {
    const searchTerms = this.tokenizeQuery(query);

    let sql = '';
    let params = [];

    switch (type) {
      case 'patrimonios':
        sql = `
          SELECT 
            p.*,
            s.nome as setor_nome,
            m.nome as municipio_nome,
            ts_rank(
              to_tsvector('portuguese', 
                COALESCE(p.descricao, '') || ' ' || 
                COALESCE(p.numero_patrimonio, '') || ' ' ||
                COALESCE(p.marca, '') || ' ' ||
                COALESCE(p.modelo, '')
              ),
              plainto_tsquery('portuguese', $1)
            ) as rank
          FROM patrimonios p
          LEFT JOIN sectors s ON p.sector_id = s.id
          LEFT JOIN municipalities m ON p.municipality_id = m.id
          WHERE 
            to_tsvector('portuguese', 
              COALESCE(p.descricao, '') || ' ' || 
              COALESCE(p.numero_patrimonio, '') || ' ' ||
              COALESCE(p.marca, '') || ' ' ||
              COALESCE(p.modelo, '')
            ) @@ plainto_tsquery('portuguese', $1)
            AND p.deleted_at IS NULL
          ORDER BY rank DESC
          LIMIT $2 OFFSET $3
        `;
        params = [searchTerms.join(' & '), limit, offset];
        break;

      case 'imoveis':
        sql = `
          SELECT 
            i.*,
            m.nome as municipio_nome,
            ts_rank(
              to_tsvector('portuguese', 
                COALESCE(i.descricao, '') || ' ' || 
                COALESCE(i.endereco, '') || ' ' ||
                COALESCE(i.numero_imovel, '')
              ),
              plainto_tsquery('portuguese', $1)
            ) as rank
          FROM imoveis i
          LEFT JOIN municipalities m ON i.municipality_id = m.id
          WHERE 
            to_tsvector('portuguese', 
              COALESCE(i.descricao, '') || ' ' || 
              COALESCE(i.endereco, '') || ' ' ||
              COALESCE(i.numero_imovel, '')
            ) @@ plainto_tsquery('portuguese', $1)
          ORDER BY rank DESC
          LIMIT $2 OFFSET $3
        `;
        params = [searchTerms.join(' & '), limit, offset];
        break;

      default:
        throw new Error(`Tipo de busca não suportado: ${type}`);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Busca fuzzy (similaridade)
   */
  async fuzzySearch(query, type, filters, limit, offset) {
    const searchTerms = this.tokenizeQuery(query);

    let sql = '';
    let params = [];

    switch (type) {
      case 'patrimonios':
        sql = `
          SELECT 
            p.*,
            s.nome as setor_nome,
            m.nome as municipio_nome,
            GREATEST(
              similarity(p.descricao, $1),
              similarity(p.numero_patrimonio, $1),
              similarity(p.marca, $1),
              similarity(p.modelo, $1)
            ) as similarity_score
          FROM patrimonios p
          LEFT JOIN sectors s ON p.sector_id = s.id
          LEFT JOIN municipalities m ON p.municipality_id = m.id
          WHERE 
            p.deleted_at IS NULL AND (
              p.descricao % $1 OR
              p.numero_patrimonio % $1 OR
              p.marca % $1 OR
              p.modelo % $1
            )
          ORDER BY similarity_score DESC
          LIMIT $2 OFFSET $3
        `;
        params = [query, limit, offset];
        break;

      default:
        throw new Error(`Busca fuzzy não suportada para: ${type}`);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Busca por tags/metadados
   */
  async tagSearch(tags, type, filters, limit, offset) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }

    let sql = '';
    let params = [];

    switch (type) {
      case 'patrimonios':
        sql = `
          SELECT 
            p.*,
            s.nome as setor_nome,
            m.nome as municipio_nome
          FROM patrimonios p
          LEFT JOIN sectors s ON p.sector_id = s.id
          LEFT JOIN municipalities m ON p.municipality_id = m.id
          WHERE 
            p.deleted_at IS NULL AND (
              p.situacao_bem = ANY($1) OR
              p.status = ANY($1) OR
              p.tipo = ANY($1) OR
              p.marca = ANY($1)
            )
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [tags, limit, offset];
        break;

      default:
        throw new Error(`Busca por tags não suportada para: ${type}`);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Busca geográfica
   */
  async geoSearch(coordinates, type, filters, limit, offset) {
    const { lat, lng, radius = 10 } = coordinates; // radius em km

    let sql = '';
    let params = [];

    switch (type) {
      case 'imoveis':
        sql = `
          SELECT 
            i.*,
            m.nome as municipio_nome,
            (
              6371 * acos(
                cos(radians($1)) * cos(radians(i.latitude)) *
                cos(radians(i.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(i.latitude))
              )
            ) AS distance
          FROM imoveis i
          LEFT JOIN municipalities m ON i.municipality_id = m.id
          WHERE 
            i.latitude IS NOT NULL AND
            i.longitude IS NOT NULL AND
            (
              6371 * acos(
                cos(radians($1)) * cos(radians(i.latitude)) *
                cos(radians(i.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(i.latitude))
              )
            ) <= $3
          ORDER BY distance
          LIMIT $4 OFFSET $5
        `;
        params = [lat, lng, radius, limit, offset];
        break;

      default:
        throw new Error(`Busca geográfica não suportada para: ${type}`);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Busca semântica (simulada)
   */
  async semanticSearch(query, type, filters, limit, offset) {
    // Implementação básica - pode ser expandida com IA
    const synonyms = this.getSynonyms(query);
    const expandedQuery = [...new Set([query, ...synonyms])];

    const results = [];

    for (const term of expandedQuery) {
      const termResults = await this.fullTextSearch(
        term,
        type,
        filters,
        limit,
        offset
      );
      results.push(...termResults);
    }

    // Remover duplicatas e ordenar
    const uniqueResults = this.removeDuplicates(results, 'id');
    return uniqueResults.slice(0, limit);
  }

  /**
   * Busca combinada (múltiplas estratégias)
   */
  async combinedSearch(query, type, filters, limit, offset) {
    const strategies = ['fullText', 'fuzzy', 'tag'];
    const allResults = [];

    for (const strategy of strategies) {
      try {
        const results = await this.searchStrategies[strategy](
          query,
          type,
          filters,
          limit,
          offset
        );
        allResults.push(...results);
      } catch (error) {
        logError(`Erro na estratégia ${strategy}:`, error);
      }
    }

    // Remover duplicatas e ordenar por relevância
    const uniqueResults = this.removeDuplicates(allResults, 'id');
    return uniqueResults.slice(0, limit);
  }

  /**
   * Aplicar filtros aos resultados
   */
  applyFilters(results, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return results;
    }

    return results.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined) continue;

        if (Array.isArray(value)) {
          if (!value.includes(item[key])) return false;
        } else if (typeof value === 'object') {
          // Filtros de range
          if (value.min !== undefined && item[key] < value.min) return false;
          if (value.max !== undefined && item[key] > value.max) return false;
        } else {
          if (item[key] !== value) return false;
        }
      }
      return true;
    });
  }

  /**
   * Ordenar resultados
   */
  sortResults(results, sortBy = 'created_at', sortOrder = 'desc') {
    return results.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  }

  /**
   * Tokenizar query para busca
   */
  tokenizeQuery(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .map(term => term.replace(/[^\w\s]/g, ''));
  }

  /**
   * Obter sinônimos para busca semântica
   */
  getSynonyms(term) {
    const synonymMap = {
      computador: ['pc', 'desktop', 'notebook', 'laptop'],
      mesa: ['cadeira', 'mobiliário', 'escritório'],
      carro: ['automóvel', 'veículo', 'transporte'],
      edifício: ['prédio', 'construção', 'imóvel'],
    };

    return synonymMap[term.toLowerCase()] || [];
  }

  /**
   * Remover duplicatas dos resultados
   */
  removeDuplicates(results, key) {
    const seen = new Set();
    return results.filter(item => {
      const duplicate = seen.has(item[key]);
      seen.add(item[key]);
      return !duplicate;
    });
  }

  /**
   * Sugestões de busca
   */
  async getSuggestions(query, type = 'patrimonios', limit = 10) {
    try {
      const cacheKey = `suggestions:${type}:${query}`;
      const cached = await intelligentCache.get(cacheKey);
      if (cached) return cached;

      let sql = '';
      let params = [];

      switch (type) {
        case 'patrimonios':
          sql = `
            SELECT DISTINCT descricao as suggestion
            FROM patrimonios
            WHERE 
              descricao ILIKE $1 AND
              deleted_at IS NULL
            LIMIT $2
          `;
          params = [`%${query}%`, limit];
          break;

        default:
          return [];
      }

      const result = await query(sql, params);
      const suggestions = result.rows.map(row => row.suggestion);

      await intelligentCache.set(cacheKey, suggestions, { ttl: 600 });
      return suggestions;
    } catch (error) {
      logError('Erro ao obter sugestões:', error);
      return [];
    }
  }
}

export default new AdvancedSearchEngine();
