import { z } from 'zod';

// Sub-patrimônio (B2): unidade individual de um bem do tipo kit. O `numero` é
// gerado pelo backend a partir do número do patrimônio pai + sequencial; o
// cliente nunca o envia na criação.

export const subPatrimonioStatusSchema = z.enum(['ativo', 'baixado', 'manutencao']);
export type SubPatrimonioStatus = z.infer<typeof subPatrimonioStatusSchema>;

export const createSubPatrimonioSchema = z.object({
  status: subPatrimonioStatusSchema.default('ativo'),
  localizacao_especifica: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});
export type CreateSubPatrimonioInput = z.infer<typeof createSubPatrimonioSchema>;

export const updateSubPatrimonioSchema = z
  .object({
    status: subPatrimonioStatusSchema.optional(),
    localizacao_especifica: z.string().trim().max(200).optional().nullable(),
    observacoes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();
export type UpdateSubPatrimonioInput = z.infer<typeof updateSubPatrimonioSchema>;

// Alteração de status em lote (bulk actions da tabela).
export const bulkStatusSubPatrimonioSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um sub-patrimônio.').max(500),
  status: subPatrimonioStatusSchema,
});
export type BulkStatusSubPatrimonioInput = z.infer<typeof bulkStatusSubPatrimonioSchema>;
