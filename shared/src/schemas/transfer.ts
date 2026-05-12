import { z } from 'zod';

// Transferência de patrimônio entre setores/locais. `model Transferencia`
// em `backend/prisma/schema.prisma`. Service em `transferService.ts`
// (Sprint 18) cuida da lógica de aprovação, restauração do `previousStatus`
// e dos estados que bloqueiam a operação (baixado/em_transferencia/etc).

const isoDateSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

const setorSchema = z
  .string()
  .trim()
  .min(1, 'Setor é obrigatório.')
  .max(100, 'Setor deve ter no máximo 100 caracteres.');

const motivoSchema = z
  .string()
  .trim()
  .min(1, 'Motivo é obrigatório.')
  .max(500, 'Motivo deve ter no máximo 500 caracteres.');

const observacoesSchema = z
  .string()
  .max(1000, 'Observações devem ter no máximo 1000 caracteres.')
  .optional();

export const createTransferSchema = z.object({
  patrimonioId: z.string().uuid('patrimonioId deve ser um UUID válido.'),
  setorOrigem: setorSchema,
  setorDestino: setorSchema,
  localOrigem: z.string().max(100).optional(),
  localDestino: z.string().max(100).optional(),
  motivo: motivoSchema,
  dataTransferencia: isoDateSchema,
  responsavelOrigem: z.string().max(200).optional(),
  responsavelDestino: z.string().max(200).optional(),
  observacoes: observacoesSchema,
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const approveTransferSchema = z
  .object({
    observacoes: observacoesSchema,
  })
  .strict();
export type ApproveTransferInput = z.infer<typeof approveTransferSchema>;

export const rejectTransferSchema = z
  .object({
    motivo: z.string().max(500).optional(),
  })
  .strict();
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;
