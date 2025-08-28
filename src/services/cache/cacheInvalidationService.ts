import { EventEmitter } from 'events';
import { advancedCache } from './advancedCache';
import { reportCache } from './reportCache';

export interface CacheInvalidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: 'data_change' | 'time_based' | 'user_action' | 'system_event';
    conditions: Record<string, any>;
  };
  actions: Array<{
    type: 'invalidate_tags' | 'invalidate_pattern' | 'warm_cache' | 'clear_all';
    parameters: Record<string, any>;
    delay?: number; // delay em ms antes de executar
  }>;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface CacheEvent {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
  source: string;
  userId?: string;
}

export interface InvalidationStats {
  totalRules: number;
  activeRules: number;
  totalInvalidations: number;
  invalidationsByRule: Record<string, number>;
  invalidationsByType: Record<string, number>;
  averageInvalidationTime: number;
  lastInvalidation: Date | null;
  errors: Array<{
    rule: string;
    error: string;
    timestamp: Date;
  }>;
}

class CacheInvalidationService extends EventEmitter {
  private rules: Map<string, CacheInvalidationRule> = new Map();
  private stats: InvalidationStats = {
    totalRules: 0,
    activeRules: 0,
    totalInvalidations: 0,
    invalidationsByRule: {},
    invalidationsByType: {},
    averageInvalidationTime: 0,
    lastInvalidation: null,
    errors: [],
  };

  private readonly MAX_ERRORS_HISTORY = 50;

  constructor() {
    super();
    this.setupDefaultRules();
    this.setupEventListeners();
  }

  /**
   * Configura regras padrão de invalidação
   */
  private setupDefaultRules(): void {
    // Invalidação quando patrimônio é alterado
    this.addRule({
      id: 'patrimonio-change',
      name: 'Invalidação por Mudança de Patrimônio',
      description:
        'Invalida cache relacionado quando patrimônio é criado, atualizado ou deletado',
      enabled: true,
      trigger: {
        type: 'data_change',
        conditions: {
          tables: ['patrimonio'],
          operations: ['create', 'update', 'delete'],
        },
      },
      actions: [
        {
          type: 'invalidate_tags',
          parameters: {
            tags: ['patrimonio', 'dashboard', 'report'],
          },
        },
        {
          type: 'warm_cache',
          parameters: {
            keys: ['dashboard:main'],
          },
          delay: 1000, // aguardar 1 segundo antes de aquecer
        },
      ],
      priority: 'high',
    });

    // Invalidação por mudança de usuário
    this.addRule({
      id: 'user-change',
      name: 'Invalidação por Mudança de Usuário',
      description: 'Invalida cache de usuário quando dados são alterados',
      enabled: true,
      trigger: {
        type: 'data_change',
        conditions: {
          tables: ['usuarios'],
          operations: ['update', 'delete'],
        },
      },
      actions: [
        {
          type: 'invalidate_tags',
          parameters: {
            tags: ['user'],
          },
        },
        {
          type: 'invalidate_pattern',
          parameters: {
            pattern: 'user:*',
          },
        },
      ],
      priority: 'medium',
    });

    // Limpeza automática noturna
    this.addRule({
      id: 'nightly-cleanup',
      name: 'Limpeza Noturna de Cache',
      description: 'Limpa cache expirado diariamente às 02:00',
      enabled: true,
      trigger: {
        type: 'time_based',
        conditions: {
          schedule: '0 2 * * *', // cron: 02:00 diariamente
          timezone: 'America/Sao_Paulo',
        },
      },
      actions: [
        {
          type: 'invalidate_pattern',
          parameters: {
            pattern: 'expired:*',
          },
        },
      ],
      priority: 'low',
    });

    // Invalidação por login de usuário
    this.addRule({
      id: 'user-login',
      name: 'Aquecimento de Cache no Login',
      description: 'Aquece cache importante quando usuário faz login',
      enabled: true,
      trigger: {
        type: 'user_action',
        conditions: {
          action: 'login',
          userRoles: ['admin', 'gestor'],
        },
      },
      actions: [
        {
          type: 'warm_cache',
          parameters: {
            keys: ['dashboard:main', 'patrimonio:summary'],
          },
          delay: 500,
        },
      ],
      priority: 'medium',
    });

    // Invalidação por alta carga do sistema
    this.addRule({
      id: 'high-load-cleanup',
      name: 'Limpeza por Alta Carga',
      description:
        'Limpa cache menos importante quando sistema está sob alta carga',
      enabled: true,
      trigger: {
        type: 'system_event',
        conditions: {
          event: 'high_memory_usage',
          threshold: 85, // 85% de uso de memória
        },
      },
      actions: [
        {
          type: 'invalidate_tags',
          parameters: {
            tags: ['low-priority', 'temporary'],
          },
        },
      ],
      priority: 'high',
    });
  }

  /**
   * Configura listeners para eventos do sistema
   */
  private setupEventListeners(): void {
    // Listener para mudanças de dados
    this.on('data_change', (event: CacheEvent) => {
      this.processEvent(event);
    });

    // Listener para ações de usuário
    this.on('user_action', (event: CacheEvent) => {
      this.processEvent(event);
    });

    // Listener para eventos do sistema
    this.on('system_event', (event: CacheEvent) => {
      this.processEvent(event);
    });
  }

  /**
   * Adiciona nova regra de invalidação
   */
  addRule(rule: CacheInvalidationRule): void {
    this.rules.set(rule.id, rule);
    this.updateStats();

    console.log(`Regra de invalidação adicionada: ${rule.name} (${rule.id})`);
  }

  /**
   * Remove regra de invalidação
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.updateStats();
      console.log(`Regra de invalidação removida: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Atualiza regra existente
   */
  updateRule(ruleId: string, updates: Partial<CacheInvalidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    this.updateStats();

    console.log(`Regra de invalidação atualizada: ${rule.name} (${ruleId})`);
    return true;
  }

  /**
   * Habilita/desabilita regra
   */
  toggleRule(ruleId: string, enabled?: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
    this.updateStats();

    console.log(
      `Regra ${rule.enabled ? 'habilitada' : 'desabilitada'}: ${rule.name}`
    );
    return true;
  }

  /**
   * Processa evento e executa regras aplicáveis
   */
  private async processEvent(event: CacheEvent): Promise<void> {
    const applicableRules = this.getApplicableRules(event);

    if (applicableRules.length === 0) return;

    console.log(
      `Processando evento ${event.type}, ${applicableRules.length} regras aplicáveis`
    );

    // Ordenar regras por prioridade
    applicableRules.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Executar regras
    for (const rule of applicableRules) {
      await this.executeRule(rule, event);
    }
  }

  /**
   * Obtém regras aplicáveis para um evento
   */
  private getApplicableRules(event: CacheEvent): CacheInvalidationRule[] {
    const applicableRules: CacheInvalidationRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      if (this.isRuleApplicable(rule, event)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Verifica se uma regra é aplicável para um evento
   */
  private isRuleApplicable(
    rule: CacheInvalidationRule,
    event: CacheEvent
  ): boolean {
    if (rule.trigger.type !== event.type) return false;

    const { conditions } = rule.trigger;

    switch (event.type) {
      case 'data_change': {
        const tables = conditions.tables as string[];
        const operations = conditions.operations as string[];

        return (
          tables.includes(event.data.table) &&
          operations.includes(event.data.operation)
        );
      }

      case 'user_action': {
        const action = conditions.action as string;
        const userRoles = conditions.userRoles as string[];

        return (
          event.data.action === action &&
          (!userRoles || userRoles.includes(event.data.userRole))
        );
      }

      case 'system_event': {
        const systemEvent = conditions.event as string;
        const threshold = conditions.threshold as number;

        return (
          event.data.event === systemEvent &&
          (!threshold || event.data.value >= threshold)
        );
      }

      default:
        return false;
    }
  }

  /**
   * Executa uma regra de invalidação
   */
  private async executeRule(
    rule: CacheInvalidationRule,
    event: CacheEvent
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Executando regra: ${rule.name}`);

      for (const action of rule.actions) {
        if (action.delay) {
          await this.delay(action.delay);
        }

        await this.executeAction(action, event);
      }

      // Atualizar estatísticas
      const executionTime = Date.now() - startTime;
      this.updateInvalidationStats(rule.id, executionTime);

      console.log(
        `Regra executada com sucesso: ${rule.name} (${executionTime}ms)`
      );
    } catch (error) {
      this.addError(rule.id, `Erro ao executar regra: ${error}`);
      console.error(`Erro ao executar regra ${rule.name}:`, error);
    }
  }

  /**
   * Executa uma ação específica
   */
  private async executeAction(
    action: { type: string; parameters: Record<string, any> },
    event: CacheEvent
  ): Promise<void> {
    switch (action.type) {
      case 'invalidate_tags': {
        const tags = action.parameters.tags as string[];
        await advancedCache.invalidateByTags(tags);
        await reportCache.invalidateReportsOnDataChange(tags, event.userId);
        break;
      }

      case 'invalidate_pattern': {
        const pattern = action.parameters.pattern as string;
        await advancedCache.invalidateByPattern(pattern);
        break;
      }

      case 'warm_cache': {
        const keys = action.parameters.keys as string[];
        // Implementar cache warming baseado nas chaves
        for (const key of keys) {
          await this.warmCacheKey(key, event);
        }
        break;
      }

      case 'clear_all':
        await advancedCache.clear();
        break;

      default:
        console.warn(`Tipo de ação desconhecido: ${action.type}`);
    }
  }

  /**
   * Aquece uma chave específica do cache
   */
  private async warmCacheKey(key: string, event: CacheEvent): Promise<void> {
    try {
      // Implementar lógica específica de aquecimento baseada na chave
      if (key.startsWith('dashboard:')) {
        // Aquecer dados do dashboard
        const dashboardData = await this.generateDashboardData(event.userId);
        await reportCache.setDashboardData(dashboardData, event.userId);
      } else if (key.startsWith('patrimonio:')) {
        // Aquecer dados de patrimônio
        // Implementar conforme necessário
      }

      console.log(`Cache aquecido para chave: ${key}`);
    } catch (error) {
      console.error(`Erro ao aquecer cache para ${key}:`, error);
    }
  }

  /**
   * Gera dados do dashboard (exemplo)
   */
  private async generateDashboardData(userId?: string): Promise<any> {
    // Simular geração de dados do dashboard
    // Em produção, isso seria uma consulta real ao banco de dados
    return {
      totalPatrimonio: 1250,
      patrimoniosPorCategoria: [
        { categoria: 'Informática', quantidade: 450, valor: 125000 },
        { categoria: 'Mobiliário', quantidade: 300, valor: 85000 },
      ],
      patrimoniosRecentes: [],
      patrimoniosPorStatus: [
        { status: 'Ativo', quantidade: 1100 },
        { status: 'Manutenção', quantidade: 85 },
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
    };
  }

  /**
   * Emite evento para processamento
   */
  emitCacheEvent(
    type: string,
    data: Record<string, any>,
    source: string,
    userId?: string
  ): void {
    const event: CacheEvent = {
      type,
      data,
      timestamp: new Date(),
      source,
      userId,
    };

    this.emit(type, event);
  }

  /**
   * Métodos de conveniência para emitir eventos comuns
   */
  emitDataChange(
    table: string,
    operation: string,
    recordId: string,
    userId?: string
  ): void {
    this.emitCacheEvent(
      'data_change',
      {
        table,
        operation,
        recordId,
      },
      'database',
      userId
    );
  }

  emitUserAction(action: string, userRole: string, userId: string): void {
    this.emitCacheEvent(
      'user_action',
      {
        action,
        userRole,
      },
      'user_interface',
      userId
    );
  }

  emitSystemEvent(event: string, value: number): void {
    this.emitCacheEvent(
      'system_event',
      {
        event,
        value,
      },
      'system_monitor'
    );
  }

  /**
   * Obtém estatísticas de invalidação
   */
  getStats(): InvalidationStats {
    return { ...this.stats };
  }

  /**
   * Obtém todas as regras
   */
  getRules(): CacheInvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Obtém regra específica
   */
  getRule(ruleId: string): CacheInvalidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Utilitários privados
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateStats(): void {
    this.stats.totalRules = this.rules.size;
    this.stats.activeRules = Array.from(this.rules.values()).filter(
      rule => rule.enabled
    ).length;
  }

  private updateInvalidationStats(ruleId: string, executionTime: number): void {
    this.stats.totalInvalidations++;
    this.stats.invalidationsByRule[ruleId] =
      (this.stats.invalidationsByRule[ruleId] || 0) + 1;
    this.stats.lastInvalidation = new Date();

    // Atualizar tempo médio
    const currentAvg = this.stats.averageInvalidationTime;
    const total = this.stats.totalInvalidations;
    this.stats.averageInvalidationTime =
      (currentAvg * (total - 1) + executionTime) / total;
  }

  private addError(ruleId: string, error: string): void {
    this.stats.errors.unshift({
      rule: ruleId,
      error,
      timestamp: new Date(),
    });

    if (this.stats.errors.length > this.MAX_ERRORS_HISTORY) {
      this.stats.errors = this.stats.errors.slice(0, this.MAX_ERRORS_HISTORY);
    }
  }
}

// Instância singleton
export const cacheInvalidationService = new CacheInvalidationService();
export default CacheInvalidationService;
