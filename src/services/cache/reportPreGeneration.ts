import { advancedCache } from './advancedCache';
import { DashboardData, reportCache, ReportMetadata } from './reportCache';

export interface PreGenerationConfig {
  id: string;
  type: 'pdf' | 'excel' | 'csv' | 'dashboard';
  title: string;
  description?: string;
  schedule: {
    enabled: boolean;
    interval: number; // em milissegundos
    times?: string[]; // horários específicos (formato HH:MM)
    daysOfWeek?: number[]; // 0-6, domingo = 0
  };
  generator: () => Promise<Buffer | DashboardData>;
  metadata?: Partial<ReportMetadata>;
  filters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  conditions?: {
    minCacheAge?: number; // só gerar se cache for mais antigo que X ms
    dataChangeDetection?: boolean; // só gerar se dados mudaram
    userActivity?: boolean; // só gerar se há atividade de usuários
  };
}

export interface PreGenerationStats {
  totalConfigs: number;
  activeConfigs: number;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  successfulRuns: number;
  failedRuns: number;
  totalReportsGenerated: number;
  avgGenerationTime: number;
  lastErrors: string[];
}

class ReportPreGenerationService {
  private configs: Map<string, PreGenerationConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private stats: PreGenerationStats = {
    totalConfigs: 0,
    activeConfigs: 0,
    lastRunTime: null,
    nextRunTime: null,
    successfulRuns: 0,
    failedRuns: 0,
    totalReportsGenerated: 0,
    avgGenerationTime: 0,
    lastErrors: [],
  };

  private readonly MAX_ERRORS_HISTORY = 10;
  private readonly DEFAULT_GENERATION_INTERVAL = 30 * 60 * 1000; // 30 minutos

  constructor() {
    this.setupDefaultConfigs();
    this.start();
  }

  /**
   * Configurações padrão de pré-geração
   */
  private setupDefaultConfigs(): void {
    // Dashboard principal - gerar a cada 5 minutos
    this.addConfig({
      id: 'main-dashboard',
      type: 'dashboard',
      title: 'Dashboard Principal',
      description: 'Dados principais do dashboard para acesso rápido',
      schedule: {
        enabled: true,
        interval: 5 * 60 * 1000, // 5 minutos
      },
      generator: async () => {
        // Simular busca de dados do dashboard
        // Em produção, isso seria uma chamada real para o banco de dados
        return {
          totalPatrimonio: 1250,
          patrimoniosPorCategoria: [
            { categoria: 'Informática', quantidade: 450, valor: 125000 },
            { categoria: 'Mobiliário', quantidade: 300, valor: 85000 },
            { categoria: 'Veículos', quantidade: 25, valor: 350000 },
          ],
          patrimoniosRecentes: [],
          patrimoniosPorStatus: [
            { status: 'Ativo', quantidade: 1100 },
            { status: 'Manutenção', quantidade: 85 },
            { status: 'Inativo', quantidade: 65 },
          ],
          valorTotalPorMes: [],
          topCategorias: [],
          alertas: [],
          estatisticas: {
            totalValor: 560000,
            crescimentoMensal: 2.5,
            itensVencidos: 12,
            manutencoesPendentes: 8,
          },
        } as DashboardData;
      },
      priority: 'high',
      conditions: {
        dataChangeDetection: true,
        userActivity: true,
      },
    });

    // Relatório mensal - gerar diariamente às 06:00
    this.addConfig({
      id: 'monthly-report',
      type: 'pdf',
      title: 'Relatório Mensal de Patrimônio',
      description: 'Relatório completo mensal para gestão',
      schedule: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 horas
        times: ['06:00'],
      },
      generator: async () => {
        // Simular geração de PDF
        const content = `Relatório Mensal de Patrimônio - ${new Date().toLocaleDateString()}`;
        return Buffer.from(content, 'utf-8');
      },
      metadata: {
        type: 'pdf',
        title: 'Relatório Mensal de Patrimônio',
        filters: { periodo: 'mensal' },
        parameters: { formato: 'completo' },
      },
      priority: 'medium',
    });

    // Exportação semanal Excel - gerar às segundas-feiras às 08:00
    this.addConfig({
      id: 'weekly-excel-export',
      type: 'excel',
      title: 'Exportação Semanal Excel',
      description: 'Planilha com todos os patrimônios para análise',
      schedule: {
        enabled: true,
        interval: 7 * 24 * 60 * 60 * 1000, // 7 dias
        times: ['08:00'],
        daysOfWeek: [1], // Segunda-feira
      },
      generator: async () => {
        // Simular geração de Excel
        const content =
          'ID,Nome,Categoria,Valor,Status\n1,Notebook,Informática,2500,Ativo';
        return Buffer.from(content, 'utf-8');
      },
      metadata: {
        type: 'excel',
        title: 'Exportação Semanal',
        filters: { periodo: 'semanal' },
        parameters: { formato: 'planilha' },
      },
      priority: 'low',
    });
  }

  /**
   * Adiciona nova configuração de pré-geração
   */
  addConfig(config: PreGenerationConfig): void {
    this.configs.set(config.id, config);
    this.updateStats();

    if (config.schedule.enabled && this.isRunning) {
      this.scheduleConfig(config);
    }
  }

  /**
   * Remove configuração de pré-geração
   */
  removeConfig(configId: string): boolean {
    const removed = this.configs.delete(configId);

    if (removed) {
      this.clearSchedule(configId);
      this.updateStats();
    }

    return removed;
  }

  /**
   * Atualiza configuração existente
   */
  updateConfig(
    configId: string,
    updates: Partial<PreGenerationConfig>
  ): boolean {
    const config = this.configs.get(configId);

    if (!config) return false;

    const updatedConfig = { ...config, ...updates };
    this.configs.set(configId, updatedConfig);

    // Re-agendar se necessário
    if (updatedConfig.schedule.enabled && this.isRunning) {
      this.clearSchedule(configId);
      this.scheduleConfig(updatedConfig);
    } else if (!updatedConfig.schedule.enabled) {
      this.clearSchedule(configId);
    }

    this.updateStats();
    return true;
  }

  /**
   * Inicia o serviço de pré-geração
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Agendar todas as configurações ativas
    for (const config of this.configs.values()) {
      if (config.schedule.enabled) {
        this.scheduleConfig(config);
      }
    }

    console.log('Serviço de pré-geração de relatórios iniciado');
  }

  /**
   * Para o serviço de pré-geração
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Limpar todos os agendamentos
    for (const configId of this.configs.keys()) {
      this.clearSchedule(configId);
    }

    console.log('Serviço de pré-geração de relatórios parado');
  }

  /**
   * Agenda uma configuração específica
   */
  private scheduleConfig(config: PreGenerationConfig): void {
    const interval = setInterval(async () => {
      await this.executeGeneration(config);
    }, config.schedule.interval);

    this.intervals.set(config.id, interval);

    // Executar imediatamente se não há cache
    setImmediate(async () => {
      const shouldGenerate = await this.shouldGenerate(config);
      if (shouldGenerate) {
        await this.executeGeneration(config);
      }
    });
  }

  /**
   * Remove agendamento de uma configuração
   */
  private clearSchedule(configId: string): void {
    const interval = this.intervals.get(configId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(configId);
    }
  }

  /**
   * Verifica se deve gerar o relatório baseado nas condições
   */
  private async shouldGenerate(config: PreGenerationConfig): Promise<boolean> {
    const { conditions } = config;

    if (!conditions) return true;

    // Verificar idade mínima do cache
    if (conditions.minCacheAge) {
      const cacheKey = `${config.type}:${config.id}`;
      const exists = await advancedCache.exists(cacheKey);

      if (exists) {
        // Se existe no cache e é recente, não gerar
        return false;
      }
    }

    // Verificar mudanças nos dados
    if (conditions.dataChangeDetection) {
      // Implementar lógica de detecção de mudanças
      // Por enquanto, assumir que sempre há mudanças
      return true;
    }

    // Verificar atividade de usuários
    if (conditions.userActivity) {
      // Implementar verificação de atividade
      // Por enquanto, assumir que sempre há atividade
      return true;
    }

    return true;
  }

  /**
   * Executa a geração de um relatório
   */
  private async executeGeneration(config: PreGenerationConfig): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Iniciando pré-geração: ${config.title} (${config.id})`);

      const shouldGenerate = await this.shouldGenerate(config);
      if (!shouldGenerate) {
        console.log(
          `Pré-geração pulada: ${config.title} (condições não atendidas)`
        );
        return;
      }

      const data = await config.generator();

      // Armazenar no cache apropriado
      switch (config.type) {
        case 'dashboard':
          await reportCache.setDashboardData(
            data as DashboardData,
            undefined,
            config.filters
          );
          break;

        case 'pdf':
          await reportCache.setPdfReport(
            config.id,
            data as Buffer,
            config.metadata || {
              type: 'pdf',
              title: config.title,
              filters: {},
              parameters: {},
            },
            undefined,
            config.filters
          );
          break;

        case 'excel':
        case 'csv':
          await reportCache.setExport(
            config.type,
            config.id,
            data as Buffer,
            config.metadata || {
              type: config.type,
              title: config.title,
              filters: {},
              parameters: {},
            },
            undefined,
            config.filters
          );
          break;
      }

      const generationTime = Date.now() - startTime;

      this.stats.successfulRuns++;
      this.stats.totalReportsGenerated++;
      this.stats.lastRunTime = new Date();
      this.updateAverageGenerationTime(generationTime);

      console.log(
        `Pré-geração concluída: ${config.title} (${generationTime}ms)`
      );
    } catch (error) {
      this.stats.failedRuns++;
      this.stats.lastRunTime = new Date();

      const errorMessage = `Erro na pré-geração ${config.title}: ${error}`;
      this.addError(errorMessage);

      console.error(errorMessage, error);
    }
  }

  /**
   * Executa pré-geração manual de uma configuração
   */
  async generateNow(configId: string): Promise<boolean> {
    const config = this.configs.get(configId);

    if (!config) {
      throw new Error(`Configuração não encontrada: ${configId}`);
    }

    try {
      await this.executeGeneration(config);
      return true;
    } catch (error) {
      console.error(`Erro na geração manual de ${configId}:`, error);
      return false;
    }
  }

  /**
   * Executa pré-geração de todas as configurações
   */
  async generateAll(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const config of this.configs.values()) {
      try {
        await this.executeGeneration(config);
        success++;
      } catch (error) {
        failed++;
        errors.push(`${config.id}: ${error}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats(): PreGenerationStats {
    return { ...this.stats };
  }

  /**
   * Obtém todas as configurações
   */
  getConfigs(): PreGenerationConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Obtém configuração específica
   */
  getConfig(configId: string): PreGenerationConfig | undefined {
    return this.configs.get(configId);
  }

  /**
   * Atualiza estatísticas
   */
  private updateStats(): void {
    this.stats.totalConfigs = this.configs.size;
    this.stats.activeConfigs = Array.from(this.configs.values()).filter(
      config => config.schedule.enabled
    ).length;

    // Calcular próximo tempo de execução
    const nextTimes: number[] = [];
    for (const config of this.configs.values()) {
      if (config.schedule.enabled) {
        nextTimes.push(Date.now() + config.schedule.interval);
      }
    }

    if (nextTimes.length > 0) {
      this.stats.nextRunTime = new Date(Math.min(...nextTimes));
    } else {
      this.stats.nextRunTime = null;
    }
  }

  /**
   * Atualiza tempo médio de geração
   */
  private updateAverageGenerationTime(newTime: number): void {
    const currentAvg = this.stats.avgGenerationTime;
    const totalRuns = this.stats.successfulRuns;

    this.stats.avgGenerationTime =
      (currentAvg * (totalRuns - 1) + newTime) / totalRuns;
  }

  /**
   * Adiciona erro ao histórico
   */
  private addError(error: string): void {
    this.stats.lastErrors.unshift(error);

    if (this.stats.lastErrors.length > this.MAX_ERRORS_HISTORY) {
      this.stats.lastErrors = this.stats.lastErrors.slice(
        0,
        this.MAX_ERRORS_HISTORY
      );
    }
  }
}

// Instância singleton
export const reportPreGeneration = new ReportPreGenerationService();
export default ReportPreGenerationService;
