// Depreciação linear — núcleo compartilhado (frontend + backend).
//
// Fonte ÚNICA do cálculo para evitar divergência silenciosa entre os dois
// lados. O backend usa `valorContabilLiquido` na conciliação físico-contábil
// (saldo físico deve casar com o valor líquido do SIAFIC, NÃO o custo bruto)
// — Lei art. 8/21, Decreto art. 12. O frontend deriva a visão rica
// (`DepreciationInfo`) a partir de `mesesInteiros`.
//
// Sem dependência externa de propósito (o pacote @sispat/shared só tem zod
// como peer): o cálculo de meses é manual para não puxar date-fns para cá.

export interface BemDepreciavel {
  valor_aquisicao: number;
  data_aquisicao: Date | string;
  vida_util_anos?: number | null;
  valor_residual?: number | null;
}

/** Meses inteiros decorridos entre `from` e `to` (0 se `to` < `from`). */
export const mesesInteiros = (from: Date, to: Date): number => {
  let m =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
};

/** Depreciação acumulada (linear) de um bem na data de referência. */
export const depreciacaoAcumulada = (
  bem: BemDepreciavel,
  ref: Date = new Date(),
): number => {
  const valor = bem.valor_aquisicao ?? 0;
  const residual = bem.valor_residual ?? 0;
  const vidaAnos = bem.vida_util_anos ?? 0;
  if (vidaAnos <= 0 || valor <= residual) return 0;
  const mensal = (valor - residual) / (vidaAnos * 12);
  const meses = Math.min(
    mesesInteiros(new Date(bem.data_aquisicao), ref),
    vidaAnos * 12,
  );
  return meses * mensal;
};

/** Valor contábil líquido = custo - depreciação acumulada, nunca abaixo do residual. */
export const valorContabilLiquido = (
  bem: BemDepreciavel,
  ref: Date = new Date(),
): number => {
  const valor = bem.valor_aquisicao ?? 0;
  const residual = bem.valor_residual ?? 0;
  return Math.max(residual, valor - depreciacaoAcumulada(bem, ref));
};
