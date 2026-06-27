/**
 * Depreciação linear — valor contábil LÍQUIDO de um bem na data de referência
 * (custo - depreciação acumulada, com piso no valor residual).
 *
 * A lógica é a FONTE ÚNICA em `@sispat/shared` (rules/depreciation), reusada
 * pelo frontend (`src/lib/depreciation-utils.ts`). É usada na conciliação
 * físico-contábil para que o saldo FÍSICO case com o valor líquido registrado
 * no SIAFIC (que NÃO é o custo histórico bruto) — Lei art. 8/21, Decreto art. 12.
 *
 * Mantido como re-export para preservar o caminho de import dos callers
 * (`../utils/depreciation`).
 */
export {
  mesesInteiros,
  depreciacaoAcumulada,
  valorContabilLiquido,
} from '@sispat/shared';
export type { BemDepreciavel } from '@sispat/shared';
