// Sprint 22: schema canônico migrado para @sispat/shared.
// Este arquivo é um reexport fino para manter compatibilidade com todos os
// imports existentes sem ter que alterar cada página/componente.
//
// Mapeamento de nomes antigos → novos:
//   imovelBaseSchema   → imovelFrontendSchema
//   imovelCreateSchema → imovelCreateFrontendSchema
//   imovelUpdateSchema → imovelFrontendSchema.partial() (update é parcial)
//   ImovelFormData     → ImovelFormData (mesmo nome)
export {
  imovelFrontendSchema as imovelBaseSchema,
  imovelCreateFrontendSchema as imovelCreateSchema,
  imovelFrontendSchema,
  imovelCreateFrontendSchema,
} from '@sispat/shared';

// imovelUpdateSchema era imovelBaseSchema.partial() no original.
// Mantemos o mesmo comportamento.
import { imovelFrontendSchema } from '@sispat/shared';
export const imovelUpdateSchema = imovelFrontendSchema.partial();

export type { ImovelFormData, ImovelCreateFormData } from '@sispat/shared';
