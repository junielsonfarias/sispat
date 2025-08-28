/**
 * Padrão Repository - Abstração de Acesso a Dados
 *
 * Fornece uma interface uniforme para acesso a dados,
 * independente da fonte (banco de dados, API, cache, etc.)
 */

// ============================================================================
// INTERFACES BASE
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filters?: Partial<T>): Promise<number>;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedRepository<T extends BaseEntity>
  extends Repository<T> {
  findPaginated(
    page: number,
    limit: number,
    filters?: Partial<T>,
    sortBy?: keyof T,
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResult<T>>;
}

// ============================================================================
// IMPLEMENTAÇÕES CONCRETAS
// ============================================================================

/**
 * Repository Base Abstrato
 */
export abstract class BaseRepository<T extends BaseEntity>
  implements Repository<T>
{
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  async findById(id: string): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL`;
      const result = await this.query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Erro ao buscar ${this.tableName} por ID:`, error);
      throw error;
    }
  }

  async findAll(filters?: Partial<T>): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
      const params: any[] = [];

      if (filters) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value], index) => {
            params.push(value);
            return `${key} = $${index + 1}`;
          });

        if (conditions.length > 0) {
          sql += ` AND ${conditions.join(' AND ')}`;
        }
      }

      const result = await this.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error(`Erro ao buscar todos ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const sql = `
        INSERT INTO ${this.tableName} (${fields.join(', ')}, created_at, updated_at)
        VALUES (${placeholders.join(', ')}, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Erro ao criar ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(', ');

      const sql = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.query(sql, [id, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Erro ao atualizar ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW()
        WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL
      `;

      const result = await this.query(sql, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Erro ao deletar ${this.tableName}:`, error);
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL`;
      const result = await this.query(sql, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error(
        `Erro ao verificar existência de ${this.tableName}:`,
        error
      );
      throw error;
    }
  }

  async count(filters?: Partial<T>): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
      const params: any[] = [];

      if (filters) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value], index) => {
            params.push(value);
            return `${key} = $${index + 1}`;
          });

        if (conditions.length > 0) {
          sql += ` AND ${conditions.join(' AND ')}`;
        }
      }

      const result = await this.query(sql, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`Erro ao contar ${this.tableName}:`, error);
      throw error;
    }
  }

  protected abstract query(sql: string, params?: any[]): Promise<any>;
}

/**
 * Repository Paginado
 */
export abstract class PaginatedBaseRepository<T extends BaseEntity>
  extends BaseRepository<T>
  implements PaginatedRepository<T>
{
  async findPaginated(
    page: number,
    limit: number,
    filters?: Partial<T>,
    sortBy?: keyof T,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<T>> {
    try {
      const offset = (page - 1) * limit;

      // Construir query base
      let baseSql = `FROM ${this.tableName} WHERE deleted_at IS NULL`;
      const params: any[] = [];

      // Aplicar filtros
      if (filters) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value], index) => {
            params.push(value);
            return `${key} = $${index + 1}`;
          });

        if (conditions.length > 0) {
          baseSql += ` AND ${conditions.join(' AND ')}`;
        }
      }

      // Contar total
      const countSql = `SELECT COUNT(*) as count ${baseSql}`;
      const countResult = await this.query(countSql, params);
      const total = parseInt(countResult.rows[0].count);

      // Buscar dados
      let dataSql = `SELECT * ${baseSql}`;

      if (sortBy) {
        dataSql += ` ORDER BY ${String(sortBy)} ${sortOrder.toUpperCase()}`;
      }

      dataSql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const dataResult = await this.query(dataSql, params);

      return {
        data: dataResult.rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error(`Erro ao buscar ${this.tableName} paginado:`, error);
      throw error;
    }
  }
}

// ============================================================================
// REPOSITORIES ESPECÍFICOS
// ============================================================================

/**
 * Repository de Patrimônios
 */
export class PatrimonioRepository extends PaginatedBaseRepository<any> {
  protected tableName = 'patrimonios';
  protected primaryKey = 'id';

  async findByMunicipality(municipalityId: string): Promise<any[]> {
    try {
      const sql = `
        SELECT p.*, s.nome as setor_nome, m.nome as municipio_nome
        FROM ${this.tableName} p
        LEFT JOIN sectors s ON p.sector_id = s.id
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        WHERE p.municipality_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `;

      const result = await this.query(sql, [municipalityId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar patrimônios por município:', error);
      throw error;
    }
  }

  async findBySector(sectorId: string): Promise<any[]> {
    try {
      const sql = `
        SELECT p.*, s.nome as setor_nome, m.nome as municipio_nome
        FROM ${this.tableName} p
        LEFT JOIN sectors s ON p.sector_id = s.id
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        WHERE p.sector_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `;

      const result = await this.query(sql, [sectorId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar patrimônios por setor:', error);
      throw error;
    }
  }

  async search(query: string, filters?: any): Promise<any[]> {
    try {
      let sql = `
        SELECT p.*, s.nome as setor_nome, m.nome as municipio_nome
        FROM ${this.tableName} p
        LEFT JOIN sectors s ON p.sector_id = s.id
        LEFT JOIN municipalities m ON p.municipality_id = m.id
        WHERE p.deleted_at IS NULL AND (
          p.descricao ILIKE $1 OR
          p.numero_patrimonio ILIKE $1 OR
          p.marca ILIKE $1 OR
          p.modelo ILIKE $1
        )
      `;

      const params = [`%${query}%`];

      if (filters?.municipality) {
        sql += ` AND p.municipality_id = $${params.length + 1}`;
        params.push(filters.municipality);
      }

      if (filters?.sector) {
        sql += ` AND p.sector_id = $${params.length + 1}`;
        params.push(filters.sector);
      }

      sql += ` ORDER BY p.created_at DESC`;

      const result = await this.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Erro na busca de patrimônios:', error);
      throw error;
    }
  }

  protected async query(sql: string, params?: any[]): Promise<any> {
    // Implementação concreta usando a conexão do banco
    const { query } = await import('../../../server/database/connection.js');
    return query(sql, params);
  }
}

/**
 * Repository de Usuários
 */
export class UserRepository extends PaginatedBaseRepository<any> {
  protected tableName = 'users';
  protected primaryKey = 'id';

  async findByEmail(email: string): Promise<any | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE email = $1 AND deleted_at IS NULL`;
      const result = await this.query(sql, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  async findByRole(role: string): Promise<any[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE role = $1 AND deleted_at IS NULL ORDER BY created_at DESC`;
      const result = await this.query(sql, [role]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar usuários por role:', error);
      throw error;
    }
  }

  protected async query(sql: string, params?: any[]): Promise<any> {
    const { query } = await import('../../../server/database/connection.js');
    return query(sql, params);
  }
}

// ============================================================================
// FACTORY PARA REPOSITORIES
// ============================================================================

export class RepositoryFactory {
  private static instances = new Map<string, Repository<any>>();

  static getPatrimonioRepository(): PatrimonioRepository {
    if (!this.instances.has('patrimonio')) {
      this.instances.set('patrimonio', new PatrimonioRepository());
    }
    return this.instances.get('patrimonio') as PatrimonioRepository;
  }

  static getUserRepository(): UserRepository {
    if (!this.instances.has('user')) {
      this.instances.set('user', new UserRepository());
    }
    return this.instances.get('user') as UserRepository;
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

// ============================================================================
// DECORATORS PARA CACHE
// ============================================================================

export function Cached(ttl: number = 300) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}_${propertyName}_${JSON.stringify(args)}`;

      // Tentar buscar do cache
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Executar método original
      const result = await method.apply(this, args);

      // Salvar no cache
      await this.setInCache(cacheKey, result, ttl);

      return result;
    };
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Repository,
  PaginatedRepository,
  BaseRepository,
  PaginatedBaseRepository,
  PatrimonioRepository,
  UserRepository,
  RepositoryFactory,
};
