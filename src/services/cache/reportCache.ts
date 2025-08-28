import { advancedCache, CacheOptions } from './advancedCache';

export interface ReportCacheOptions extends CacheOptions {
  reportType: 'pdf' | 'excel' | 'csv' | 'dashboard' | 'aggregated';
  userId?: string;
  filters?: Record<string, any>;
  generateIfMissing?: boolean;
  preGenerate?: boolean;
}

export interface ReportMetadata {
  id: string;
  type: 'pdf' | 'excel' | 'csv' | 'dashboard' | 'aggregated';
  title: string;
  userId?: string;
  filters: Record<string, any>;
  generatedAt: Date;
  expiresAt: Date;
  fileSize?: number;
  filePath?: string;
  parameters: Record<string, any>;
}

export interface DashboardData {
  totalPatrimonio: number;
  patrimoniosPorCategoria: Array<{
    categoria: string;
    quantidade: number;
    valor: number;
  }>;
  patrimoniosRecentes: Array<any>;
  patrimoniosPorStatus: Array<{ status: string; quantidade: number }>;
  valorTotalPorMes: Array<{ mes: string; valor: number }>;
  topCategorias: Array<{ categoria: string; valor: number }>;
  alertas: Array<any>;
  estatisticas: Record<string, number>;
}

class ReportCacheManager {
  private readonly CACHE_PREFIX = 'report';
  private readonly DASHBOARD_PREFIX = 'dashboard';
  private readonly EXPORT_PREFIX = 'export';

  // TTL padrão para diferentes tipos de relatório
  private readonly DEFAULT_TTL = {
    pdf: 3600, // 1 hora
    excel: 1800, // 30 minutos
    csv: 1800, // 30 minutos
    dashboard: 300, // 5 minutos
    aggregated: 600, // 10 minutos
  };

  /**
   * Gera chave única para o cache baseada nos parâmetros do relatório
   */
  private generateCacheKey(
    type: string,
    userId?: string,
    filters?: Record<string, any>,
    additionalParams?: Record<string, any>
  ): string {
    const params = {
      userId: userId || 'anonymous',
      filters: filters || {},
      ...additionalParams,
    };

    const paramsHash = Buffer.from(JSON.stringify(params)).toString('base64');
    return `${this.CACHE_PREFIX}:${type}:${paramsHash}`;
  }

  /**
   * Cache de dados de dashboard
   */
  async getDashboardData(
    userId?: string,
    filters?: Record<string, any>
  ): Promise<DashboardData | null> {
    const key = this.generateCacheKey(this.DASHBOARD_PREFIX, userId, filters);

    return await advancedCache.get<DashboardData>(key, {
      ttl: this.DEFAULT_TTL.dashboard,
      tags: ['dashboard', 'patrimonio'],
      useRedis: true,
      useMemory: true,
    });
  }

  /**
   * Armazena dados de dashboard no cache
   */
  async setDashboardData(
    data: DashboardData,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<boolean> {
    const key = this.generateCacheKey(this.DASHBOARD_PREFIX, userId, filters);

    return await advancedCache.set(key, data, {
      ttl: this.DEFAULT_TTL.dashboard,
      tags: ['dashboard', 'patrimonio'],
      useRedis: true,
      useMemory: true,
      compression: true,
    });
  }

  /**
   * Cache de relatórios PDF
   */
  async getPdfReport(
    reportId: string,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<{ buffer: Buffer; metadata: ReportMetadata } | null> {
    const key = this.generateCacheKey('pdf', userId, filters, { reportId });

    const cached = await advancedCache.get<{
      buffer: string;
      metadata: ReportMetadata;
    }>(key, {
      ttl: this.DEFAULT_TTL.pdf,
      tags: ['pdf', 'report'],
      useRedis: true,
      useMemory: false, // PDFs são grandes, não armazenar em memória
    });

    if (cached) {
      return {
        buffer: Buffer.from(cached.buffer, 'base64'),
        metadata: cached.metadata,
      };
    }

    return null;
  }

  /**
   * Armazena relatório PDF no cache
   */
  async setPdfReport(
    reportId: string,
    buffer: Buffer,
    metadata: Omit<ReportMetadata, 'id' | 'generatedAt' | 'expiresAt'>,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<boolean> {
    const key = this.generateCacheKey('pdf', userId, filters, { reportId });

    const reportMetadata: ReportMetadata = {
      ...metadata,
      id: reportId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_TTL.pdf * 1000),
      fileSize: buffer.length,
    };

    const cacheData = {
      buffer: buffer.toString('base64'),
      metadata: reportMetadata,
    };

    return await advancedCache.set(key, cacheData, {
      ttl: this.DEFAULT_TTL.pdf,
      tags: ['pdf', 'report'],
      useRedis: true,
      useMemory: false,
      compression: true,
    });
  }

  /**
   * Cache de exportações (Excel, CSV)
   */
  async getExport(
    exportType: 'excel' | 'csv',
    exportId: string,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<{ buffer: Buffer; metadata: ReportMetadata } | null> {
    const key = this.generateCacheKey(exportType, userId, filters, {
      exportId,
    });

    const cached = await advancedCache.get<{
      buffer: string;
      metadata: ReportMetadata;
    }>(key, {
      ttl: this.DEFAULT_TTL[exportType],
      tags: [exportType, 'export'],
      useRedis: true,
      useMemory: false,
    });

    if (cached) {
      return {
        buffer: Buffer.from(cached.buffer, 'base64'),
        metadata: cached.metadata,
      };
    }

    return null;
  }

  /**
   * Armazena exportação no cache
   */
  async setExport(
    exportType: 'excel' | 'csv',
    exportId: string,
    buffer: Buffer,
    metadata: Omit<ReportMetadata, 'id' | 'generatedAt' | 'expiresAt'>,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<boolean> {
    const key = this.generateCacheKey(exportType, userId, filters, {
      exportId,
    });

    const exportMetadata: ReportMetadata = {
      ...metadata,
      id: exportId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_TTL[exportType] * 1000),
      fileSize: buffer.length,
    };

    const cacheData = {
      buffer: buffer.toString('base64'),
      metadata: exportMetadata,
    };

    return await advancedCache.set(key, cacheData, {
      ttl: this.DEFAULT_TTL[exportType],
      tags: [exportType, 'export'],
      useRedis: true,
      useMemory: false,
      compression: true,
    });
  }

  /**
   * Cache de consultas agregadas complexas
   */
  async getAggregatedQuery<T>(
    queryId: string,
    parameters: Record<string, any>,
    userId?: string
  ): Promise<T | null> {
    const key = this.generateCacheKey('aggregated', userId, undefined, {
      queryId,
      parameters,
    });

    return await advancedCache.get<T>(key, {
      ttl: this.DEFAULT_TTL.aggregated,
      tags: ['aggregated', 'query'],
      useRedis: true,
      useMemory: true,
      compression: true,
    });
  }

  /**
   * Armazena resultado de consulta agregada
   */
  async setAggregatedQuery<T>(
    queryId: string,
    data: T,
    parameters: Record<string, any>,
    userId?: string,
    customTtl?: number
  ): Promise<boolean> {
    const key = this.generateCacheKey('aggregated', userId, undefined, {
      queryId,
      parameters,
    });

    return await advancedCache.set(key, data, {
      ttl: customTtl || this.DEFAULT_TTL.aggregated,
      tags: ['aggregated', 'query'],
      useRedis: true,
      useMemory: true,
      compression: true,
    });
  }

  /**
   * Pré-geração de relatórios frequentes
   */
  async preGenerateReports(
    reportConfigs: Array<{
      type: 'pdf' | 'excel' | 'csv' | 'dashboard';
      id: string;
      generator: () => Promise<Buffer | DashboardData>;
      metadata?: Partial<ReportMetadata>;
      userId?: string;
      filters?: Record<string, any>;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const config of reportConfigs) {
      try {
        const data = await config.generator();

        if (config.type === 'dashboard') {
          await this.setDashboardData(
            data as DashboardData,
            config.userId,
            config.filters
          );
        } else {
          const buffer = data as Buffer;
          const metadata = {
            type: config.type,
            title: config.id,
            filters: config.filters || {},
            parameters: {},
            ...config.metadata,
          } as Omit<ReportMetadata, 'id' | 'generatedAt' | 'expiresAt'>;

          if (config.type === 'pdf') {
            await this.setPdfReport(
              config.id,
              buffer,
              metadata,
              config.userId,
              config.filters
            );
          } else {
            await this.setExport(
              config.type,
              config.id,
              buffer,
              metadata,
              config.userId,
              config.filters
            );
          }
        }

        success++;
      } catch (error) {
        failed++;
        errors.push(`Erro ao pré-gerar ${config.type} ${config.id}: ${error}`);
        console.error(`Erro ao pré-gerar relatório ${config.id}:`, error);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Invalida cache de relatórios baseado em mudanças de dados
   */
  async invalidateReportsOnDataChange(
    changedTables: string[],
    userId?: string
  ): Promise<number> {
    const tags: string[] = [];

    // Mapear tabelas para tags de cache
    if (changedTables.includes('patrimonio')) {
      tags.push('dashboard', 'patrimonio', 'report');
    }

    if (changedTables.includes('usuarios')) {
      tags.push('user');
    }

    if (changedTables.includes('categorias')) {
      tags.push('dashboard', 'report');
    }

    // Invalidar por tags
    let totalInvalidated = 0;
    for (const tag of tags) {
      totalInvalidated += await advancedCache.invalidateByTags([tag]);
    }

    // Se usuário específico, invalidar seus relatórios
    if (userId) {
      const userPattern = `${this.CACHE_PREFIX}:*:*${userId}*`;
      totalInvalidated += await advancedCache.invalidateByPattern(userPattern);
    }

    return totalInvalidated;
  }

  /**
   * Obtém estatísticas de cache de relatórios
   */
  async getReportCacheStats(): Promise<{
    totalReports: number;
    reportsByType: Record<string, number>;
    totalSize: number;
    avgGenerationTime: number;
    hitRate: number;
  }> {
    const stats = await advancedCache.getStats();
    const metrics = advancedCache.getMetrics();

    const reportMetrics = metrics.filter(m =>
      m.key.startsWith(this.CACHE_PREFIX)
    );

    const reportsByType: Record<string, number> = {};
    let totalSize = 0;

    reportMetrics.forEach(metric => {
      const type = metric.key.split(':')[1];
      reportsByType[type] = (reportsByType[type] || 0) + 1;
      totalSize += metric.size;
    });

    return {
      totalReports: reportMetrics.length,
      reportsByType,
      totalSize,
      avgGenerationTime: 0, // Implementar se necessário
      hitRate: stats.total.hitRate,
    };
  }

  /**
   * Limpa relatórios expirados
   */
  async cleanupExpiredReports(): Promise<number> {
    const pattern = `${this.CACHE_PREFIX}:*`;
    return await advancedCache.invalidateByPattern(pattern);
  }
}

export const reportCache = new ReportCacheManager();
export default ReportCacheManager;
