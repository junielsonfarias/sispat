// Sprint 22: schema canônico migrado para @sispat/shared.
// Este arquivo é um reexport fino para manter compatibilidade com todos os
// imports existentes sem ter que alterar cada página/componente.
export {
  patrimonioBaseSchema,
  patrimonioCreateSchema,
  patrimonioEditSchema,
} from '@sispat/shared';

export type {
  PatrimonioBase,
  PatrimonioCreateFormData,
  PatrimonioEditFormData,
} from '@sispat/shared';
