import { query } from '../../database/connection.js';
import { logInfo, logError } from '../../utils/logger.js';
import intelligentCache from '../cache/intelligentCache.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sistema de Relatórios Avançados
 * - Relatórios customizáveis
 * - Múltiplos formatos (PDF, Excel, CSV)
 * - Agendamento de relatórios
 * - Relatórios comparativos
 * - Templates personalizáveis
 */
class AdvancedReportGenerator {
  constructor() {
    this.reportTypes = {
      PATRIMONY_SUMMARY: 'patrimony_summary',
      DEPRECIATION_REPORT: 'depreciation_report',
      TRANSFER_HISTORY: 'transfer_history',
      INVENTORY_REPORT: 'inventory_report',
      FINANCIAL_REPORT: 'financial_report',
      COMPARATIVE_REPORT: 'comparative_report',
      CUSTOM_REPORT: 'custom_report',
    };

    this.exportFormats = {
      PDF: 'pdf',
      EXCEL: 'excel',
      CSV: 'csv',
      JSON: 'json',
    };

    this.reportsDirectory = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  /**
   * Garantir que o diretório de relatórios existe
   */
  async ensureReportsDirectory() {
    try {
      await fs.access(this.reportsDirectory);
    } catch {
      await fs.mkdir(this.reportsDirectory, { recursive: true });
    }
  }

  /**
   * Gerar relatório customizado
   */
  async generateCustomReport(config) {
    try {
      const {
        type,
        filters = {},
        format = 'pdf',
        includeCharts = true,
        includeMetadata = true,
        customFields = [],
      } = config;

      logInfo(`Gerando relatório: ${type}`, { config });

      // Buscar dados baseado no tipo
      const data = await this.fetchReportData(type, filters);

      // Processar dados
      const processedData = await this.processReportData(
        data,
        type,
        customFields
      );

      // Gerar relatório
      const report = await this.createReport(processedData, type, {
        includeCharts,
        includeMetadata,
        format,
      });

      // Salvar relatório
      const filename = await this.saveReport(report, type, format);

      logInfo(`Relatório gerado com sucesso: ${filename}`);

      return {
        success: true,
        filename,
        downloadUrl: `/api/reports/download/${filename}`,
        metadata: {
          type,
          format,
          generatedAt: new Date().toISOString(),
          recordCount: processedData.length,
          filters,
        },
      };
    } catch (error) {
      logError('Erro ao gerar relatório customizado:', error);
      throw error;
    }
  }

  /**
   * Buscar dados para relatório
   */
  async fetchReportData(type, filters) {
    const cacheKey = `report_data_${type}_${JSON.stringify(filters)}`;
    const cached = await intelligentCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let sql = '';
    let params = [];

    switch (type) {
      case this.reportTypes.PATRIMONY_SUMMARY:
        sql = this.buildPatrimonySummaryQuery(filters);
        break;

      case this.reportTypes.DEPRECIATION_REPORT:
        sql = this.buildDepreciationReportQuery(filters);
        break;

      case this.reportTypes.TRANSFER_HISTORY:
        sql = this.buildTransferHistoryQuery(filters);
        break;

      case this.reportTypes.INVENTORY_REPORT:
        sql = this.buildInventoryReportQuery(filters);
        break;

      case this.reportTypes.FINANCIAL_REPORT:
        sql = this.buildFinancialReportQuery(filters);
        break;

      default:
        throw new Error(`Tipo de relatório não suportado: ${type}`);
    }

    const result = await query(sql, params);
    const data = result.rows;

    // Cache dos dados por 30 minutos
    await intelligentCache.set(cacheKey, data, { ttl: 1800 });

    return data;
  }

  /**
   * Construir query para resumo de patrimônios
   */
  buildPatrimonySummaryQuery(filters) {
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
        s.nome as setor_nome,
        m.nome as municipio_nome,
        p.created_at
      FROM patrimonios p
      LEFT JOIN sectors s ON p.sector_id = s.id
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      WHERE p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.municipality) {
      sql += ` AND p.municipality_id = $${paramIndex++}`;
      params.push(filters.municipality);
    }

    if (filters.sector) {
      sql += ` AND p.sector_id = $${paramIndex++}`;
      params.push(filters.sector);
    }

    if (filters.status) {
      sql += ` AND p.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.dateFrom) {
      sql += ` AND p.created_at >= $${paramIndex++}`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ` AND p.created_at <= $${paramIndex++}`;
      params.push(filters.dateTo);
    }

    sql += ` ORDER BY p.created_at DESC`;

    return { sql, params };
  }

  /**
   * Construir query para relatório de depreciação
   */
  buildDepreciationReportQuery(filters) {
    let sql = `
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao,
        p.valor_aquisicao,
        p.data_aquisicao,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        EXTRACT(YEAR FROM AGE(NOW(), p.data_aquisicao)) as anos_uso,
        CASE 
          WHEN p.metodo_depreciacao = 'LINEAR' THEN
            (p.valor_aquisicao - COALESCE(p.valor_residual, 0)) / p.vida_util_anos
          ELSE 0
        END as depreciacao_anual,
        CASE 
          WHEN p.metodo_depreciacao = 'LINEAR' THEN
            (p.valor_aquisicao - COALESCE(p.valor_residual, 0)) / p.vida_util_anos * 
            EXTRACT(YEAR FROM AGE(NOW(), p.data_aquisicao))
          ELSE 0
        END as depreciacao_acumulada,
        p.valor_aquisicao - 
        CASE 
          WHEN p.metodo_depreciacao = 'LINEAR' THEN
            (p.valor_aquisicao - COALESCE(p.valor_residual, 0)) / p.vida_util_anos * 
            EXTRACT(YEAR FROM AGE(NOW(), p.data_aquisicao))
          ELSE 0
        END as valor_atual
      FROM patrimonios p
      WHERE p.deleted_at IS NULL 
        AND p.valor_aquisicao > 0 
        AND p.data_aquisicao IS NOT NULL
    `;

    const params = [];

    if (filters.municipality) {
      sql += ` AND p.municipality_id = $1`;
      params.push(filters.municipality);
    }

    sql += ` ORDER BY p.data_aquisicao DESC`;

    return { sql, params };
  }

  /**
   * Construir query para histórico de transferências
   */
  buildTransferHistoryQuery(filters) {
    let sql = `
      SELECT 
        t.id,
        t.patrimonio_id,
        p.numero_patrimonio,
        p.descricao,
        t.setor_origem,
        t.setor_destino,
        t.data_transferencia,
        t.motivo,
        t.observacoes,
        u.nome as usuario_transferencia
      FROM transfers t
      JOIN patrimonios p ON t.patrimonio_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    if (filters.patrimonio) {
      sql += ` AND t.patrimonio_id = $1`;
      params.push(filters.patrimonio);
    }

    if (filters.dateFrom) {
      sql += ` AND t.data_transferencia >= $${params.length + 1}`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ` AND t.data_transferencia <= $${params.length + 1}`;
      params.push(filters.dateTo);
    }

    sql += ` ORDER BY t.data_transferencia DESC`;

    return { sql, params };
  }

  /**
   * Construir query para relatório de inventário
   */
  buildInventoryReportQuery(filters) {
    let sql = `
      SELECT 
        i.id,
        i.patrimonio_id,
        p.numero_patrimonio,
        p.descricao,
        i.data_inventario,
        i.situacao_encontrada,
        i.observacoes,
        i.fotos,
        u.nome as usuario_inventario
      FROM inventories i
      JOIN patrimonios p ON i.patrimonio_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    if (filters.dateFrom) {
      sql += ` AND i.data_inventario >= $1`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ` AND i.data_inventario <= $${params.length + 1}`;
      params.push(filters.dateTo);
    }

    sql += ` ORDER BY i.data_inventario DESC`;

    return { sql, params };
  }

  /**
   * Construir query para relatório financeiro
   */
  buildFinancialReportQuery(filters) {
    let sql = `
      SELECT 
        DATE_TRUNC('month', p.data_aquisicao) as mes,
        COUNT(*) as total_patrimonios,
        SUM(p.valor_aquisicao) as valor_total,
        AVG(p.valor_aquisicao) as valor_medio,
        COUNT(CASE WHEN p.situacao_bem = 'OTIMO' THEN 1 END) as otimo_count,
        COUNT(CASE WHEN p.situacao_bem = 'BOM' THEN 1 END) as bom_count,
        COUNT(CASE WHEN p.situacao_bem = 'REGULAR' THEN 1 END) as regular_count,
        COUNT(CASE WHEN p.situacao_bem = 'RUIM' THEN 1 END) as ruim_count,
        COUNT(CASE WHEN p.situacao_bem = 'PESSIMO' THEN 1 END) as pessimo_count
      FROM patrimonios p
      WHERE p.deleted_at IS NULL 
        AND p.data_aquisicao IS NOT NULL
    `;

    const params = [];

    if (filters.year) {
      sql += ` AND EXTRACT(YEAR FROM p.data_aquisicao) = $1`;
      params.push(filters.year);
    }

    sql += `
      GROUP BY DATE_TRUNC('month', p.data_aquisicao)
      ORDER BY mes DESC
    `;

    return { sql, params };
  }

  /**
   * Processar dados do relatório
   */
  async processReportData(data, type, customFields) {
    let processedData = [...data];

    // Aplicar campos customizados
    if (customFields.length > 0) {
      processedData = processedData.map(item => {
        const customItem = { ...item };
        customFields.forEach(field => {
          if (field.type === 'calculated') {
            customItem[field.name] = this.calculateCustomField(item, field);
          } else if (field.type === 'formatted') {
            customItem[field.name] = this.formatCustomField(item, field);
          }
        });
        return customItem;
      });
    }

    // Aplicar cálculos específicos por tipo
    switch (type) {
      case this.reportTypes.DEPRECIATION_REPORT:
        processedData = this.processDepreciationData(processedData);
        break;

      case this.reportTypes.FINANCIAL_REPORT:
        processedData = this.processFinancialData(processedData);
        break;
    }

    return processedData;
  }

  /**
   * Processar dados de depreciação
   */
  processDepreciationData(data) {
    return data.map(item => ({
      ...item,
      depreciacao_percentual:
        (item.depreciacao_acumulada / item.valor_aquisicao) * 100,
      vida_util_restante: Math.max(0, item.vida_util_anos - item.anos_uso),
      status_depreciacao: this.getDepreciationStatus(item),
    }));
  }

  /**
   * Processar dados financeiros
   */
  processFinancialData(data) {
    return data.map(item => ({
      ...item,
      valor_medio_formatado: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(item.valor_medio),
      total_formatado: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(item.valor_total),
    }));
  }

  /**
   * Calcular campo customizado
   */
  calculateCustomField(item, field) {
    switch (field.calculation) {
      case 'percentage':
        return (item[field.field1] / item[field.field2]) * 100;
      case 'difference':
        return item[field.field1] - item[field.field2];
      case 'sum':
        return item[field.field1] + item[field.field2];
      default:
        return item[field.field1];
    }
  }

  /**
   * Formatar campo customizado
   */
  formatCustomField(item, field) {
    const value = item[field.field];

    switch (field.format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value;
    }
  }

  /**
   * Obter status de depreciação
   */
  getDepreciationStatus(item) {
    const percentual = item.depreciacao_percentual;

    if (percentual >= 100) return 'TOTALMENTE DEPRECIADO';
    if (percentual >= 75) return 'ALTAMENTE DEPRECIADO';
    if (percentual >= 50) return 'MODERADAMENTE DEPRECIADO';
    if (percentual >= 25) return 'POUCO DEPRECIADO';
    return 'NOVO';
  }

  /**
   * Criar relatório
   */
  async createReport(data, type, options) {
    const { includeCharts, includeMetadata, format } = options;

    const report = {
      type,
      format,
      generatedAt: new Date().toISOString(),
      data,
      metadata: includeMetadata
        ? await this.generateMetadata(data, type)
        : null,
      charts: includeCharts ? await this.generateCharts(data, type) : null,
      summary: this.generateSummary(data, type),
    };

    return report;
  }

  /**
   * Gerar metadados do relatório
   */
  async generateMetadata(data, type) {
    return {
      recordCount: data.length,
      totalValue: data.reduce(
        (sum, item) => sum + (item.valor_aquisicao || 0),
        0
      ),
      averageValue:
        data.length > 0
          ? data.reduce((sum, item) => sum + (item.valor_aquisicao || 0), 0) /
            data.length
          : 0,
      dateRange: this.getDateRange(data),
      filters: {}, // Seria preenchido com os filtros aplicados
    };
  }

  /**
   * Gerar gráficos para o relatório
   */
  async generateCharts(data, type) {
    const charts = {};

    switch (type) {
      case this.reportTypes.PATRIMONY_SUMMARY:
        charts.situacao = this.createSituacaoChart(data);
        charts.valorPorTipo = this.createValorPorTipoChart(data);
        break;

      case this.reportTypes.DEPRECIATION_REPORT:
        charts.depreciacao = this.createDepreciacaoChart(data);
        charts.valorAtual = this.createValorAtualChart(data);
        break;

      case this.reportTypes.FINANCIAL_REPORT:
        charts.evolucaoMensal = this.createEvolucaoMensalChart(data);
        break;
    }

    return charts;
  }

  /**
   * Criar gráfico de situação
   */
  createSituacaoChart(data) {
    const situacoes = {};

    data.forEach(item => {
      const situacao = item.situacao_bem || 'NÃO INFORMADO';
      situacoes[situacao] = (situacoes[situacao] || 0) + 1;
    });

    return {
      type: 'pie',
      data: {
        labels: Object.keys(situacoes),
        datasets: [
          {
            data: Object.values(situacoes),
            backgroundColor: [
              '#4CAF50',
              '#8BC34A',
              '#FFC107',
              '#FF9800',
              '#F44336',
            ],
          },
        ],
      },
    };
  }

  /**
   * Criar gráfico de valor por tipo
   */
  createValorPorTipoChart(data) {
    const tipos = {};

    data.forEach(item => {
      const tipo = item.tipo || 'NÃO INFORMADO';
      tipos[tipo] = (tipos[tipo] || 0) + (item.valor_aquisicao || 0);
    });

    return {
      type: 'bar',
      data: {
        labels: Object.keys(tipos),
        datasets: [
          {
            label: 'Valor Total (R$)',
            data: Object.values(tipos),
            backgroundColor: '#2196F3',
          },
        ],
      },
    };
  }

  /**
   * Criar gráfico de depreciação
   */
  createDepreciacaoChart(data) {
    const ranges = {
      '0-25%': 0,
      '25-50%': 0,
      '50-75%': 0,
      '75-100%': 0,
      '100%+': 0,
    };

    data.forEach(item => {
      const percentual = item.depreciacao_percentual || 0;
      if (percentual <= 25) ranges['0-25%']++;
      else if (percentual <= 50) ranges['25-50%']++;
      else if (percentual <= 75) ranges['50-75%']++;
      else if (percentual <= 100) ranges['75-100%']++;
      else ranges['100%+']++;
    });

    return {
      type: 'doughnut',
      data: {
        labels: Object.keys(ranges),
        datasets: [
          {
            data: Object.values(ranges),
            backgroundColor: [
              '#4CAF50',
              '#8BC34A',
              '#FFC107',
              '#FF9800',
              '#F44336',
            ],
          },
        ],
      },
    };
  }

  /**
   * Criar gráfico de valor atual
   */
  createValorAtualChart(data) {
    const valores = data
      .map(item => ({
        patrimonio: item.numero_patrimonio,
        valorAquisicao: item.valor_aquisicao,
        valorAtual: item.valor_atual,
      }))
      .slice(0, 20); // Limitar a 20 itens

    return {
      type: 'line',
      data: {
        labels: valores.map(v => v.patrimonio),
        datasets: [
          {
            label: 'Valor de Aquisição',
            data: valores.map(v => v.valorAquisicao),
            borderColor: '#2196F3',
            fill: false,
          },
          {
            label: 'Valor Atual',
            data: valores.map(v => v.valorAtual),
            borderColor: '#FF9800',
            fill: false,
          },
        ],
      },
    };
  }

  /**
   * Criar gráfico de evolução mensal
   */
  createEvolucaoMensalChart(data) {
    return {
      type: 'line',
      data: {
        labels: data.map(item =>
          new Date(item.mes).toLocaleDateString('pt-BR', {
            month: 'short',
            year: 'numeric',
          })
        ),
        datasets: [
          {
            label: 'Valor Total (R$)',
            data: data.map(item => item.valor_total),
            borderColor: '#4CAF50',
            fill: false,
          },
        ],
      },
    };
  }

  /**
   * Gerar resumo do relatório
   */
  generateSummary(data, type) {
    const summary = {
      totalRecords: data.length,
      totalValue: data.reduce(
        (sum, item) => sum + (item.valor_aquisicao || 0),
        0
      ),
      averageValue:
        data.length > 0
          ? data.reduce((sum, item) => sum + (item.valor_aquisicao || 0), 0) /
            data.length
          : 0,
    };

    switch (type) {
      case this.reportTypes.DEPRECIATION_REPORT:
        summary.totalDepreciacao = data.reduce(
          (sum, item) => sum + (item.depreciacao_acumulada || 0),
          0
        );
        summary.valorAtualTotal = data.reduce(
          (sum, item) => sum + (item.valor_atual || 0),
          0
        );
        break;

      case this.reportTypes.FINANCIAL_REPORT:
        summary.totalPatrimonios = data.reduce(
          (sum, item) => sum + (item.total_patrimonios || 0),
          0
        );
        break;
    }

    return summary;
  }

  /**
   * Obter intervalo de datas dos dados
   */
  getDateRange(data) {
    if (data.length === 0) return null;

    const dates = data
      .map(
        item =>
          item.created_at ||
          item.data_aquisicao ||
          item.data_transferencia ||
          item.data_inventario
      )
      .filter(date => date)
      .map(date => new Date(date));

    if (dates.length === 0) return null;

    return {
      start: new Date(Math.min(...dates)).toISOString(),
      end: new Date(Math.max(...dates)).toISOString(),
    };
  }

  /**
   * Salvar relatório
   */
  async saveReport(report, type, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `relatorio_${type}_${timestamp}.${format}`;
    const filepath = path.join(this.reportsDirectory, filename);

    let content = '';

    switch (format) {
      case this.exportFormats.JSON:
        content = JSON.stringify(report, null, 2);
        break;

      case this.exportFormats.CSV:
        content = this.convertToCSV(report.data);
        break;

      case this.exportFormats.EXCEL:
        content = await this.convertToExcel(report);
        break;

      case this.exportFormats.PDF:
        content = await this.convertToPDF(report);
        break;

      default:
        throw new Error(`Formato não suportado: ${format}`);
    }

    await fs.writeFile(filepath, content);
    return filename;
  }

  /**
   * Converter dados para CSV
   */
  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Converter para Excel (simulado)
   */
  async convertToExcel(report) {
    // Em produção, usar biblioteca como xlsx
    return JSON.stringify(report);
  }

  /**
   * Converter para PDF (simulado)
   */
  async convertToPDF(report) {
    // Em produção, usar biblioteca como puppeteer ou jsPDF
    return JSON.stringify(report);
  }

  /**
   * Agendar relatório
   */
  async scheduleReport(config) {
    const { type, filters, format, schedule, email, webhook } = config;

    const scheduledReport = {
      id: `scheduled_${Date.now()}`,
      type,
      filters,
      format,
      schedule,
      email,
      webhook,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(schedule),
    };

    // Em produção, salvar no banco de dados
    logInfo('Relatório agendado:', scheduledReport);

    return scheduledReport;
  }

  /**
   * Calcular próxima execução
   */
  calculateNextRun(schedule) {
    const now = new Date();

    switch (schedule.frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      default:
        return now;
    }
  }

  /**
   * Gerar relatório comparativo
   */
  async generateComparativeReport(reports) {
    const comparativeData = {
      reports: reports.map(report => ({
        type: report.type,
        summary: report.summary,
        metadata: report.metadata,
      })),
      comparison: this.compareReports(reports),
    };

    return comparativeData;
  }

  /**
   * Comparar relatórios
   */
  compareReports(reports) {
    if (reports.length < 2) return null;

    const comparison = {
      totalValueDifference:
        reports[1].summary.totalValue - reports[0].summary.totalValue,
      totalValuePercentage:
        ((reports[1].summary.totalValue - reports[0].summary.totalValue) /
          reports[0].summary.totalValue) *
        100,
      recordCountDifference:
        reports[1].summary.totalRecords - reports[0].summary.totalRecords,
      averageValueDifference:
        reports[1].summary.averageValue - reports[0].summary.averageValue,
    };

    return comparison;
  }
}

export default new AdvancedReportGenerator();
