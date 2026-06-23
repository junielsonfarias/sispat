/**
 * Feature flags do frontend.
 *
 * Use para esconder funcionalidades incompletas em produção sem deletar
 * o código. Quando uma feature ficar pronta, basta virar a flag para `true`.
 *
 * Convenção: mantenha aqui apenas flags de UI. Para flags que afetam
 * backend (ex.: ativar Sentry, Redis), use variáveis de ambiente.
 */
export const FEATURES = {
  /**
   * Sub-patrimônios (kits/conjuntos) — B2.
   * Backend completo: CRUD em /api/patrimonios/:id/sub-patrimonios + geração
   * automática na criação do kit. Ver `Docs/_PROJETO/PLANO_MELHORIAS_FLUXOS.md`.
   */
  subPatrimonios: true,
} as const;
