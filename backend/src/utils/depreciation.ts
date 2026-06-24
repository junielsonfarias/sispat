/**
 * Depreciação linear no backend — valor contábil LÍQUIDO de um bem na data de
 * referência (custo - depreciação acumulada, com piso no valor residual).
 *
 * Espelha a lógica de `src/lib/depreciation-utils.ts` (frontend). É usado na
 * conciliação físico-contábil para que o saldo FÍSICO case com o valor líquido
 * registrado no SIAFIC (que NÃO é o custo histórico bruto) — Lei art. 8/21,
 * Decreto art. 12.
 */

export interface BemDepreciavel {
  valor_aquisicao: number;
  data_aquisicao: Date | string;
  vida_util_anos?: number | null;
  valor_residual?: number | null;
}

/** Meses inteiros decorridos entre `from` e `to` (0 se `to` < `from`). */
const mesesInteiros = (from: Date, to: Date): number => {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
};

/** Depreciação acumulada (linear) de um bem na data de referência. */
export const depreciacaoAcumulada = (bem: BemDepreciavel, ref: Date = new Date()): number => {
  const valor = bem.valor_aquisicao ?? 0;
  const residual = bem.valor_residual ?? 0;
  const vidaAnos = bem.vida_util_anos ?? 0;
  if (vidaAnos <= 0 || valor <= residual) return 0;
  const mensal = (valor - residual) / (vidaAnos * 12);
  const meses = Math.min(mesesInteiros(new Date(bem.data_aquisicao), ref), vidaAnos * 12);
  return meses * mensal;
};

/** Valor contábil líquido = custo - depreciação acumulada, nunca abaixo do residual. */
export const valorContabilLiquido = (bem: BemDepreciavel, ref: Date = new Date()): number => {
  const valor = bem.valor_aquisicao ?? 0;
  const residual = bem.valor_residual ?? 0;
  return Math.max(residual, valor - depreciacaoAcumulada(bem, ref));
};
