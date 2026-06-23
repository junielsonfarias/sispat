import { z } from 'zod';

// Desfazimento de bem inservível — Art. 24 da Lei / Art. 13-14 do Decreto.
// Ao concluir, o patrimônio é baixado (Art. 25).

export const classificacaoInservivelSchema = z.enum([
  'ocioso',
  'recuperavel',
  'antieconomico',
  'irrecuperavel',
]);
export type ClassificacaoInservivel = z.infer<typeof classificacaoInservivelSchema>;

export const modalidadeDesfazimentoSchema = z.enum([
  'doacao',
  'leilao',
  'permuta',
  'transferencia',
  'cessao',
  'inutilizacao',
]);
export type ModalidadeDesfazimento = z.infer<typeof modalidadeDesfazimentoSchema>;

export const statusDesfazimentoSchema = z.enum(['em_andamento', 'concluido', 'cancelado']);
export type StatusDesfazimento = z.infer<typeof statusDesfazimentoSchema>;

export const createDesfazimentoSchema = z.object({
  patrimonioId: z.string().uuid('Patrimônio é obrigatório.'),
  classificacao: classificacaoInservivelSchema,
  modalidade: modalidadeDesfazimentoSchema,
  valorAvaliacao: z.coerce.number().min(0).optional().nullable(),
  justificativa: z.string().trim().min(10, 'Justificativa muito curta.').max(4000),
  laudo: z.string().max(4000).optional().nullable(),
  comissaoId: z.string().uuid().optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});
export type CreateDesfazimentoInput = z.infer<typeof createDesfazimentoSchema>;

export const updateDesfazimentoSchema = z
  .object({
    classificacao: classificacaoInservivelSchema.optional(),
    modalidade: modalidadeDesfazimentoSchema.optional(),
    valorAvaliacao: z.coerce.number().min(0).optional().nullable(),
    justificativa: z.string().trim().min(10).max(4000).optional(),
    laudo: z.string().max(4000).optional().nullable(),
    comissaoId: z.string().uuid().optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
  })
  .strict();
export type UpdateDesfazimentoInput = z.infer<typeof updateDesfazimentoSchema>;
