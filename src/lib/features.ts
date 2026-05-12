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
   * Sub-patrimônios (kits/conjuntos).
   * Backend ainda não tem endpoint para gerenciar. Ver
   * `Docs/_PROJETO/PLANO_MELHORIAS_FLUXOS.md` — B2.
   */
  subPatrimonios: false,
} as const;
