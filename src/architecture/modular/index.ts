/**
 * Arquitetura Modular SISPAT
 * 
 * Estrutura organizada por:
 * - Features (funcionalidades específicas)
 * - Shared (componentes compartilhados)
 * - Services (serviços de negócio)
 * - Infrastructure (configurações técnicas)
 */

// ============================================================================
// FEATURES - Funcionalidades Específicas
// ============================================================================

export * from './features/analytics';
export * from './features/search';
export * from './features/mobile';
export * from './features/ai';

// ============================================================================
// SHARED - Componentes Compartilhados
// ============================================================================

export * from './shared/components';
export * from './shared/hooks';
export * from './shared/utils';
export * from './shared/types';

// ============================================================================
// SERVICES - Serviços de Negócio
// ============================================================================

export * from './services/api';
export * from './services/cache';
export * from './services/auth';
export * from './services/reports';

// ============================================================================
// INFRASTRUCTURE - Configurações Técnicas
// ============================================================================

export * from './infrastructure/config';
export * from './infrastructure/logger';
export * from './infrastructure/error-handling';
