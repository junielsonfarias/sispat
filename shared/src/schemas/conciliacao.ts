import { z } from 'zod';

// Conciliação físico-contábil (SIAFIC) — Art. 3 II e Art. 8 V da Lei.
// O saldo contábil vem do SIAFIC (informado); o físico é calculado pelo backend.

export const categoriaConciliacaoSchema = z.enum(['bens_moveis', 'bens_imoveis']);
export type CategoriaConciliacao = z.infer<typeof categoriaConciliacaoSchema>;

export const statusConciliacaoSchema = z.enum(['conciliada', 'divergente']);
export type StatusConciliacao = z.infer<typeof statusConciliacaoSchema>;

const isoDate = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM.');

export const createConciliacaoSchema = z.object({
  competencia: competenciaSchema,
  dataBase: isoDate,
  categoria: categoriaConciliacaoSchema,
  valorContabil: z.coerce.number().min(0, 'Valor contábil não pode ser negativo.'),
  observacoes: z.string().max(2000).optional().nullable(),
});
export type CreateConciliacaoInput = z.infer<typeof createConciliacaoSchema>;

export const conciliacaoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  categoria: categoriaConciliacaoSchema.optional(),
  status: statusConciliacaoSchema.optional(),
});
